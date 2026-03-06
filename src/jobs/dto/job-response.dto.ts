import { ApiProperty } from "@nestjs/swagger";
import { HttpMethod } from "../../common/types/http-method.enum";
import { Health } from "../../common/types/health.enum";

/**
 * Job 응답 DTO
 */
export class JobResponseDto {
  @ApiProperty({
    description: "Job ID (UUID)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "Job 이름",
    example: "API Health Check",
  })
  name: string;

  @ApiProperty({
    description: "활성화 여부",
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: "실행 주기 (분)",
    example: 5,
  })
  scheduleMinutes: number;

  @ApiProperty({
    description: "HTTP 메서드",
    enum: HttpMethod,
    example: HttpMethod.GET,
  })
  method: HttpMethod;

  @ApiProperty({
    description: "요청 URL",
    example: "https://api.example.com/health",
  })
  url: string;

  @ApiProperty({
    description: "요청 헤더 (선택적)",
    example: { "Content-Type": "application/json" },
    required: false,
    nullable: true,
  })
  headers?: Record<string, string> | null;

  @ApiProperty({
    description: "요청 본문 (선택적)",
    example: { key: "value" },
    required: false,
    nullable: true,
  })
  body?: Record<string, unknown> | null;

  @ApiProperty({
    description: "다음 실행 예정 시간",
    example: "2026-01-19T12:00:00.000Z",
    nullable: true,
  })
  nextRunAt: Date | null;

  @ApiProperty({
    description: "마지막 Health 상태",
    enum: Health,
    example: Health.NORMAL,
    nullable: true,
  })
  lastHealth: Health | null;

  @ApiProperty({
    description: "생성 시간",
    example: "2026-01-19T11:47:42.123Z",
  })
  createdAt: Date;

  @ApiProperty({
    description: "수정 시간",
    example: "2026-01-19T11:47:42.123Z",
  })
  updatedAt: Date;
}

/**
 * Job with Health 응답 DTO
 */
export class JobWithHealthResponseDto extends JobResponseDto {
  @ApiProperty({
    description: "현재 Health 상태",
    enum: Health,
    example: Health.NORMAL,
  })
  health: Health;
}

/**
 * Job 목록 응답 DTO
 */
export class JobListResponseDto {
  @ApiProperty({
    description: "Job 목록",
    type: [JobResponseDto],
  })
  items: JobResponseDto[];
}

/**
 * Job with Health 목록 응답 DTO
 */
export class JobWithHealthListResponseDto {
  @ApiProperty({
    description: "Job 목록 (Health 포함)",
    type: [JobWithHealthResponseDto],
  })
  items: JobWithHealthResponseDto[];
}
