import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { DataSource } from "typeorm";
import { HealthController } from "../src/health.controller";

/**
 * E2E 테스트 - Health 엔드포인트
 * 실제 DB 연결 없이 HealthController만 테스트
 */
describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: {
            query: jest.fn().mockResolvedValue([{ "1": 1 }]),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health (GET) - 200 및 status 반환", () => {
    return request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("status");
        expect(["ok", "degraded"]).toContain(res.body.status);
        expect(res.body).toHaveProperty("checks");
        expect(res.body.checks).toHaveProperty("database");
      });
  });
});
