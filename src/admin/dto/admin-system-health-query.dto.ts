import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

/** System Health 조회 쿼리 */
export class AdminSystemHealthQueryDto {
  @ApiPropertyOptional({
    description: "시계열 시간 범위",
    enum: ["1h", "24h", "7d"],
    default: "24h",
  })
  @IsOptional()
  @IsIn(["1h", "24h", "7d"])
  range?: "1h" | "24h" | "7d";
}
