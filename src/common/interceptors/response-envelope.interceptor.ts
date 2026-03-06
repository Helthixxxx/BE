import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";
import { SuccessResponse } from "../types/response.types";
import { randomUUID } from "crypto";

/**
 * ResponseEnvelopeInterceptor
 * 성공 응답(2xx)을 meta + data 형태의 envelope로 감싸기
 * meta에는 requestId와 timestamp를 포함
 * data가 null이거나 undefined인 경우 data 필드를 포함하지 않음
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept<T>(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.requestId || randomUUID();

    return next.handle().pipe(
      map((data: T) => {
        const response: SuccessResponse<T> = {
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };

        // data가 null이나 undefined가 아닌 경우에만 포함
        if (data !== null && data !== undefined) {
          response.data = data;
        }

        return response;
      }),
    );
  }
}
