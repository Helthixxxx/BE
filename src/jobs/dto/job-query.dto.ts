import { IsOptional, IsEnum } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Health } from "../../common/types/health.enum";

/**
 * JobQueryDto
 * Job 목록 조회 시 사용하는 쿼리 파라미터 DTO
 */
export class JobQueryDto {
  @ApiPropertyOptional({
    description: "Health 상태 포함 여부",
    example: true,
    default: false,
  })
  @IsOptional()
  includeHealth?: boolean;

  @ApiPropertyOptional({
    description: "Health 상태별 필터링 (includeHealth=true일 때만 유효)",
    enum: Health,
    example: Health.NORMAL,
  })
  @IsOptional()
  @IsEnum(Health)
  health?: Health;
}
