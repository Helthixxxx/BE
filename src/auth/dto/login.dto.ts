import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, Matches } from "class-validator";

/**
 * 로그인 요청 DTO
 */
export class LoginDto {
  @ApiProperty({
    description: "사용자 식별자 (providerId)",
    example: "user123",
    minLength: 3,
    pattern: "^[a-zA-Z0-9@]{3,}$",
  })
  @IsString()
  @MinLength(3, { message: "providerId는 최소 3자 이상이어야 합니다." })
  @Matches(/^[a-zA-Z0-9@]{3,}$/, {
    message: "providerId는 영문, 숫자, @만 사용 가능합니다.",
  })
  providerId: string;

  @ApiProperty({
    description: "비밀번호",
    example: "password123",
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: "비밀번호는 최소 8자 이상이어야 합니다." })
  password: string;
}
