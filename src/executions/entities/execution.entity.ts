import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { Job } from "../../jobs/entities/job.entity";
import { ExecutionErrorCode } from "../../common/types/execution-error-type.enum";

/** Execution Entity (append-only) */
@Entity("executions")
@Unique(["executionKey"])
@Index(["jobId", "createdAt", "id"])
export class Execution {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "uuid", name: "job_id" })
  jobId: string;

  @ManyToOne(() => Job, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @Column({ type: "timestamptz", name: "scheduled_at" })
  scheduledAt: Date;

  @Column({ type: "timestamptz", name: "started_at" })
  startedAt: Date;

  @Column({ type: "timestamptz", name: "finished_at", nullable: true })
  finishedAt: Date | null;

  @Column({ type: "int", name: "duration_ms", nullable: true })
  durationMs: number | null;

  @Column({ type: "boolean" })
  success: boolean;

  @Column({ type: "int", name: "http_status", nullable: true })
  httpStatus: number | null;

  @Column({
    type: "enum",
    enum: ExecutionErrorCode,
    default: ExecutionErrorCode.NONE,
    name: "error_type",
  })
  errorType: ExecutionErrorCode;

  @Column({ type: "text", name: "error_message", nullable: true })
  errorMessage: string | null;

  @Column({ type: "text", name: "response_snippet", nullable: true })
  responseSnippet: string | null;

  /**
   * executionKey: jobId + scheduledAt 기반으로 생성
   * 형식: `${jobId}:${scheduledAt.toISOString()}`
   */
  @Column({ type: "varchar", length: 255, name: "execution_key" })
  executionKey: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
