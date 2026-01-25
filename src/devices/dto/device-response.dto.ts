import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Device 응답 DTO
 */
export class DeviceResponseDto {
  @ApiProperty({ description: "Device ID" })
  id: string;

  @ApiPropertyOptional({ description: "사용자 ID (로그인 후 연결)" })
  userId: string | null;

  @ApiProperty({ description: "Expo Push Token" })
  pushToken: string;

  @ApiPropertyOptional({ description: "앱에서 생성한 기기 고유 ID" })
  deviceId: string | null;

  @ApiProperty({ description: "플랫폼 타입" })
  platform: string;

  @ApiProperty({ description: "알림 수신 활성화 여부" })
  isActive: boolean;

  @ApiPropertyOptional({ description: "마지막 토큰 사용 시각" })
  lastUsedAt: Date | null;

  @ApiProperty({ description: "생성 시각" })
  createdAt: Date;

  @ApiProperty({ description: "수정 시각" })
  updatedAt: Date;
}
