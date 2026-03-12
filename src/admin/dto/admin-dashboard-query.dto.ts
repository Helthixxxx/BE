import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class AdminDashboardQueryDto {
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
    description: "시계열 버킷 크기 (분 단위)",
    example: 60,
    minimum: 5,
    maximum: 1440,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  bucketMinutes?: number = 60;

  @ApiPropertyOptional({
    description: "상위 엔드포인트 개수",
    example: 5,
    minimum: 1,
    maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topEndpointsLimit?: number = 5;
}
