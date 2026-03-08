import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

/**
 * ApiLog 엔티티
 * API 요청/응답 로그
 */
@Entity("api_logs")
@Index(["createdAt"])
@Index(["requestId"])
@Index(["createdAt", "method"])
@Index(["createdAt", "statusCode"])
@Index(["createdAt", "userId"])
export class ApiLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 36, name: "request_id" })
  requestId: string;

  @Column({ type: "varchar", length: 10 })
  method: string;

  @Column({ type: "varchar", length: 500 })
  url: string;

  @Column({ type: "jsonb", nullable: true })
  query: Record<string, unknown> | null;

  @Column({ type: "int", name: "status_code" })
  statusCode: number;

  @Column({ type: "int", name: "duration_ms" })
  durationMs: number;

  @Column({ type: "jsonb", nullable: true, name: "request_body" })
  requestBody: unknown;

  @Column({ type: "jsonb", nullable: true, name: "response_body" })
  responseBody: unknown;

  @Column({ type: "uuid", nullable: true, name: "user_id" })
  userId: string | null;

  @Column({ type: "text", nullable: true, name: "error_message" })
  errorMessage: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
