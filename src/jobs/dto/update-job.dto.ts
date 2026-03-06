import { PartialType } from "@nestjs/swagger";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateJobDto } from "./create-job.dto";
import { IsBoolean, IsOptional } from "class-validator";

/** Job 수정 DTO */
export class UpdateJobDto extends PartialType(CreateJobDto) {
  @ApiPropertyOptional({
    description: "활성화 여부",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
