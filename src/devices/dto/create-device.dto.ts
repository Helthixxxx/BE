import { IsString, IsOptional, IsEnum, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Device 등록 DTO
 * 로그인 전/후 모두 토큰 등록 가능 (인증 선택적)
 */
export class CreateDeviceDto {
  /**
   * Expo Push Token
   * 형식: ExponentPushToken[...]
   */
  @ApiProperty({
    description: "Expo Push Token",
    example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  })
  @IsString()
  @Matches(/^ExponentPushToken\[.+\]$/, {
    message: "유효한 Expo Push Token 형식이 아닙니다.",
  })
  pushToken: string;

  /**
   * 앱에서 생성한 기기 고유 ID (선택적)
   * 로그인 전 토큰과 로그인 후 토큰을 매칭하는 데 사용
   */
  @ApiPropertyOptional({
    description: "앱에서 생성한 기기 고유 ID",
    example: "device-uuid-12345",
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  /**
   * 플랫폼 타입
   * 현재는 'ios'만 지원
   */
  @ApiPropertyOptional({
    description: "플랫폼 타입",
    enum: ["ios", "android"],
    default: "ios",
  })
  @IsOptional()
  @IsEnum(["ios", "android"])
  platform?: string;
}
