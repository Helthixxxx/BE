import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { NotificationLog } from "../../notification-logs/entities/notification-log.entity";
import { Device } from "../../devices/entities/device.entity";
import { User } from "../../users/entities/user.entity";

/**
 * NotificationRecipient Entity
 * 각 알림의 수신자별 상세 발송 로그
 * 푸시 알림의 경우 Device별로, 향후 Email/Slack의 경우 User별로 기록
 */
@Entity("notification_recipients")
@Index(["notificationLogId"])
@Index(["deviceId", "sentAt"])
@Index(["userId", "sentAt"])
export class NotificationRecipient {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * NotificationLog ID (FK)
   */
  @Column({ type: "uuid", name: "notification_log_id" })
  notificationLogId: string;

  @ManyToOne(() => NotificationLog, { onDelete: "CASCADE" })
  @JoinColumn({ name: "notification_log_id" })
  notificationLog: NotificationLog;

  /**
   * Device ID (푸시 알림인 경우)
   * nullable: 향후 Email/Slack 등 다른 타입 지원 시
   */
  @Column({ type: "uuid", name: "device_id", nullable: true })
  deviceId: string | null;

  @ManyToOne(() => Device, { onDelete: "SET NULL" })
  @JoinColumn({ name: "device_id" })
  device: Device | null;

  /**
   * User ID (향후 Email/Slack 등에서 사용)
   * nullable: Device 기반 푸시 알림의 경우 Device.userId로 추적 가능
   */
  @Column({ type: "uuid", name: "user_id", nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user: User | null;

  /**
   * 발송 상태
   * pending: 발송 대기 중
   * sent: 발송 성공
   * failed: 발송 실패
   * skipped: 발송 스킵 (쿨다운 등)
   */
  @Column({
    type: "varchar",
    length: 50,
    default: "pending",
  })
  status: string;

  /**
   * 에러 메시지 (실패 시)
   */
  @Column({
    type: "varchar",
    length: 500,
    name: "error_message",
    nullable: true,
  })
  errorMessage: string | null;

  /**
   * 실제 발송 시각
   * status가 'sent'인 경우에만 설정
   */
  @Column({ type: "timestamptz", name: "sent_at", nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
