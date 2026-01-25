import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationsService } from "./notifications.service";
import { PushNotificationStrategy } from "./strategies/push-notification.strategy";
import { Device } from "../devices/entities/device.entity";
import { NotificationRecipient } from "../notification-recipients/entities/notification-recipient.entity";

/**
 * NotificationsModule
 * 알림 발송 관련 모듈
 */
@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Device, NotificationRecipient])],
  providers: [NotificationsService, PushNotificationStrategy],
  exports: [NotificationsService],
})
export class NotificationsModule {}
