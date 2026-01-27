import { Controller, Get, UseGuards, HttpStatus, Inject, forwardRef } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { Roles } from "./auth/decorators/roles.decorator";
import { UserRole } from "./users/entities/user.entity";
import { Registry } from "prom-client";
import { MetricsService } from "./common/metrics/metrics.service";
import { JobsService } from "./jobs/jobs.service";
import { ExecutionsService } from "./executions/executions.service";
import { HealthService } from "./health/health.service";
import { SuccessResponseDto, ErrorResponseDto } from "./common/dto/response.dto";
import { DashboardMetricsResponseDto } from "./metrics/dto/dashboard-metrics-response.dto";

/**
 * MetricsController
 * 메트릭 조회 API
 * - GET /metrics: Prometheus 형식 메트릭 (텍스트)
 * - GET /api/metrics/dashboard: 대시보드용 집계 메트릭 (JSON, ADMIN 전용)
 */
@ApiTags("metrics")
@Controller()
export class MetricsController {
  constructor(
    @Inject("PROM_REGISTRY") private readonly registry: Registry,
    private readonly metricsService: MetricsService,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
    @Inject(forwardRef(() => ExecutionsService))
    private readonly executionsService: ExecutionsService,
    @Inject(forwardRef(() => HealthService))
    private readonly healthService: HealthService,
  ) {}

  /**
   * Prometheus 형식 메트릭 엔드포인트
   * Prometheus가 스크래핑하는 엔드포인트
   */
  @Get("metrics")
  @ApiOperation({
    summary: "Prometheus 메트릭 조회",
    description:
      "Prometheus 형식의 메트릭을 반환합니다. Prometheus 서버가 이 엔드포인트를 스크래핑하여 메트릭을 수집합니다. " +
      "응답은 Prometheus exposition format으로 반환되며, 텍스트 형식입니다.\n\n" +
      "**메트릭 타입 설명:**\n" +
      "- **Counter**: 누적 증가하는 값 (예: 총 요청 수, 총 에러 수)\n" +
      "- **Histogram**: 값의 분포를 버킷으로 나누어 측정 (예: 응답 시간 분포)\n" +
      "  - `_bucket`: 각 버킷의 누적 카운트\n" +
      "  - `_sum`: 모든 값의 합\n" +
      "  - `_count`: 총 관측 수\n" +
      "- **Gauge**: 현재 값을 나타내는 변동 가능한 메트릭 (예: 현재 메모리 사용량, Health 상태)\n\n" +
      "**레이블 설명:**\n" +
      "- `method`: HTTP 메서드 (GET, POST 등)\n" +
      "- `route`: 라우트 패턴 (파라미터는 :id로 치환)\n" +
      "- `status`: HTTP 상태 코드\n" +
      "- `job_id`: Job UUID\n" +
      "- `health`: Health 상태 (NORMAL, DEGRADED, FAILED)\n\n" +
      "**사용 예시:**\n" +
      "- 에러율 계산: `rate(shm_http_requests_total{status=~\"5..\"}[5m]) / rate(shm_http_requests_total[5m])`\n" +
      "- P95 응답 시간: `histogram_quantile(0.95, rate(shm_http_request_duration_seconds_bucket[5m]))`\n" +
      "- Job 성공률: `rate(shm_job_executions_total{status=\"success\"}[5m]) / rate(shm_job_executions_total[5m])`",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "메트릭 조회 성공 (Prometheus exposition format)",
    content: {
      "text/plain": {
        schema: {
          type: "string",
          example: `# HELP shm_http_requests_total Total number of HTTP requests
# TYPE shm_http_requests_total counter
shm_http_requests_total{method="GET",route="/jobs",status="200"} 1250
shm_http_requests_total{method="GET",route="/jobs",status="400"} 5
shm_http_requests_total{method="POST",route="/jobs",status="201"} 50
shm_http_requests_total{method="GET",route="/health",status="200"} 5000

# HELP shm_http_request_duration_seconds HTTP request duration in seconds
# TYPE shm_http_request_duration_seconds histogram
shm_http_request_duration_seconds_bucket{method="GET",route="/jobs",le="0.1"} 800
shm_http_request_duration_seconds_bucket{method="GET",route="/jobs",le="0.5"} 1200
shm_http_request_duration_seconds_bucket{method="GET",route="/jobs",le="1"} 1240
shm_http_request_duration_seconds_bucket{method="GET",route="/jobs",le="2"} 1250
shm_http_request_duration_seconds_bucket{method="GET",route="/jobs",le="5"} 1250
shm_http_request_duration_seconds_bucket{method="GET",route="/jobs",le="10"} 1250
shm_http_request_duration_seconds_bucket{method="GET",route="/jobs",le="+Inf"} 1250
shm_http_request_duration_seconds_sum{method="GET",route="/jobs"} 312.5
shm_http_request_duration_seconds_count{method="GET",route="/jobs"} 1250

# HELP shm_job_executions_total Total number of job executions
# TYPE shm_job_executions_total counter
shm_job_executions_total{job_id="550e8400-e29b-41d4-a716-446655440000",status="success"} 1200
shm_job_executions_total{job_id="550e8400-e29b-41d4-a716-446655440000",status="failed"} 50
shm_job_executions_total{job_id="660e8400-e29b-41d4-a716-446655440001",status="success"} 800
shm_job_executions_total{job_id="660e8400-e29b-41d4-a716-446655440001",status="failed"} 20

# HELP shm_job_execution_duration_seconds Job execution duration in seconds
# TYPE shm_job_execution_duration_seconds histogram
shm_job_execution_duration_seconds_bucket{job_id="550e8400-e29b-41d4-a716-446655440000",le="0.1"} 200
shm_job_execution_duration_seconds_bucket{job_id="550e8400-e29b-41d4-a716-446655440000",le="0.5"} 1000
shm_job_execution_duration_seconds_bucket{job_id="550e8400-e29b-41d4-a716-446655440000",le="1"} 1180
shm_job_execution_duration_seconds_bucket{job_id="550e8400-e29b-41d4-a716-446655440000",le="2"} 1240
shm_job_execution_duration_seconds_bucket{job_id="550e8400-e29b-41d4-a716-446655440000",le="5"} 1250
shm_job_execution_duration_seconds_bucket{job_id="550e8400-e29b-41d4-a716-446655440000",le="10"} 1250
shm_job_execution_duration_seconds_bucket{job_id="550e8400-e29b-41d4-a716-446655440000",le="30"} 1250
shm_job_execution_duration_seconds_sum{job_id="550e8400-e29b-41d4-a716-446655440000"} 312.5
shm_job_execution_duration_seconds_count{job_id="550e8400-e29b-41d4-a716-446655440000"} 1250

# HELP shm_job_health_status Job health status (0=NORMAL, 1=DEGRADED, 2=FAILED)
# TYPE shm_job_health_status gauge
shm_job_health_status{job_id="550e8400-e29b-41d4-a716-446655440000"} 0
shm_job_health_status{job_id="660e8400-e29b-41d4-a716-446655440001"} 1
shm_job_health_status{job_id="770e8400-e29b-41d4-a716-446655440002"} 2

# HELP shm_health_calculations_total Total number of health calculations
# TYPE shm_health_calculations_total counter
shm_health_calculations_total{health="NORMAL"} 8500
shm_health_calculations_total{health="DEGRADED"} 200
shm_health_calculations_total{health="FAILED"} 50

# HELP shm_process_cpu_user_seconds_total Total user CPU time spent in seconds
# TYPE shm_process_cpu_user_seconds_total counter
shm_process_cpu_user_seconds_total 123.45

# HELP shm_process_resident_memory_bytes Resident memory size in bytes
# TYPE shm_process_resident_memory_bytes gauge
shm_process_resident_memory_bytes 52428800`,
        },
      },
    },
  })
  async getMetrics(): Promise<string> {
    // Prometheus 형식으로 메트릭 반환
    return await this.registry.metrics();
  }

  /**
   * 대시보드용 집계 메트릭 API
   * 어드민 페이지에서 사용할 JSON 형식의 메트릭
   */
  @Get("api/metrics/dashboard")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({
    summary: "대시보드 메트릭 조회 (Admin 전용)",
    description:
      "대시보드에 표시할 집계 메트릭을 반환합니다. (Admin 전용)\n\n" +
      "**응답 데이터 설명:**\n" +
      "- `jobStats`: Job 관련 통계\n" +
      "  - `total`: 전체 Job 수\n" +
      "  - `active`: 활성화된 Job 수 (isActive=true)\n" +
      "  - `byHealth`: Health 상태별 Job 수 집계 (NORMAL, DEGRADED, FAILED)\n\n" +
      "- `executionStats`: Execution 관련 통계\n" +
      "  - `last24h`: 최근 24시간 동안의 Execution 통계\n" +
      "    - `total`: 총 Execution 수\n" +
      "    - `success`: 성공한 Execution 수\n" +
      "    - `failed`: 실패한 Execution 수\n" +
      "    - `avgDuration`: 평균 실행 시간 (밀리초)\n\n" +
      "- `executionStats`: Execution 관련 통계\n" +
      "  - `last24h`: 최근 24시간 Execution 통계\n" +
      "  - `overall`: 전체 Execution 통계 (백분위수 포함)\n\n" +
      "- `httpStats`: HTTP 요청 통계\n" +
      "  - `totalRequests`: 전체 HTTP 요청 수 (누적)\n" +
      "  - `byStatus`: HTTP 상태 코드별 요청 수 (200, 400, 500 등)\n" +
      "  - `byMethod`: HTTP 메서드별 요청 수 (GET, POST 등)\n" +
      "  - `duration`: 응답 시간 통계 (avgMs, p50Ms, p95Ms, p99Ms)\n" +
      "  - `size`: 요청/응답 크기 통계 (avgRequestBytes, avgResponseBytes)\n" +
      "  - `percentilesByRoute`: 라우트별 백분위수 지표\n\n" +
      "- `jobMetrics`: Job 메트릭\n" +
      "  - `executionDuration.percentilesByJob`: Job별 실행 시간 백분위수\n" +
      "  - `healthStatus`: Job별 Health 상태\n\n" +
      "- `healthMetrics`: Health 계산 메트릭\n" +
      "  - `calculationsTotal`: Health 계산 총 수\n" +
      "  - `byStatus`: Health 상태별 계산 수\n\n" +
      "- `systemMetrics`: 시스템 리소스 메트릭\n" +
      "  - `cpu`: CPU 사용량 (userSeconds, systemSeconds, totalSeconds)\n" +
      "  - `memory`: 메모리 사용량 (residentBytes, heapUsedBytes, heapTotalBytes, externalBytes, rssBytes, heapUsagePercent)\n" +
      "  - `process`: 프로세스 정보 (uptimeSeconds, startTimeSeconds, pid)\n" +
      "  - `eventLoop`: Event Loop 성능 지표 (lagMs, utilizationPercent)\n\n" +
      "이 API는 실시간으로 계산되며, 프로덕션 수준의 모니터링 대시보드를 구축하는 데 사용됩니다.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "대시보드 메트릭 조회 성공",
    type: SuccessResponseDto<DashboardMetricsResponseDto>,
    schema: {
      example: {
        meta: {
          requestId: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2026-01-27T12:00:00.000Z",
        },
        data: {
          jobStats: {
            total: 10,
            active: 8,
            byHealth: {
              NORMAL: 6,
              DEGRADED: 1,
              FAILED: 1,
            },
          },
          executionStats: {
            last24h: {
              total: 1200,
              success: 1150,
              failed: 50,
              avgDuration: 245.5,
            },
            overall: {
              total: 5000,
              byStatus: {
                success: 4800,
                failed: 200,
              },
              duration: {
                avgSeconds: 0.245,
                p50Seconds: 0.2,
                p95Seconds: 0.5,
                p99Seconds: 1.0,
              },
            },
          },
          httpStats: {
            totalRequests: 12500,
            byStatus: {
              "200": 12000,
              "400": 50,
              "500": 10,
            },
            byMethod: {
              GET: 10000,
              POST: 2000,
              PATCH: 400,
              DELETE: 100,
            },
            errorRate: 0.48,
            duration: {
              avgMs: 245.5,
              p50Ms: 200,
              p95Ms: 500,
              p99Ms: 1000,
            },
            size: {
              avgRequestBytes: 1024,
              avgResponseBytes: 2048,
            },
            percentilesByRoute: [
              {
                method: "GET",
                route: "/jobs",
                p50Ms: 200,
                p95Ms: 500,
                p99Ms: 1000,
              },
            ],
          },
          jobMetrics: {
            executionDuration: {
              percentilesByJob: [
                {
                  jobId: "550e8400-e29b-41d4-a716-446655440000",
                  p50Seconds: 0.2,
                  p95Seconds: 0.5,
                  p99Seconds: 1.0,
                },
              ],
            },
            healthStatus: [
              {
                jobId: "550e8400-e29b-41d4-a716-446655440000",
                status: "NORMAL",
              },
            ],
          },
          healthMetrics: {
            calculationsTotal: 8750,
            byStatus: {
              NORMAL: 8500,
              DEGRADED: 200,
              FAILED: 50,
            },
          },
          databaseMetrics: {
            queryDuration: {
              avgSeconds: 0.012,
              totalQueries: 5000,
            },
            connectionsActive: 5,
          },
          notificationMetrics: {
            totalSent: 150,
            totalFailed: 5,
            byType: {
              push: {
                sent: 150,
                failed: 5,
              },
            },
            successRate: 96.77,
          },
          systemMetrics: {
            cpu: {
              userSeconds: 123.45,
              systemSeconds: 45.67,
              totalSeconds: 169.12,
            },
            memory: {
              residentBytes: 52428800,
              heapUsedBytes: 31457280,
              heapTotalBytes: 67108864,
              externalBytes: 1048576,
              rssBytes: 52428800,
              heapUsagePercent: 46.9,
            },
            process: {
              uptimeSeconds: 86400,
              startTimeSeconds: 1706342400,
              pid: 12345,
            },
            eventLoop: {
              lagMs: 5.2,
              utilizationPercent: 15.5,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "인증 실패",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "권한 없음 (ADMIN만 접근 가능)",
    type: ErrorResponseDto,
  })
  async getDashboardMetrics() {
    const jobs = await this.jobsService.findAllInternal(false);
    const activeJobs = jobs.filter((job) => job.isActive);

    // Health 상태별 집계
    const healthCounts = {
      NORMAL: 0,
      DEGRADED: 0,
      FAILED: 0,
    };

    // 각 Job의 Health 계산 (병렬 처리)
    const healthResults = await Promise.all(
      activeJobs.map((job) => this.healthService.calculateHealth(job.id)),
    );

    for (const health of healthResults) {
      healthCounts[health]++;
    }

    // 최근 24시간 Execution 통계
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 모든 Job의 최근 Execution 조회
    const recentExecutions = await Promise.all(
      activeJobs.map((job) => this.executionsService.findRecentByJobId(job.id, 100)),
    );

    const allRecentExecutions = recentExecutions.flat();
    const last24hExecutions = allRecentExecutions.filter((exec) => exec.createdAt >= yesterday);

    const executionStats = {
      total: last24hExecutions.length,
      success: last24hExecutions.filter((exec) => exec.success).length,
      failed: last24hExecutions.filter((exec) => !exec.success).length,
      avgDuration:
        last24hExecutions
          .filter((exec) => exec.durationMs !== null)
          .reduce((sum, exec) => sum + (exec.durationMs || 0), 0) /
          last24hExecutions.filter((exec) => exec.durationMs !== null).length || 0,
    };

    // HTTP 메트릭 조회
    const httpMetrics = await this.metricsService.getHttpMetrics();

    // HTTP 메트릭 집계
    const totalRequests = httpMetrics.requestsTotal.reduce((sum, m) => sum + m.value, 0);
    const byStatus = httpMetrics.requestsTotal.reduce(
      (acc, m) => {
        const status = m.labels.status || "unknown";
        acc[status] = (acc[status] || 0) + m.value;
        return acc;
      },
      {} as Record<string, number>,
    );
    const byMethod = httpMetrics.requestsTotal.reduce(
      (acc, m) => {
        const method = m.labels.method || "unknown";
        acc[method] = (acc[method] || 0) + m.value;
        return acc;
      },
      {} as Record<string, number>,
    );
    const avgDuration =
      httpMetrics.requestDuration.count.length > 0
        ? httpMetrics.requestDuration.sum.reduce((sum, m) => sum + m.value, 0) /
          httpMetrics.requestDuration.count.reduce((sum, m) => sum + m.value, 0)
        : 0;

    // 전체 백분위수 계산 (모든 라우트 통합)
    const allDurationSum = httpMetrics.requestDuration.sum.reduce((sum, m) => sum + m.value, 0);
    const allDurationCount = httpMetrics.requestDuration.count.reduce((sum, m) => sum + m.value, 0);
    const allDurationBuckets = httpMetrics.requestDuration.buckets.reduce(
      (acc, bucket) => {
        const le = bucket.le;
        if (!acc[le]) {
          acc[le] = 0;
        }
        acc[le] += bucket.value;
        return acc;
      },
      {} as Record<string, number>,
    );

    const allBucketsArray = Object.entries(allDurationBuckets).map(([le, value]) => ({
      labels: {},
      le,
      value,
    }));

    const overallPercentiles = this.metricsService.calculatePercentiles(
      allBucketsArray,
      allDurationSum,
      allDurationCount,
    );

    // 요청/응답 크기 통계
    const avgRequestSize =
      httpMetrics.requestSize.avg.length > 0
        ? httpMetrics.requestSize.avg.reduce((sum, m) => sum + m.value, 0) /
          httpMetrics.requestSize.avg.length
        : 0;
    const avgResponseSize =
      httpMetrics.responseSize.avg.length > 0
        ? httpMetrics.responseSize.avg.reduce((sum, m) => sum + m.value, 0) /
          httpMetrics.responseSize.avg.length
        : 0;

    // Job 메트릭 조회
    const jobMetrics = await this.metricsService.getJobMetrics();

    // Job 실행 통계
    const totalJobExecutions = jobMetrics.executionsTotal.reduce((sum, m) => sum + m.value, 0);
    const jobExecutionsByStatus = jobMetrics.executionsTotal.reduce(
      (acc, m) => {
        const status = m.labels.status || "unknown";
        acc[status] = (acc[status] || 0) + m.value;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Job 실행 시간 백분위수 (전체)
    const allJobDurationSum = jobMetrics.executionDuration.sum.reduce((sum, m) => sum + m.value, 0);
    const allJobDurationCount = jobMetrics.executionDuration.count.reduce(
      (sum, m) => sum + m.value,
      0,
    );
    const allJobDurationBuckets = jobMetrics.executionDuration.buckets.reduce(
      (acc, bucket) => {
        const le = bucket.le;
        if (!acc[le]) {
          acc[le] = 0;
        }
        acc[le] += bucket.value;
        return acc;
      },
      {} as Record<string, number>,
    );

    const allJobBucketsArray = Object.entries(allJobDurationBuckets).map(([le, value]) => ({
      labels: {},
      le,
      value,
    }));

    const jobOverallPercentiles = this.metricsService.calculatePercentiles(
      allJobBucketsArray,
      allJobDurationSum,
      allJobDurationCount,
    );

    // Health 메트릭 조회
    const healthMetrics = await this.metricsService.getHealthMetrics();
    const healthCalculationsByStatus = healthMetrics.calculationsTotal.reduce(
      (acc, m) => {
        const health = m.labels.health || "unknown";
        acc[health] = (acc[health] || 0) + m.value;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 에러율 계산
    const errorRate =
      totalRequests > 0
        ? (Object.entries(byStatus)
            .filter(([status]) => status.startsWith("5") || status.startsWith("4"))
            .reduce((sum, [, count]) => sum + count, 0) /
            totalRequests) *
          100
        : 0;

    // 데이터베이스 메트릭 조회
    const databaseMetrics = await this.metricsService.getDatabaseMetrics();

    // 알림 메트릭 조회
    const notificationMetrics = await this.metricsService.getNotificationMetrics();

    // 시스템 메트릭 조회
    const systemMetrics = await this.metricsService.getSystemMetrics();

    return {
      jobStats: {
        total: jobs.length,
        active: activeJobs.length,
        byHealth: healthCounts,
      },
      executionStats: {
        last24h: executionStats,
        overall: {
          total: totalJobExecutions,
          byStatus: jobExecutionsByStatus,
          duration: {
            avgSeconds: allJobDurationCount > 0 ? allJobDurationSum / allJobDurationCount : 0,
            p50Seconds: jobOverallPercentiles.p50,
            p95Seconds: jobOverallPercentiles.p95,
            p99Seconds: jobOverallPercentiles.p99,
          },
        },
      },
      httpStats: {
        totalRequests,
        byStatus,
        byMethod,
        errorRate: Math.round(errorRate * 100) / 100, // 소수점 둘째 자리까지
        duration: {
          avgMs: Math.round(avgDuration * 1000),
          p50Ms: Math.round(overallPercentiles.p50 * 1000),
          p95Ms: Math.round(overallPercentiles.p95 * 1000),
          p99Ms: Math.round(overallPercentiles.p99 * 1000),
        },
        size: {
          avgRequestBytes: Math.round(avgRequestSize),
          avgResponseBytes: Math.round(avgResponseSize),
        },
        percentilesByRoute: httpMetrics.requestDuration.percentiles.map((p) => ({
          method: p.labels.method,
          route: p.labels.route,
          p50Ms: Math.round(p.p50 * 1000),
          p95Ms: Math.round(p.p95 * 1000),
          p99Ms: Math.round(p.p99 * 1000),
        })),
      },
      databaseMetrics: {
        queryDuration: {
          avgSeconds: databaseMetrics.queryDuration.avg.length > 0
            ? databaseMetrics.queryDuration.avg.reduce((sum, m) => sum + m.value, 0) /
              databaseMetrics.queryDuration.avg.length
            : 0,
          totalQueries: databaseMetrics.queryDuration.count.reduce((sum, m) => sum + m.value, 0),
        },
        connectionsActive: databaseMetrics.connectionsActive,
      },
      notificationMetrics: {
        totalSent: notificationMetrics.sentTotal.reduce((sum, m) => sum + m.value, 0),
        totalFailed: notificationMetrics.failedTotal.reduce((sum, m) => sum + m.value, 0),
        byType: notificationMetrics.byType,
        successRate:
          notificationMetrics.sentTotal.reduce((sum, m) => sum + m.value, 0) > 0
            ? ((notificationMetrics.sentTotal.filter((m) => m.labels.status === "sent").reduce((sum, m) => sum + m.value, 0) /
                notificationMetrics.sentTotal.reduce((sum, m) => sum + m.value, 0)) *
                100)
            : 0,
      },
      jobMetrics: {
        executionDuration: {
          percentilesByJob: jobMetrics.executionDuration.percentiles.map((p) => ({
            jobId: p.labels.job_id,
            p50Seconds: p.p50,
            p95Seconds: p.p95,
            p99Seconds: p.p99,
          })),
        },
        healthStatus: jobMetrics.healthStatus.map((h) => ({
          jobId: h.labels.job_id,
          status: h.value === 0 ? "NORMAL" : h.value === 1 ? "DEGRADED" : "FAILED",
        })),
      },
      healthMetrics: {
        calculationsTotal: healthMetrics.calculationsTotal.reduce((sum, m) => sum + m.value, 0),
        byStatus: healthCalculationsByStatus,
      },
      systemMetrics: {
        cpu: {
          userSeconds: systemMetrics.cpu.userSeconds,
          systemSeconds: systemMetrics.cpu.systemSeconds,
          totalSeconds: systemMetrics.cpu.totalSeconds,
        },
        memory: {
          residentBytes: systemMetrics.memory.residentBytes,
          heapUsedBytes: systemMetrics.memory.heapUsedBytes,
          heapTotalBytes: systemMetrics.memory.heapTotalBytes,
          externalBytes: systemMetrics.memory.externalBytes,
          rssBytes: systemMetrics.memory.rssBytes,
          heapUsagePercent:
            systemMetrics.memory.heapTotalBytes > 0
              ? (systemMetrics.memory.heapUsedBytes / systemMetrics.memory.heapTotalBytes) * 100
              : 0,
        },
        process: {
          uptimeSeconds: systemMetrics.process.uptimeSeconds,
          startTimeSeconds: systemMetrics.process.startTimeSeconds,
          pid: systemMetrics.process.pid,
        },
        eventLoop: {
          lagMs: Math.round(systemMetrics.eventLoop.lagSeconds * 1000),
          utilizationPercent: systemMetrics.eventLoop.utilizationPercent,
        },
      },
    };
  }
}
