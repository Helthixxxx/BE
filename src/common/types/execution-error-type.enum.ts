/** Execution 에러 유형 enum */
export enum ExecutionErrorCode {
  /** 성공 */
  NONE = "NONE",
  /** HTTP 에러 (4xx, 5xx) */
  HTTP_ERROR = "HTTP_ERROR",
  /** 타임아웃 */
  TIMEOUT = "TIMEOUT",
  /** 네트워크 에러 */
  NETWORK_ERROR = "NETWORK_ERROR",
  /** 알 수 없는 에러 */
  UNKNOWN = "UNKNOWN",
}
