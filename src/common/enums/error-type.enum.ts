/**
 * Execution 실패 유형 enum
 * NONE: 성공
 * HTTP_ERROR: HTTP 에러 (4xx, 5xx)
 * TIMEOUT: 타임아웃
 * NETWORK_ERROR: 네트워크 에러
 * UNKNOWN: 알 수 없는 에러
 */
export enum ErrorType {
  NONE = "NONE",
  HTTP_ERROR = "HTTP_ERROR",
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN = "UNKNOWN",
}
