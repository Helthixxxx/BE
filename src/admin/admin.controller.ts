import { Controller, Get, HttpStatus, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ErrorResponseDto } from "../common/types/response-docs.types";
import { UserRole } from "../users/entities/user.entity";
import { AdminService } from "./admin.service";
import { AdminApiErrorsQueryDto } from "./dto/admin-api-errors-query.dto";
import { AdminDashboardQueryDto } from "./dto/admin-dashboard-query.dto";
import {
  AdminDashboardApiErrorsResponseDto,
  AdminDashboardAppMetricsResponseDto,
  AdminDashboardCommonResponseDto,
  AdminDashboardOverviewResponseDto,
  AdminDashboardSettingsResponseDto,
} from "./dto/admin-dashboard-response.dto";
import { AdminSystemHealthQueryDto } from "./dto/admin-system-health-query.dto";
import { AdminSystemHealthResponseDto } from "./dto/admin-system-health-response.dto";

@ApiTags("admin")
@Controller("admin/dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("JWT-auth")
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("common")
  @ApiOperation({
    summary: "어드민 공통 메타 조회",
    description: "서비스 메타 정보와 전체 상태를 조회합니다. (ADMIN 전용)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "공통 메타 조회 성공",
    type: AdminDashboardCommonResponseDto,
    example: {
      meta: {
        requestId: "8b43f598-7d31-4fdc-bf53-9792d46fdb6e",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      data: {
        serviceName: "Helthix",
        serviceRegion: "ap-northeast-2",
        environment: "production",
        servicePlatformInfo: {
          framework: "nestjs",
          runtime: "node v22.14.0",
          language: "typescript",
          database: "postgresql",
          deployment: "docker",
          cloudProvider: "aws",
        },
        overallStatus: "degraded",
        overallStatusDescription: "성능 저하 상태의 활성 Job이 1건 있습니다.",
        activeJobs: 3,
        activeJobHealth: {
          total: 3,
          normal: 2,
          degraded: 1,
          failed: 0,
          unknown: 0,
        },
        lastUpdatedAt: "2026-03-09T07:58:10.000Z",
        generatedAt: "2026-03-09T08:00:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "인증 실패",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "8b43f598-7d31-4fdc-bf53-9792d46fdb6e",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "관리자 권한 없음",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "8b43f598-7d31-4fdc-bf53-9792d46fdb6e",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "FORBIDDEN",
        message: "권한이 없습니다.",
      },
    },
  })
  async getCommon() {
    return await this.adminService.getCommon();
  }

  @Get("overview")
  @ApiOperation({
    summary: "어드민 Overview 조회",
    description: "가동률, API 에러율, 요청 추이, 최근 API 에러를 집계합니다. (ADMIN 전용)",
  })
  @ApiQuery({ name: "hours", required: false, type: Number, example: 24 })
  @ApiQuery({ name: "bucketMinutes", required: false, type: Number, example: 60 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Overview 조회 성공",
    type: AdminDashboardOverviewResponseDto,
    example: {
      meta: {
        requestId: "93d7d067-a4ac-441f-a51c-3763b1886b6e",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      data: {
        window: {
          hours: 24,
          bucketMinutes: 60,
          startAt: "2026-03-08T08:00:00.000Z",
          endAt: "2026-03-09T08:00:00.000Z",
          previousStartAt: "2026-03-07T08:00:00.000Z",
          previousEndAt: "2026-03-08T08:00:00.000Z",
        },
        appAvailability: {
          value: 98.21,
          changeValue: -0.72,
          status: "warning",
          description: "최근 24시간 동안 완료된 실행 112건 중 110건이 성공했습니다.",
        },
        apiErrorRate: {
          value: 1.84,
          changeValue: 0.41,
          status: "warning",
          description: "최근 24시간 동안 수집된 API 요청 652건 중 오류 응답은 12건입니다.",
        },
        totalRequests: 652,
        successfulExecutions: 110,
        failedExecutions: 2,
        timeSeries: {
          apiRequests: [
            {
              timestamp: "2026-03-09T05:00:00.000Z",
              requestCount: 21,
            },
            {
              timestamp: "2026-03-09T06:00:00.000Z",
              requestCount: 33,
            },
            {
              timestamp: "2026-03-09T07:00:00.000Z",
              requestCount: 28,
            },
          ],
        },
        recentApiErrors: [
          {
            method: "POST",
            endpoint: "/auth/login",
            statusCode: 401,
            occurrenceCount: 5,
            lastOccurredAt: "2026-03-09T07:54:10.000Z",
          },
          {
            method: "GET",
            endpoint: "/jobs/health-check",
            statusCode: 500,
            occurrenceCount: 2,
            lastOccurredAt: "2026-03-09T07:40:22.000Z",
          },
        ],
        activeJobHealth: {
          total: 3,
          normal: 2,
          degraded: 1,
          failed: 0,
          unknown: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "쿼리 파라미터 검증 실패",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "93d7d067-a4ac-441f-a51c-3763b1886b6e",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: {
          hours: ["must not be greater than 168"],
          bucketMinutes: ["must not be less than 5"],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "인증 실패",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "93d7d067-a4ac-441f-a51c-3763b1886b6e",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "관리자 권한 없음",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "93d7d067-a4ac-441f-a51c-3763b1886b6e",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "FORBIDDEN",
        message: "권한이 없습니다.",
      },
    },
  })
  async getOverview(@Query() query: AdminDashboardQueryDto) {
    return await this.adminService.getOverview(query);
  }

  @Get("app-metrics")
  @ApiOperation({
    summary: "어드민 App Metrics 조회",
    description: "시간대별 요청/지연/에러 추이와 엔드포인트별 통계를 조회합니다. (ADMIN 전용)",
  })
  @ApiQuery({ name: "hours", required: false, type: Number, example: 24 })
  @ApiQuery({ name: "bucketMinutes", required: false, type: Number, example: 60 })
  @ApiQuery({ name: "topEndpointsLimit", required: false, type: Number, example: 5 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "App Metrics 조회 성공",
    type: AdminDashboardAppMetricsResponseDto,
    example: {
      meta: {
        requestId: "e7a03fd0-14a4-4581-9f1f-db2abf23a00f",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      data: {
        window: {
          hours: 24,
          bucketMinutes: 60,
          startAt: "2026-03-08T08:00:00.000Z",
          endAt: "2026-03-09T08:00:00.000Z",
          previousStartAt: "2026-03-07T08:00:00.000Z",
          previousEndAt: "2026-03-08T08:00:00.000Z",
        },
        timeSeries: [
          {
            timestamp: "2026-03-09T05:00:00.000Z",
            requestCount: 21,
            avgLatencyMs: 182.44,
            errorRate: 0,
            successCount: 21,
            clientErrorCount: 0,
            serverErrorCount: 0,
          },
          {
            timestamp: "2026-03-09T06:00:00.000Z",
            requestCount: 33,
            avgLatencyMs: 241.12,
            errorRate: 3.03,
            successCount: 32,
            clientErrorCount: 1,
            serverErrorCount: 0,
          },
          {
            timestamp: "2026-03-09T07:00:00.000Z",
            requestCount: 28,
            avgLatencyMs: 318.22,
            errorRate: 7.14,
            successCount: 26,
            clientErrorCount: 1,
            serverErrorCount: 1,
          },
        ],
        endpointStats: [
          {
            endpoint: "/auth/login",
            requestCount: 124,
            requestsPerSecond: 0.0014,
            p95LatencyMs: 412.33,
            errorRate: 4.03,
          },
          {
            endpoint: "/jobs",
            requestCount: 96,
            requestsPerSecond: 0.0011,
            p95LatencyMs: 188.2,
            errorRate: 0,
          },
        ],
        recentApiErrors: [
          {
            method: "POST",
            endpoint: "/auth/login",
            statusCode: 401,
            occurrenceCount: 5,
            lastOccurredAt: "2026-03-09T07:54:10.000Z",
          },
          {
            method: "GET",
            endpoint: "/jobs/health-check",
            statusCode: 500,
            occurrenceCount: 2,
            lastOccurredAt: "2026-03-09T07:40:22.000Z",
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "쿼리 파라미터 검증 실패",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "e7a03fd0-14a4-4581-9f1f-db2abf23a00f",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: {
          topEndpointsLimit: ["must not be greater than 20"],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "인증 실패",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "e7a03fd0-14a4-4581-9f1f-db2abf23a00f",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "관리자 권한 없음",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "e7a03fd0-14a4-4581-9f1f-db2abf23a00f",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "FORBIDDEN",
        message: "권한이 없습니다.",
      },
    },
  })
  async getAppMetrics(@Query() query: AdminDashboardQueryDto) {
    return await this.adminService.getAppMetrics(query);
  }

  @Get("api-errors")
  @ApiOperation({
    summary: "어드민 API 에러 상세 조회",
    description:
      "에러가 발생한 API 로그 상세 목록을 조회합니다. 메서드, 경로, 쿼리, 요청/응답 바디, 상태 코드 등을 포함합니다. (ADMIN 전용)",
  })
  @ApiQuery({ name: "hours", required: false, type: Number, example: 24 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "API 에러 상세 조회 성공",
    type: AdminDashboardApiErrorsResponseDto,
    example: {
      meta: {
        requestId: "314ecf6a-22cc-4724-8e4e-2b3a8e8989ed",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      data: {
        window: {
          hours: 24,
          bucketMinutes: 0,
          startAt: "2026-03-08T08:00:00.000Z",
          endAt: "2026-03-09T08:00:00.000Z",
          previousStartAt: "2026-03-08T08:00:00.000Z",
          previousEndAt: "2026-03-09T08:00:00.000Z",
        },
        limit: 20,
        items: [
          {
            id: "8c2ef4b1-a2be-4673-a4a0-0d1cab7eb05d",
            requestId: "3a554253-2d18-4408-aa88-0f8441b50d22",
            method: "POST",
            endpoint: "/auth/login",
            query: {
              redirect: "/admin",
            },
            statusCode: 401,
            durationMs: 322,
            requestBody: {
              providerId: "admin01",
              password: "***",
            },
            responseBody: {
              meta: {
                requestId: "3a554253-2d18-4408-aa88-0f8441b50d22",
                timestamp: "2026-03-09T07:54:10.000Z",
              },
              error: {
                code: "UNAUTHORIZED",
                message: "아이디 또는 비밀번호가 일치하지 않습니다.",
              },
            },
            errorMessage: "아이디 또는 비밀번호가 일치하지 않습니다.",
            userId: null,
            occurredAt: "2026-03-09T07:54:10.000Z",
          },
          {
            id: "1657c4bd-a8ff-4c9e-9d98-7688ee817a5f",
            requestId: "bf3aeb0e-ae52-406a-a600-a1007e471f01",
            method: "GET",
            endpoint: "/jobs/health-check",
            query: null,
            statusCode: 500,
            durationMs: 1089,
            requestBody: null,
            responseBody: {
              meta: {
                requestId: "bf3aeb0e-ae52-406a-a600-a1007e471f01",
                timestamp: "2026-03-09T07:40:22.000Z",
              },
              error: {
                code: "INTERNAL_ERROR",
                message: "Internal server error",
              },
            },
            errorMessage: "QueryFailedError: relation does not exist",
            userId: "550e8400-e29b-41d4-a716-446655440000",
            occurredAt: "2026-03-09T07:40:22.000Z",
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "쿼리 파라미터 검증 실패",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "314ecf6a-22cc-4724-8e4e-2b3a8e8989ed",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: {
          limit: ["must not be greater than 100"],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "인증 실패",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "314ecf6a-22cc-4724-8e4e-2b3a8e8989ed",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "관리자 권한 없음",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "314ecf6a-22cc-4724-8e4e-2b3a8e8989ed",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "FORBIDDEN",
        message: "권한이 없습니다.",
      },
    },
  })
  async getApiErrors(@Query() query: AdminApiErrorsQueryDto) {
    return await this.adminService.getApiErrors(query);
  }

  @Get("system-health")
  @ApiOperation({
    summary: "어드민 System Health 조회",
    description:
      "인프라 CPU/메모리/네트워크, 노드/파드(컨테이너) 현황 및 리소스 사용률 시계열을 조회합니다. Prometheus 연동 필요. (ADMIN 전용)",
  })
  @ApiQuery({ name: "range", required: false, enum: ["1h", "24h", "7d"], example: "24h" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "System Health 조회 성공",
    type: AdminSystemHealthResponseDto,
    example: {
      meta: {
        requestId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        timestamp: "2026-03-12T10:00:00.000Z",
      },
      data: {
        summary: {
          cpuUsagePercent: 42,
          memoryUsage: { usedGb: 21.8, totalGb: 32, percent: 68 },
          network: { inboundMbps: 125, outboundMbps: 89 },
        },
        timeSeries: {
          cpu: [{ timestamp: "2026-03-12T05:00:00.000Z", value: 42 }],
          memory: [{ timestamp: "2026-03-12T05:00:00.000Z", value: 68 }],
        },
        nodes: [
          {
            name: "node-helthix-01",
            role: "master",
            cpuPercent: 38,
            memoryPercent: 62,
            pods: 12,
            status: "ready",
          },
          {
            name: "node-helthix-02",
            role: "worker",
            cpuPercent: 55,
            memoryPercent: 71,
            pods: 18,
            status: "ready",
          },
        ],
        pods: [
          {
            name: "helthix",
            namespace: "default",
            ready: "1/1",
            restarts: 0,
            age: "3d",
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: "Prometheus 연결 실패",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "인증 실패",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "관리자 권한 없음",
    type: ErrorResponseDto,
  })
  async getSystemHealth(@Query() query: AdminSystemHealthQueryDto) {
    return await this.adminService.getSystemHealth(query);
  }

  @Get("settings")
  @ApiOperation({
    summary: "어드민 Settings 조회",
    description: "현재 코드베이스에서 실제 노출 가능한 시스템 설정값을 조회합니다. (ADMIN 전용)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Settings 조회 성공",
    type: AdminDashboardSettingsResponseDto,
    example: {
      meta: {
        requestId: "dc796f1f-848c-4d23-8e86-46970d7d8d53",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      data: {
        dashboardDefaults: {
          defaultRangeHours: 24,
          realtimeRefreshIntervalSeconds: 60,
          operatorViewPreset: "operations-overview",
          defaultBucketMinutes: 60,
        },
        runtimeConfig: {
          environment: "production",
          httpTimeoutMs: 30000,
          httpMaxRedirects: 5,
          healthDegradedThresholdMs: 800,
          healthGracePeriodMs: 120000,
          apiLogRetentionDays: 30,
          apiLogBodyMaxBytes: 10240,
          apiLogExcludedPaths: ["/health", "/api-docs", "/api-docs/*", "/favicon.ico"],
          dbPool: {
            maxConnections: 20,
            minConnections: 5,
            connectionTimeoutMs: 10000,
            idleTimeoutMs: 30000,
            acquireTimeoutMs: 10000,
            queryTimeoutMs: 30000,
          },
        },
        notificationChannels: {
          push: true,
          slack: false,
          pagerDuty: false,
          emailSummary: false,
          sms: false,
        },
        unsupportedSettings: [
          "infraCpuWarningThreshold",
          "apiErrorRateWarningThreshold",
          "dbConnectionWarningThreshold",
          "replicationLagWarningThreshold",
          "realtimeRefreshEnabled",
          "autoEscalationEnabled",
          "anomalyDetectionEnabled",
          "maintenanceMuteEnabled",
        ],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "인증 실패",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "dc796f1f-848c-4d23-8e86-46970d7d8d53",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "관리자 권한 없음",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "dc796f1f-848c-4d23-8e86-46970d7d8d53",
        timestamp: "2026-03-09T08:00:00.000Z",
      },
      error: {
        code: "FORBIDDEN",
        message: "권한이 없습니다.",
      },
    },
  })
  getSettings() {
    return this.adminService.getSettings();
  }
}
