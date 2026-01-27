import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * Request 타입 확장 (requestId 포함)
 */
interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * 응답 Envelope 타입
 */
interface ResponseEnvelope<T> {
  meta: {
    requestId: string;
    timestamp: string;
  };
  data?: T;
}

/**
 * ResponseEnvelopeInterceptor
 * 성공 응답(2xx)을 meta + data 형태의 envelope로 감싸기
 * meta에는 requestId와 timestamp를 포함
 * data가 null이거나 undefined인 경우 data 필드를 포함하지 않음
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept<T>(context: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<T>> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    // requestId가 없으면 즉시 생성하여 request 객체에 저장
    if (!request.requestId) {
      // pino-http가 생성한 req.id가 있으면 그 값을 requestId로 승격(로그/응답 meta 일치 목적)
      const reqId = (request as unknown as { id?: string }).id;
      request.requestId = reqId || uuidv4();
    }
    const requestId = request.requestId;

    return next.handle().pipe(
      map((data: T) => {
        const response: ResponseEnvelope<T> = {
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
