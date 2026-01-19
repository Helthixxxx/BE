import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { Health } from '../../common/enums/health.enum';

/**
 * NotificationLog Entity
 * Health 상태 전이 시 기록 (푸시 전송은 제외, 로그만 기록)
 */
@Entity('notification_logs')
@Index(['jobId', 'sentAt'])
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'job_id' })
  jobId: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({
    type: 'enum',
    enum: Health,
    nullable: true,
    name: 'prev_health',
  })
  prevHealth: Health | null;

  @Column({
    type: 'enum',
    enum: Health,
    name: 'next_health',
  })
  nextHealth: Health;

  @Column({ type: 'varchar', length: 500 })
  reason: string;

  @Column({ type: 'timestamptz', name: 'sent_at' })
  sentAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
