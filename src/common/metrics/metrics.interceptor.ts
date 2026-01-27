import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";
import { MetricsService } from "./metrics.service";

/**
 * Request 타입 확장 (requestId 포함)
 */
interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * MetricsInterceptor
 * HTTP 요청/응답 메트릭 자동 수집
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;
    const route = this.getRoute(request.url);

    // 요청 시작 시간 기록
    const startTime = Date.now();

    // 요청 크기 계산
    const requestSize = this.calculateRequestSize(request);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const responseSize = this.calculateResponseSize(data);

          // 메트릭 기록
          this.metricsService.recordHttpRequest(
            method,
            route,
            response.statusCode,
            duration,
            requestSize,
            responseSize,
          );
        },
        error: (error: unknown) => {
          const duration = Date.now() - startTime;
          const statusCode =
            error && typeof error === "object" && "status" in error
              ? (error.status as number)
              : 500;

          // 메트릭 기록 (에러인 경우)
          this.metricsService.recordHttpRequest(method, route, statusCode, duration);
        },
      }),
    );
  }

  /**
   * URL에서 route 추출 (파라미터 제거)
   * 예: /jobs/123 -> /jobs/:id
   */
  private getRoute(url: string): string {
    // 쿼리 파라미터 제거
    const path = url.split("?")[0];

    // UUID 패턴을 :id로 치환
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    let route = path.replace(uuidPattern, ":id");

    // 숫자 ID 패턴을 :id로 치환
    route = route.replace(/\/\d+/g, "/:id");

    return route || "/";
  }

  /**
   * 요청 크기 계산 (바이트)
   */
  private calculateRequestSize(request: Request): number | undefined {
    try {
      const contentLength = request.get("content-length");
      if (contentLength) {
        return parseInt(contentLength, 10);
      }

      // body가 있으면 JSON 문자열 길이로 추정
      if (request.body) {
        return JSON.stringify(request.body).length;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 응답 크기 계산 (바이트)
   */
  private calculateResponseSize(data: unknown): number | undefined {
    try {
      if (data === null || data === undefined) {
        return 0;
      }

      return JSON.stringify(data).length;
    } catch {
      return undefined;
    }
  }
}
