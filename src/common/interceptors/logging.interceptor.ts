import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";

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
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;
    const url = request.url;
    const query = request.query as Record<string, unknown>;
    const body = request.body as unknown;

    // 요청 시작 시간 기록
    const startTime = Date.now();

    // Health check는 간소화
    const isHealthCheck = url === "/health";

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          this.logRequestResponse(
            method,
            url,
            query,
            body,
            response.statusCode,
            data,
            responseTime,
            isHealthCheck,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.logError(method, url, query, body, error, responseTime);
        },
      }),
    );
  }

  /**
   * 요청/응답 통합 로깅 (여러 줄로 가독성 있게 표시)
   */
  private logRequestResponse(
    method: string,
    url: string,
    query: Record<string, unknown>,
    body: unknown,
    statusCode: number,
    data: unknown,
    responseTime: number,
    isHealthCheck: boolean,
  ): void {
    // Health check는 간소화
    if (isHealthCheck) {
      this.logger.log(`→ ${method} ${url} | ${statusCode} | ${responseTime}ms`);
      return;
    }

    // URL에 쿼리 파라미터 추가
    let fullUrl = url;
    const queryKeys = Object.keys(query);
    if (queryKeys.length > 0) {
      const queryString = queryKeys
        .map((key) => `${key}=${this.formatValue(query[key])}`)
        .join("&");
      fullUrl = `${url}?${queryString}`;
    }

    // 상태 코드에 따른 이모지
    const statusEmoji = statusCode >= 500 ? "❌" : statusCode >= 400 ? "⚠️" : "✅";

    // 요청 정보 로깅
    let requestInfo = `${statusEmoji} ${method} ${fullUrl} | ${statusCode} | ${responseTime}ms`;

    // 요청 바디가 있으면 표시
    if (body && typeof body === "object" && Object.keys(body).length > 0) {
      const maskedBody = this.maskSensitiveFields(body);
      const bodyJson = JSON.stringify(maskedBody, null, 2);
      requestInfo += `\nRequest Body:\n${bodyJson}`;
    }

    // 응답 데이터 포맷팅 (meta 포함, 배열 전체 표시)
    const maskedData = this.maskSensitiveFields(data);
    const responseJson = JSON.stringify(maskedData, null, 2);

    this.logger.log(`${requestInfo}\nResponse:\n${responseJson}`);
  }

  /**
   * 에러 로깅
   */
  private logError(
    method: string,
    url: string,
    query: Record<string, unknown>,
    body: unknown,
    error: unknown,
    responseTime: number,
  ): void {
    // URL에 쿼리 파라미터 추가
    let fullUrl = url;
    const queryKeys = Object.keys(query);
    if (queryKeys.length > 0) {
      const queryString = queryKeys
        .map((key) => `${key}=${this.formatValue(query[key])}`)
        .join("&");
      fullUrl = `${url}?${queryString}`;
    }

    // 요청 바디가 있으면 표시
    let requestInfo = `❌ ${method} ${fullUrl} | ERROR | ${responseTime}ms`;
    if (body && typeof body === "object" && Object.keys(body).length > 0) {
      const maskedBody = this.maskSensitiveFields(body);
      const bodyJson = JSON.stringify(maskedBody, null, 2);
      requestInfo += `\nRequest Body:\n${bodyJson}`;
    }

    const errorObj = error as {
      name?: string;
      message?: string;
      stack?: string;
      response?: unknown;
    };

    const errorDetails: Record<string, unknown> = {};
    if (errorObj?.name) errorDetails.name = errorObj.name;
    if (errorObj?.message) errorDetails.message = errorObj.message;
    if (errorObj?.stack) errorDetails.stack = errorObj.stack;
    if (errorObj?.response) errorDetails.response = errorObj.response;

    const errorJson = JSON.stringify(errorDetails, null, 2);

    this.logger.error(`${requestInfo}\nError:\n${errorJson}`);
  }

  /**
   * 값 포맷팅 (간단한 형태로)
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "null";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return JSON.stringify(value);
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
