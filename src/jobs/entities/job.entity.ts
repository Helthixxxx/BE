import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { Health } from "../../common/enums/health.enum";
import { HttpMethod } from "../../common/enums/http-method.enum";
import { Execution } from "../../executions/entities/execution.entity";
import { NotificationLog } from "../../notification-logs/entities/notification-log.entity";

/**
 * Job Entity
 * 감시 대상 정의 (HTTP 호출 스펙 + 실행 주기)
 */
@Entity("jobs")
@Index(["isActive"])
export class Job {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "boolean", name: "is_active", default: true })
  isActive: boolean;

  @Column({ type: "int", name: "schedule_minutes" })
  scheduleMinutes: number;

  @Column({
    type: "enum",
    enum: HttpMethod,
    default: HttpMethod.GET,
  })
  method: HttpMethod;

  @Column({ type: "varchar", length: 2048 })
  url: string;

  @Column({ type: "jsonb", nullable: true })
  headers: Record<string, string> | null;

  @Column({ type: "jsonb", nullable: true })
  body: Record<string, unknown> | null;

  @Column({ type: "timestamptz", name: "next_run_at", nullable: true })
  nextRunAt: Date | null;

  @Column({
    type: "enum",
    enum: Health,
    nullable: true,
    name: "last_health",
  })
  lastHealth: Health | null;

  /**
   * 마지막 알림 발송 시각
   * 쿨다운 정책에 사용 (같은 상태로 전이된 경우 일정 시간 내 재발송 방지)
   */
  @Column({
    type: "timestamptz",
    name: "last_notification_sent_at",
    nullable: true,
  })
  lastNotificationSentAt: Date | null;

  /**
   * 마지막 알림 발송 시 상태
   * 쿨다운 체크 시 같은 상태인지 확인하는 데 사용
   */
  @Column({
    type: "enum",
    enum: Health,
    nullable: true,
    name: "last_notification_health",
  })
  lastNotificationHealth: Health | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(() => Execution, (execution) => execution.job)
  executions: Execution[];

  @OneToMany(() => NotificationLog, (log) => log.job)
  notificationLogs: NotificationLog[];
}
