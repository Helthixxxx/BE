import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';

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
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.requestId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message: string = 'Internal server error';
    let details: Record<string, string[]> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 401/403 에러 코드 매핑
      if (exception instanceof UnauthorizedException) {
        // JWT 토큰 만료 또는 유효하지 않은 경우
        let errorMessage: string;
        if (typeof exceptionResponse === 'string') {
          errorMessage = exceptionResponse;
        } else {
          const responseObj = exceptionResponse as HttpExceptionResponse;
          errorMessage =
            typeof responseObj?.message === 'string'
              ? responseObj.message
              : exception.message;
        }
        if (
          errorMessage.includes('expired') ||
          errorMessage.includes('만료') ||
          errorMessage.includes('토큰')
        ) {
          errorCode = 'TOKEN_EXPIRED';
        } else {
          errorCode = 'UNAUTHORIZED';
        }
        message = errorMessage;
      } else if (exception instanceof ForbiddenException) {
        errorCode = 'FORBIDDEN';
        if (typeof exceptionResponse === 'string') {
          message = exceptionResponse;
        } else {
          const responseObj = exceptionResponse as HttpExceptionResponse;
          message =
            typeof responseObj?.message === 'string'
              ? responseObj.message
              : exception.message;
        }
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        // NestJS ValidationPipe가 반환하는 형태 처리
        const responseObj = exceptionResponse as HttpExceptionResponse;

        if (responseObj.message && Array.isArray(responseObj.message)) {
          // Validation 에러인 경우
          errorCode = 'VALIDATION_ERROR';
          message = 'Invalid request';
          details = this.formatValidationErrors(responseObj.message);
        } else {
          errorCode = responseObj.error || responseObj.code || 'HTTP_ERROR';
          message =
            typeof responseObj.message === 'string'
              ? responseObj.message
              : exception.message;
          details = responseObj.details;
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
      },
    });
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
        if (!result['_general']) {
          result['_general'] = [];
        }
        result['_general'].push(msg);
      }
    }

    return result;
  }
}
