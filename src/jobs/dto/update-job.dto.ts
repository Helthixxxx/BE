import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * UpdateJobDto
 * Job 수정 시 사용하는 DTO (모든 필드 optional)
 */
export class UpdateJobDto extends PartialType(CreateJobDto) {
  @ApiPropertyOptional({
    description: '활성화 여부',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
