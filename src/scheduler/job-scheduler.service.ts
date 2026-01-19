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
        // nextRunAt이 없으면 현재 시간 기준으로 다음 실행 시간 설정
        const now = new Date();
        const nextRunAt = this.calculateNextRunAt(now, job.scheduleMinutes);
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
        const nextRunAt = this.calculateNextRunAt(now, job.scheduleMinutes);
        await this.jobsService.updateNextRunAt(job.id, nextRunAt);
        this.logger.log(
          `Job ${job.id} (${job.name}) nextRunAt initialized to ${nextRunAt.toISOString()}`,
        );
        continue;
      }

      // 실행 시간이 되었는지 체크 (분 단위 정렬)
      const scheduledMinute = new Date(job.nextRunAt);
      scheduledMinute.setSeconds(0, 0); // 초와 밀리초 제거

      const currentMinute = new Date(now);
      currentMinute.setSeconds(0, 0);

      if (scheduledMinute.getTime() <= currentMinute.getTime()) {
        // 실행 시간이 되었으므로 실행
        const scheduledAt = scheduledMinute; // 정확한 실행 시간

        // 비동기 실행 (await 하지 않음 - 병렬 처리)
        this.jobExecutorService.executeJob(job, scheduledAt).catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to execute job ${job.id}: ${errorMessage}`);
        });

        // 다음 실행 시간 계산 및 업데이트
        const nextRunAt = this.calculateNextRunAt(
          scheduledMinute,
          job.scheduleMinutes,
        );
        await this.jobsService.updateNextRunAt(job.id, nextRunAt);
      }
    }
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
