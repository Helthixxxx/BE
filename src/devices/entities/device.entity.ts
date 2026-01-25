import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

/**
 * Device Entity
 * 푸시 알림을 받을 수 있는 기기 정보
 * User와 연결되지만 로그인 전에도 토큰 등록 가능 (userId nullable)
 */
@Entity("devices")
@Index(["userId", "isActive"])
@Index(["pushToken"], { unique: true })
export class Device {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * 사용자 ID (로그인 후 연결)
   * nullable: 로그인 전에도 토큰 등록 가능
   */
  @Column({ type: "uuid", name: "user_id", nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user: User | null;

  /**
   * Expo Push Token
   * 형식: ExponentPushToken[...]
   * UNIQUE 제약으로 중복 토큰 방지
   */
  @Column({ type: "varchar", length: 255, name: "push_token", unique: true })
  pushToken: string;

  /**
   * 앱에서 생성한 기기 고유 ID (선택적)
   * 로그인 전 토큰과 로그인 후 토큰을 매칭하는 데 사용
   */
  @Column({ type: "varchar", length: 255, name: "device_id", nullable: true })
  deviceId: string | null;

  /**
   * 플랫폼 타입
   * 현재는 iOS만 지원하지만 향후 Android 확장 고려
   */
  @Column({
    type: "varchar",
    length: 50,
    default: "ios",
  })
  platform: string;

  /**
   * 알림 수신 활성화 여부
   * false로 설정하면 알림 발송 대상에서 제외
   */
  @Column({ type: "boolean", name: "is_active", default: true })
  isActive: boolean;

  /**
   * 마지막 토큰 사용 시각
   * 토큰 무효화 정책에 사용 (예: 90일 이상 미사용 시 비활성화)
   */
  @Column({ type: "timestamptz", name: "last_used_at", nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
