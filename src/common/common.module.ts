import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { RequestIdMiddleware } from "./middleware/request-id.middleware";

/**
 * CommonModule
 * 공통 미들웨어, 인터셉터, 필터를 제공하는 모듈
 */
@Module({})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
