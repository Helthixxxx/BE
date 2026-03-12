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

export class AdminDashboardDefaultsDto {
  @ApiProperty({ example: 24 })
  defaultRangeHours: number;

  @ApiProperty({ example: 60 })
  realtimeRefreshIntervalSeconds: number;

  @ApiProperty({ example: "operations-overview" })
  operatorViewPreset: string;

  @ApiProperty({ example: 60 })
  defaultBucketMinutes: number;
}

export class AdminDbPoolConfigDto {
  @ApiPropertyOptional({ example: 20, nullable: true })
  maxConnections?: number | null;

  @ApiPropertyOptional({ example: 5, nullable: true })
  minConnections?: number | null;

  @ApiPropertyOptional({ example: 10000, nullable: true })
  connectionTimeoutMs?: number | null;

  @ApiPropertyOptional({ example: 30000, nullable: true })
  idleTimeoutMs?: number | null;

  @ApiPropertyOptional({ example: 10000, nullable: true })
  acquireTimeoutMs?: number | null;

  @ApiPropertyOptional({ example: 30000, nullable: true })
  queryTimeoutMs?: number | null;
}

export class AdminRuntimeConfigDto {
  @ApiProperty({ example: "production" })
  environment: string;

  @ApiProperty({ example: 30000 })
  httpTimeoutMs: number;

  @ApiProperty({ example: 5 })
  httpMaxRedirects: number;

  @ApiProperty({ example: 800 })
  healthDegradedThresholdMs: number;

  @ApiProperty({ example: 120000 })
  healthGracePeriodMs: number;

  @ApiProperty({ example: 30 })
  apiLogRetentionDays: number;

  @ApiProperty({ example: 10240 })
  apiLogBodyMaxBytes: number;

  @ApiProperty({
    type: [String],
    example: ["/health", "/api-docs", "/api-docs/*", "/favicon.ico"],
  })
  apiLogExcludedPaths: string[];

  @ApiProperty({ type: AdminDbPoolConfigDto })
  dbPool: AdminDbPoolConfigDto;
}

export class AdminNotificationChannelsDto {
  @ApiProperty({ example: true })
  push: boolean;

  @ApiProperty({ example: false })
  slack: boolean;

  @ApiProperty({ example: false })
  pagerDuty: boolean;

  @ApiProperty({ example: false })
  emailSummary: boolean;

  @ApiProperty({ example: false })
  sms: boolean;
}
