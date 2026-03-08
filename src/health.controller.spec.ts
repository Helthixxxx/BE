import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn().mockResolvedValue([{ "1": 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: dataSource }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("DB 연결 시 status ok", async () => {
    const result = await controller.health();

    expect(result.status).toBe("ok");
    expect(result.checks.database).toBe("connected");
    expect(result.instanceId).toBeDefined();
    expect(result.uptime).toBeDefined();
  });

  it("DB 연결 실패 시 status degraded", async () => {
    dataSource.query.mockRejectedValueOnce(new Error("Connection failed"));

    const result = await controller.health();

    expect(result.status).toBe("degraded");
    expect(result.checks.database).toBe("disconnected");
  });
});
