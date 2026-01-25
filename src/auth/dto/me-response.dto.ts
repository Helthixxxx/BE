import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../../users/entities/user.entity";

/**
 * 내 정보 응답 DTO
 */
export class MeResponseDto {
  @ApiProperty({
    description: "사용자 ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "인증 제공자",
    example: "local",
  })
  provider: string;

  @ApiProperty({
    description: "사용자 식별자",
    example: "user123",
  })
  providerId: string;

  @ApiProperty({
    description: "사용자 역할",
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: "생성일시",
    example: "2026-01-19T11:47:42.123Z",
  })
  createdAt: Date;

  @ApiProperty({
    description: "수정일시",
    example: "2026-01-19T11:47:42.123Z",
  })
  updatedAt: Date;
}
