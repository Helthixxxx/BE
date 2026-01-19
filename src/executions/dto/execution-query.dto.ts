import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ExecutionQueryDto
 * Execution 조회 시 사용하는 쿼리 파라미터
 */
export class ExecutionQueryDto {
  @ApiPropertyOptional({
    description: '페이지 크기 (기본값: 20, 최대: 100)',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '다음 페이지 커서 (base64 인코딩된 JSON 문자열)',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTE5VDEyOjAwOjAwLjAwMFoiLCJpZCI6MTIzNDV9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
