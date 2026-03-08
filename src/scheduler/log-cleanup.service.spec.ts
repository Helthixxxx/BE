import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ApiLogsService } from "../api-logs/api-logs.service";
import { LogCleanupService } from "./log-cleanup.service";

describe("LogCleanupService", () => {
  let service: LogCleanupService;
  let apiLogsService: { deleteOlderThan: jest.Mock };

  beforeEach(async () => {
    apiLogsService = {
      deleteOlderThan: jest.fn().mockResolvedValue(5),
    };

    const configService = {
      get: jest.fn().mockReturnValue({ retentionDays: 30 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogCleanupService,
        { provide: ApiLogsService, useValue: apiLogsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<LogCleanupService>(LogCleanupService);
    jest.clearAllMocks();
  });

  it("handleApiLogCleanup 실행 시 deleteOlderThan 호출", async () => {
    await service.handleApiLogCleanup();

    expect(apiLogsService.deleteOlderThan).toHaveBeenCalledWith(30);
  });

  it("retentionDays가 없으면 30 사용", async () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const module2 = await Test.createTestingModule({
      providers: [
        LogCleanupService,
        { provide: ApiLogsService, useValue: apiLogsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    const svc = module2.get<LogCleanupService>(LogCleanupService);

    await svc.handleApiLogCleanup();

    expect(apiLogsService.deleteOlderThan).toHaveBeenCalledWith(30);
  });
});
