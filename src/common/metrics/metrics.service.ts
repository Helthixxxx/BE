import { Injectable, Inject } from "@nestjs/common";
import { Counter, Histogram, Gauge, Registry } from "prom-client";

/**
 * MetricsService
 * Prometheus 메트릭 수집 서비스
 * 비즈니스 메트릭을 등록하고 업데이트하는 역할
 */
@Injectable()
export class MetricsService {
  // HTTP 메트릭
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestSize: Histogram<string>;
  private readonly httpResponseSize: Histogram<string>;

  // Job 메트릭
  private readonly jobExecutionsTotal: Counter<string>;
  private readonly jobExecutionDuration: Histogram<string>;
  private readonly jobHealthStatus: Gauge<string>;

  // Health 메트릭
  private readonly healthCalculationsTotal: Counter<string>;

  // 데이터베이스 메트릭
  private readonly dbQueryDuration: Histogram<string>;
  private readonly dbConnectionsActive: Gauge<string>;

  // 알림 메트릭
  private readonly notificationSentTotal: Counter<string>;
  private readonly notificationFailedTotal: Counter<string>;

  constructor(@Inject("PROM_REGISTRY") private readonly registry: Registry) {
    // HTTP 메트릭 초기화 및 Registry 등록
    this.httpRequestsTotal = new Counter({
      name: "shm_http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status"],
      registers: [registry],
    });

    this.httpRequestDuration = new Histogram({
      name: "shm_http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "route"],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [registry],
    });

    this.httpRequestSize = new Histogram({
      name: "shm_http_request_size_bytes",
      help: "HTTP request size in bytes",
      labelNames: ["method", "route"],
      buckets: [100, 500, 1000, 5000, 10000, 50000],
      registers: [registry],
    });

    this.httpResponseSize = new Histogram({
      name: "shm_http_response_size_bytes",
      help: "HTTP response size in bytes",
      labelNames: ["method", "route"],
      buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
      registers: [registry],
    });

    // Job 메트릭 초기화 및 Registry 등록
    this.jobExecutionsTotal = new Counter({
      name: "shm_job_executions_total",
      help: "Total number of job executions",
      labelNames: ["job_id", "status"],
      registers: [registry],
    });

    this.jobExecutionDuration = new Histogram({
      name: "shm_job_execution_duration_seconds",
      help: "Job execution duration in seconds",
      labelNames: ["job_id"],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [registry],
    });

    this.jobHealthStatus = new Gauge({
      name: "shm_job_health_status",
      help: "Job health status (0=NORMAL, 1=DEGRADED, 2=FAILED)",
      labelNames: ["job_id"],
      registers: [registry],
    });

    // Health 메트릭 초기화 및 Registry 등록
    this.healthCalculationsTotal = new Counter({
      name: "shm_health_calculations_total",
      help: "Total number of health calculations",
      labelNames: ["health"],
      registers: [registry],
    });

    // 데이터베이스 메트릭 초기화 및 Registry 등록
    this.dbQueryDuration = new Histogram({
      name: "shm_db_query_duration_seconds",
      help: "Database query duration in seconds",
      labelNames: ["operation", "table"],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [registry],
    });

    this.dbConnectionsActive = new Gauge({
      name: "shm_db_connections_active",
      help: "Number of active database connections",
      registers: [registry],
    });

    // 알림 메트릭 초기화 및 Registry 등록
    this.notificationSentTotal = new Counter({
      name: "shm_notification_sent_total",
      help: "Total number of notifications sent",
      labelNames: ["type", "status"],
      registers: [registry],
    });

    this.notificationFailedTotal = new Counter({
      name: "shm_notification_failed_total",
      help: "Total number of notification failures",
      labelNames: ["type"],
      registers: [registry],
    });
  }

  /**
   * HTTP 요청 메트릭 기록
   */
  recordHttpRequest(
    method: string,
    route: string,
    status: number,
    duration: number,
    requestSize?: number,
    responseSize?: number,
  ): void {
    this.httpRequestsTotal.inc({ method, route, status: status.toString() });
    this.httpRequestDuration.observe({ method, route }, duration / 1000); // 밀리초를 초로 변환

    if (requestSize !== undefined) {
      this.httpRequestSize.observe({ method, route }, requestSize);
    }

    if (responseSize !== undefined) {
      this.httpResponseSize.observe({ method, route }, responseSize);
    }
  }

  /**
   * Job 실행 메트릭 기록
   */
  recordJobExecution(
    jobId: string,
    status: "success" | "failed",
    duration: number,
  ): void {
    this.jobExecutionsTotal.inc({ job_id: jobId, status });
    this.jobExecutionDuration.observe({ job_id: jobId }, duration / 1000); // 밀리초를 초로 변환
  }

  /**
   * Job Health 상태 업데이트
   */
  updateJobHealth(
    jobId: string,
    health: "NORMAL" | "DEGRADED" | "FAILED",
  ): void {
    const healthValue = health === "NORMAL" ? 0 : health === "DEGRADED" ? 1 : 2;
    this.jobHealthStatus.set({ job_id: jobId }, healthValue);
  }

  /**
   * Health 계산 메트릭 기록
   */
  recordHealthCalculation(health: "NORMAL" | "DEGRADED" | "FAILED"): void {
    this.healthCalculationsTotal.inc({ health });
  }

  /**
   * 데이터베이스 쿼리 메트릭 기록
   */
  recordDbQuery(operation: string, table: string, duration: number): void {
    this.dbQueryDuration.observe({ operation, table }, duration / 1000); // 밀리초를 초로 변환
  }

  /**
   * 데이터베이스 연결 수 업데이트
   */
  updateDbConnections(count: number): void {
    this.dbConnectionsActive.set(count);
  }

  /**
   * 알림 발송 메트릭 기록
   */
  recordNotificationSent(type: string, status: "sent" | "failed"): void {
    this.notificationSentTotal.inc({ type, status });
    if (status === "failed") {
      this.notificationFailedTotal.inc({ type });
    }
  }

  /**
   * Histogram에서 백분위수 계산 (P50, P95, P99)
   */
  calculatePercentiles(
    buckets: Array<{
      labels: Record<string, string>;
      le: string;
      value: number;
    }>,
    sum: number,
    count: number,
  ): { p50: number; p95: number; p99: number } {
    if (count === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    // 버킷을 le 값으로 정렬
    const sortedBuckets = [...buckets].sort((a, b) => {
      const aLe = a.le === "+Inf" ? Infinity : parseFloat(a.le);
      const bLe = b.le === "+Inf" ? Infinity : parseFloat(b.le);
      return aLe - bLe;
    });

    // 백분위수 계산 (간단한 근사치)
    const getPercentile = (percentile: number): number => {
      const targetCount = (count * percentile) / 100;
      let cumulativeCount = 0;

      for (const bucket of sortedBuckets) {
        cumulativeCount += bucket.value;
        const le = bucket.le === "+Inf" ? Infinity : parseFloat(bucket.le);
        if (cumulativeCount >= targetCount) {
          return le;
        }
      }

      return sortedBuckets[sortedBuckets.length - 1]?.le === "+Inf"
        ? sum / count
        : parseFloat(sortedBuckets[sortedBuckets.length - 1]?.le || "0");
    };

    return {
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  /**
   * HTTP 메트릭 조회 (대시보드용)
   */
  async getHttpMetrics(): Promise<{
    requestsTotal: Array<{ labels: Record<string, string>; value: number }>;
    requestDuration: {
      buckets: Array<{
        labels: Record<string, string>;
        le: string;
        value: number;
      }>;
      sum: Array<{ labels: Record<string, string>; value: number }>;
      count: Array<{ labels: Record<string, string>; value: number }>;
      percentiles: Array<{
        labels: Record<string, string>;
        p50: number;
        p95: number;
        p99: number;
      }>;
    };
    requestSize: {
      buckets: Array<{
        labels: Record<string, string>;
        le: string;
        value: number;
      }>;
      sum: Array<{ labels: Record<string, string>; value: number }>;
      count: Array<{ labels: Record<string, string>; value: number }>;
      avg: Array<{ labels: Record<string, string>; value: number }>;
    };
    responseSize: {
      buckets: Array<{
        labels: Record<string, string>;
        le: string;
        value: number;
      }>;
      sum: Array<{ labels: Record<string, string>; value: number }>;
      count: Array<{ labels: Record<string, string>; value: number }>;
      avg: Array<{ labels: Record<string, string>; value: number }>;
    };
  }> {
    const metrics = await this.registry.getMetricsAsJSON();

    // HTTP 요청 총 수 메트릭
    const requestsTotalMetric = metrics.find(
      (m) => m.name === "shm_http_requests_total",
    );
    const requestsTotal =
      requestsTotalMetric?.values?.map((v) => ({
        labels: v.labels as Record<string, string>,
        value: v.value || 0,
      })) || [];

    // HTTP 요청 응답 시간 메트릭
    const durationBuckets = metrics.filter((m) =>
      m.name.startsWith("shm_http_request_duration_seconds_bucket"),
    );
    const durationSum = metrics.filter((m) =>
      m.name.startsWith("shm_http_request_duration_seconds_sum"),
    );
    const durationCount = metrics.filter((m) =>
      m.name.startsWith("shm_http_request_duration_seconds_count"),
    );

    const buckets =
      durationBuckets.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              method: (v.labels?.method as string) || "",
              route: (v.labels?.route as string) || "",
            },
            le: (v.labels?.le as string) || "",
            value: v.value || 0,
          })) || [],
      ) || [];

    const sum =
      durationSum.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              method: (v.labels?.method as string) || "",
              route: (v.labels?.route as string) || "",
            },
            value: v.value || 0,
          })) || [],
      ) || [];

    const count =
      durationCount.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              method: (v.labels?.method as string) || "",
              route: (v.labels?.route as string) || "",
            },
            value: v.value || 0,
          })) || [],
      ) || [];

    // 백분위수 계산 (라우트별로 그룹화)
    const routeGroups = new Map<
      string,
      { buckets: typeof buckets; sum: number; count: number }
    >();
    for (const bucket of buckets) {
      const key = `${bucket.labels.method}:${bucket.labels.route}`;
      if (!routeGroups.has(key)) {
        routeGroups.set(key, { buckets: [], sum: 0, count: 0 });
      }
      routeGroups.get(key)!.buckets.push(bucket);
    }

    for (const sumItem of sum) {
      const key = `${sumItem.labels.method}:${sumItem.labels.route}`;
      if (routeGroups.has(key)) {
        routeGroups.get(key)!.sum = sumItem.value;
      }
    }

    for (const countItem of count) {
      const key = `${countItem.labels.method}:${countItem.labels.route}`;
      if (routeGroups.has(key)) {
        routeGroups.get(key)!.count = countItem.value;
      }
    }

    const percentiles = Array.from(routeGroups.entries()).map(([key, data]) => {
      const [method, route] = key.split(":");
      const percentile = this.calculatePercentiles(
        data.buckets,
        data.sum,
        data.count,
      );
      return {
        labels: { method, route },
        p50: percentile.p50,
        p95: percentile.p95,
        p99: percentile.p99,
      };
    });

    // HTTP 요청 크기 메트릭
    const requestSizeBuckets = metrics.filter((m) =>
      m.name.startsWith("shm_http_request_size_bytes_bucket"),
    );
    const requestSizeSum = metrics.filter((m) =>
      m.name.startsWith("shm_http_request_size_bytes_sum"),
    );
    const requestSizeCount = metrics.filter((m) =>
      m.name.startsWith("shm_http_request_size_bytes_count"),
    );

    const requestSizeBucketsData =
      requestSizeBuckets.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              method: (v.labels?.method as string) || "",
              route: (v.labels?.route as string) || "",
            },
            le: (v.labels?.le as string) || "",
            value: v.value || 0,
          })) || [],
      ) || [];

    const requestSizeSumData =
      requestSizeSum.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              method: (v.labels?.method as string) || "",
              route: (v.labels?.route as string) || "",
            },
            value: v.value || 0,
          })) || [],
      ) || [];

    const requestSizeCountData =
      requestSizeCount.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              method: (v.labels?.method as string) || "",
              route: (v.labels?.route as string) || "",
            },
            value: v.value || 0,
          })) || [],
      ) || [];

    const requestSizeAvg = requestSizeSumData.map((sumItem) => {
      const countItem = requestSizeCountData.find(
        (c) =>
          c.labels.method === sumItem.labels.method &&
          c.labels.route === sumItem.labels.route,
      );
      return {
        labels: sumItem.labels,
        value:
          countItem && countItem.value > 0
            ? sumItem.value / countItem.value
            : 0,
      };
    });

    // HTTP 응답 크기 메트릭
    const responseSizeBuckets = metrics.filter((m) =>
      m.name.startsWith("shm_http_response_size_bytes_bucket"),
    );
    const responseSizeSum = metrics.filter((m) =>
      m.name.startsWith("shm_http_response_size_bytes_sum"),
    );
    const responseSizeCount = metrics.filter((m) =>
      m.name.startsWith("shm_http_response_size_bytes_count"),
    );

    const responseSizeBucketsData =
      responseSizeBuckets.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              method: (v.labels?.method as string) || "",
              route: (v.labels?.route as string) || "",
            },
            le: (v.labels?.le as string) || "",
            value: v.value || 0,
          })) || [],
      ) || [];

    const responseSizeSumData =
      responseSizeSum.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              method: (v.labels?.method as string) || "",
              route: (v.labels?.route as string) || "",
            },
            value: v.value || 0,
          })) || [],
      ) || [];

    const responseSizeCountData =
      responseSizeCount.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              method: (v.labels?.method as string) || "",
              route: (v.labels?.route as string) || "",
            },
            value: v.value || 0,
          })) || [],
      ) || [];

    const responseSizeAvg = responseSizeSumData.map((sumItem) => {
      const countItem = responseSizeCountData.find(
        (c) =>
          c.labels.method === sumItem.labels.method &&
          c.labels.route === sumItem.labels.route,
      );
      return {
        labels: sumItem.labels,
        value:
          countItem && countItem.value > 0
            ? sumItem.value / countItem.value
            : 0,
      };
    });

    return {
      requestsTotal,
      requestDuration: {
        buckets,
        sum,
        count,
        percentiles,
      },
      requestSize: {
        buckets: requestSizeBucketsData,
        sum: requestSizeSumData,
        count: requestSizeCountData,
        avg: requestSizeAvg,
      },
      responseSize: {
        buckets: responseSizeBucketsData,
        sum: responseSizeSumData,
        count: responseSizeCountData,
        avg: responseSizeAvg,
      },
    };
  }

  /**
   * Job 메트릭 조회 (대시보드용)
   */
  async getJobMetrics(): Promise<{
    executionsTotal: Array<{ labels: Record<string, string>; value: number }>;
    executionDuration: {
      buckets: Array<{
        labels: Record<string, string>;
        le: string;
        value: number;
      }>;
      sum: Array<{ labels: Record<string, string>; value: number }>;
      count: Array<{ labels: Record<string, string>; value: number }>;
      percentiles: Array<{
        labels: Record<string, string>;
        p50: number;
        p95: number;
        p99: number;
      }>;
    };
    healthStatus: Array<{ labels: Record<string, string>; value: number }>;
  }> {
    const metrics = await this.registry.getMetricsAsJSON();

    // Job 실행 총 수
    const executionsTotalMetric = metrics.find(
      (m) => m.name === "shm_job_executions_total",
    );
    const executionsTotal =
      executionsTotalMetric?.values?.map((v) => ({
        labels: v.labels as Record<string, string>,
        value: v.value || 0,
      })) || [];

    // Job 실행 시간 메트릭
    const executionDurationBuckets = metrics.filter((m) =>
      m.name.startsWith("shm_job_execution_duration_seconds_bucket"),
    );
    const executionDurationSum = metrics.filter((m) =>
      m.name.startsWith("shm_job_execution_duration_seconds_sum"),
    );
    const executionDurationCount = metrics.filter((m) =>
      m.name.startsWith("shm_job_execution_duration_seconds_count"),
    );

    const executionBuckets =
      executionDurationBuckets.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              job_id: (v.labels?.job_id as string) || "",
            },
            le: (v.labels?.le as string) || "",
            value: v.value || 0,
          })) || [],
      ) || [];

    const executionSum =
      executionDurationSum.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              job_id: (v.labels?.job_id as string) || "",
            },
            value: v.value || 0,
          })) || [],
      ) || [];

    const executionCount =
      executionDurationCount.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              job_id: (v.labels?.job_id as string) || "",
            },
            value: v.value || 0,
          })) || [],
      ) || [];

    // Job별 백분위수 계산
    const jobGroups = new Map<
      string,
      { buckets: typeof executionBuckets; sum: number; count: number }
    >();
    for (const bucket of executionBuckets) {
      const key = bucket.labels.job_id;
      if (!jobGroups.has(key)) {
        jobGroups.set(key, { buckets: [], sum: 0, count: 0 });
      }
      jobGroups.get(key)!.buckets.push(bucket);
    }

    for (const sumItem of executionSum) {
      const key = sumItem.labels.job_id;
      if (jobGroups.has(key)) {
        jobGroups.get(key)!.sum = sumItem.value;
      }
    }

    for (const countItem of executionCount) {
      const key = countItem.labels.job_id;
      if (jobGroups.has(key)) {
        jobGroups.get(key)!.count = countItem.value;
      }
    }

    const executionPercentiles = Array.from(jobGroups.entries()).map(
      ([jobId, data]) => {
        const percentile = this.calculatePercentiles(
          data.buckets,
          data.sum,
          data.count,
        );
        return {
          labels: { job_id: jobId },
          p50: percentile.p50,
          p95: percentile.p95,
          p99: percentile.p99,
        };
      },
    );

    // Job Health 상태
    const healthStatusMetric = metrics.find(
      (m) => m.name === "shm_job_health_status",
    );
    const healthStatus =
      healthStatusMetric?.values?.map((v) => ({
        labels: v.labels as Record<string, string>,
        value: v.value || 0,
      })) || [];

    return {
      executionsTotal,
      executionDuration: {
        buckets: executionBuckets,
        sum: executionSum,
        count: executionCount,
        percentiles: executionPercentiles,
      },
      healthStatus,
    };
  }

  /**
   * Health 계산 메트릭 조회
   */
  async getHealthMetrics(): Promise<{
    calculationsTotal: Array<{ labels: Record<string, string>; value: number }>;
  }> {
    const metrics = await this.registry.getMetricsAsJSON();

    const healthCalculationsMetric = metrics.find(
      (m) => m.name === "shm_health_calculations_total",
    );
    const calculationsTotal =
      healthCalculationsMetric?.values?.map((v) => ({
        labels: v.labels as Record<string, string>,
        value: v.value || 0,
      })) || [];

    return {
      calculationsTotal,
    };
  }

  /**
   * 시스템 메트릭 조회 (대시보드용)
   */
  async getSystemMetrics(): Promise<{
    cpu: {
      userSeconds: number;
      systemSeconds: number;
      totalSeconds: number;
    };
    memory: {
      residentBytes: number;
      heapUsedBytes: number;
      heapTotalBytes: number;
      externalBytes: number;
      rssBytes: number;
    };
    process: {
      uptimeSeconds: number;
      startTimeSeconds: number;
      pid: number;
    };
    eventLoop: {
      lagSeconds: number;
      utilizationPercent: number;
    };
  }> {
    const metrics = await this.registry.getMetricsAsJSON();

    const cpuUser = metrics.find(
      (m) => m.name === "shm_process_cpu_user_seconds_total",
    );
    const cpuSystem = metrics.find(
      (m) => m.name === "shm_process_cpu_system_seconds_total",
    );
    const memoryResident = metrics.find(
      (m) => m.name === "shm_process_resident_memory_bytes",
    );
    const heapUsed = metrics.find(
      (m) => m.name === "shm_process_heap_used_bytes",
    );
    const heapTotal = metrics.find(
      (m) => m.name === "shm_process_heap_total_bytes",
    );
    const heapExternal = metrics.find(
      (m) => m.name === "shm_process_heap_external_bytes",
    );
    const rss = metrics.find(
      (m) => m.name === "shm_process_resident_memory_bytes",
    );
    const uptime = metrics.find(
      (m) => m.name === "shm_process_start_time_seconds",
    );
    const eventLoopLag = metrics.find(
      (m) => m.name === "shm_nodejs_eventloop_lag_seconds",
    );
    const eventLoopUtilization = metrics.find(
      (m) => m.name === "shm_nodejs_eventloop_utilization",
    );

    const userSeconds = cpuUser?.values?.[0]?.value || 0;
    const systemSeconds = cpuSystem?.values?.[0]?.value || 0;

    return {
      cpu: {
        userSeconds,
        systemSeconds,
        totalSeconds: userSeconds + systemSeconds,
      },
      memory: {
        residentBytes: memoryResident?.values?.[0]?.value || 0,
        heapUsedBytes: heapUsed?.values?.[0]?.value || 0,
        heapTotalBytes: heapTotal?.values?.[0]?.value || 0,
        externalBytes: heapExternal?.values?.[0]?.value || 0,
        rssBytes: rss?.values?.[0]?.value || 0,
      },
      process: {
        uptimeSeconds: uptime
          ? Math.floor(Date.now() / 1000 - (uptime.values?.[0]?.value || 0))
          : process.uptime(),
        startTimeSeconds: uptime?.values?.[0]?.value || 0,
        pid: process.pid,
      },
      eventLoop: {
        lagSeconds: eventLoopLag?.values?.[0]?.value || 0,
        utilizationPercent: eventLoopUtilization?.values?.[0]?.value
          ? eventLoopUtilization.values[0].value * 100
          : 0,
      },
    };
  }

  /**
   * 데이터베이스 메트릭 조회 (대시보드용)
   */
  async getDatabaseMetrics(): Promise<{
    queryDuration: {
      buckets: Array<{
        labels: Record<string, string>;
        le: string;
        value: number;
      }>;
      sum: Array<{ labels: Record<string, string>; value: number }>;
      count: Array<{ labels: Record<string, string>; value: number }>;
      avg: Array<{ labels: Record<string, string>; value: number }>;
    };
    connectionsActive: number;
  }> {
    const metrics = await this.registry.getMetricsAsJSON();

    // 데이터베이스 쿼리 시간 메트릭
    const queryDurationBuckets = metrics.filter((m) =>
      m.name.startsWith("shm_db_query_duration_seconds_bucket"),
    );
    const queryDurationSum = metrics.filter((m) =>
      m.name.startsWith("shm_db_query_duration_seconds_sum"),
    );
    const queryDurationCount = metrics.filter((m) =>
      m.name.startsWith("shm_db_query_duration_seconds_count"),
    );

    const buckets =
      queryDurationBuckets.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              operation: (v.labels?.operation as string) || "",
              table: (v.labels?.table as string) || "",
            },
            le: (v.labels?.le as string) || "",
            value: v.value || 0,
          })) || [],
      ) || [];

    const sum =
      queryDurationSum.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              operation: (v.labels?.operation as string) || "",
              table: (v.labels?.table as string) || "",
            },
            value: v.value || 0,
          })) || [],
      ) || [];

    const count =
      queryDurationCount.flatMap(
        (m) =>
          m.values?.map((v) => ({
            labels: {
              operation: (v.labels?.operation as string) || "",
              table: (v.labels?.table as string) || "",
            },
            value: v.value || 0,
          })) || [],
      ) || [];

    const avg = sum.map((sumItem) => {
      const countItem = count.find(
        (c) =>
          c.labels.operation === sumItem.labels.operation &&
          c.labels.table === sumItem.labels.table,
      );
      return {
        labels: sumItem.labels,
        value:
          countItem && countItem.value > 0
            ? sumItem.value / countItem.value
            : 0,
      };
    });

    // 활성 연결 수
    const connectionsMetric = metrics.find(
      (m) => m.name === "shm_db_connections_active",
    );
    const connectionsActive = connectionsMetric?.values?.[0]?.value || 0;

    return {
      queryDuration: {
        buckets,
        sum,
        count,
        avg,
      },
      connectionsActive,
    };
  }

  /**
   * 알림 메트릭 조회 (대시보드용)
   */
  async getNotificationMetrics(): Promise<{
    sentTotal: Array<{ labels: Record<string, string>; value: number }>;
    failedTotal: Array<{ labels: Record<string, string>; value: number }>;
    byType: Record<string, { sent: number; failed: number }>;
  }> {
    const metrics = await this.registry.getMetricsAsJSON();

    const sentMetric = metrics.find(
      (m) => m.name === "shm_notification_sent_total",
    );
    const failedMetric = metrics.find(
      (m) => m.name === "shm_notification_failed_total",
    );

    const sentTotal =
      sentMetric?.values?.map((v) => ({
        labels: v.labels as Record<string, string>,
        value: v.value || 0,
      })) || [];

    const failedTotal =
      failedMetric?.values?.map((v) => ({
        labels: v.labels as Record<string, string>,
        value: v.value || 0,
      })) || [];

    // 타입별 집계
    const byType: Record<string, { sent: number; failed: number }> = {};
    for (const sent of sentTotal) {
      const type = sent.labels.type || "unknown";
      if (!byType[type]) {
        byType[type] = { sent: 0, failed: 0 };
      }
      if (sent.labels.status === "sent") {
        byType[type].sent += sent.value;
      }
    }
    for (const failed of failedTotal) {
      const type = failed.labels.type || "unknown";
      if (!byType[type]) {
        byType[type] = { sent: 0, failed: 0 };
      }
      byType[type].failed += failed.value;
    }

    return {
      sentTotal,
      failedTotal,
      byType,
    };
  }
}
