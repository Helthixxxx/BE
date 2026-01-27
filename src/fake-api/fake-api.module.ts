import { Module } from "@nestjs/common";
import { FakeApiController } from "./fake-api.controller";

/**
 * FakeApiModule
 * 테스트용 FAKE API 모듈
 * - 항상 200 정상 응답
 * - 항상 500 에러 응답
 * - N% 확률로 실패 응답
 * - N초 지연 응답
 */
@Module({
  controllers: [FakeApiController],
})
export class FakeApiModule {}
