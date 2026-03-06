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

  /** Job 생성 */
  async create(createJobDto: CreateJobDto, userId: string): Promise<Job> {
    const isActive = createJobDto.isActive ?? true;

    return await this.dataSource.transaction(async (manager) => {
      const jobRepo = manager.getRepository(Job);

      const job = jobRepo.create({
        ...createJobDto,
        isActive,
        userId,
        nextRunAt: null,
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

  /** Job 목록 조회 (내부용, 권한 체크 없음) */
  async findAllInternal(): Promise<Job[]> {
    return await this.jobRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  /** Job 목록 조회 */
  async findAll(userId: string, userRole: UserRole): Promise<Job[]> {
    const queryBuilder = this.jobRepository
      .createQueryBuilder("job")
      .orderBy("job.createdAt", "DESC");

    // USER 역할인 경우 자신이 생성한 Job만 조회
    if (userRole !== UserRole.ADMIN) {
      queryBuilder.where("job.userId = :userId", { userId });
    }

    return await queryBuilder.getMany();
  }

  /** Job 단건 조회 (내부용, 권한 체크 없음) */
  async findOneInternal(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Job을 찾을 수 없습니다: ${id}`);
    }

    return job;
  }

  /** Job 단건 조회 */
  async findOne(id: string, userId: string, userRole: UserRole): Promise<Job> {
    const job = await this.findOneInternal(id);

    // USER 역할인 경우 자신이 생성한 Job인지 확인
    if (userRole !== UserRole.ADMIN && job.userId !== userId) {
      throw new ForbiddenException("해당 Job에 접근할 권한이 없습니다.");
    }

    return job;
  }

  /** Job 수정 */
  async update(
    id: string,
    updateJobDto: UpdateJobDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Job> {
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

  /** Job 삭제 */
  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const job = await this.findOne(id, userId, userRole);
    await this.jobRepository.remove(job);
  }

  /** 활성 Job 목록 조회 (스케줄러에서 사용) */
  async findActiveJobs(): Promise<Job[]> {
    return await this.jobRepository.find({
      where: { isActive: true },
      order: { nextRunAt: "ASC" },
    });
  }

  /** Job의 lastHealth 업데이트 */
  async updateLastHealth(jobId: string, health: Health): Promise<void> {
    await this.jobRepository.update(jobId, { lastHealth: health });
  }

  /** Job의 알림 발송 정보 업데이트 */
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

  /** Job 조회 (Lock용) */
  async findOneWithLock(jobId: string, manager?: EntityManager): Promise<Job> {
    const repository = manager ? manager.getRepository(Job) : this.jobRepository;

    const job = await repository
      .createQueryBuilder("job")
      .where("job.id = :id", { id: jobId })
      .setLock("pessimistic_write")
      .getOne();

    if (!job) {
      throw new NotFoundException(`Job을 찾을 수 없습니다: ${jobId}`);
    }

    return job;
  }

  /** Job의 nextRunAt 업데이트 */
  async updateNextRunAt(jobId: string, nextRunAt: Date): Promise<void> {
    await this.jobRepository.update(jobId, { nextRunAt });
  }

  /** 다음 실행 시간 계산 */
  private calculateNextRunAt(baseTime: Date, scheduleMinutes: number): Date {
    const next = new Date(baseTime);
    next.setMinutes(next.getMinutes() + scheduleMinutes);
    return next;
  }
}
