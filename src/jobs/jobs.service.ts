import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager, DataSource } from "typeorm";
import { Job } from "./entities/job.entity";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { Health } from "../common/types/health.enum";
import { UserRole } from "../users/entities/user.entity";

/**
 * JobsService
 * Job CRUD 및 비즈니스 로직 처리
 */
@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Job 생성
   * 활성화된 Job의 경우 nextRunAt을 자동으로 설정
   * 생성일시(createdAt)로부터 정확히 스케줄 시간을 더함
   * 트랜잭션으로 일관성 보장
   * @param createJobDto Job 생성 데이터
   * @param userId 호출자의 사용자 ID
   */
  async create(createJobDto: CreateJobDto, userId: string): Promise<Job> {
    const isActive = createJobDto.isActive ?? true;

    return await this.dataSource.transaction(async (manager) => {
      const jobRepo = manager.getRepository(Job);

      const job = jobRepo.create({
        ...createJobDto,
        isActive,
        userId,
        nextRunAt: null, // 일단 null로 설정, 저장 후 createdAt 기준으로 계산
        lastHealth: null,
      });

      const savedJob = await jobRepo.save(job);

      // 저장 후 createdAt이 설정되므로, 이를 기준으로 nextRunAt 계산
      if (isActive && savedJob.createdAt) {
        const nextRunAt = this.calculateNextRunAt(savedJob.createdAt, savedJob.scheduleMinutes);
        savedJob.nextRunAt = nextRunAt;
        return await jobRepo.save(savedJob);
      }

      return savedJob;
    });
  }

  /**
   * Job 목록 조회 (내부용, 권한 체크 없음)
   * 서비스 간 호출 시 사용
   */
  async findAllInternal(includeHealth: boolean = false): Promise<Job[]> {
    const jobs = await this.jobRepository.find({
      order: { createdAt: "DESC" },
    });

    if (includeHealth) {
      // Health는 실시간 계산이므로 별도 로직 필요
      // 여기서는 기본 구조만 제공하고, HealthService에서 계산
      return jobs;
    }

    return jobs;
  }

  /**
   * Job 목록 조회
   * USER: 자신이 생성한 Job만 조회
   * ADMIN: 모든 Job 조회
   * includeHealth가 true이면 각 Job의 현재 Health 포함
   */
  async findAll(
    includeHealth: boolean = false,
    userId: string,
    userRole: UserRole,
  ): Promise<Job[]> {
    const queryBuilder = this.jobRepository
      .createQueryBuilder("job")
      .orderBy("job.createdAt", "DESC");

    // USER 역할인 경우 자신이 생성한 Job만 조회
    if (userRole !== UserRole.ADMIN) {
      queryBuilder.where("job.userId = :userId", { userId });
    }

    const jobs = await queryBuilder.getMany();

    if (includeHealth) {
      // Health는 실시간 계산이므로 별도 로직 필요
      // 여기서는 기본 구조만 제공하고, HealthService에서 계산
      return jobs;
    }

    return jobs;
  }

  /**
   * Job 단건 조회 (내부용, 권한 체크 없음)
   * 서비스 간 호출 시 사용
   */
  async findOneInternal(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  /**
   * Job 단건 조회
   * USER: 자신이 생성한 Job만 조회 가능
   * ADMIN: 모든 Job 조회 가능
   */
  async findOne(id: string, userId: string, userRole: UserRole): Promise<Job> {
    const job = await this.findOneInternal(id);

    // USER 역할인 경우 자신이 생성한 Job인지 확인
    if (userRole !== UserRole.ADMIN && job.userId !== userId) {
      throw new ForbiddenException("해당 Job에 접근할 권한이 없습니다.");
    }

    return job;
  }

  /**
   * Job 수정
   */
  async update(
    id: string,
    updateJobDto: UpdateJobDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Job> {
    // USER면 본인 소유 Job만 수정 가능 / ADMIN이면 모두 가능
    const job = await this.findOne(id, userId, userRole);
    const previousIsActive = job.isActive;
    const previousScheduleMinutes = job.scheduleMinutes;

    Object.assign(job, updateJobDto);

    // isActive가 false에서 true로 변경되거나, scheduleMinutes가 변경된 경우 nextRunAt 업데이트
    const isActivated = !previousIsActive && job.isActive;
    const scheduleChanged =
      updateJobDto.scheduleMinutes !== undefined &&
      updateJobDto.scheduleMinutes !== previousScheduleMinutes;

    if (isActivated || (scheduleChanged && job.isActive)) {
      // 활성화되거나 스케줄이 변경된 경우 nextRunAt 재설정
      // 생성일시(createdAt)를 기준으로 계산
      const baseTime = job.createdAt || new Date();
      job.nextRunAt = this.calculateNextRunAt(baseTime, job.scheduleMinutes);
    } else if (updateJobDto.isActive === false && job.isActive === false) {
      // 비활성화된 경우 nextRunAt을 null로 설정
      job.nextRunAt = null;
    }

    return await this.jobRepository.save(job);
  }

  /**
   * Job 삭제
   */
  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    // USER면 본인 소유 Job만 삭제 가능 / ADMIN이면 모두 가능
    const job = await this.findOne(id, userId, userRole);
    await this.jobRepository.remove(job);
  }

  /**
   * 활성 Job 목록 조회 (스케줄러에서 사용)
   */
  async findActiveJobs(): Promise<Job[]> {
    return await this.jobRepository.find({
      where: { isActive: true },
      order: { nextRunAt: "ASC" },
    });
  }

  /**
   * Job의 lastHealth 업데이트
   */
  async updateLastHealth(jobId: string, health: Health): Promise<void> {
    await this.jobRepository.update(jobId, { lastHealth: health });
  }

  /**
   * Job의 알림 발송 정보 업데이트
   */
  async updateNotificationInfo(
    jobId: string,
    lastNotificationSentAt: Date,
    lastNotificationHealth: Health,
  ): Promise<void> {
    await this.jobRepository.update(jobId, {
      lastNotificationSentAt,
      lastNotificationHealth,
    });
  }

  /**
   * Job 조회 (Lock용)
   * SELECT FOR UPDATE로 동시성 제어
   * 트랜잭션 매니저가 제공되면 해당 트랜잭션 내에서 실행
   */
  async findOneWithLock(jobId: string, manager?: EntityManager): Promise<Job> {
    const repository = manager ? manager.getRepository(Job) : this.jobRepository;

    const job = await repository
      .createQueryBuilder("job")
      .where("job.id = :id", { id: jobId })
      .setLock("pessimistic_write")
      .getOne();

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    return job;
  }

  /**
   * Job의 nextRunAt 업데이트
   */
  async updateNextRunAt(jobId: string, nextRunAt: Date): Promise<void> {
    await this.jobRepository.update(jobId, { nextRunAt });
  }

  /**
   * 다음 실행 시간 계산
   * baseTime으로부터 정확히 scheduleMinutes를 더함 (초와 밀리초 유지)
   * 예: 1시23분12초 + 5분 = 1시28분12초
   */
  private calculateNextRunAt(baseTime: Date, scheduleMinutes: number): Date {
    const next = new Date(baseTime);
    next.setMinutes(next.getMinutes() + scheduleMinutes);
    // 초와 밀리초는 유지 (정확한 시간 계산)
    return next;
  }
}
