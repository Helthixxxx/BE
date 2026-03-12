import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class AdminApiErrorsQueryDto {
  @ApiPropertyOptional({
    description: "조회 기간 (시간 단위)",
    example: 24,
    minimum: 1,
    maximum: 168,
    default: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  hours?: number = 24;

  @ApiPropertyOptional({
    description: "반환할 에러 로그 개수",
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
