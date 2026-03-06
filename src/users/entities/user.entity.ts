import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * User Role Enum
 * USER: 일반 사용자 (기본 가입자)
 * ADMIN: 관리자 (시드/DB 수동 작업으로만 승격 가능)
 */
export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

@Entity("users")
@Index(["provider", "providerId"], { unique: true })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** 인증 제공자 */
  @Column({ type: "varchar", length: 50, default: "local" })
  provider: string;

  /** 제공자별 사용자 식별자 */
  @Column({ type: "varchar", length: 255, name: "provider_id" })
  providerId: string;

  /** 비밀번호 해시 (bcrypt) */
  @Column({ type: "varchar", length: 255, name: "password_hash" })
  passwordHash: string;

  /** 사용자 역할 */
  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  /** Refresh Token 해시 (bcrypt) */
  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "refresh_token_hash",
  })
  refreshTokenHash: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
