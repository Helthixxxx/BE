import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";
import { v4 as uuidv4 } from "uuid";

/**
 * Request 타입 확장 (requestId 포함)
 */
interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * LoggingInterceptor
 * 요청과 응답에 대한 간결한 로깅
 * - 입출력값만 깔끔하게 표시
 * - 헤더 정보 제외
 * - Health check는 간소화
 * - meta 포함, 배열 전체 표시
 * - Pino를 사용한 구조화된 로깅
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;
    // express 기준: originalUrl이 있으면 query string까지 포함된 원본 URL
    const url = (request as unknown as { originalUrl?: string }).originalUrl || request.url;
    const body = request.body as unknown;

    // requestId를 요청 단위로 1개 고정 (응답 meta/로그/예외에서 공통으로 사용)
    if (!request.requestId) {
      request.requestId = uuidv4();
    }
    const requestId = request.requestId;

    // 요청 시작 시간 기록
    const startTime = Date.now();

    // /health 는 ALB/모니터링 호출이 잦아 로그 노이즈가 크므로 스킵
    // (pino-http 자동 로깅에서도 제외 처리 필요: logger.module.ts 참고)
    const skipPaths = new Set(["/health", "/metrics"]);
    const isSkippedPath = skipPaths.has(request.url);
    if (isSkippedPath) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          this.logRequestResponse(
            method,
            url,
            body,
            response.statusCode,
            data,
            responseTime,
            requestId,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.logError(method, url, body, error, responseTime, requestId);
        },
      }),
    );
  }

  /**
   * 요청/응답 통합 로깅 (구조화된 JSON 로깅)
   */
  private logRequestResponse(
    method: string,
    url: string,
    body: unknown,
    statusCode: number,
    data: unknown,
    responseTime: number,
    requestId: string,
  ): void {
    // URL은 intercept()에서 originalUrl 우선으로 구성하므로 추가 조합하지 않음
    const fullUrl = url;

    // 구조화된 로그 객체 생성
    const logData: Record<string, unknown> = {
      type: "HTTP_REQUEST",
      method,
      url: fullUrl,
      statusCode,
      responseTime,
      requestId,
    };

    // 요청 바디가 있으면 추가 (민감 정보 마스킹)
    if (body && typeof body === "object" && Object.keys(body).length > 0) {
      logData.requestBody = this.maskSensitiveFields(body);
    }

    // 응답 데이터 추가 (민감 정보 마스킹)
    const maskedData = this.maskSensitiveFields(data);
    logData.response = maskedData;

    // 로그 레벨 결정
    if (statusCode >= 500) {
      this.logger.error(logData, `${method} ${fullUrl} | ${statusCode} | ${responseTime}ms`);
    } else if (statusCode >= 400) {
      this.logger.warn(logData, `${method} ${fullUrl} | ${statusCode} | ${responseTime}ms`);
    } else {
      this.logger.info(logData, `${method} ${fullUrl} | ${statusCode} | ${responseTime}ms`);
    }
  }

  /**
   * 에러 로깅 (구조화된 JSON 로깅)
   */
  private logError(
    method: string,
    url: string,
    body: unknown,
    error: unknown,
    responseTime: number,
    requestId: string,
  ): void {
    // URL은 intercept()에서 originalUrl 우선으로 구성하므로 추가 조합하지 않음
    const fullUrl = url;

    const errorObj = error as {
      name?: string;
      message?: string;
      stack?: string;
      response?: unknown;
      statusCode?: number;
    };

    // 구조화된 에러 로그 객체 생성
    const logData: Record<string, unknown> = {
      type: "HTTP_ERROR",
      method,
      url: fullUrl,
      responseTime,
      requestId,
      error: {
        name: errorObj?.name || "Unknown",
        message: errorObj?.message || String(error),
        stack: errorObj?.stack,
      },
    };

    // 요청 바디가 있으면 추가 (민감 정보 마스킹)
    if (body && typeof body === "object" && Object.keys(body).length > 0) {
      logData.requestBody = this.maskSensitiveFields(body);
    }

    // HTTP 상태 코드가 있으면 추가
    if (errorObj?.statusCode) {
      logData.statusCode = errorObj.statusCode;
    }

    // 에러 응답이 있으면 추가
    if (errorObj?.response) {
      logData.errorResponse = errorObj.response;
    }

    this.logger.error(logData, `${method} ${fullUrl} | ERROR | ${responseTime}ms`);
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
      "passwordHash",
      "refreshTokenHash",
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
}
