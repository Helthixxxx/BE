import { ApiProperty } from "@nestjs/swagger";

/**
 * Health 상태별 집계 DTO
 */
export class HealthCountsDto {
  @ApiProperty({
    description:
      "NORMAL 상태인 Job 수. 모든 Health 체크를 통과한 정상 상태의 Job입니다.",
    example: 6,
    minimum: 0,
  })
  NORMAL: number;

  @ApiProperty({
    description:
      "DEGRADED 상태인 Job 수. 성능 저하가 감지되었지만 완전히 실패하지는 않은 상태입니다. " +
      "응답 시간이 이전 평균 대비 50% 이상 느려지거나 절대 임계값을 초과한 경우입니다.",
    example: 1,
    minimum: 0,
  })
  DEGRADED: number;

  @ApiProperty({
    description:
      "FAILED 상태인 Job 수. 최근 2회 연속 실패하거나 실행이 중단된 상태입니다. " +
      "즉시 조치가 필요한 심각한 장애 상태입니다.",
    example: 1,
    minimum: 0,
  })
  FAILED: number;
}

/**
 * Job 통계 DTO
 */
export class JobStatsDto {
  @ApiProperty({
    description:
      "전체 Job 수. 시스템에 등록된 모든 Job의 총 개수입니다 (비활성화된 Job 포함).",
    example: 10,
    minimum: 0,
  })
  total: number;

  @ApiProperty({
    description:
      "활성화된 Job 수. 현재 실행 중인 Job의 개수입니다 (isActive=true). " +
      "비활성화된 Job은 스케줄러에 의해 실행되지 않습니다.",
    example: 8,
    minimum: 0,
  })
  active: number;

  @ApiProperty({
    description:
      "Health 상태별 Job 수 집계. 활성화된 Job만 집계됩니다. " +
      "각 Job의 Health 상태는 실시간으로 계산되며, 최근 Execution 결과를 기반으로 판단됩니다.",
    type: HealthCountsDto,
  })
  byHealth: HealthCountsDto;
}

/**
 * 최근 24시간 Execution 통계 DTO
 */
export class Last24hExecutionStatsDto {
  @ApiProperty({
    description:
      "최근 24시간 동안 실행된 Execution 총 수. " +
      "모든 활성화된 Job의 Execution을 합산한 값입니다.",
    example: 1200,
    minimum: 0,
  })
  total: number;

  @ApiProperty({
    description:
      "성공한 Execution 수. HTTP 요청이 성공적으로 완료된 경우입니다 (HTTP 상태 코드 200-399). " +
      "성공률 계산: success / total * 100",
    example: 1150,
    minimum: 0,
  })
  success: number;

  @ApiProperty({
    description:
      "실패한 Execution 수. HTTP 요청이 실패하거나 타임아웃, 네트워크 에러가 발생한 경우입니다. " +
      "실패율 계산: failed / total * 100",
    example: 50,
    minimum: 0,
  })
  failed: number;

  @ApiProperty({
    description:
      "평균 실행 시간 (밀리초). durationMs가 null인 Execution은 제외됩니다. " +
      "HTTP 요청 시작부터 완료까지의 시간을 의미합니다. " +
      "성능 모니터링에 중요한 지표입니다.",
    example: 245.5,
    minimum: 0,
  })
  avgDuration: number;
}

/**
 * Execution Duration 통계 DTO
 */
export class ExecutionDurationStatsDto {
  @ApiProperty({
    description: "평균 실행 시간 (초)",
    example: 0.245,
    minimum: 0,
  })
  avgSeconds: number;

  @ApiProperty({
    description: "P50 실행 시간 (초). 중앙값입니다.",
    example: 0.2,
    minimum: 0,
  })
  p50Seconds: number;

  @ApiProperty({
    description: "P95 실행 시간 (초). 95%의 요청이 이 시간 이내에 완료됩니다.",
    example: 0.5,
    minimum: 0,
  })
  p95Seconds: number;

  @ApiProperty({
    description: "P99 실행 시간 (초). 99%의 요청이 이 시간 이내에 완료됩니다.",
    example: 1.0,
    minimum: 0,
  })
  p99Seconds: number;
}

/**
 * Execution Overall 통계 DTO
 */
export class ExecutionOverallStatsDto {
  @ApiProperty({
    description: "전체 Execution 총 수",
    example: 5000,
    minimum: 0,
  })
  total: number;

  @ApiProperty({
    description: "상태별 Execution 수",
    example: {
      success: 4800,
      failed: 200,
    },
  })
  byStatus: Record<string, number>;

  @ApiProperty({
    description: "실행 시간 통계",
    type: ExecutionDurationStatsDto,
  })
  duration: ExecutionDurationStatsDto;
}

/**
 * Execution 통계 DTO
 */
export class ExecutionStatsDto {
  @ApiProperty({
    description:
      "최근 24시간 Execution 통계. " +
      "현재 시점으로부터 24시간 전까지의 모든 Execution을 집계합니다. " +
      "대시보드에서 일일 성능 추이를 확인하는 데 사용됩니다.",
    type: Last24hExecutionStatsDto,
  })
  last24h: Last24hExecutionStatsDto;

  @ApiProperty({
    description:
      "전체 Execution 통계. 애플리케이션 시작 이후의 모든 Execution을 집계합니다. " +
      "백분위수 지표를 포함합니다.",
    type: ExecutionOverallStatsDto,
  })
  overall: ExecutionOverallStatsDto;
}

/**
 * HTTP Duration 통계 DTO
 */
export class HttpDurationStatsDto {
  @ApiProperty({
    description: "평균 HTTP 응답 시간 (밀리초)",
    example: 245.5,
    minimum: 0,
  })
  avgMs: number;

  @ApiProperty({
    description: "P50 HTTP 응답 시간 (밀리초). 중앙값입니다.",
    example: 200,
    minimum: 0,
  })
  p50Ms: number;

  @ApiProperty({
    description: "P95 HTTP 응답 시간 (밀리초). 95%의 요청이 이 시간 이내에 완료됩니다.",
    example: 500,
    minimum: 0,
  })
  p95Ms: number;

  @ApiProperty({
    description: "P99 HTTP 응답 시간 (밀리초). 99%의 요청이 이 시간 이내에 완료됩니다.",
    example: 1000,
    minimum: 0,
  })
  p99Ms: number;
}

/**
 * HTTP Size 통계 DTO
 */
export class HttpSizeStatsDto {
  @ApiProperty({
    description: "평균 HTTP 요청 크기 (바이트)",
    example: 1024,
    minimum: 0,
  })
  avgRequestBytes: number;

  @ApiProperty({
    description: "평균 HTTP 응답 크기 (바이트)",
    example: 2048,
    minimum: 0,
  })
  avgResponseBytes: number;
}

/**
 * HTTP Percentile by Route DTO
 */
export class HttpPercentileByRouteDto {
  @ApiProperty({
    description: "HTTP 메서드",
    example: "GET",
  })
  method: string;

  @ApiProperty({
    description: "라우트 패턴",
    example: "/jobs",
  })
  route: string;

  @ApiProperty({
    description: "P50 응답 시간 (밀리초)",
    example: 200,
  })
  p50Ms: number;

  @ApiProperty({
    description: "P95 응답 시간 (밀리초)",
    example: 500,
  })
  p95Ms: number;

  @ApiProperty({
    description: "P99 응답 시간 (밀리초)",
    example: 1000,
  })
  p99Ms: number;
}

/**
 * HTTP 통계 DTO
 */
export class HttpStatsDto {
  @ApiProperty({
    description: "전체 HTTP 요청 수. 애플리케이션 시작 이후 누적된 총 요청 수입니다.",
    example: 12500,
    minimum: 0,
  })
  totalRequests: number;

  @ApiProperty({
    description:
      "HTTP 상태 코드별 요청 수. 각 상태 코드(200, 400, 500 등)로 분류된 요청 수입니다. " +
      "에러율 계산에 사용됩니다.",
    example: {
      "200": 12000,
      "400": 50,
      "500": 10,
    },
  })
  byStatus: Record<string, number>;

  @ApiProperty({
    description:
      "HTTP 메서드별 요청 수. GET, POST, PATCH, DELETE 등 메서드별 요청 수입니다.",
    example: {
      GET: 10000,
      POST: 2000,
      PATCH: 400,
      DELETE: 100,
    },
  })
  byMethod: Record<string, number>;

  @ApiProperty({
    description:
      "HTTP 응답 시간 통계. 평균 및 백분위수(P50, P95, P99)를 포함합니다. " +
      "프로덕션 모니터링에 필수적인 지표입니다.",
    type: HttpDurationStatsDto,
  })
  duration: HttpDurationStatsDto;

  @ApiProperty({
    description:
      "HTTP 요청/응답 크기 통계. 평균 요청 크기와 평균 응답 크기를 포함합니다.",
    type: HttpSizeStatsDto,
  })
  size: HttpSizeStatsDto;

  @ApiProperty({
    description:
      "라우트별 백분위수 지표. 각 라우트별로 P50, P95, P99 응답 시간을 제공합니다. " +
      "느린 엔드포인트를 식별하는 데 사용됩니다.",
    type: [HttpPercentileByRouteDto],
  })
  percentilesByRoute: HttpPercentileByRouteDto[];
}

/**
 * CPU 메트릭 DTO
 */
export class CpuMetricsDto {
  @ApiProperty({
    description: "사용자 CPU 시간 (초). 프로세스가 사용자 모드에서 사용한 CPU 시간입니다.",
    example: 123.45,
    minimum: 0,
  })
  userSeconds: number;

  @ApiProperty({
    description: "시스템 CPU 시간 (초). 프로세스가 커널 모드에서 사용한 CPU 시간입니다.",
    example: 45.67,
    minimum: 0,
  })
  systemSeconds: number;

  @ApiProperty({
    description: "총 CPU 시간 (초). 사용자 + 시스템 CPU 시간의 합입니다.",
    example: 169.12,
    minimum: 0,
  })
  totalSeconds: number;
}

/**
 * 메모리 메트릭 DTO
 */
export class MemoryMetricsDto {
  @ApiProperty({
    description: "Resident 메모리 사용량 (바이트). 실제 물리 메모리 사용량입니다.",
    example: 52428800,
    minimum: 0,
  })
  residentBytes: number;

  @ApiProperty({
    description: "Heap 사용량 (바이트). Node.js 힙 메모리 중 현재 사용 중인 메모리입니다.",
    example: 31457280,
    minimum: 0,
  })
  heapUsedBytes: number;

  @ApiProperty({
    description: "Heap 총량 (바이트). Node.js 힙 메모리의 총 할당된 메모리입니다.",
    example: 67108864,
    minimum: 0,
  })
  heapTotalBytes: number;

  @ApiProperty({
    description: "External 메모리 사용량 (바이트). V8 외부 메모리 사용량입니다.",
    example: 1048576,
    minimum: 0,
  })
  externalBytes: number;

  @ApiProperty({
    description: "RSS 메모리 사용량 (바이트). Resident Set Size입니다.",
    example: 52428800,
    minimum: 0,
  })
  rssBytes: number;

  @ApiProperty({
    description: "Heap 사용률 (%). heapUsedBytes / heapTotalBytes * 100",
    example: 46.9,
    minimum: 0,
    maximum: 100,
  })
  heapUsagePercent: number;
}

/**
 * Event Loop 메트릭 DTO
 */
export class EventLoopMetricsDto {
  @ApiProperty({
    description: "Event Loop 지연 시간 (밀리초). 높을수록 성능 저하를 의미합니다.",
    example: 5.2,
    minimum: 0,
  })
  lagMs: number;

  @ApiProperty({
    description: "Event Loop 사용률 (%). 100%에 가까울수록 부하가 높습니다.",
    example: 15.5,
    minimum: 0,
    maximum: 100,
  })
  utilizationPercent: number;
}

/**
 * 프로세스 메트릭 DTO
 */
export class ProcessMetricsDto {
  @ApiProperty({
    description: "프로세스 업타임 (초). 애플리케이션이 시작된 이후 경과한 시간입니다.",
    example: 86400,
    minimum: 0,
  })
  uptimeSeconds: number;

  @ApiProperty({
    description: "프로세스 시작 시간 (Unix timestamp 초 단위)",
    example: 1706342400,
    minimum: 0,
  })
  startTimeSeconds: number;

  @ApiProperty({
    description: "프로세스 ID",
    example: 12345,
    minimum: 0,
  })
  pid: number;
}

/**
 * 시스템 메트릭 DTO
 */
export class SystemMetricsDto {
  @ApiProperty({
    description: "CPU 사용량 메트릭",
    type: CpuMetricsDto,
  })
  cpu: CpuMetricsDto;

  @ApiProperty({
    description: "메모리 사용량 메트릭",
    type: MemoryMetricsDto,
  })
  memory: MemoryMetricsDto;

  @ApiProperty({
    description: "프로세스 메트릭",
    type: ProcessMetricsDto,
  })
  process: ProcessMetricsDto;

  @ApiProperty({
    description: "Event Loop 메트릭. Node.js 이벤트 루프 성능 지표입니다.",
    type: EventLoopMetricsDto,
  })
  eventLoop: EventLoopMetricsDto;
}

/**
 * Job Execution Percentile DTO
 */
export class JobExecutionPercentileDto {
  @ApiProperty({
    description: "Job ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  jobId: string;

  @ApiProperty({
    description: "P50 실행 시간 (초)",
    example: 0.2,
  })
  p50Seconds: number;

  @ApiProperty({
    description: "P95 실행 시간 (초)",
    example: 0.5,
  })
  p95Seconds: number;

  @ApiProperty({
    description: "P99 실행 시간 (초)",
    example: 1.0,
  })
  p99Seconds: number;
}

/**
 * Job Health Status DTO
 */
export class JobHealthStatusDto {
  @ApiProperty({
    description: "Job ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  jobId: string;

  @ApiProperty({
    description: "Health 상태",
    example: "NORMAL",
    enum: ["NORMAL", "DEGRADED", "FAILED"],
  })
  status: string;
}

/**
 * Job 메트릭 DTO
 */
export class JobMetricsDto {
  @ApiProperty({
    description: "Job 실행 시간 백분위수 (Job별)",
    type: [JobExecutionPercentileDto],
  })
  executionDuration: {
    percentilesByJob: JobExecutionPercentileDto[];
  };

  @ApiProperty({
    description: "Job Health 상태 목록",
    type: [JobHealthStatusDto],
  })
  healthStatus: JobHealthStatusDto[];
}

/**
 * Health 메트릭 DTO
 */
export class HealthMetricsDto {
  @ApiProperty({
    description: "Health 계산 총 수",
    example: 8750,
    minimum: 0,
  })
  calculationsTotal: number;

  @ApiProperty({
    description: "Health 상태별 계산 수",
    example: {
      NORMAL: 8500,
      DEGRADED: 200,
      FAILED: 50,
    },
  })
  byStatus: Record<string, number>;
}

/**
 * 데이터베이스 메트릭 DTO
 */
export class DatabaseMetricsDto {
  @ApiProperty({
    description: "데이터베이스 쿼리 실행 시간 통계",
    example: {
      avgSeconds: 0.012,
      totalQueries: 5000,
    },
  })
  queryDuration: {
    avgSeconds: number;
    totalQueries: number;
  };

  @ApiProperty({
    description: "활성 데이터베이스 연결 수",
    example: 5,
    minimum: 0,
  })
  connectionsActive: number;
}

/**
 * 알림 메트릭 DTO
 */
export class NotificationMetricsDto {
  @ApiProperty({
    description: "전체 알림 발송 수",
    example: 150,
    minimum: 0,
  })
  totalSent: number;

  @ApiProperty({
    description: "전체 알림 실패 수",
    example: 5,
    minimum: 0,
  })
  totalFailed: number;

  @ApiProperty({
    description: "알림 타입별 통계 (push, email 등)",
    example: {
      push: {
        sent: 150,
        failed: 5,
      },
    },
  })
  byType: Record<string, { sent: number; failed: number }>;

  @ApiProperty({
    description: "알림 성공률 (%)",
    example: 96.77,
    minimum: 0,
    maximum: 100,
  })
  successRate: number;
}

/**
 * 대시보드 메트릭 응답 DTO
 * 
 * 어드민 페이지의 대시보드에 표시할 집계 메트릭입니다.
 * 실시간으로 계산되며, 시스템의 전반적인 상태를 한눈에 파악할 수 있습니다.
 * 
 * **프로덕션 수준의 모니터링 지표:**
 * - RED 메트릭 (Rate, Errors, Duration): HTTP 요청 수, 에러율, 응답 시간 백분위수
 * - Four Golden Signals (Google SRE): Latency, Traffic, Errors, Saturation
 * - 비즈니스 메트릭: Job 실행 통계, Health 상태 분포
 * - 시스템 리소스: CPU, 메모리, Event Loop 성능
 * 
 * **사용 예시:**
 * - 전체 시스템 상태: `jobStats.byHealth`로 Health 상태 분포 확인
 * - 일일 성능: `executionStats.last24h`로 최근 24시간 성능 추이 확인
 * - 성공률 모니터링: `executionStats.last24h.success / executionStats.last24h.total * 100`
 * - HTTP 에러율: `httpStats.byStatus["5xx"] / httpStats.totalRequests * 100`
 * - 메모리 사용률: `systemMetrics.memory.heapUsagePercent`
 * - 느린 엔드포인트 식별: `httpStats.percentilesByRoute`에서 P95/P99가 높은 라우트 확인
 * - Job 성능 분석: `jobMetrics.executionDuration.percentilesByJob`로 느린 Job 식별
 */
export class DashboardMetricsResponseDto {
  @ApiProperty({
    description:
      "Job 관련 통계. 시스템에 등록된 Job의 상태와 Health 분포를 나타냅니다. " +
      "대시보드의 주요 지표로 사용됩니다.",
    type: JobStatsDto,
  })
  jobStats: JobStatsDto;

  @ApiProperty({
    description:
      "Execution 관련 통계. Job 실행 이력과 성능 지표를 나타냅니다. " +
      "시스템의 안정성과 성능을 평가하는 데 사용됩니다. " +
      "최근 24시간 통계와 전체 통계(백분위수 포함)를 제공합니다.",
    type: ExecutionStatsDto,
  })
  executionStats: ExecutionStatsDto;

  @ApiProperty({
    description:
      "HTTP 요청 통계. 애플리케이션의 HTTP API 사용 현황을 나타냅니다. " +
      "요청 수, 상태 코드별 분포, 메서드별 분포, 응답 시간 백분위수(P50, P95, P99), " +
      "요청/응답 크기 통계, 라우트별 백분위수를 포함합니다.",
    type: HttpStatsDto,
  })
  httpStats: HttpStatsDto;

  @ApiProperty({
    description:
      "Job 메트릭. 개별 Job의 실행 시간 백분위수와 Health 상태를 제공합니다. " +
      "느린 Job을 식별하고 Health 상태를 모니터링하는 데 사용됩니다.",
    type: JobMetricsDto,
  })
  jobMetrics: JobMetricsDto;

  @ApiProperty({
    description:
      "Health 계산 메트릭. Health 계산 횟수와 상태별 분포를 제공합니다.",
    type: HealthMetricsDto,
  })
  healthMetrics: HealthMetricsDto;

  @ApiProperty({
    description:
      "데이터베이스 메트릭. 데이터베이스 쿼리 성능과 연결 상태를 나타냅니다. " +
      "쿼리 실행 시간 통계와 활성 연결 수를 포함합니다.",
    type: DatabaseMetricsDto,
  })
  databaseMetrics: DatabaseMetricsDto;

  @ApiProperty({
    description:
      "알림 메트릭. 알림 발송 현황을 나타냅니다. " +
      "발송 수, 실패 수, 타입별 통계, 성공률을 포함합니다.",
    type: NotificationMetricsDto,
  })
  notificationMetrics: NotificationMetricsDto;

  @ApiProperty({
    description:
      "시스템 메트릭. 서버의 리소스 사용 현황을 나타냅니다. " +
      "CPU 사용량, 메모리 사용량(Heap, RSS, External), 프로세스 정보, " +
      "Event Loop 성능 지표를 포함합니다.",
    type: SystemMetricsDto,
  })
  systemMetrics: SystemMetricsDto;
}
