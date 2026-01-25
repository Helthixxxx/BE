import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

/**
 * Refresh Token 요청 DTO
 */
export class RefreshDto {
  @ApiProperty({
    description: "Refresh Token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty({ message: "refreshToken은 필수입니다." })
  refreshToken: string;
}
