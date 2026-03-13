import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ApiLog } from "../api-logs/entities/api-log.entity";
import { Execution } from "../executions/entities/execution.entity";
import { Job } from "../jobs/entities/job.entity";
import apiLogConfig from "../config/api-log.config";
import databaseConfig from "../config/database.config";
import healthConfig from "../config/health.config";
import httpConfig from "../config/http.config";
import { AdminService } from "./admin.service";
import { AdminApiErrorsQueryDto } from "./dto/admin-api-errors-query.dto";
import { AdminDashboardQueryDto } from "./dto/admin-dashboard-query.dto";
import { PrometheusClient } from "./infra/prometheus.client";

type AdminServiceInternals = {
  getDatabaseStatus: () => Promise<"connected" | "disconnected">;
  getActiveJobHealthSummary: () => Promise<{
    total: number;
    normal: number;
    degraded: number;
    failed: number;
    unknown: number;
  }>;
  getLatestDataUpdatedAt: () => Promise<string | null>;
  getExecutionStats: (
    start: Date,
    end: Date,
  ) => Promise<{ totalCount: number; successCount: number }>;
  getApiLogStats: (start: Date, end: Date) => Promise<{ totalCount: number; errorCount: number }>;
  getApiLogTimeSeries: (
    start: Date,
    end: Date,
    bucketMinutes: number,
  ) => Promise<
    Array<{
      timestamp: string;
      requestCount: number;
      avgLatencyMs: number | null;
      errorRate: number;
      successCount: number;
      clientErrorCount: number;
      serverErrorCount: number;
    }>
  >;
  getRecentApiErrors: (
    start: Date,
    end: Date,
  ) => Promise<
    Array<{
      method: string;
      endpoint: string;
      statusCode: number;
      occurrenceCount: number;
      lastOccurredAt: string;
    }>
  >;
  getEndpointStats: (
    start: Date,
    end: Date,
    limit: number,
  ) => Promise<
    Array<{
      endpoint: string;
      requestCount: number;
      requestsPerSecond: number;
      p95LatencyMs: number | null;
      errorRate: number;
    }>
  >;
  getApiErrorDetails: (
    start: Date,
    end: Date,
    limit: number,
  ) => Promise<
    Array<{
      id: string;
      requestId: string;
      method: string;
      endpoint: string;
      query: Record<string, unknown> | null;
      statusCode: number;
      durationMs: number;
      requestBody: unknown;
      responseBody: unknown;
      errorMessage: string | null;
      userId: string | null;
      occurredAt: string;
    }>
  >;
};

describe("AdminService", () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Job), useValue: {} as Partial<Repository<Job>> },
        { provide: getRepositoryToken(Execution), useValue: {} as Partial<Repository<Execution>> },
        { provide: getRepositoryToken(ApiLog), useValue: {} as Partial<Repository<ApiLog>> },
        {
          provide: databaseConfig.KEY,
          useValue: {
            extra: {
              max: 20,
              min: 5,
              connectionTimeoutMillis: 10000,
              idleTimeoutMillis: 30000,
              acquireTimeoutMillis: 10000,
            },
            connectTimeoutMS: 30000,
          },
        },
        {
          provide: healthConfig.KEY,
          useValue: {
            degradedThresholdMs: 800,
            gracePeriodMs: 120000,
          },
        },
        {
          provide: httpConfig.KEY,
          useValue: {
            timeout: 30000,
            maxRedirects: 5,
          },
        },
        {
          provide: apiLogConfig.KEY,
          useValue: {
            retentionDays: 30,
            bodyMaxBytes: 10240,
            excludedPaths: ["/health", "/api-docs"],
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
          },
        },
        {
          provide: PrometheusClient,
          useValue: {
            getCpuUsagePercent: jest.fn(),
            getMemoryUsage: jest.fn(),
            getNetworkMbps: jest.fn(),
            getNodes: jest.fn(),
            getPods: jest.fn(),
            getCpuTimeSeries: jest.fn(),
            getMemoryTimeSeries: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it("getCommon은 공통 메타를 조합해 반환", async () => {
    const internals = service as unknown as AdminServiceInternals;
    jest.spyOn(internals, "getDatabaseStatus").mockResolvedValue("connected");
    jest.spyOn(internals, "getActiveJobHealthSummary").mockResolvedValue({
      total: 3,
      normal: 2,
      degraded: 1,
      failed: 0,
      unknown: 0,
    });
    jest.spyOn(internals, "getLatestDataUpdatedAt").mockResolvedValue("2026-03-09T08:00:00.000Z");

    const result = await service.getCommon();

    expect(result.serviceName).toBeDefined();
    expect(result.serviceRegion).toBe("ap-northeast-2");
    expect(result.overallStatus).toBe("degraded");
    expect(result.activeJobHealth.degraded).toBe(1);
    expect(result.lastUpdatedAt).toBe("2026-03-09T08:00:00.000Z");
  });

  it("getOverview는 recentApiErrors에 method를 포함해 반환", async () => {
    const internals = service as unknown as AdminServiceInternals;
    jest
      .spyOn(internals, "getExecutionStats")
      .mockResolvedValueOnce({ totalCount: 100, successCount: 99 })
      .mockResolvedValueOnce({ totalCount: 100, successCount: 98 });
    jest
      .spyOn(internals, "getApiLogStats")
      .mockResolvedValueOnce({ totalCount: 200, errorCount: 4 })
      .mockResolvedValueOnce({ totalCount: 200, errorCount: 2 });
    jest.spyOn(internals, "getApiLogTimeSeries").mockResolvedValue([
      {
        timestamp: "2026-03-09T07:00:00.000Z",
        requestCount: 10,
        avgLatencyMs: 100,
        errorRate: 10,
        successCount: 9,
        clientErrorCount: 1,
        serverErrorCount: 0,
      },
    ]);
    jest.spyOn(internals, "getRecentApiErrors").mockResolvedValue([
      {
        method: "POST",
        endpoint: "/auth/login",
        statusCode: 401,
        occurrenceCount: 5,
        lastOccurredAt: "2026-03-09T07:54:10.000Z",
      },
    ]);
    jest.spyOn(internals, "getActiveJobHealthSummary").mockResolvedValue({
      total: 3,
      normal: 2,
      degraded: 1,
      failed: 0,
      unknown: 0,
    });

    const query: AdminDashboardQueryDto = { hours: 24, bucketMinutes: 60, topEndpointsLimit: 5 };
    const result = await service.getOverview(query);

    expect(result.appAvailability.value).toBe(99);
    expect(result.apiErrorRate.value).toBe(2);
    expect(result.recentApiErrors[0]?.method).toBe("POST");
    expect(result.timeSeries.apiRequests[0]?.requestCount).toBe(10);
  });

  it("getAppMetrics는 endpointStats와 recentApiErrors를 반환", async () => {
    const internals = service as unknown as AdminServiceInternals;
    jest.spyOn(internals, "getApiLogTimeSeries").mockResolvedValue([
      {
        timestamp: "2026-03-09T07:00:00.000Z",
        requestCount: 10,
        avgLatencyMs: 120,
        errorRate: 0,
        successCount: 10,
        clientErrorCount: 0,
        serverErrorCount: 0,
      },
    ]);
    jest.spyOn(internals, "getEndpointStats").mockResolvedValue([
      {
        endpoint: "/auth/login",
        requestCount: 30,
        requestsPerSecond: 0.01,
        p95LatencyMs: 320,
        errorRate: 3.5,
      },
    ]);
    jest.spyOn(internals, "getRecentApiErrors").mockResolvedValue([
      {
        method: "GET",
        endpoint: "/jobs",
        statusCode: 500,
        occurrenceCount: 2,
        lastOccurredAt: "2026-03-09T07:54:10.000Z",
      },
    ]);

    const query: AdminDashboardQueryDto = { hours: 24, bucketMinutes: 60, topEndpointsLimit: 5 };
    const result = await service.getAppMetrics(query);

    expect(result.timeSeries).toHaveLength(1);
    expect(result.endpointStats[0]?.endpoint).toBe("/auth/login");
    expect(result.recentApiErrors[0]?.method).toBe("GET");
  });

  it("getApiErrors는 요청/응답 바디를 포함한 상세 에러 로그를 반환", async () => {
    const internals = service as unknown as AdminServiceInternals;
    jest.spyOn(internals, "getApiErrorDetails").mockResolvedValue([
      {
        id: "log-1",
        requestId: "req-1",
        method: "POST",
        endpoint: "/auth/login",
        query: { redirect: "/admin" },
        statusCode: 401,
        durationMs: 220,
        requestBody: { providerId: "admin01", password: "***" },
        responseBody: { error: { code: "UNAUTHORIZED" } },
        errorMessage: "아이디 또는 비밀번호가 일치하지 않습니다.",
        userId: null,
        occurredAt: "2026-03-09T07:54:10.000Z",
      },
    ]);

    const query: AdminApiErrorsQueryDto = { hours: 24, limit: 20 };
    const result = await service.getApiErrors(query);

    expect(result.limit).toBe(20);
    expect(result.items[0]?.method).toBe("POST");
    expect(result.items[0]?.endpoint).toBe("/auth/login");
    expect(result.items[0]?.requestBody).toEqual({
      providerId: "admin01",
      password: "***",
    });
    expect(result.items[0]?.responseBody).toEqual({ error: { code: "UNAUTHORIZED" } });
  });

  it("getSettings는 런타임 설정과 dbPool 값을 반환", () => {
    const result = service.getSettings();

    expect(result.dashboardDefaults.defaultRangeHours).toBe(24);
    expect(result.runtimeConfig.httpTimeoutMs).toBe(30000);
    expect(result.runtimeConfig.dbPool.maxConnections).toBe(20);
    expect(result.notificationChannels.push).toBe(true);
  });
});
