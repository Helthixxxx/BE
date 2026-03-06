import { ErrorCode } from "./error-code.enum";

/** 응답 메타 정보 */
export interface MetaResponse {
  requestId: string;
  timestamp: string;
}

/** 성공 응답 타입 */
export interface SuccessResponse<T = unknown> {
  meta: MetaResponse;
  data?: T;
}

/** 에러 상세 정보 */
export interface ErrorDetails {
  [field: string]: string[];
}

/** 에러 응답 타입 */
export interface ErrorResponse {
  meta: MetaResponse;
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails;
  };
}
