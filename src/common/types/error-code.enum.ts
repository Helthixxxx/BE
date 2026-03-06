/** API 에러 코드 Enum */
export enum ErrorCode {
  /** 유효성 검사 실패 (400) */
  VALIDATION_ERROR = "VALIDATION_ERROR",
  /** 리소스를 찾을 수 없음 (404) */
  NOT_FOUND = "NOT_FOUND",
  /** 잘못된 요청 (400) */
  BAD_REQUEST = "BAD_REQUEST",
  /** 리소스 충돌 (409) */
  CONFLICT = "CONFLICT",
  /** 인증 실패 (401) */
  UNAUTHORIZED = "UNAUTHORIZED",
  /** 권한 없음 (403) */
  FORBIDDEN = "FORBIDDEN",
  /** 서버 내부 에러 (500) */
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}
