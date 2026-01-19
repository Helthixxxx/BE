import { ApiProperty } from '@nestjs/swagger';

/**
 * Health Summary 응답 DTO
 */
export class HealthSummaryResponseDto {
  @ApiProperty({
    description: '전체 Job 수',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'NORMAL 상태 Job 수 (정상)',
    example: 7,
  })
  normal: number;

  @ApiProperty({
    description: 'DEGRADED 상태 Job 수 (응답 지연)',
    example: 2,
  })
  degraded: number;

  @ApiProperty({
    description: 'FAILED 상태 Job 수 (실패, 실행 중단 포함)',
    example: 1,
  })
  failed: number;
}
