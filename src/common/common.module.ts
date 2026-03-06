import { Module, NestModule, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { RequestIdMiddleware } from "./middleware/request-id.middleware";
import { GlobalExceptionFilter } from "./filters/global-exception.filter";
import { ResponseEnvelopeInterceptor } from "./interceptors/response-envelope.interceptor";

/**
 * CommonModule
 * 공통 미들웨어, 인터셉터, 필터를 제공하는 모듈
 */
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
  ],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
