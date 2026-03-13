import { ApiProperty } from "@nestjs/swagger";
import { MetaDto } from "../../common/types/response-docs.types";

/** System Health 요약 카드 */
export class AdminSystemHealthSummaryDto {
  @ApiProperty({ example: 42, description: "클러스터 평균 CPU 사용률 (%)" })
  cpuUsagePercent: number;

  @ApiProperty({
    description: "메모리 사용량",
    example: { usedGb: 21.8, totalGb: 32, percent: 68 },
  })
  memoryUsage: {
    usedGb: number;
    totalGb: number;
    percent: number;
  };

  @ApiProperty({
    description: "네트워크 트래픽 (Mbps)",
    example: { inboundMbps: 125, outboundMbps: 89 },
  })
  network: {
    inboundMbps: number;
    outboundMbps: number;
  };
}

/** 시계열 데이터 포인트 */
export class AdminSystemHealthTimeSeriesPointDto {
  @ApiProperty({ example: "2026-03-12T05:00:00.000Z" })
  timestamp: string;

  @ApiProperty({ example: 42 })
  value: number;
}

/** 시계열 데이터 */
export class AdminSystemHealthTimeSeriesDto {
  @ApiProperty({ type: [AdminSystemHealthTimeSeriesPointDto], description: "CPU 사용률 추이 (%)" })
  cpu: AdminSystemHealthTimeSeriesPointDto[];

  @ApiProperty({
    type: [AdminSystemHealthTimeSeriesPointDto],
    description: "메모리 사용률 추이 (%)",
  })
  memory: AdminSystemHealthTimeSeriesPointDto[];
}

/** 노드 현황 */
export class AdminSystemHealthNodeDto {
  @ApiProperty({ example: "node-helthix-01" })
  name: string;

  @ApiProperty({ example: "master", description: "master | worker" })
  role: string;

  @ApiProperty({ example: 38 })
  cpuPercent: number;

  @ApiProperty({ example: 62 })
  memoryPercent: number;

  @ApiProperty({ example: 12, description: "파드(컨테이너) 수" })
  pods: number;

  @ApiProperty({ example: "ready", description: "ready | not_ready" })
  status: string;
}

/** 파드(컨테이너) 목록 */
export class AdminSystemHealthPodDto {
  @ApiProperty({ example: "helthix-api-718c9d-x2kp4" })
  name: string;

  @ApiProperty({ example: "default" })
  namespace: string;

  @ApiProperty({ example: "2/2", description: "Ready 상태 (ready/total)" })
  ready: string;

  @ApiProperty({ example: 0, description: "재시작 횟수" })
  restarts: number;

  @ApiProperty({ example: "3d", description: "생성 후 경과 시간" })
  age: string;
}

/** System Health 전체 응답 데이터 */
export class AdminSystemHealthDataDto {
  @ApiProperty({ type: AdminSystemHealthSummaryDto })
  summary: AdminSystemHealthSummaryDto;

  @ApiProperty({ type: AdminSystemHealthTimeSeriesDto })
  timeSeries: AdminSystemHealthTimeSeriesDto;

  @ApiProperty({ type: [AdminSystemHealthNodeDto] })
  nodes: AdminSystemHealthNodeDto[];

  @ApiProperty({ type: [AdminSystemHealthPodDto] })
  pods: AdminSystemHealthPodDto[];
}

export class AdminSystemHealthResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;

  @ApiProperty({ type: AdminSystemHealthDataDto })
  data: AdminSystemHealthDataDto;
}
