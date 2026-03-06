import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { Job } from "../../jobs/entities/job.entity";
import { Health } from "../../common/types/health.enum";

import { NotificationRecipient } from "../../notification-recipients/entities/notification-recipient.entity";

@Entity("notification_logs")
@Index(["jobId", "sentAt"])
export class NotificationLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", name: "job_id" })
  jobId: string;

  @ManyToOne(() => Job, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @Column({
    type: "enum",
    enum: Health,
    nullable: true,
    name: "prev_health",
  })
  prevHealth: Health | null;

  @Column({
    type: "enum",
    enum: Health,
    name: "next_health",
  })
  nextHealth: Health;

  @Column({ type: "varchar", length: 500 })
  reason: string;

  /**
   * 알림 타입
   * push: 푸시 알림
   * email: 이메일 알림 (향후)
   * slack: Slack 알림 (향후)
   * webhook: Webhook 알림 (향후)
   */
  @Column({
    type: "varchar",
    length: 50,
    name: "notification_type",
    default: "push",
    enum: ["push", "email", "slack", "webhook"],
  })
  notificationType: string;

  /**
   * 알림 발송 상태
   * pending: 발송 대기 중
   * sent: 발송 완료
   * failed: 발송 실패
   * skipped: 발송 스킵 (쿨다운 등)
   */
  @Column({
    type: "varchar",
    length: 50,
    default: "pending",
    enum: ["pending", "sent", "failed", "skipped"],
  })
  status: string;

  /** 에러 메시지 */
  @Column({
    type: "varchar",
    length: 500,
    name: "error_message",
    nullable: true,
  })
  errorMessage: string | null;

  /** 수신자 수 */
  @Column({
    type: "int",
    name: "recipient_count",
    default: 0,
  })
  recipientCount: number;

  @Column({ type: "timestamptz", name: "sent_at" })
  sentAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @OneToMany(() => NotificationRecipient, (recipient) => recipient.notificationLog)
  recipients: NotificationRecipient[];
}
