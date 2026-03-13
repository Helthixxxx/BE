import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AdminServicePlatformInfoDto {
  @ApiProperty({ example: "nestjs" })
  framework: string;

  @ApiProperty({ example: "node v22.14.0" })
  runtime: string;

  @ApiProperty({ example: "typescript" })
  language: string;

  @ApiProperty({ example: "postgresql" })
  database: string;

  @ApiProperty({ example: "docker" })
  deployment: string;

  @ApiProperty({ example: "aws" })
  cloudProvider: string;
}

export class AdminActiveJobHealthSummaryDto {
  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 2 })
  normal: number;

  @ApiProperty({ example: 1 })
  degraded: number;

  @ApiProperty({ example: 0 })
  failed: number;

  @ApiProperty({ example: 0 })
  unknown: number;
}

export class AdminDashboardWindowDto {
  @ApiProperty({ example: 24 })
  hours: number;

  @ApiProperty({ example: 60 })
  bucketMinutes: number;

  @ApiProperty({ example: "2026-03-08T08:00:00.000Z" })
  startAt: string;

  @ApiProperty({ example: "2026-03-09T08:00:00.000Z" })
  endAt: string;

  @ApiProperty({ example: "2026-03-07T08:00:00.000Z" })
  previousStartAt: string;

  @ApiProperty({ example: "2026-03-08T08:00:00.000Z" })
  previousEndAt: string;
}

export class AdminMetricSummaryDto {
  @ApiPropertyOptional({ example: 98.21, nullable: true })
  value?: number | null;

  @ApiPropertyOptional({ example: -0.72, nullable: true })
  changeValue?: number | null;

  @ApiProperty({
    enum: ["healthy", "warning", "critical", "unknown"],
    example: "warning",
  })
  status: "healthy" | "warning" | "critical" | "unknown";

  @ApiProperty({ example: "최근 24시간 동안 완료된 실행 112건 중 110건이 성공했습니다." })
  description: string;
}

export class AdminRecentApiErrorDto {
  @ApiProperty({ example: "POST" })
  method: string;

  @ApiProperty({ example: "/auth/login" })
  endpoint: string;

  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 5 })
  occurrenceCount: number;

  @ApiProperty({ example: "2026-03-09T07:54:10.000Z" })
  lastOccurredAt: string;
}

export class AdminApiErrorDetailDto {
  @ApiProperty({ example: "8c2ef4b1-a2be-4673-a4a0-0d1cab7eb05d" })
  id: string;

  @ApiProperty({ example: "3a554253-2d18-4408-aa88-0f8441b50d22" })
  requestId: string;

  @ApiProperty({ example: "POST" })
  method: string;

  @ApiProperty({ example: "/auth/login" })
  endpoint: string;

  @ApiProperty({ example: { redirect: "/admin" }, nullable: true, required: false })
  query?: Record<string, unknown> | null;

  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 322 })
  durationMs: number;

  @ApiPropertyOptional({
    example: { providerId: "user123", password: "***" },
    nullable: true,
  })
  requestBody?: unknown;

  @ApiPropertyOptional({
    example: {
      meta: {
        requestId: "3a554253-2d18-4408-aa88-0f8441b50d22",
        timestamp: "2026-03-09T07:54:10.000Z",
      },
      error: {
        code: "UNAUTHORIZED",
        message: "아이디 또는 비밀번호가 일치하지 않습니다.",
      },
    },
    nullable: true,
  })
  responseBody?: unknown;

  @ApiPropertyOptional({
    example: "아이디 또는 비밀번호가 일치하지 않습니다.",
    nullable: true,
  })
  errorMessage?: string | null;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440000",
    nullable: true,
  })
  userId?: string | null;

  @ApiProperty({ example: "2026-03-09T07:54:10.000Z" })
  occurredAt: string;
}
