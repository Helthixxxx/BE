import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";
import { ApiLogsService } from "../../api-logs/api-logs.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly apiLogsService: ApiLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    if (this.apiLogsService.isExcludedPath(request.path)) {
      return next.handle();
    }

    const startAt = Date.now();
    const requestId = (request.requestId as string) ?? "";
    const method = request.method;
    const url = request.originalUrl?.split("?")[0] ?? request.path;
    const query =
      Object.keys(request.query ?? {}).length > 0
        ? (request.query as Record<string, unknown>)
        : null;
    const requestBody = request.body as Record<string, unknown>;

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const durationMs = Date.now() - startAt;
          const user = request.user as { id?: string } | undefined;
          const userId = user?.id ?? null;
          const response = ctx.getResponse<Response>();
          const statusCode = response.statusCode;

          this.apiLogsService.saveLog({
            requestId,
            method,
            url,
            query,
            statusCode,
            durationMs,
            requestBody,
            responseBody: responseData,
            userId: userId ?? undefined,
          });
        },
      }),
    );
  }
}
