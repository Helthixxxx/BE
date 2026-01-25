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

/**
 * User Entity
 * 로컬 회원가입/로그인을 위한 사용자 엔티티
 * 추후 소셜 로그인 확장을 고려하여 provider/providerId 구조로 설계
 */
@Entity("users")
@Index(["provider", "providerId"], { unique: true })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * 인증 제공자
   * 현재 구현은 'local'만 허용
   * 추후 'google', 'kakao', 'naver' 등 확장 가능
   */
  @Column({ type: "varchar", length: 50, default: "local" })
  provider: string;

  /**
   * 제공자별 사용자 식별자
   * 이메일 형식 강제 금지, 단순 문자열 허용
   * 규칙: 영문(a-zA-Z) + 숫자(0-9) + @, 최소 3자
   * 유니크 조건: (provider, providerId) 복합 unique
   */
  @Column({ type: "varchar", length: 255, name: "provider_id" })
  providerId: string;

  /**
   * 비밀번호 해시 (bcrypt)
   * 원문 저장 금지
   */
  @Column({ type: "varchar", length: 255, name: "password_hash" })
  passwordHash: string;

  /**
   * 사용자 역할
   * 기본값: USER
   * ADMIN 승격은 시드/DB 수동 작업으로만 가능
   */
  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  /**
   * Refresh Token 해시 (bcrypt)
   * 원문 저장 금지, 유저당 1개만 유지
   * 로그인/refresh 시 회전(갱신)
   */
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
