import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
  ) {}

  /**
   * Execution 생성 (스케줄러에서 사용)
   * executionKey로 중복 실행 방지
   */
  async create(jobId: string, scheduledAt: Date, startedAt: Date): Promise<Execution> {
    const executionKey = `${jobId}:${scheduledAt.toISOString()}`;

    // 중복 실행 방지: executionKey unique constraint 활용
    const existing = await this.executionRepository.findOne({
      where: { executionKey },
    });

    if (existing) {
      throw new Error(`Execution already exists for key: ${executionKey}`);
    }

    const execution = this.executionRepository.create({
      jobId,
      scheduledAt,
      startedAt,
      success: false,
      errorType: ErrorType.NONE,
      executionKey, // executionKey 설정
    });

    return await this.executionRepository.save(execution);
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

    // 각 Execution에 성능 추이 정보 추가
    const executionsWithTrend = await Promise.all(
      executions.map(async (execution) => {
        const performanceTrend = await this.calculatePerformanceTrend(jobId, execution);
        return {
          ...execution,
          performanceTrend,
        };
      }),
    );

    return {
      items: executionsWithTrend,
      nextCursor,
    };
  }

  /**
   * 성능 추이 계산
   * 현재 Execution 이전의 10개 Execution 평균과 비교
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
    // 현재 Execution의 durationMs가 없으면 null 반환
    if (!currentExecution.durationMs || !currentExecution.finishedAt) {
      return null;
    }

    // 현재 Execution 이전의 Execution 10개 조회
    const previousExecutions = await this.executionRepository.find({
      where: { jobId },
      order: { createdAt: "DESC", id: "DESC" },
      take: 20, // 충분히 많이 가져와서 필터링
    });

    // 현재 Execution보다 이전인 것들만 필터링
    const beforeCurrent = previousExecutions.filter(
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
      finishedBefore.reduce((sum, exec) => sum + (exec.durationMs || 0), 0) / finishedBefore.length;

    // 현재 Execution의 durationMs
    const currentDuration = currentExecution.durationMs;

    // 변화율 계산 (양수면 느려짐, 음수면 빨라짐)
    const changePercent =
      previousAvg > 0 ? ((currentDuration - previousAvg) / previousAvg) * 100 : 0;

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
   * Job의 최근 Execution 목록 조회 (Health 계산용)
   */
  async findRecentByJobId(jobId: string, limit: number = 10): Promise<Execution[]> {
    return await this.executionRepository.find({
      where: { jobId },
      order: { createdAt: "DESC", id: "DESC" },
      take: limit,
    });
  }
}
