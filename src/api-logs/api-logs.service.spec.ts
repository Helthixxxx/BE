import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { ApiLogsService } from "./api-logs.service";
import { ApiLog } from "./entities/api-log.entity";

describe("ApiLogsService", () => {
  let service: ApiLogsService;
  let apiLogRepository: { create: jest.Mock; save: jest.Mock; createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    apiLogRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      }),
    };

    const configService = {
      get: jest.fn().mockReturnValue({
        bodyMaxBytes: 10240,
        maskedFields: ["password", "refreshToken", "accessToken"],
        excludedPaths: ["/health", "/api-docs"],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiLogsService,
        { provide: getRepositoryToken(ApiLog), useValue: apiLogRepository },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ApiLogsService>(ApiLogsService);
    jest.clearAllMocks();
  });

  describe("isExcludedPath", () => {
    it("/health는 제외", () => {
      expect(service.isExcludedPath("/health")).toBe(true);
    });

    it("/api-docs/foo는 제외 (prefix)", () => {
      expect(service.isExcludedPath("/api-docs/foo")).toBe(true);
    });

    it("/jobs는 제외 아님", () => {
      expect(service.isExcludedPath("/jobs")).toBe(false);
    });
  });

  describe("saveLog", () => {
    it("로그 저장 호출", () => {
      service.saveLog({
        requestId: "req-1",
        method: "GET",
        url: "/jobs",
        query: {},
        statusCode: 200,
        durationMs: 10,
      });

      expect(apiLogRepository.create).toHaveBeenCalled();
      expect(apiLogRepository.save).toHaveBeenCalled();
    });

    it("민감 필드 마스킹", () => {
      service.saveLog({
        requestId: "req-1",
        method: "POST",
        url: "/auth/login",
        query: {},
        statusCode: 200,
        durationMs: 10,
        requestBody: { providerId: "u", password: "secret" },
      });

      const createCall = apiLogRepository.create.mock.calls[0][0];
      expect(createCall.requestBody).toEqual({ providerId: "u", password: "***" });
    });
  });

  describe("deleteOlderThan", () => {
    it("지정 기간 이전 로그 삭제", async () => {
      const result = await service.deleteOlderThan(30);

      expect(result).toBe(5);
    });
  });
});
