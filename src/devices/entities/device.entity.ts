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

/** Device Entity */
@Entity("devices")
@Index(["userId", "isActive"])
@Index(["pushToken"], { unique: true })
export class Device {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** 사용자 ID */
  @Column({ type: "uuid", name: "user_id", nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user: User | null;

  /** Expo Push Token */
  @Column({ type: "varchar", length: 255, name: "push_token", unique: true })
  pushToken: string;

  /** 앱에서 생성한 기기 고유 ID */
  @Column({ type: "varchar", length: 255, name: "device_id", nullable: true })
  deviceId: string | null;

  /** 플랫폼 타입 */
  @Column({
    type: "varchar",
    length: 50,
    default: "ios",
  })
  platform: string;

  /** 알림 수신 활성화 여부 */
  @Column({ type: "boolean", name: "is_active", default: true })
  isActive: boolean;

  /** 마지막 토큰 사용 시각 */
  @Column({ type: "timestamptz", name: "last_used_at", nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
