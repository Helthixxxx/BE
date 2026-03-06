import { ApiProperty } from "@nestjs/swagger";
import { ExecutionErrorCode } from "../../common/types/execution-error-type.enum";

/**
 * Execution 응답 DTO
 */
export class ExecutionResponseDto {
  @ApiProperty({
    description: "Execution ID",
    example: 12345,
  })
  id: number;

  @ApiProperty({
    description: "Job ID (UUID)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  jobId: string;

  @ApiProperty({
    description: "예약 실행 시간",
    example: "2026-01-19T12:00:00.000Z",
  })
  scheduledAt: Date;

  @ApiProperty({
    description: "실제 시작 시간",
    example: "2026-01-19T12:00:00.123Z",
  })
  startedAt: Date;

  @ApiProperty({
    description: "완료 시간",
    example: "2026-01-19T12:00:00.456Z",
    nullable: true,
  })
  finishedAt: Date | null;

  @ApiProperty({
    description: "실행 소요 시간 (밀리초)",
    example: 333,
    nullable: true,
  })
  durationMs: number | null;

  @ApiProperty({
    description: "성능 추이 정보",
    example: {
      previousAvg: 100,
      currentAvg: 500,
      changePercent: 400,
      trend: "degraded",
    },
    nullable: true,
    required: false,
  })
  performanceTrend?: {
    previousAvg: number;
    currentAvg: number;
    changePercent: number;
    trend: "improved" | "stable" | "degraded";
  } | null;

  @ApiProperty({
    description: "성공 여부",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "HTTP 상태 코드",
    example: 200,
    nullable: true,
  })
  httpStatus: number | null;

  @ApiProperty({
    description: "에러 유형",
    enum: ExecutionErrorCode,
    example: ExecutionErrorCode.NONE,
  })
  errorType: ExecutionErrorCode;

  @ApiProperty({
    description: "에러 메시지",
    example: null,
    nullable: true,
  })
  errorMessage: string | null;

  @ApiProperty({
    description: "응답 스니펫",
    example: '{"status":"ok"}',
    nullable: true,
  })
  responseSnippet: string | null;

  @ApiProperty({
    description: "생성 시간",
    example: "2026-01-19T12:00:00.123Z",
  })
  createdAt: Date;
}

/**
 * Execution 목록 응답 DTO (Cursor Pagination)
 */
export class ExecutionListResponseDto {
  @ApiProperty({
    description: "Execution 목록",
    type: [ExecutionResponseDto],
  })
  items: ExecutionResponseDto[];

  @ApiProperty({
    description: "다음 페이지 커서 (base64 인코딩된 JSON 문자열)",
    example: "eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTE5VDEyOjAwOjAwLjAwMFoiLCJpZCI6MTIzNDV9",
    nullable: true,
  })
  nextCursor: string | null;
}
