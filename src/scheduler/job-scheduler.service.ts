import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from '../jobs/jobs.service';
import { JobExecutorService } from './job-executor.service';

/**
 * JobSchedulerService
 * @nestjs/schedule 기반 Job 스케줄링
 * 분 단위로 실행하여 scheduleMinutes에 맞는 Job 실행
 */
@Injectable()
export class JobSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly jobExecutorService: JobExecutorService,
  ) {}

  /**
   * 모듈 초기화 시 활성 Job 로드 및 nextRunAt 설정
   */
  async onModuleInit() {
    this.logger.log('Initializing job scheduler...');
    await this.initializeJobs();
  }

  /**
   * 활성 Job 초기화
   * nextRunAt이 null이면 현재 시간 기준으로 다음 실행 시간 설정
   */
  private async initializeJobs(): Promise<void> {
    const activeJobs = await this.jobsService.findActiveJobs();

    for (const job of activeJobs) {
      if (!job.nextRunAt) {
        // nextRunAt이 없으면 생성일시(createdAt) 기준으로 다음 실행 시간 설정
        const now = new Date();
        const baseTime = job.createdAt || now;
        const nextRunAt = this.calculateNextRunAt(
          baseTime,
          job.scheduleMinutes,
        );
        await this.jobsService.updateNextRunAt(job.id, nextRunAt);
        this.logger.log(
          `Job ${job.id} (${job.name}) nextRunAt set to ${nextRunAt.toISOString()}`,
        );
      }
    }

    this.logger.log(`Initialized ${activeJobs.length} active jobs`);
  }

  /**
   * 매분 실행되는 Cron Job
   * 실행 시간이 된 Job들을 찾아 실행
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const now = new Date();
    const activeJobs = await this.jobsService.findActiveJobs();

    for (const job of activeJobs) {
      // nextRunAt이 null인 경우 초기화 (서버 실행 중 생성된 job 처리)
      if (!job.nextRunAt) {
        // 생성일시(createdAt)를 기준으로 계산
        const baseTime = job.createdAt || now;
        const nextRunAt = this.calculateNextRunAt(
          baseTime,
          job.scheduleMinutes,
        );
        await this.jobsService.updateNextRunAt(job.id, nextRunAt);
        this.logger.log(
          `Job ${job.id} (${job.name}) nextRunAt initialized to ${nextRunAt.toISOString()}`,
        );
        continue;
      }

      // 실행 시간이 되었는지 체크 (정확한 시간 비교)
      if (job.nextRunAt.getTime() <= now.getTime()) {
        // 실행 시간이 되었으므로 실행
        const scheduledAt = job.nextRunAt; // 정확한 실행 시간

        // 비동기 실행 (await 하지 않음 - 병렬 처리)
        this.jobExecutorService.executeJob(job, scheduledAt).catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to execute job ${job.id}: ${errorMessage}`);
        });

        // 다음 실행 시간 계산 및 업데이트 (현재 nextRunAt 기준으로 다음 스케줄 계산)
        const nextRunAt = this.calculateNextRunAt(
          job.nextRunAt,
          job.scheduleMinutes,
        );
        await this.jobsService.updateNextRunAt(job.id, nextRunAt);
      }
    }
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
