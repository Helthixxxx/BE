import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../../users/entities/user.entity";

/**
 * 토큰 정보 DTO
 */
export class TokensDto {
  @ApiProperty({
    description: "Access Token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiProperty({
    description: "Refresh Token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  refreshToken: string;
}

/**
 * 사용자 정보 DTO (민감 정보 제외)
 */
export class UserInfoDto {
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
}

/**
 * 인증 응답 DTO (회원가입/로그인)
 */
export class AuthResponseDto {
  @ApiProperty({ type: TokensDto })
  tokens: TokensDto;

  @ApiProperty({ type: UserInfoDto })
  user: UserInfoDto;
}

/**
 * Refresh Token 응답 DTO
 */
export class RefreshResponseDto {
  @ApiProperty({ type: TokensDto })
  tokens: TokensDto;
}
