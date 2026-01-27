import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { PinoLogger } from "nestjs-pino";

/**
 * Request 타입 확장 (requestId 포함)
 */
interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * HttpException 응답 타입
 */
interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  code?: string;
  details?: Record<string, string[]>;
}

/**
 * GlobalExceptionFilter
 * 모든 예외를 meta + error 형태의 envelope로 통일
 * ValidationPipe에서 발생한 에러는 details에 필드별 에러를 포함
 * Pino를 사용한 구조화된 로깅
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    // requestId가 없으면 즉시 생성하여 request 객체에 저장
    if (!request.requestId) {
      // pino-http가 생성한 req.id가 있으면 그 값을 requestId로 승격(로그/응답 meta 일치 목적)
      const reqId = (request as unknown as { id?: string }).id;
      request.requestId = reqId || uuidv4();
    }
    const requestId = request.requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = "INTERNAL_ERROR";
    let message: string = "Internal server error";
    let details: Record<string, string[]> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 401/403 에러 코드 매핑
      if (exception instanceof UnauthorizedException) {
        // JWT 토큰 만료 또는 유효하지 않은 경우
        let errorMessage: string;
        if (typeof exceptionResponse === "string") {
          errorMessage = exceptionResponse;
        } else {
          const responseObj = exceptionResponse as HttpExceptionResponse;
          errorMessage =
            typeof responseObj?.message === "string"
              ? responseObj.message
              : exception.message;
        }
        if (
          errorMessage.includes("expired") ||
          errorMessage.includes("만료") ||
          errorMessage.includes("토큰")
        ) {
          errorCode = "TOKEN_EXPIRED";
        } else {
          errorCode = "UNAUTHORIZED";
        }
        message = errorMessage;
      } else if (exception instanceof ForbiddenException) {
        errorCode = "FORBIDDEN";
        if (typeof exceptionResponse === "string") {
          message = exceptionResponse;
        } else {
          const responseObj = exceptionResponse as HttpExceptionResponse;
          message =
            typeof responseObj?.message === "string"
              ? responseObj.message
              : exception.message;
        }
      } else if (
        typeof exceptionResponse === "object" &&
        exceptionResponse !== null
      ) {
        // NestJS ValidationPipe가 반환하는 형태 처리
        const responseObj = exceptionResponse as HttpExceptionResponse;

        if (responseObj.message && Array.isArray(responseObj.message)) {
          // Validation 에러인 경우
          errorCode = "VALIDATION_ERROR";
          message = "Invalid request";
          details = this.formatValidationErrors(responseObj.message);
        } else {
          errorCode = responseObj.error || responseObj.code || "HTTP_ERROR";
          message =
            typeof responseObj.message === "string"
              ? responseObj.message
              : exception.message;
          details = responseObj.details;
        }
      } else if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 에러 상세 로깅
    this.logError(request, exception, status, errorCode, message, details);

    const errorResponse = {
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
      },
    };

    response.status(status).json(errorResponse);
  }

  /**
   * 에러 상세 로깅 (구조화된 JSON 로깅)
   */
  private logError(
    request: RequestWithId,
    exception: unknown,
    status: number,
    errorCode: string,
    message: string,
    details?: Record<string, string[]>,
  ): void {
    const method = request.method;
    const url = request.url;
    const headers = request.headers as Record<string, unknown>;
    const query = request.query as Record<string, unknown>;
    const body = request.body as unknown;
    const requestId = request.requestId || "unknown";

    // 민감한 정보 마스킹
    const maskedHeaders = this.maskSensitiveHeaders(headers);
    const maskedBody = this.maskSensitiveFields(body);

    const errorLog: Record<string, unknown> = {
      type: "EXCEPTION",
      requestId,
      method,
      url,
      statusCode: status,
      errorCode,
      message,
      request: {
        headers: maskedHeaders,
        query: Object.keys(query).length > 0 ? query : undefined,
        body: maskedBody,
      },
      exception: {
        name: exception instanceof Error ? exception.name : "Unknown",
        message:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      },
    };

    // details가 있으면 추가
    if (details) {
      errorLog.details = details;
    }

    // 500 에러는 error 레벨로, 그 외는 warn 레벨로 로깅
    if (status >= 500) {
      this.logger.error(errorLog, `Exception: ${errorCode} - ${message}`);
    } else {
      this.logger.warn(errorLog, `Exception: ${errorCode} - ${message}`);
    }
  }

  /**
   * 민감한 헤더 마스킹
   */
  private maskSensitiveHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
    const masked: Record<string, unknown> = { ...headers };

    for (const key of Object.keys(masked)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        masked[key] = "***";
      }
    }

    return masked;
  }

  /**
   * 민감한 필드 마스킹
   */
  private maskSensitiveFields(data: unknown): unknown {
    if (!data || typeof data !== "object") {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.maskSensitiveFields(item));
    }

    const sensitiveFields = [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "secret",
      "apiKey",
      "authorization",
    ];

    const masked: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
    };

    for (const key of Object.keys(masked)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        masked[key] = "***";
      } else if (typeof masked[key] === "object" && masked[key] !== null) {
        masked[key] = this.maskSensitiveFields(masked[key]);
      }
    }

    return masked;
  }

  /**
   * ValidationPipe의 에러 메시지를 필드별로 그룹화
   * 예: ["name should not be empty", "url must be a URL"]
   * → { name: ["should not be empty"], url: ["must be a URL"] }
   */
  private formatValidationErrors(messages: string[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const msg of messages) {
      // "property should not be empty" 형태를 파싱
      const match = msg.match(/^(\w+)\s+(.+)$/);
      if (match) {
        const [, property, errorMsg] = match;
        if (!result[property]) {
          result[property] = [];
        }
        result[property].push(errorMsg);
      } else {
        // 파싱 실패 시 전체 메시지를 사용
        if (!result["_general"]) {
          result["_general"] = [];
        }
        result["_general"].push(msg);
      }
    }

    return result;
  }
}
