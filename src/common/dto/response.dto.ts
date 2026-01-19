import { ApiProperty } from '@nestjs/swagger';

/**
 * Meta 정보 DTO
 */
export class MetaDto {
  @ApiProperty({
    description: '요청 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  requestId: string;

  @ApiProperty({
    description: '응답 타임스탬프 (ISO 8601)',
    example: '2026-01-19T11:47:42.123Z',
  })
  timestamp: string;
}

/**
 * 에러 응답 DTO
 */
export class ErrorDto {
  @ApiProperty({
    description: '에러 코드',
    example: 'VALIDATION_ERROR',
    enum: [
      'VALIDATION_ERROR',
      'HTTP_ERROR',
      'INTERNAL_ERROR',
      'NOT_FOUND',
      'BAD_REQUEST',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'TOKEN_EXPIRED',
    ],
  })
  code: string;

  @ApiProperty({
    description: '에러 메시지',
    example: 'Invalid request',
  })
  message: string;

  @ApiProperty({
    description: '에러 상세 정보 (선택적)',
    example: {
      name: ['should not be empty'],
      url: ['must be a URL'],
    },
    required: false,
  })
  details?: Record<string, string[]>;
}

/**
 * 성공 응답 Envelope DTO
 */
export class SuccessResponseDto<T> {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ description: '응답 데이터' })
  data: T;
}

/**
 * 실패 응답 Envelope DTO
 */
export class ErrorResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ type: ErrorDto })
  error: ErrorDto;
}
