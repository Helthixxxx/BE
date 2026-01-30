import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { NotificationPayload } from "./interfaces/notification-strategy.interface";
import { PushNotificationStrategy } from "./strategies/push-notification.strategy";

/**
 * NotificationsService
 * 알림 발송을 관리하는 Facade 서비스
 * Strategy Pattern을 사용하여 다양한 알림 타입 지원
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly pushNotificationStrategy: PushNotificationStrategy,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(NotificationsService.name);
  }

  /**
   * 푸시 알림 발송
   */
  async sendPushNotification(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; recipientCount: number }> {
    this.logger.info(`푸시 알림 발송 시작: Job ${payload.jobId} (${payload.jobName})`);

    const result = await this.pushNotificationStrategy.send(payload);

    if (result.success) {
      this.logger.info(`푸시 알림 발송 성공: ${result.recipientCount}명에게 발송`);
    } else {
      this.logger.warn(`푸시 알림 발송 실패: ${result.errors.length}건 실패`);
    }

    return {
      success: result.success,
      recipientCount: result.recipientCount,
    };
  }
}
