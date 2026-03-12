import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MetaDto } from "../../common/types/response-docs.types";
import {
  AdminActiveJobHealthSummaryDto,
  AdminApiErrorDetailDto,
  AdminDashboardDefaultsDto,
  AdminDashboardWindowDto,
  AdminMetricSummaryDto,
  AdminNotificationChannelsDto,
  AdminRecentApiErrorDto,
  AdminRuntimeConfigDto,
  AdminServicePlatformInfoDto,
} from "./admin-dashboard-common.dto";

export class AdminDashboardCommonDataDto {
  @ApiProperty({ example: "Helthix" })
  serviceName: string;

  @ApiProperty({ example: "ap-northeast-2" })
  serviceRegion: string;

  @ApiProperty({ example: "production" })
  environment: string;

  @ApiProperty({ type: AdminServicePlatformInfoDto })
  servicePlatformInfo: AdminServicePlatformInfoDto;

  @ApiProperty({ enum: ["ok", "degraded", "failed"], example: "degraded" })
  overallStatus: "ok" | "degraded" | "failed";

  @ApiProperty({ example: "성능 저하 상태의 활성 Job이 1건 있습니다." })
  overallStatusDescription: string;

  @ApiProperty({ example: 3 })
  activeJobs: number;

  @ApiProperty({ type: AdminActiveJobHealthSummaryDto })
  activeJobHealth: AdminActiveJobHealthSummaryDto;

  @ApiProperty({ example: "2026-03-09T07:58:10.000Z" })
  lastUpdatedAt: string;

  @ApiProperty({ example: "2026-03-09T08:00:00.000Z" })
  generatedAt: string;
}

export class AdminDashboardCommonResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ type: AdminDashboardCommonDataDto })
  data: AdminDashboardCommonDataDto;
}

export class AdminOverviewApiRequestPointDto {
  @ApiProperty({ example: "2026-03-09T07:00:00.000Z" })
  timestamp: string;

  @ApiProperty({ example: 28 })
  requestCount: number;
}

export class AdminOverviewTimeSeriesDto {
  @ApiProperty({ type: [AdminOverviewApiRequestPointDto] })
  apiRequests: AdminOverviewApiRequestPointDto[];
}

export class AdminDashboardOverviewDataDto {
  @ApiProperty({ type: AdminDashboardWindowDto })
  window: AdminDashboardWindowDto;

  @ApiProperty({ type: AdminMetricSummaryDto })
  appAvailability: AdminMetricSummaryDto;

  @ApiProperty({ type: AdminMetricSummaryDto })
  apiErrorRate: AdminMetricSummaryDto;

  @ApiProperty({ example: 652 })
  totalRequests: number;

  @ApiProperty({ example: 110 })
  successfulExecutions: number;

  @ApiProperty({ example: 2 })
  failedExecutions: number;

  @ApiProperty({ type: AdminOverviewTimeSeriesDto })
  timeSeries: AdminOverviewTimeSeriesDto;

  @ApiProperty({ type: [AdminRecentApiErrorDto] })
  recentApiErrors: AdminRecentApiErrorDto[];

  @ApiProperty({ type: AdminActiveJobHealthSummaryDto })
  activeJobHealth: AdminActiveJobHealthSummaryDto;
}

export class AdminDashboardOverviewResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ type: AdminDashboardOverviewDataDto })
  data: AdminDashboardOverviewDataDto;
}

export class AdminAppMetricsTimeSeriesPointDto {
  @ApiProperty({ example: "2026-03-09T07:00:00.000Z" })
  timestamp: string;

  @ApiProperty({ example: 28 })
  requestCount: number;

  @ApiPropertyOptional({ example: 318.22, nullable: true })
  avgLatencyMs?: number | null;

  @ApiProperty({ example: 7.14 })
  errorRate: number;

  @ApiProperty({ example: 26 })
  successCount: number;

  @ApiProperty({ example: 1 })
  clientErrorCount: number;

  @ApiProperty({ example: 1 })
  serverErrorCount: number;
}

export class AdminEndpointStatDto {
  @ApiProperty({ example: "/auth/login" })
  endpoint: string;

  @ApiProperty({ example: 124 })
  requestCount: number;

  @ApiProperty({ example: 0.0014 })
  requestsPerSecond: number;

  @ApiPropertyOptional({ example: 412.33, nullable: true })
  p95LatencyMs?: number | null;

  @ApiProperty({ example: 4.03 })
  errorRate: number;
}

export class AdminDashboardAppMetricsDataDto {
  @ApiProperty({ type: AdminDashboardWindowDto })
  window: AdminDashboardWindowDto;

  @ApiProperty({ type: [AdminAppMetricsTimeSeriesPointDto] })
  timeSeries: AdminAppMetricsTimeSeriesPointDto[];

  @ApiProperty({ type: [AdminEndpointStatDto] })
  endpointStats: AdminEndpointStatDto[];

  @ApiProperty({ type: [AdminRecentApiErrorDto] })
  recentApiErrors: AdminRecentApiErrorDto[];
}

export class AdminDashboardAppMetricsResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ type: AdminDashboardAppMetricsDataDto })
  data: AdminDashboardAppMetricsDataDto;
}

export class AdminDashboardApiErrorsDataDto {
  @ApiProperty({ type: AdminDashboardWindowDto })
  window: AdminDashboardWindowDto;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ type: [AdminApiErrorDetailDto] })
  items: AdminApiErrorDetailDto[];
}

export class AdminDashboardApiErrorsResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ type: AdminDashboardApiErrorsDataDto })
  data: AdminDashboardApiErrorsDataDto;
}

export class AdminDashboardSettingsDataDto {
  @ApiProperty({ type: AdminDashboardDefaultsDto })
  dashboardDefaults: AdminDashboardDefaultsDto;

  @ApiProperty({ type: AdminRuntimeConfigDto })
  runtimeConfig: AdminRuntimeConfigDto;

  @ApiProperty({ type: AdminNotificationChannelsDto })
  notificationChannels: AdminNotificationChannelsDto;

  @ApiProperty({
    type: [String],
    example: [
      "infraCpuWarningThreshold",
      "apiErrorRateWarningThreshold",
      "dbConnectionWarningThreshold",
      "replicationLagWarningThreshold",
      "realtimeRefreshEnabled",
      "autoEscalationEnabled",
      "anomalyDetectionEnabled",
      "maintenanceMuteEnabled",
    ],
  })
  unsupportedSettings: string[];
}

export class AdminDashboardSettingsResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ type: AdminDashboardSettingsDataDto })
  data: AdminDashboardSettingsDataDto;
}
