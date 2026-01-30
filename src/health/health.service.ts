import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { DataSource } from "typeorm";
import { PinoLogger } from "nestjs-pino";
import { JobsService } from "../jobs/jobs.service";
import { ExecutionsService } from "../executions/executions.service";
import { NotificationLogsService } from "../notification-logs/notification-logs.service";
import { NotificationsService } from "../notifications/notifications.service";
import { MetricsService } from "../common/metrics/metrics.service";
import { Health } from "../common/enums/health.enum";
import healthConfig from "../config/health.config";
import { NotificationLog } from "../notification-logs/entities/notification-log.entity";
import { Job } from "../jobs/entities/job.entity";

/**
 * HealthService
 * Health 상태 계산 및 상태 전이 감지
 * Health는 실시간 계산하며 DB에 저장하지 않음
 */
@Injectable()
export class HealthService {
  // 쿨다운 시간 (밀리초)
  private readonly COOLDOWN_FAILED_MS = 30 * 60 * 1000; // 30분
  private readonly COOLDOWN_RECOVERY_MS = 60 * 60 * 1000; // 1시간

  constructor(
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
    private readonly executionsService: ExecutionsService,
    private readonly notificationLogsService: NotificationLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly metricsService: MetricsService,
    private readonly logger: PinoLogger,
    @Inject(healthConfig.KEY)
    private readonly healthConfiguration: ConfigType<typeof healthConfig>,
    private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(HealthService.name);
  }

  /**
   * Job의 Health 상태 계산 (Admin용)
   * 규칙:
   * 1) FAILED: 최근 2회 연속 실패 OR 실행 중단 (nextRunAt이 현재 시간 + gracePeriodMs보다 과거)
   * 2) DEGRADED: 최근 평균이 이전 평균보다 50% 이상 느려짐 OR 최근 평균이 절대 임계값 초과 (성공한 execution만 사용)
   * 3) NORMAL: 그 외 (정상)
   */
  async calculateHealth(jobId: string): Promise<Health> {
    const job = await this.jobsService.findOneInternal(jobId);
    const health = await this.calculateHealthInternal(job);

    // 메트릭 수집: Health 계산 기록
    this.metricsService.recordHealthCalculation(health);

    return health;
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
    const recentExecutions = await this.executionsService.findRecentByJobId(jobId, 10);

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
      (exec) => exec.finishedAt !== null && exec.durationMs !== null && exec.success === true,
    );

    if (successfulExecutions.length >= 10) {
      // 최근 성공한 10개 평균 계산
      const recentAvg =
        successfulExecutions.slice(0, 10).reduce((sum, exec) => sum + (exec.durationMs || 0), 0) /
        10;

      // 절대 임계값 체크: 최근 평균이 임계값을 초과하면 DEGRADED
      if (recentAvg >= this.healthConfiguration.degradedThresholdMs) {
        return Health.DEGRADED;
      }

      // 상대적 성능 저하 체크: 최근 10개 평균 vs 이전 10개 평균 비교
      // 이전 10개 조회 (11~20번째)
      const olderExecutions = await this.executionsService.findRecentByJobId(jobId, 20);
      const olderSuccessful = olderExecutions
        .slice(10, 20)
        .filter(
          (exec) => exec.finishedAt !== null && exec.durationMs !== null && exec.success === true,
        );

      // 이전 성공한 10개가 모두 있으면 비교
      if (olderSuccessful.length >= 10) {
        const olderAvg =
          olderSuccessful.reduce((sum, exec) => sum + (exec.durationMs || 0), 0) / 10;

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
   * Job의 Health를 계산하고 상태 전이 시 알림 발송
   * 스케줄러에서 Execution 완료 후 호출
   * DB Lock을 사용하여 동시성 제어 및 중복 발송 방지
   *
   * 트랜잭션 구조:
   * 1. 트랜잭션 내부: DB Lock, Health 계산, NotificationLog 생성, Job 업데이트
   * 2. 트랜잭션 외부: 외부 API 호출(알림 발송), NotificationLog 상태 업데이트
   */
  async updateHealthAndNotify(jobId: string): Promise<Health> {
    // 트랜잭션 내에서 비관적 잠금 사용 및 DB 작업만 수행
    const { currentHealth, prevHealth, jobName, notificationLogId, shouldNotify, reason } =
      await this.dataSource.transaction(async (manager) => {
        // DB Lock으로 동시성 제어 (트랜잭션 내에서 실행)
        const job = await this.jobsService.findOneWithLock(jobId, manager);

        // Health 계산 (트랜잭션 내부에서 job 객체 직접 사용)
        const currentHealth = await this.calculateHealthInternal(job);
        const prevHealth = job.lastHealth;

        // 상태 전이 감지
        if (prevHealth !== currentHealth) {
          const reason = this.getHealthChangeReason(prevHealth, currentHealth);

          // 알림 발송 조건 확인
          const shouldNotify = this.shouldSendNotification(
            prevHealth,
            currentHealth,
            job.lastNotificationSentAt,
            job.lastNotificationHealth,
          );

          // NotificationLog 먼저 생성 (알림 발송 여부와 무관)
          const notificationLogRepo = manager.getRepository(NotificationLog);
          const notificationLog = notificationLogRepo.create({
            jobId,
            prevHealth,
            nextHealth: currentHealth,
            reason,
            sentAt: new Date(),
            notificationType: shouldNotify ? "push" : undefined,
            status: shouldNotify ? "pending" : "skipped",
          });
          const savedNotificationLog = await notificationLogRepo.save(notificationLog);

          // Job의 lastHealth 업데이트 (트랜잭션 내부에서)
          const jobRepo = manager.getRepository(Job);
          await jobRepo.update(jobId, { lastHealth: currentHealth });

          // 알림 발송이 필요한 경우, Job의 알림 정보도 업데이트
          if (shouldNotify) {
            await jobRepo.update(jobId, {
              lastNotificationSentAt: new Date(),
              lastNotificationHealth: currentHealth,
            });
          }

          return {
            currentHealth,
            prevHealth,
            jobName: job.name,
            notificationLogId: savedNotificationLog.id,
            shouldNotify,
            reason,
          };
        }

        // 상태 전이가 없는 경우
        return {
          currentHealth,
          prevHealth,
          jobName: job.name,
          notificationLogId: null,
          shouldNotify: false,
          reason: null,
        };
      });

    // 트랜잭션 외부에서 외부 API 호출 (알림 발송)
    if (shouldNotify && notificationLogId && reason) {
      try {
        const result = await this.sendNotification(
          notificationLogId,
          jobId,
          jobName,
          prevHealth,
          currentHealth,
          reason,
        );

        // NotificationLog 상태 업데이트 (트랜잭션 외부에서)
        const notificationStatus = result.success ? "sent" : "failed";
        const errorMessage = result.success ? null : "알림 발송 실패";
        await this.notificationLogsService.updateStatus(
          notificationLogId,
          notificationStatus,
          result.recipientCount,
          errorMessage,
        );

        // 알림 메트릭 기록
        this.metricsService.recordNotificationSent("push", notificationStatus);
      } catch (error: unknown) {
        // 알림 발송 중 에러 발생 시 실패로 기록
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await this.notificationLogsService.updateStatus(
          notificationLogId,
          "failed",
          0,
          errorMessage,
        );

        // 알림 실패 메트릭 기록
        this.metricsService.recordNotificationSent("push", "failed");
      }
    } else if (prevHealth !== currentHealth) {
      // 쿨다운으로 인해 스킵
      this.logger.debug(`알림 발송 스킵 (쿨다운): Job ${jobId} (${prevHealth} → ${currentHealth})`);
    }

    // 메트릭 수집: Job Health 상태 업데이트
    this.metricsService.updateJobHealth(jobId, currentHealth);

    return currentHealth;
  }

  /**
   * 알림 발송 여부 결정
   * 정책:
   * 1. NORMAL ↔ FAILED만 알림 발송
   * 2. 쿨다운 체크 (같은 상태로 전이된 경우 일정 시간 내 재발송 방지)
   */
  private shouldSendNotification(
    prevHealth: Health | null,
    nextHealth: Health,
    lastNotificationSentAt: Date | null,
    lastNotificationHealth: Health | null,
  ): boolean {
    // 1. 알림 발송 대상 상태 변화인지 확인
    const isNotificationTarget =
      (prevHealth === Health.NORMAL && nextHealth === Health.FAILED) ||
      (prevHealth === Health.DEGRADED && nextHealth === Health.FAILED) ||
      (prevHealth === Health.FAILED && nextHealth === Health.NORMAL);

    if (!isNotificationTarget) {
      return false;
    }

    // 2. 쿨다운 체크
    if (lastNotificationSentAt && lastNotificationHealth === nextHealth) {
      const now = new Date();
      const timeSinceLastNotification = now.getTime() - lastNotificationSentAt.getTime();

      // FAILED 알림: 30분 쿨다운
      if (nextHealth === Health.FAILED) {
        if (timeSinceLastNotification < this.COOLDOWN_FAILED_MS) {
          return false;
        }
      }

      // NORMAL 복구 알림: 1시간 쿨다운
      if (nextHealth === Health.NORMAL) {
        if (timeSinceLastNotification < this.COOLDOWN_RECOVERY_MS) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 알림 발송
   */
  private async sendNotification(
    notificationLogId: string,
    jobId: string,
    jobName: string,
    prevHealth: Health | null,
    nextHealth: Health,
    reason: string,
  ): Promise<{ success: boolean; recipientCount: number }> {
    try {
      this.logger.info(
        `알림 발송 시작: Job ${jobId} (${jobName}) - ${prevHealth} → ${nextHealth}`,
      );

      const result = await this.notificationsService.sendPushNotification({
        notificationLogId,
        jobId,
        jobName,
        prevHealth: prevHealth || null,
        nextHealth,
        reason,
      });

      if (result.success) {
        this.logger.info(`알림 발송 성공: Job ${jobId} - ${result.recipientCount}명에게 발송`);
      } else {
        this.logger.warn(`알림 발송 실패: Job ${jobId}`);
      }

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`알림 발송 중 에러: Job ${jobId} - ${errorMessage}`);
      // 에러가 발생해도 Health 업데이트는 계속 진행
      return { success: false, recipientCount: 0 };
    }
  }

  /**
   * Health 상태 전이 이유 생성
   */
  private getHealthChangeReason(prevHealth: Health | null, nextHealth: Health): string {
    if (prevHealth === null) {
      return `Initial health status: ${nextHealth}`;
    }

    const reasons: Record<string, string> = {
      [`${prevHealth}_${nextHealth}`]: `${prevHealth} → ${nextHealth}`,
    };

    return (
      reasons[`${prevHealth}_${nextHealth}`] || `Health changed from ${prevHealth} to ${nextHealth}`
    );
  }
}
