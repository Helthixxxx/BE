import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Execution } from "./entities/execution.entity";
import { ErrorType } from "../common/enums/error-type.enum";
import { ExecutionListResponseDto } from "./dto/execution-response.dto";
import { encodeCursor, decodeCursor } from "./dto/cursor.dto";
import { JobsService } from "../jobs/jobs.service";

/**
 * ExecutionsService
 * Execution 저장 및 조회 로직
 * cursor 기반 pagination 지원
 */
@Injectable()
export class ExecutionsService {
  constructor(
    @InjectRepository(Execution)
    private readonly executionRepository: Repository<Execution>,
    private readonly jobsService: JobsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Execution 생성 (스케줄러에서 사용)
   * executionKey로 중복 실행 방지
   * 트랜잭션과 UNIQUE 제약 조건으로 Race condition 방지
   */
  async create(
    jobId: string,
    scheduledAt: Date,
    startedAt: Date,
  ): Promise<Execution> {
    const executionKey = `${jobId}:${scheduledAt.toISOString()}`;

    try {
      return await this.dataSource.transaction(async (manager) => {
        const executionRepo = manager.getRepository(Execution);

        // 중복 실행 방지: executionKey unique constraint 활용
        // 트랜잭션 내에서 조회하여 Race condition 방지
        const existing = await executionRepo.findOne({
          where: { executionKey },
        });

        if (existing) {
          throw new Error(`Execution already exists for key: ${executionKey}`);
        }

        const execution = executionRepo.create({
          jobId,
          scheduledAt,
          startedAt,
          success: false,
          errorType: ErrorType.NONE,
          executionKey, // executionKey 설정
        });

        return await executionRepo.save(execution);
      });
    } catch (error) {
      // UNIQUE 제약 조건 위반 시에도 동일한 에러 메시지 반환
      if (error instanceof Error && error.message.includes("duplicate key")) {
        throw new Error(`Execution already exists for key: ${executionKey}`);
      }
      throw error;
    }
  }

  /**
   * Execution 결과 업데이트
   */
  async updateResult(
    executionId: number,
    finishedAt: Date,
    success: boolean,
    httpStatus: number | null,
    errorType: ErrorType,
    errorMessage: string | null,
    responseSnippet: string | null,
  ): Promise<void> {
    const execution = await this.executionRepository.findOne({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${executionId} not found`);
    }

    const durationMs = finishedAt.getTime() - execution.startedAt.getTime();

    // responseSnippet은 최대 1KB로 truncate
    let truncatedSnippet = responseSnippet;
    if (truncatedSnippet && truncatedSnippet.length > 1024) {
      truncatedSnippet = truncatedSnippet.substring(0, 1024);
    }

    execution.finishedAt = finishedAt;
    execution.durationMs = durationMs;
    execution.success = success;
    execution.httpStatus = httpStatus;
    execution.errorType = errorType;
    execution.errorMessage = errorMessage;
    execution.responseSnippet = truncatedSnippet;

    await this.executionRepository.save(execution);
  }

  /**
   * Job의 Execution 목록 조회 (Admin용 - 모든 Job 접근 가능)
   * 정렬: createdAt DESC, id DESC
   */
  async findByJobId(
    jobId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<ExecutionListResponseDto> {
    // Job 존재 확인
    await this.jobsService.findOne(jobId);

    return this.findByJobIdInternal(jobId, limit, cursor);
  }

  /**
   * Execution 목록 조회 내부 로직
   */
  private async findByJobIdInternal(
    jobId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<ExecutionListResponseDto> {
    const queryBuilder = this.executionRepository
      .createQueryBuilder("execution")
      .where("execution.jobId = :jobId", { jobId })
      .orderBy("execution.createdAt", "DESC")
      .addOrderBy("execution.id", "DESC")
      .limit(limit + 1); // nextCursor 판단을 위해 +1

    // cursor가 있으면 조건 추가
    if (cursor) {
      const decodedCursor = decodeCursor(cursor);
      queryBuilder.andWhere(
        "(execution.createdAt < :cursorCreatedAt OR (execution.createdAt = :cursorCreatedAt AND execution.id < :cursorId))",
        {
          cursorCreatedAt: decodedCursor.createdAt,
          cursorId: decodedCursor.id,
        },
      );
    }

    const executions = await queryBuilder.getMany();

    // nextCursor 판단
    let nextCursor: string | null = null;
    if (executions.length > limit) {
      const lastExecution = executions[limit - 1];
      nextCursor = encodeCursor({
        createdAt: lastExecution.createdAt.toISOString(),
        id: lastExecution.id,
      });
      executions.pop(); // 마지막 항목 제거
    }

    // 성능 추이 계산을 위한 배치 처리
    // 모든 execution에 대해 필요한 이전 execution들을 한 번에 조회
    const executionsWithTrend = await this.calculatePerformanceTrendsBatch(
      jobId,
      executions,
    );

    return {
      items: executionsWithTrend,
      nextCursor,
    };
  }

  /**
   * 성능 추이 계산 (배치 처리)
   * 모든 execution에 대해 필요한 이전 execution들을 한 번에 조회하여 N+1 쿼리 문제 해결
   */
  private async calculatePerformanceTrendsBatch(
    jobId: string,
    executions: Execution[],
  ): Promise<
    Array<
      Execution & {
        performanceTrend: ReturnType<typeof this.calculatePerformanceTrend>;
      }
    >
  > {
    // durationMs가 없는 execution은 null 반환
    const executionsWithDuration = executions.filter(
      (exec) => exec.durationMs !== null && exec.finishedAt !== null,
    );

    if (executionsWithDuration.length === 0) {
      return executions.map((exec) => ({ ...exec, performanceTrend: null }));
    }

    // 모든 execution 이전의 execution들을 한 번에 조회
    const allPreviousExecutions = await this.executionRepository.find({
      where: { jobId },
      order: { createdAt: "DESC", id: "DESC" },
      take: 100, // 충분히 많이 가져와서 필터링 (최대 20개 execution * 10개 이전 = 200개 필요하지만 안전하게 100개)
    });

    // 각 execution에 대해 성능 추이 계산
    return executions.map((execution) => {
      const performanceTrend = this.calculatePerformanceTrendInternal(
        execution,
        allPreviousExecutions,
      );
      return {
        ...execution,
        performanceTrend,
      };
    });
  }

  /**
   * 성능 추이 계산 (내부 로직)
   * 메모리에서 이미 조회된 execution 목록을 사용
   */
  private calculatePerformanceTrendInternal(
    currentExecution: Execution,
    allPreviousExecutions: Execution[],
  ): {
    previousAvg: number;
    currentAvg: number;
    changePercent: number;
    trend: "improved" | "stable" | "degraded";
  } | null {
    // 현재 Execution의 durationMs가 없으면 null 반환
    if (!currentExecution.durationMs || !currentExecution.finishedAt) {
      return null;
    }

    // 현재 Execution보다 이전인 것들만 필터링
    const beforeCurrent = allPreviousExecutions.filter(
      (exec) =>
        exec.createdAt < currentExecution.createdAt ||
        (exec.createdAt.getTime() === currentExecution.createdAt.getTime() &&
          exec.id < currentExecution.id),
    );

    // 완료된 Execution 중 durationMs가 있는 것만 필터링
    const finishedBefore = beforeCurrent
      .filter((exec) => exec.finishedAt !== null && exec.durationMs !== null)
      .slice(0, 10); // 최근 10개

    // 이전 10개가 없으면 null 반환
    if (finishedBefore.length < 10) {
      return null;
    }

    // 이전 10개 평균 계산
    const previousAvg =
      finishedBefore.reduce((sum, exec) => sum + (exec.durationMs || 0), 0) /
      finishedBefore.length;

    // 현재 Execution의 durationMs
    const currentDuration = currentExecution.durationMs;

    // 변화율 계산 (양수면 느려짐, 음수면 빨라짐)
    const changePercent =
      previousAvg > 0
        ? ((currentDuration - previousAvg) / previousAvg) * 100
        : 0;

    // trend 판단
    let trend: "improved" | "stable" | "degraded";
    if (changePercent <= -10) {
      // 10% 이상 빨라짐
      trend = "improved";
    } else if (changePercent >= 50) {
      // 50% 이상 느려짐
      trend = "degraded";
    } else {
      // 안정적
      trend = "stable";
    }

    return {
      previousAvg: Math.round(previousAvg),
      currentAvg: currentDuration,
      changePercent: Math.round(changePercent * 100) / 100, // 소수점 2자리
      trend,
    };
  }

  /**
   * 성능 추이 계산 (단일 execution용, 하위 호환성)
   * @deprecated calculatePerformanceTrendsBatch를 사용하세요
   */
  private async calculatePerformanceTrend(
    jobId: string,
    currentExecution: Execution,
  ): Promise<{
    previousAvg: number;
    currentAvg: number;
    changePercent: number;
    trend: "improved" | "stable" | "degraded";
  } | null> {
    // 현재 Execution 이전의 Execution들을 조회
    const allPreviousExecutions = await this.executionRepository.find({
      where: { jobId },
      order: { createdAt: "DESC", id: "DESC" },
      take: 100,
    });

    return this.calculatePerformanceTrendInternal(
      currentExecution,
      allPreviousExecutions,
    );
  }

  /**
   * Job의 최근 Execution 목록 조회 (Health 계산용)
   */
  async findRecentByJobId(
    jobId: string,
    limit: number = 10,
  ): Promise<Execution[]> {
    return await this.executionRepository.find({
      where: { jobId },
      order: { createdAt: "DESC", id: "DESC" },
      take: limit,
    });
  }
}
