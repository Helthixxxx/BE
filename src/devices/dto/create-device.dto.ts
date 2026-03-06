import { IsString, IsOptional, IsEnum, Matches, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** Device 등록 DTO */
export class CreateDeviceDto {
  /** Expo Push Token */
  @ApiProperty({
    description: "Expo Push Token",
    example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  })
  @IsString()
  @Matches(/^ExponentPushToken\[.+\]$/, {
    message: "유효한 Expo Push Token 형식이 아닙니다.",
  })
  pushToken: string;

  /** 사용자 ID */
  @ApiPropertyOptional({
    description: "사용자 ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  /** 앱에서 생성한 기기 고유 ID */
  @ApiPropertyOptional({
    description: "앱에서 생성한 기기 고유 ID",
    example: "device-uuid-12345",
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  /** 플랫폼 타입 */
  @ApiPropertyOptional({
    description: "플랫폼 타입",
    enum: ["ios", "android"],
    default: "ios",
  })
  @IsOptional()
  @IsEnum(["ios", "android"])
  platform?: string;
}
