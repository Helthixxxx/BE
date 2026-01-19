import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Health } from '../common/enums/health.enum';

/**
 * JobsService
 * Job CRUD 및 비즈니스 로직 처리
 */
@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  /**
   * Job 생성
   * 활성화된 Job의 경우 nextRunAt을 자동으로 설정
   * @param createJobDto Job 생성 데이터
   * @param userId Job 소유자 ID (선택적, Admin은 null 가능)
   */
  async create(
    createJobDto: CreateJobDto,
    userId?: string | null,
  ): Promise<Job> {
    const isActive = createJobDto.isActive ?? true;
    // 활성화된 Job의 경우 nextRunAt 자동 설정
    const nextRunAt = isActive
      ? this.calculateNextRunAt(new Date(), createJobDto.scheduleMinutes)
      : null;

    const job = this.jobRepository.create({
      ...createJobDto,
      isActive,
      userId: userId || null,
      nextRunAt,
      lastHealth: null,
    });

    return await this.jobRepository.save(job);
  }

  /**
   * 모든 Job 조회 (Admin용)
   * includeHealth가 true이면 각 Job의 현재 Health 포함
   */
  async findAll(includeHealth: boolean = false): Promise<Job[]> {
    const jobs = await this.jobRepository.find({
      order: { createdAt: 'DESC' },
    });

    if (includeHealth) {
      // Health는 실시간 계산이므로 별도 로직 필요
      // 여기서는 기본 구조만 제공하고, HealthService에서 계산
      return jobs;
    }

    return jobs;
  }

  /**
   * 사용자별 Job 조회 (User용)
   * @param userId 사용자 ID
   * @param includeHealth Health 포함 여부
   */
  async findByUserId(
    userId: string,
    includeHealth: boolean = false,
  ): Promise<Job[]> {
    const jobs = await this.jobRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (includeHealth) {
      // Health는 실시간 계산이므로 별도 로직 필요
      return jobs;
    }

    return jobs;
  }

  /**
   * Job 단건 조회 (Admin용 - 모든 Job 접근 가능)
   */
  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  /**
   * 사용자별 Job 단건 조회 (User용 - 본인 Job만 접근 가능)
   * @param id Job ID
   * @param userId 사용자 ID
   */
  async findOneByUserId(id: string, userId: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id, userId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  /**
   * Job 수정 (Admin용)
   */
  async update(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(id);
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
      const now = new Date();
      job.nextRunAt = this.calculateNextRunAt(now, job.scheduleMinutes);
    } else if (updateJobDto.isActive === false && job.isActive === false) {
      // 비활성화된 경우 nextRunAt을 null로 설정
      job.nextRunAt = null;
    }

    return await this.jobRepository.save(job);
  }

  /**
   * 사용자별 Job 수정 (User용 - 본인 Job만 수정 가능)
   * @param id Job ID
   * @param updateJobDto 수정 데이터
   * @param userId 사용자 ID
   */
  async updateByUserId(
    id: string,
    updateJobDto: UpdateJobDto,
    userId: string,
  ): Promise<Job> {
    const job = await this.findOneByUserId(id, userId);
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
      const now = new Date();
      job.nextRunAt = this.calculateNextRunAt(now, job.scheduleMinutes);
    } else if (updateJobDto.isActive === false && job.isActive === false) {
      // 비활성화된 경우 nextRunAt을 null로 설정
      job.nextRunAt = null;
    }

    return await this.jobRepository.save(job);
  }

  /**
   * Job 삭제 (Admin용)
   */
  async remove(id: string): Promise<void> {
    const job = await this.findOne(id);
    await this.jobRepository.remove(job);
  }

  /**
   * 사용자별 Job 삭제 (User용 - 본인 Job만 삭제 가능)
   * @param id Job ID
   * @param userId 사용자 ID
   */
  async removeByUserId(id: string, userId: string): Promise<void> {
    const job = await this.findOneByUserId(id, userId);
    await this.jobRepository.remove(job);
  }

  /**
   * 활성 Job 목록 조회 (스케줄러에서 사용)
   */
  async findActiveJobs(): Promise<Job[]> {
    return await this.jobRepository.find({
      where: { isActive: true },
      order: { nextRunAt: 'ASC' },
    });
  }

  /**
   * Job의 lastHealth 업데이트
   */
  async updateLastHealth(jobId: string, health: Health): Promise<void> {
    await this.jobRepository.update(jobId, { lastHealth: health });
  }

  /**
   * Job의 nextRunAt 업데이트
   */
  async updateNextRunAt(jobId: string, nextRunAt: Date): Promise<void> {
    await this.jobRepository.update(jobId, { nextRunAt });
  }

  /**
   * 다음 실행 시간 계산
   * scheduleMinutes 기준으로 분 단위 정렬
   */
  private calculateNextRunAt(baseTime: Date, scheduleMinutes: number): Date {
    const next = new Date(baseTime);
    next.setMinutes(next.getMinutes() + scheduleMinutes);
    next.setSeconds(0, 0); // 초와 밀리초는 0으로 설정
    return next;
  }
}
