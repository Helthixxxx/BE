import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Request 타입 확장 (requestId 포함)
 */
interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * LoggingInterceptor
 * 모든 요청과 응답에 대한 상세 로깅
 * - 요청: 메서드, URL, 헤더, 쿼리, 바디, requestId
 * - 응답: 상태 코드, 응답 본문, requestId, 응답 시간
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;
    const url = request.url;
    const headers = request.headers as Record<string, unknown>;
    const query = request.query as Record<string, unknown>;
    const body = request.body as unknown;
    const requestId = request.requestId || 'unknown';

    // 요청 시작 시간 기록
    const startTime = Date.now();

    // 요청 로깅
    this.logRequest(requestId, method, url, headers, query, body);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          this.logResponse(
            requestId,
            method,
            url,
            response.statusCode,
            data,
            responseTime,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.logError(requestId, method, url, error, responseTime);
        },
      }),
    );
  }

  /**
   * 요청 로깅
   */
  private logRequest(
    requestId: string,
    method: string,
    url: string,
    headers: Record<string, unknown>,
    query: Record<string, unknown>,
    body: unknown,
  ): void {
    // 민감한 정보 마스킹
    const maskedHeaders = this.maskSensitiveHeaders(headers);
    const maskedBody = this.maskSensitiveFields(body);

    this.logger.log({
      type: 'REQUEST',
      requestId,
      method,
      url,
      headers: maskedHeaders,
      query: Object.keys(query).length > 0 ? query : undefined,
      body: maskedBody,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 응답 로깅
   */
  private logResponse(
    requestId: string,
    method: string,
    url: string,
    statusCode: number,
    data: unknown,
    responseTime: number,
  ): void {
    const maskedData = this.maskSensitiveFields(data);

    this.logger.log({
      type: 'RESPONSE',
      requestId,
      method,
      url,
      statusCode,
      data: maskedData,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 에러 로깅
   */
  private logError(
    requestId: string,
    method: string,
    url: string,
    error: unknown,
    responseTime: number,
  ): void {
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

    this.logger.error({
      type: 'ERROR',
      requestId,
      method,
      url,
      error: errorDetails,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 민감한 헤더 마스킹
   */
  private maskSensitiveHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const masked: Record<string, unknown> = { ...headers };

    for (const key of Object.keys(masked)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        masked[key] = '***';
      }
    }

    return masked;
  }

  /**
   * 민감한 필드 마스킹
   */
  private maskSensitiveFields(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.maskSensitiveFields(item));
    }

    const sensitiveFields = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'authorization',
    ];

    const masked: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
    };

    for (const key of Object.keys(masked)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        masked[key] = '***';
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveFields(masked[key]);
      }
    }

    return masked;
  }
}
