import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { readFileSync } from "fs";
import { join } from "path";
import { DataSource, Repository } from "typeorm";
import { ApiLog } from "../api-logs/entities/api-log.entity";
import { Execution } from "../executions/entities/execution.entity";
import { Job } from "../jobs/entities/job.entity";
import { Health } from "../common/types/health.enum";
import databaseConfig from "../config/database.config";
import healthConfig from "../config/health.config";
import httpConfig from "../config/http.config";
import apiLogConfig from "../config/api-log.config";
import { AdminApiErrorsQueryDto } from "./dto/admin-api-errors-query.dto";
import { AdminDashboardQueryDto } from "./dto/admin-dashboard-query.dto";
import { AdminSystemHealthQueryDto } from "./dto/admin-system-health-query.dto";
import { PrometheusClient } from "./infra/prometheus.client";

type MetricStatus = "healthy" | "warning" | "critical" | "unknown";
type OverallStatus = "ok" | "degraded" | "failed";

type DashboardWindow = {
  hours: number;
  bucketMinutes: number;
  startAt: string;
  endAt: string;
  previousStartAt: string;
  previousEndAt: string;
};

type TimeBucketRow = {
  bucket_start: string;
  request_count: string;
  avg_latency_ms: string | null;
  error_rate: string | null;
  success_count: string;
  client_error_count: string;
  server_error_count: string;
};

type ApiErrorSummaryRow = {
  method: string;
  endpoint: string;
  status_code: number;
  occurrence_count: string;
  last_occurred_at: string;
};

type ApiErrorDetailRow = {
  id: string;
  request_id: string;
  method: string;
  endpoint: string;
  query: Record<string, unknown> | null;
  status_code: number;
  duration_ms: number;
  request_body: unknown;
  response_body: unknown;
  error_message: string | null;
  user_id: string | null;
  occurred_at: string;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Execution)
    private readonly executionRepository: Repository<Execution>,
    @InjectRepository(ApiLog)
    private readonly apiLogRepository: Repository<ApiLog>,
    @Inject(databaseConfig.KEY)
    private readonly databaseConfiguration: ConfigType<typeof databaseConfig>,
    @Inject(healthConfig.KEY)
    private readonly healthConfiguration: ConfigType<typeof healthConfig>,
    @Inject(httpConfig.KEY)
    private readonly httpConfiguration: ConfigType<typeof httpConfig>,
    @Inject(apiLogConfig.KEY)
    private readonly apiLogConfiguration: ConfigType<typeof apiLogConfig>,
    private readonly dataSource: DataSource,
    private readonly prometheusClient: PrometheusClient,
  ) {}

  async getCommon() {
    const [databaseStatus, activeJobSummary, latestDataUpdatedAt] = await Promise.all([
      this.getDatabaseStatus(),
      this.getActiveJobHealthSummary(),
      this.getLatestDataUpdatedAt(),
    ]);

    const generatedAt = new Date().toISOString();

    return {
      serviceName: this.getServiceName(),
      serviceRegion: this.getServiceRegion(),
      environment: process.env.NODE_ENV || "local",
      servicePlatformInfo: this.getServicePlatformInfo(),
      overallStatus: this.getOverallStatus(databaseStatus, activeJobSummary),
      overallStatusDescription: this.getOverallStatusDescription(databaseStatus, activeJobSummary),
      activeJobs: activeJobSummary.total,
      activeJobHealth: activeJobSummary,
      lastUpdatedAt: latestDataUpdatedAt ?? generatedAt,
      generatedAt,
    };
  }

  async getOverview(query: AdminDashboardQueryDto) {
    const window = this.resolveWindow(query);
    const [currentExecutionStats, previousExecutionStats, currentApiLogStats, previousApiLogStats] =
      await Promise.all([
        this.getExecutionStats(window.start, window.end),
        this.getExecutionStats(window.previousStart, window.previousEnd),
        this.getApiLogStats(window.start, window.end),
        this.getApiLogStats(window.previousStart, window.previousEnd),
      ]);

    const [requestSeries, recentApiErrors, activeJobSummary] = await Promise.all([
      this.getApiLogTimeSeries(window.start, window.end, window.bucketMinutes),
      this.getRecentApiErrors(window.start, window.end),
      this.getActiveJobHealthSummary(),
    ]);

    const availabilityValue = this.getPercent(
      currentExecutionStats.successCount,
      currentExecutionStats.totalCount,
    );
    const previousAvailabilityValue = this.getPercent(
      previousExecutionStats.successCount,
      previousExecutionStats.totalCount,
    );
    const apiErrorRateValue = this.getPercent(
      currentApiLogStats.errorCount,
      currentApiLogStats.totalCount,
    );
    const previousApiErrorRateValue = this.getPercent(
      previousApiLogStats.errorCount,
      previousApiLogStats.totalCount,
    );

    return {
      window: this.serializeWindow(window),
      appAvailability: {
        value: availabilityValue,
        changeValue: this.getDelta(availabilityValue, previousAvailabilityValue),
        status: this.getAvailabilityStatus(availabilityValue),
        description: this.getAvailabilityDescription(
          currentExecutionStats.successCount,
          currentExecutionStats.totalCount,
          window.hours,
        ),
      },
      apiErrorRate: {
        value: apiErrorRateValue,
        changeValue: this.getDelta(apiErrorRateValue, previousApiErrorRateValue),
        status: this.getApiErrorRateStatus(apiErrorRateValue),
        description: this.getApiErrorRateDescription(
          currentApiLogStats.errorCount,
          currentApiLogStats.totalCount,
          window.hours,
        ),
      },
      totalRequests: currentApiLogStats.totalCount,
      successfulExecutions: currentExecutionStats.successCount,
      failedExecutions: currentExecutionStats.totalCount - currentExecutionStats.successCount,
      timeSeries: {
        apiRequests: requestSeries.map((item) => ({
          timestamp: item.timestamp,
          requestCount: item.requestCount,
        })),
      },
      recentApiErrors,
      activeJobHealth: activeJobSummary,
    };
  }

  async getAppMetrics(query: AdminDashboardQueryDto) {
    const window = this.resolveWindow(query);
    const [requestSeries, endpointStats, recentApiErrors] = await Promise.all([
      this.getApiLogTimeSeries(window.start, window.end, window.bucketMinutes),
      this.getEndpointStats(window.start, window.end, query.topEndpointsLimit ?? 5),
      this.getRecentApiErrors(window.start, window.end),
    ]);

    return {
      window: this.serializeWindow(window),
      timeSeries: requestSeries,
      endpointStats,
      recentApiErrors,
    };
  }

  async getApiErrors(query: AdminApiErrorsQueryDto) {
    const hours = query.hours ?? 24;
    const limit = query.limit ?? 20;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);

    const items = await this.getApiErrorDetails(start, end, limit);

    return {
      window: {
        hours,
        bucketMinutes: 0,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        previousStartAt: start.toISOString(),
        previousEndAt: end.toISOString(),
      },
      limit,
      items,
    };
  }

  async getSystemHealth(query: AdminSystemHealthQueryDto) {
    const range = query.range ?? "24h";
    const rangeHours = range === "1h" ? 1 : range === "24h" ? 24 : 168;
    const stepMinutes = 5;
    const end = new Date();
    const start = new Date(end.getTime() - rangeHours * 60 * 60 * 1000);
    const now = new Date();

    const [summaryCpu, summaryMem, summaryNet, nodes, pods, cpuSeries, memSeries] =
      await Promise.all([
        this.prometheusClient.getCpuUsagePercent(now),
        this.prometheusClient.getMemoryUsage(now),
        this.prometheusClient.getNetworkMbps(now),
        this.prometheusClient.getNodes(now),
        this.prometheusClient.getPods(now),
        this.prometheusClient.getCpuTimeSeries(start, end, stepMinutes),
        this.prometheusClient.getMemoryTimeSeries(start, end, stepMinutes),
      ]);

    return {
      summary: {
        cpuUsagePercent: summaryCpu,
        memoryUsage: summaryMem,
        network: summaryNet,
      },
      timeSeries: {
        cpu: cpuSeries,
        memory: memSeries,
      },
      nodes,
      pods,
    };
  }

  private resolveWindow(query: AdminDashboardQueryDto) {
    const hours = query.hours ?? 24;
    const bucketMinutes = query.bucketMinutes ?? 60;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    const previousEnd = new Date(start);
    const previousStart = new Date(start.getTime() - hours * 60 * 60 * 1000);

    return {
      hours,
      bucketMinutes,
      start,
      end,
      previousStart,
      previousEnd,
    };
  }

  private serializeWindow(window: {
    hours: number;
    bucketMinutes: number;
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
  }): DashboardWindow {
    return {
      hours: window.hours,
      bucketMinutes: window.bucketMinutes,
      startAt: window.start.toISOString(),
      endAt: window.end.toISOString(),
      previousStartAt: window.previousStart.toISOString(),
      previousEndAt: window.previousEnd.toISOString(),
    };
  }

  private async getDatabaseStatus(): Promise<"connected" | "disconnected"> {
    try {
      await this.dataSource.query("SELECT 1");
      return "connected";
    } catch {
      return "disconnected";
    }
  }

  private async getActiveJobHealthSummary() {
    const [total, normal, degraded, failed] = await Promise.all([
      this.jobRepository.count({ where: { isActive: true } }),
      this.jobRepository.count({ where: { isActive: true, lastHealth: Health.NORMAL } }),
      this.jobRepository.count({ where: { isActive: true, lastHealth: Health.DEGRADED } }),
      this.jobRepository.count({ where: { isActive: true, lastHealth: Health.FAILED } }),
    ]);

    return {
      total,
      normal,
      degraded,
      failed,
      unknown: Math.max(total - normal - degraded - failed, 0),
    };
  }

  private getOverallStatus(
    databaseStatus: "connected" | "disconnected",
    activeJobSummary: {
      total: number;
      degraded: number;
      failed: number;
    },
  ): OverallStatus {
    if (databaseStatus === "disconnected" || activeJobSummary.failed > 0) {
      return "failed";
    }

    if (activeJobSummary.degraded > 0) {
      return "degraded";
    }

    return "ok";
  }

  private getOverallStatusDescription(
    databaseStatus: "connected" | "disconnected",
    activeJobSummary: {
      total: number;
      degraded: number;
      failed: number;
    },
  ): string {
    if (databaseStatus === "disconnected") {
      return "DB 연결이 끊어진 상태입니다.";
    }

    if (activeJobSummary.failed > 0) {
      return `실패 상태의 활성 Job이 ${activeJobSummary.failed}건 있습니다.`;
    }

    if (activeJobSummary.degraded > 0) {
      return `성능 저하 상태의 활성 Job이 ${activeJobSummary.degraded}건 있습니다.`;
    }

    return "DB 연결과 활성 Job 상태가 모두 정상입니다.";
  }

  private async getLatestDataUpdatedAt(): Promise<string | null> {
    const [jobRow, executionRow, apiLogRow] = await Promise.all([
      this.jobRepository
        .createQueryBuilder("job")
        .select("MAX(job.updatedAt)", "latest")
        .getRawOne<{ latest: Date | string | null }>(),
      this.executionRepository
        .createQueryBuilder("execution")
        .select("MAX(execution.createdAt)", "latest")
        .getRawOne<{ latest: Date | string | null }>(),
      this.apiLogRepository
        .createQueryBuilder("apiLog")
        .select("MAX(apiLog.createdAt)", "latest")
        .getRawOne<{ latest: Date | string | null }>(),
    ]);

    const latestCandidates = [jobRow?.latest, executionRow?.latest, apiLogRow?.latest]
      .filter((value): value is Date | string => value !== null && value !== undefined)
      .map((value) => new Date(value).getTime())
      .filter((value) => !Number.isNaN(value));

    if (latestCandidates.length === 0) {
      return null;
    }

    return new Date(Math.max(...latestCandidates)).toISOString();
  }

  private async getExecutionStats(start: Date, end: Date) {
    const raw = await this.executionRepository
      .createQueryBuilder("execution")
      .select("COUNT(*)", "total")
      .addSelect(
        "COALESCE(SUM(CASE WHEN execution.success = true THEN 1 ELSE 0 END), 0)",
        "successCount",
      )
      .where("execution.finishedAt IS NOT NULL")
      .andWhere("execution.createdAt >= :start", { start })
      .andWhere("execution.createdAt < :end", { end })
      .getRawOne<{ total: string; successCount: string }>();

    return {
      totalCount: Number(raw?.total ?? 0),
      successCount: Number(raw?.successCount ?? 0),
    };
  }

  private async getApiLogStats(start: Date, end: Date) {
    const raw = await this.apiLogRepository
      .createQueryBuilder("apiLog")
      .select("COUNT(*)", "total")
      .addSelect(
        "COALESCE(SUM(CASE WHEN apiLog.statusCode >= 400 THEN 1 ELSE 0 END), 0)",
        "errorCount",
      )
      .where("apiLog.createdAt >= :start", { start })
      .andWhere("apiLog.createdAt < :end", { end })
      .getRawOne<{ total: string; errorCount: string }>();

    return {
      totalCount: Number(raw?.total ?? 0),
      errorCount: Number(raw?.errorCount ?? 0),
    };
  }

  private async getApiLogTimeSeries(start: Date, end: Date, bucketMinutes: number) {
    const bucketSeconds = bucketMinutes * 60;
    const rows = await this.dataSource.query<TimeBucketRow[]>(
      `
        SELECT
          to_timestamp(floor(extract(epoch from created_at) / $3) * $3) AS bucket_start,
          COUNT(*)::int AS request_count,
          ROUND(AVG(duration_ms)::numeric, 2) AS avg_latency_ms,
          ROUND(AVG(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::numeric * 100, 2) AS error_rate,
          SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END)::int AS success_count,
          SUM(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 ELSE 0 END)::int AS client_error_count,
          SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END)::int AS server_error_count
        FROM api_logs
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      [start.toISOString(), end.toISOString(), bucketSeconds],
    );

    const rowMap = new Map(
      rows.map((row) => {
        const timestamp = new Date(row.bucket_start).toISOString();
        return [timestamp, row];
      }),
    );

    const items: Array<{
      timestamp: string;
      requestCount: number;
      avgLatencyMs: number | null;
      errorRate: number;
      successCount: number;
      clientErrorCount: number;
      serverErrorCount: number;
    }> = [];

    for (
      let cursor = start.getTime();
      cursor <= end.getTime();
      cursor += bucketMinutes * 60 * 1000
    ) {
      const bucketTimestamp = this.alignTimestamp(cursor, bucketMinutes);
      const row = rowMap.get(bucketTimestamp);

      items.push({
        timestamp: bucketTimestamp,
        requestCount: Number(row?.request_count ?? 0),
        avgLatencyMs: row?.avg_latency_ms ? Number(row.avg_latency_ms) : null,
        errorRate: Number(row?.error_rate ?? 0),
        successCount: Number(row?.success_count ?? 0),
        clientErrorCount: Number(row?.client_error_count ?? 0),
        serverErrorCount: Number(row?.server_error_count ?? 0),
      });
    }

    return items;
  }

  private async getEndpointStats(start: Date, end: Date, limit: number) {
    const windowSeconds = Math.max((end.getTime() - start.getTime()) / 1000, 1);
    const rows = await this.dataSource.query<
      Array<{
        endpoint: string;
        request_count: string;
        requests_per_second: string;
        p95_latency_ms: string | null;
        error_rate: string | null;
      }>
    >(
      `
        SELECT
          url AS endpoint,
          COUNT(*)::int AS request_count,
          ROUND((COUNT(*)::numeric / $3), 4) AS requests_per_second,
          ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2) AS p95_latency_ms,
          ROUND(AVG(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::numeric * 100, 2) AS error_rate
        FROM api_logs
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY url
        ORDER BY COUNT(*) DESC, url ASC
        LIMIT $4
      `,
      [start.toISOString(), end.toISOString(), windowSeconds, limit],
    );

    return rows.map((row) => ({
      endpoint: row.endpoint,
      requestCount: Number(row.request_count),
      requestsPerSecond: Number(row.requests_per_second),
      p95LatencyMs: row.p95_latency_ms ? Number(row.p95_latency_ms) : null,
      errorRate: Number(row.error_rate ?? 0),
    }));
  }

  private async getRecentApiErrors(start: Date, end: Date) {
    const rows = await this.dataSource.query<ApiErrorSummaryRow[]>(
      `
        SELECT
          method,
          url AS endpoint,
          status_code,
          COUNT(*)::int AS occurrence_count,
          MAX(created_at) AS last_occurred_at
        FROM api_logs
        WHERE created_at >= $1
          AND created_at < $2
          AND status_code >= 400
        GROUP BY method, url, status_code
        ORDER BY MAX(created_at) DESC, COUNT(*) DESC
        LIMIT 10
      `,
      [start.toISOString(), end.toISOString()],
    );

    return rows.map((row) => ({
      method: row.method,
      endpoint: row.endpoint,
      statusCode: Number(row.status_code),
      occurrenceCount: Number(row.occurrence_count),
      lastOccurredAt: new Date(row.last_occurred_at).toISOString(),
    }));
  }

  private async getApiErrorDetails(start: Date, end: Date, limit: number) {
    const rows = await this.dataSource.query<ApiErrorDetailRow[]>(
      `
        SELECT
          id,
          request_id,
          method,
          url AS endpoint,
          query,
          status_code,
          duration_ms,
          request_body,
          response_body,
          error_message,
          user_id,
          created_at AS occurred_at
        FROM api_logs
        WHERE created_at >= $1
          AND created_at < $2
          AND status_code >= 400
        ORDER BY created_at DESC, id DESC
        LIMIT $3
      `,
      [start.toISOString(), end.toISOString(), limit],
    );

    return rows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      method: row.method,
      endpoint: row.endpoint,
      query: row.query,
      statusCode: Number(row.status_code),
      durationMs: Number(row.duration_ms),
      requestBody: row.request_body,
      responseBody: row.response_body,
      errorMessage: row.error_message,
      userId: row.user_id,
      occurredAt: new Date(row.occurred_at).toISOString(),
    }));
  }

  private getPercent(count: number, total: number): number | null {
    if (total <= 0) {
      return null;
    }

    return this.roundNumber((count / total) * 100);
  }

  private getDelta(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null) {
      return null;
    }

    return this.roundNumber(current - previous);
  }

  private getAvailabilityStatus(value: number | null): MetricStatus {
    if (value === null) {
      return "unknown";
    }

    if (value >= 99) {
      return "healthy";
    }

    if (value >= 95) {
      return "warning";
    }

    return "critical";
  }

  private getApiErrorRateStatus(value: number | null): MetricStatus {
    if (value === null) {
      return "unknown";
    }

    if (value <= 1) {
      return "healthy";
    }

    if (value <= 5) {
      return "warning";
    }

    return "critical";
  }

  private getAvailabilityDescription(
    successCount: number,
    totalCount: number,
    hours: number,
  ): string {
    if (totalCount === 0) {
      return `최근 ${hours}시간 동안 완료된 실행 데이터가 없습니다.`;
    }

    return `최근 ${hours}시간 동안 완료된 실행 ${totalCount}건 중 ${successCount}건이 성공했습니다.`;
  }

  private getApiErrorRateDescription(
    errorCount: number,
    totalCount: number,
    hours: number,
  ): string {
    if (totalCount === 0) {
      return `최근 ${hours}시간 동안 수집된 API 요청 로그가 없습니다.`;
    }

    return `최근 ${hours}시간 동안 수집된 API 요청 ${totalCount}건 중 오류 응답은 ${errorCount}건입니다.`;
  }

  private getServiceName(): string {
    try {
      const packageJson = JSON.parse(
        readFileSync(join(process.cwd(), "package.json"), "utf-8"),
      ) as { name?: string };
      return packageJson.name || "Helthix";
    } catch {
      return "Helthix";
    }
  }

  private getServiceRegion(): string {
    return process.env.APP_REGION || process.env.AWS_REGION || "ap-northeast-2";
  }

  private getServicePlatformInfo() {
    return {
      framework: "nestjs",
      runtime: `node ${process.version}`,
      language: "typescript",
      database: "postgresql",
      deployment: "docker",
      cloudProvider: process.env.CLOUD_PROVIDER || "aws",
    };
  }

  private alignTimestamp(timestampMs: number, bucketMinutes: number): string {
    const bucketMs = bucketMinutes * 60 * 1000;
    const aligned = Math.floor(timestampMs / bucketMs) * bucketMs;
    return new Date(aligned).toISOString();
  }

  private roundNumber(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
