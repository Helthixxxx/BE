import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ValidationError } from "class-validator";
import { ErrorCode } from "../types/error-code.enum";
import { ErrorDetails } from "../types/response.types";
import { ApiLogsService } from "../../api-logs/api-logs.service";

/**
 * HttpException 응답 타입
 */
interface HttpExceptionResponse {
  message?: string | string[] | ValidationError[];
  error?: string;
  code?: string;
  details?: Record<string, string[]>;
}

type BadRequestMessageRule = {
  result: string;
  test: (normalizedMessage: string) => boolean;
};

const BAD_REQUEST_ALLOWED_MESSAGES = new Set([
  "JSON 형식이 올바르지 않습니다.",
  "요청 본문이 필요합니다.",
  "요청 본문은 객체 형태여야 합니다.",
  "잘못된 요청입니다.",
]);

const BAD_REQUEST_MESSAGE_RULES: BadRequestMessageRule[] = [
  {
    result: "요청 본문은 객체 형태여야 합니다.",
    test: (s) =>
      s.includes("is not valid json") &&
      (s.includes("unexpected token '\"'") || s.includes('unexpected token "')),
  },
  {
    result: "요청 본문은 객체 형태여야 합니다.",
    test: (s) =>
      s.includes("unexpected token") &&
      s.includes("at position 0") &&
      [
        'unexpected token "',
        "unexpected token '\"'",
        "unexpected token 0",
        "unexpected token 1",
        "unexpected token 2",
        "unexpected token 3",
        "unexpected token 4",
        "unexpected token 5",
        "unexpected token 6",
        "unexpected token 7",
        "unexpected token 8",
        "unexpected token 9",
        "unexpected token t",
        "unexpected token f",
        "unexpected token n",
        "unexpected token -",
        "unexpected number",
        "unexpected string",
      ].some((keyword) => s.includes(keyword)),
  },
  {
    result: "JSON 형식이 올바르지 않습니다.",
    test: (s) =>
      s.includes("unexpected token") ||
      s.includes("is not valid json") ||
      s.includes("json at position"),
  },
  {
    result: "요청 본문이 필요합니다.",
    test: (s) =>
      s.includes("unexpected end of json input") ||
      s.includes("request body is required") ||
      s.includes("body is required"),
  },
  {
    result: "요청 본문은 객체 형태여야 합니다.",
    test: (s) =>
      s.includes("must be an object") ||
      s.includes("body must be an object") ||
      s.includes("should be an object"),
  },
];

/**
 * ValidationError 여부 확인
 */
function isValidationError(obj: unknown): obj is ValidationError {
  return typeof obj === "object" && obj !== null && "property" in obj && "constraints" in obj;
}

function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.values(ErrorCode).includes(value as ErrorCode);
}

type RequestWithStartAt = Request & { startAt?: number };

/**
 * GlobalExceptionFilter
 * 모든 예외를 meta + error 형태의 envelope로 통일
 * ValidationPipe에서 발생한 에러는 details에 필드별 에러를 포함
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly apiLogsService: ApiLogsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.requestId as string;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    let message: string = "서버 내부 오류가 발생했습니다.";
    let details: ErrorDetails | undefined = undefined;

    const getMessageFromResponse = (res: unknown, fallback: string): string => {
      if (typeof res === "string") return res;
      if (typeof res !== "object" || res === null) return fallback;
      if (!("message" in res)) return fallback;

      const msg = (res as { message: unknown }).message;
      if (Array.isArray(msg)) {
        const first = (msg as unknown[])[0];
        if (typeof first === "string") return first;
        if (isValidationError(first) && first.constraints) {
          return Object.values(first.constraints)[0] ?? fallback;
        }
        return typeof first === "string" ? first : fallback;
      }
      return typeof msg === "string" ? msg : String(msg);
    };

    /** BadRequest 에러 메시지 정제 - JSON 파싱 에러 등을 사용자 친화적 메시지로 변환 */
    const sanitizeBadRequestMessage = (raw: string): string => {
      if (BAD_REQUEST_ALLOWED_MESSAGES.has(raw)) return raw;

      const s = raw.toLowerCase();
      for (const rule of BAD_REQUEST_MESSAGE_RULES) {
        if (rule.test(s)) {
          return rule.result;
        }
      }

      return "잘못된 요청입니다.";
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as unknown;

      if (exception instanceof UnauthorizedException) {
        errorCode = ErrorCode.UNAUTHORIZED;
        message = getMessageFromResponse(exceptionResponse, "인증이 필요합니다.");
      } else if (exception instanceof ForbiddenException) {
        errorCode = ErrorCode.FORBIDDEN;
        message = getMessageFromResponse(exceptionResponse, "접근 권한이 없습니다.");
      } else if (exception instanceof BadRequestException) {
        const responseObj =
          typeof exceptionResponse === "object" && exceptionResponse !== null
            ? (exceptionResponse as HttpExceptionResponse)
            : null;

        if (responseObj?.message && Array.isArray(responseObj.message)) {
          const validationErrors = responseObj.message.filter(isValidationError);

          if (validationErrors.length > 0) {
            errorCode = ErrorCode.VALIDATION_ERROR;
            details = this.formatValidationErrorsFromObjects(validationErrors);
            message = this.getFirstErrorMessage(validationErrors);
          } else {
            errorCode = ErrorCode.BAD_REQUEST;
            const raw =
              typeof responseObj.message[0] === "string"
                ? responseObj.message[0]
                : "잘못된 요청입니다.";
            message = sanitizeBadRequestMessage(raw);
          }
        } else {
          errorCode = ErrorCode.BAD_REQUEST;
          message = sanitizeBadRequestMessage(
            getMessageFromResponse(exceptionResponse, "잘못된 요청입니다."),
          );
        }
      } else if (exception instanceof NotFoundException) {
        errorCode = ErrorCode.NOT_FOUND;
        message = getMessageFromResponse(exceptionResponse, "리소스를 찾을 수 없습니다.");
      } else if (exception instanceof ConflictException) {
        errorCode = ErrorCode.CONFLICT;
        message = getMessageFromResponse(exceptionResponse, "리소스가 이미 존재합니다.");
      } else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const responseObj = exceptionResponse as HttpExceptionResponse;

        if (responseObj.message && Array.isArray(responseObj.message)) {
          const validationErrors = responseObj.message.filter(isValidationError);

          if (validationErrors.length > 0) {
            errorCode = ErrorCode.VALIDATION_ERROR;
            details = this.formatValidationErrorsFromObjects(validationErrors);
            message = this.getFirstErrorMessage(validationErrors);
          } else {
            const stringMessages = responseObj.message.filter(
              (m): m is string => typeof m === "string",
            );
            if (stringMessages.length > 0) {
              errorCode = ErrorCode.VALIDATION_ERROR;
              details = this.formatValidationErrorsFromStrings(stringMessages);
              message = "유효성 검사에 실패했습니다.";
            } else {
              errorCode = this.resolveErrorCode(responseObj.error, ErrorCode.BAD_REQUEST);
              message = getMessageFromResponse(exceptionResponse, "오류가 발생했습니다.");
            }
          }
        } else {
          if (Number(status) >= 500) {
            errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
            message = "서버 내부 오류가 발생했습니다.";
          } else {
            errorCode = this.resolveErrorCode(
              responseObj.code,
              this.resolveErrorCode(responseObj.error),
            );
            message = getMessageFromResponse(exceptionResponse, "오류가 발생했습니다.");
          }
          details = responseObj.details;
        }
      } else if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

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

    this.saveErrorLog(request, status, message, errorResponse);

    response.status(status).json(errorResponse);
  }

  private saveErrorLog(
    request: RequestWithStartAt,
    statusCode: number,
    errorMessage: string,
    errorResponse: object,
  ): void {
    if (this.apiLogsService.isExcludedPath(request.path)) {
      return;
    }

    const startAt = request.startAt ?? Date.now();
    const durationMs = Date.now() - startAt;
    const url = request.originalUrl?.split("?")[0] ?? request.path;
    const query =
      Object.keys(request.query ?? {}).length > 0
        ? (request.query as Record<string, unknown>)
        : null;
    const user = request.user as { id?: string } | undefined;

    this.apiLogsService.saveLog({
      requestId: (request.requestId as string) ?? "",
      method: request.method,
      url,
      query,
      statusCode,
      durationMs,
      requestBody: request.body,
      responseBody: errorResponse,
      userId: user?.id ?? undefined,
      errorMessage,
    });
  }

  /**
   * ValidationError[]를 details 형태로 변환
   */
  private formatValidationErrorsFromObjects(validationErrors: ValidationError[]): ErrorDetails {
    const details: ErrorDetails = {};

    for (const error of validationErrors) {
      this.appendValidationErrorDetails(error, details);
    }

    return details;
  }

  /**
   * string[] (ValidationPipe 기본 형식)을 details 형태로 변환
   * 예: ["name should not be empty", "url must be a URL"]
   */
  private formatValidationErrorsFromStrings(messages: string[]): ErrorDetails {
    const result: ErrorDetails = {};

    for (const msg of messages) {
      const match = msg.match(/^(\w+)\s+(.+)$/);
      if (match) {
        const [, property, errorMsg] = match;
        if (!result[property]) {
          result[property] = [];
        }
        result[property].push(errorMsg);
      } else {
        if (!result["_general"]) {
          result["_general"] = [];
        }
        result["_general"].push(msg);
      }
    }

    return result;
  }

  /** 첫 번째 필드의 첫 번째 에러 메시지 추출 */
  private getFirstErrorMessage(validationErrors: ValidationError[]): string {
    if (validationErrors.length === 0) {
      return "유효성 검사에 실패했습니다.";
    }

    for (const validationError of validationErrors) {
      const foundMessage = this.findFirstConstraintMessage(validationError);
      if (foundMessage) {
        return foundMessage;
      }
    }

    return "유효성 검사에 실패했습니다.";
  }

  private resolveErrorCode(value: unknown, fallback: ErrorCode = ErrorCode.BAD_REQUEST): ErrorCode {
    if (isErrorCode(value)) {
      return value;
    }
    return fallback;
  }

  private appendValidationErrorDetails(
    error: ValidationError,
    details: ErrorDetails,
    parentPath?: string,
  ): void {
    const currentPath = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      details[currentPath] = Object.values(error.constraints);
    }

    if (error.children && error.children.length > 0) {
      for (const child of error.children) {
        this.appendValidationErrorDetails(child, details, currentPath);
      }
    }
  }

  private findFirstConstraintMessage(error: ValidationError): string | undefined {
    if (error.constraints) {
      const constraintValues = Object.values(error.constraints);
      if (constraintValues.length > 0) {
        return constraintValues[0];
      }
    }

    if (error.children && error.children.length > 0) {
      for (const child of error.children) {
        const foundMessage = this.findFirstConstraintMessage(child);
        if (foundMessage) {
          return foundMessage;
        }
      }
    }

    return undefined;
  }
}
