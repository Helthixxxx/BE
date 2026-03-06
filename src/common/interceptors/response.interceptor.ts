import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";
import { SuccessResponse } from "../types/response.types";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept<T>(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.requestId as string;

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
