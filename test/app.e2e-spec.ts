import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { DataSource } from "typeorm";
import { HealthController } from "../src/health.controller";

type HealthResponseBody = {
  status: "ok" | "degraded";
  checks: {
    database: string;
  };
};

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
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    return request(httpServer)
      .get("/health")
      .expect(200)
      .expect((res: request.Response) => {
        const body = res.body as HealthResponseBody;
        expect(body).toHaveProperty("status");
        expect(["ok", "degraded"]).toContain(body.status);
        expect(body).toHaveProperty("checks");
        expect(body.checks).toHaveProperty("database");
      });
  });
});
