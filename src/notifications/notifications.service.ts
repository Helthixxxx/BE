import { Injectable } from "@nestjs/common";
import { NotificationPayload } from "./interfaces/notification-strategy.interface";
import { PushNotificationStrategy } from "./strategies/push-notification.strategy";

/**
 * NotificationsService
 * 알림 발송을 관리하는 Facade 서비스
 * Strategy Pattern을 사용하여 다양한 알림 타입 지원
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly pushNotificationStrategy: PushNotificationStrategy) {}

  /**
   * 푸시 알림 발송
   */
  async sendPushNotification(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; recipientCount: number }> {
    const result = await this.pushNotificationStrategy.send(payload);

    return {
      success: result.success,
      recipientCount: result.recipientCount,
    };
  }
}
