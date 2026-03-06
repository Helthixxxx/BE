/** Health 상태 enum */
export enum Health {
  /** 정상 */
  NORMAL = "NORMAL",
  /** 응답 지연 (성능 저하 또는 일부 실패) */
  DEGRADED = "DEGRADED",
  /** 실패 (최근 3회 연속 실패 또는 실행 중단) */
  FAILED = "FAILED",
}
