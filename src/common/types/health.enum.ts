/**
 * Health 상태 enum
 * NORMAL: 정상
 * DEGRADED: 응답 지연 (성능 저하 또는 일부 실패)
 * FAILED: 실패 (최근 3회 연속 실패 또는 실행 중단)
 */
export enum Health {
  NORMAL = "NORMAL",
  DEGRADED = "DEGRADED",
  FAILED = "FAILED",
}
