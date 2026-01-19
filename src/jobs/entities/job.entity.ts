import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Health } from '../../common/enums/health.enum';
import { HttpMethod } from '../../common/enums/http-method.enum';
import { Execution } from '../../executions/entities/execution.entity';
import { NotificationLog } from '../../notification-logs/entities/notification-log.entity';

/**
 * Job Entity
 * 감시 대상 정의 (HTTP 호출 스펙 + 실행 주기)
 */
@Entity('jobs')
@Index(['isActive'])
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', name: 'schedule_minutes' })
  scheduleMinutes: number;

  @Column({
    type: 'enum',
    enum: HttpMethod,
    default: HttpMethod.GET,
  })
  method: HttpMethod;

  @Column({ type: 'varchar', length: 2048 })
  url: string;

  @Column({ type: 'jsonb', nullable: true })
  headers: Record<string, string> | null;

  @Column({ type: 'jsonb', nullable: true })
  body: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', name: 'next_run_at', nullable: true })
  nextRunAt: Date | null;

  @Column({
    type: 'enum',
    enum: Health,
    nullable: true,
    name: 'last_health',
  })
  lastHealth: Health | null;

  /**
   * Job 소유자 ID (nullable)
   * Job 생성 시 현재 사용자 ID 저장
   * User는 본인이 생성한 Job만 접근 가능
   * Admin은 모든 Job에 접근 가능
   */
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  @Index(['userId'])
  userId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Execution, (execution) => execution.job)
  executions: Execution[];

  @OneToMany(() => NotificationLog, (log) => log.job)
  notificationLogs: NotificationLog[];
}
