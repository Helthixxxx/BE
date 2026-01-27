import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { RequestIdMiddleware } from "./middleware/request-id.middleware";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { GlobalExceptionFilter } from "./filters/global-exception.filter";
import { MetricsInterceptor } from "./metrics/metrics.interceptor";
import { DbMetricsInstrumentationService } from "./metrics/db-metrics-instrumentation.service";

/**
 * CommonModule
 * 공통 미들웨어, 인터셉터, 필터를 제공하는 모듈
 */
@Module({
  providers: [
    LoggingInterceptor,
    GlobalExceptionFilter,
    MetricsInterceptor,
    DbMetricsInstrumentationService,
  ],
  exports: [LoggingInterceptor, GlobalExceptionFilter, MetricsInterceptor],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
