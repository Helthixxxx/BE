import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JobsService } from '../jobs/jobs.service';
import { ExecutionsService } from '../executions/executions.service';
import { NotificationLogsService } from '../notification-logs/notification-logs.service';
import { Health } from '../common/enums/health.enum';
import healthConfig from '../config/health.config';

/**
 * HealthService
 * Health 상태 계산 및 상태 전이 감지
 * Health는 실시간 계산하며 DB에 저장하지 않음
 */
@Injectable()
export class HealthService {
  constructor(
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
    private readonly executionsService: ExecutionsService,
    private readonly notificationLogsService: NotificationLogsService,
    @Inject(healthConfig.KEY)
    private readonly healthConfiguration: ConfigType<typeof healthConfig>,
  ) {}

  /**
   * Job의 Health 상태 계산 (Admin용)
   * 규칙:
   * 1) FAILED: 최근 2회 연속 실패 OR 실행 중단 (nextRunAt이 현재 시간 + gracePeriodMs보다 과거)
   * 2) DEGRADED: 최근 평균이 이전 평균보다 50% 이상 느려짐 OR 최근 평균이 절대 임계값 초과 (성공한 execution만 사용)
   * 3) NORMAL: 그 외 (정상)
   */
  async calculateHealth(jobId: string): Promise<Health> {
    const job = await this.jobsService.findOne(jobId);
    return this.calculateHealthInternal(job);
  }

  /**
   * 사용자별 Job의 Health 상태 계산 (User용 - 본인 Job만 접근 가능)
   * @param jobId Job ID
   * @param userId 사용자 ID
   */
  async calculateHealthByUserId(
    jobId: string,
    userId: string,
  ): Promise<Health> {
    const job = await this.jobsService.findOneByUserId(jobId, userId);
    return this.calculateHealthInternal(job);
  }

  /**
   * Health 상태 계산 내부 로직
   */
  private async calculateHealthInternal(job: {
    id: string;
    nextRunAt: Date | null;
  }): Promise<Health> {
    const jobId = job.id;
    const now = new Date();

    // 최근 Execution 10개 조회
    const recentExecutions = await this.executionsService.findRecentByJobId(
      jobId,
      10,
    );

    // Execution이 없으면 NORMAL (아직 실행되지 않음)
    if (recentExecutions.length === 0) {
      return Health.NORMAL;
    }

    // 1) FAILED 체크 (최우선)
    // 1-1) 연속 실패 2회: 최근 2개 실행이 모두 실패
    const recentFailedCount = recentExecutions
      .slice(0, 2)
      .filter((exec) => exec.finishedAt !== null && !exec.success).length;
    if (recentFailedCount >= 2) {
      return Health.FAILED;
    }

    // 1-2) 실행 중단: nextRunAt이 있고 현재 시간 + gracePeriodMs보다 과거인 경우
    if (job.nextRunAt) {
      const gracePeriodEnd = new Date(
        job.nextRunAt.getTime() + this.healthConfiguration.gracePeriodMs,
      );
      if (now > gracePeriodEnd) {
        return Health.FAILED;
      }
    }

    // 2) DEGRADED 체크 (응답 지연/성능 저하만)
    // 성공한 execution만 사용하여 평균 계산
    const successfulExecutions = recentExecutions.filter(
      (exec) =>
        exec.finishedAt !== null &&
        exec.durationMs !== null &&
        exec.success === true,
    );

    if (successfulExecutions.length >= 10) {
      // 최근 성공한 10개 평균 계산
      const recentAvg =
        successfulExecutions
          .slice(0, 10)
          .reduce((sum, exec) => sum + (exec.durationMs || 0), 0) / 10;

      // 절대 임계값 체크: 최근 평균이 임계값을 초과하면 DEGRADED
      if (recentAvg >= this.healthConfiguration.degradedThresholdMs) {
        return Health.DEGRADED;
      }

      // 상대적 성능 저하 체크: 최근 10개 평균 vs 이전 10개 평균 비교
      // 이전 10개 조회 (11~20번째)
      const olderExecutions = await this.executionsService.findRecentByJobId(
        jobId,
        20,
      );
      const olderSuccessful = olderExecutions
        .slice(10, 20)
        .filter(
          (exec) =>
            exec.finishedAt !== null &&
            exec.durationMs !== null &&
            exec.success === true,
        );

      // 이전 성공한 10개가 모두 있으면 비교
      if (olderSuccessful.length >= 10) {
        const olderAvg =
          olderSuccessful.reduce(
            (sum, exec) => sum + (exec.durationMs || 0),
            0,
          ) / 10;

        // 최근 평균이 이전 평균보다 50% 이상 느려지면 DEGRADED (성능 저하)
        if (recentAvg >= olderAvg * 1.5) {
          return Health.DEGRADED;
        }
      }
    }

    // 3) NORMAL (정상)
    return Health.NORMAL;
  }

  /**
   * Job의 Health를 계산하고 상태 전이 시 NotificationLog 기록
   * 스케줄러에서 Execution 완료 후 호출
   */
  async updateHealthAndNotify(jobId: string): Promise<Health> {
    const job = await this.jobsService.findOne(jobId);
    const currentHealth = await this.calculateHealth(jobId);
    const prevHealth = job.lastHealth;

    // 상태 전이 감지
    if (prevHealth !== currentHealth) {
      const reason = this.getHealthChangeReason(prevHealth, currentHealth);
      await this.notificationLogsService.create({
        jobId,
        prevHealth,
        nextHealth: currentHealth,
        reason,
        sentAt: new Date(),
      });

      // Job의 lastHealth 업데이트
      await this.jobsService.updateLastHealth(jobId, currentHealth);
    }

    return currentHealth;
  }

  /**
   * Health 상태 전이 이유 생성
   */
  private getHealthChangeReason(
    prevHealth: Health | null,
    nextHealth: Health,
  ): string {
    if (prevHealth === null) {
      return `Initial health status: ${nextHealth}`;
    }

    const reasons: Record<string, string> = {
      [`${prevHealth}_${nextHealth}`]: `${prevHealth} → ${nextHealth}`,
    };

    return (
      reasons[`${prevHealth}_${nextHealth}`] ||
      `Health changed from ${prevHealth} to ${nextHealth}`
    );
  }

  /**
   * Health Summary 조회 (Admin용)
   * 모든 Job의 Health 상태 요약
   * STALLED는 FAILED에 포함됨
   */
  async getHealthSummary(): Promise<{
    total: number;
    normal: number;
    degraded: number;
    failed: number;
  }> {
    const jobs = await this.jobsService.findAll(false);
    const healthCounts = {
      total: jobs.length,
      normal: 0,
      degraded: 0,
      failed: 0,
    };

    for (const job of jobs) {
      const health = await this.calculateHealth(job.id);
      switch (health) {
        case Health.NORMAL:
          healthCounts.normal++;
          break;
        case Health.DEGRADED:
          healthCounts.degraded++;
          break;
        case Health.FAILED:
          healthCounts.failed++;
          break;
      }
    }

    return healthCounts;
  }
}
