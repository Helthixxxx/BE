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

@Entity("notification_recipients")
@Index(["notificationLogId"])
@Index(["deviceId", "sentAt"])
@Index(["userId", "sentAt"])
export class NotificationRecipient {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** NotificationLog ID (FK) */
  @Column({ type: "uuid", name: "notification_log_id" })
  notificationLogId: string;

  @ManyToOne(() => NotificationLog, { onDelete: "CASCADE" })
  @JoinColumn({ name: "notification_log_id" })
  notificationLog: NotificationLog;

  /** Device ID (푸시 알림인 경우) */
  @Column({ type: "uuid", name: "device_id", nullable: true })
  deviceId: string | null;

  @ManyToOne(() => Device, { onDelete: "SET NULL" })
  @JoinColumn({ name: "device_id" })
  device: Device | null;

  /** User ID (향후 Email/Slack 등에서 사용) */
  @Column({ type: "uuid", name: "user_id", nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user: User | null;

  /** 발송 상태 */
  @Column({
    type: "varchar",
    length: 50,
    default: "pending",
  })
  status: string;

  /** 에러 메시지 (실패 시) */
  @Column({
    type: "varchar",
    length: 500,
    name: "error_message",
    nullable: true,
  })
  errorMessage: string | null;

  /** 실제 발송 시각 */
  @Column({ type: "timestamptz", name: "sent_at", nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
