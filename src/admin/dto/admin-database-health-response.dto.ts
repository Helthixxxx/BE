import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MetaDto } from "../../common/types/response-docs.types";

/** 커넥션 풀 요약 */
export class AdminDatabaseHealthConnectionPoolDto {
  @ApiProperty({ example: 42, description: "활성 커넥션 수" })
  active: number;

  @ApiProperty({ example: 100, description: "최대 커넥션 수" })
  max: number;

  @ApiProperty({ example: 28, description: "유휴(Idle) 커넥션 수" })
  idle: number;

  @ApiPropertyOptional({ example: 0, description: "대기 중인 커넥션 수", nullable: true })
  waiting?: number;
}

/** Database Health 요약 카드 */
export class AdminDatabaseHealthSummaryDto {
  @ApiProperty({ type: AdminDatabaseHealthConnectionPoolDto })
  connectionPool: AdminDatabaseHealthConnectionPoolDto;

  @ApiPropertyOptional({
    example: 1250,
    description: "초당 읽기 처리량 (Prometheus postgres_exporter)",
    nullable: true,
  })
  readQps?: number | null;

  @ApiPropertyOptional({
    example: 340,
    description: "초당 쓰기 처리량 (Prometheus postgres_exporter)",
    nullable: true,
  })
  writeQps?: number | null;

  @ApiPropertyOptional({
    example: null,
    description: "Replica 지연(ms). 미사용 시 null",
    nullable: true,
  })
  replicaLagMs?: number | null;
}

/** 슬로우 쿼리 항목 */
export class AdminSlowQueryDto {
  @ApiProperty({ example: "SELECT * FROM users WHERE created_at > $1 ORDER BY created_at DESC" })
  query: string;

  @ApiProperty({ example: 2450, description: "평균 실행 시간 (ms)" })
  meanExecTimeMs: number;

  @ApiProperty({ example: 12, description: "호출 횟수" })
  calls: number;
}

/** QPS 시계열 포인트 */
export class AdminDatabaseQpsPointDto {
  @ApiProperty({ example: "2026-03-14T05:00:00.000Z" })
  timestamp: string;

  @ApiProperty({ example: 1200 })
  value: number;
}

/** Database Health 전체 응답 데이터 */
export class AdminDatabaseHealthDataDto {
  @ApiProperty({ type: AdminDatabaseHealthSummaryDto })
  summary: AdminDatabaseHealthSummaryDto;

  @ApiProperty({
    type: AdminDatabaseHealthConnectionPoolDto,
    description: "커넥션 풀 상세 현황",
  })
  connectionPoolStatus: AdminDatabaseHealthConnectionPoolDto;

  @ApiPropertyOptional({
    type: [AdminSlowQueryDto],
    description: "슬로우 쿼리 목록. pg_stat_statements 비활성화 시 null",
    nullable: true,
  })
  slowQueries?: AdminSlowQueryDto[] | null;

  @ApiPropertyOptional({
    example: "pg_stat_statements 확장이 비활성화되어 있습니다. RDS 파라미터 그룹에 추가 후 DB 재부팅이 필요합니다.",
    description: "슬로우 쿼리 미제공 시 안내 문구",
    nullable: true,
  })
  slowQueriesInfoMessage?: string | null;

  @ApiProperty({
    description: "QPS 추이 시계열",
    properties: {
      read: { type: "array", items: { $ref: "#/components/schemas/AdminDatabaseQpsPointDto" } },
      write: { type: "array", items: { $ref: "#/components/schemas/AdminDatabaseQpsPointDto" } },
    },
  })
  qpsTrend: {
    read: AdminDatabaseQpsPointDto[];
    write: AdminDatabaseQpsPointDto[];
  };
}

export class AdminDatabaseHealthResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ type: AdminDatabaseHealthDataDto })
  data: AdminDatabaseHealthDataDto;
}
