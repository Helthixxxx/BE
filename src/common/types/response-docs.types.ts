import { ApiProperty } from "@nestjs/swagger";
import { ErrorCode } from "./error-code.enum";

/** Swagger 문서용 Meta DTO */
export class MetaDto {
  @ApiProperty({
    description: "요청 ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  requestId: string;

  @ApiProperty({
    description: "응답 타임스탬프 (ISO 8601)",
    example: "2026-01-19T11:47:42.123Z",
  })
  timestamp: string;
}

/** Swagger 문서용 에러 DTO */
export class ErrorDto {
  @ApiProperty({
    description: "에러 코드",
    example: "VALIDATION_ERROR",
    enum: ErrorCode,
  })
  code: ErrorCode;

  @ApiProperty({
    description: "에러 메시지",
    example: "Invalid request",
  })
  message: string;

  @ApiProperty({
    description: "에러 상세 정보 (선택적)",
    example: {
      name: ["should not be empty"],
      url: ["must be a URL"],
    },
    required: false,
  })
  details?: Record<string, string[]>;
}

/** Swagger 문서용 성공 응답 DTO */
export class SuccessResponseDto<T> {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({
    description: "응답 데이터",
    required: false,
  })
  data?: T;
}

/** Swagger 문서용 실패 응답 DTO */
export class ErrorResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ type: ErrorDto })
  error: ErrorDto;
}
