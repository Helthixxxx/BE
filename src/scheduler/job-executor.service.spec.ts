import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { JobExecutorService } from "./job-executor.service";
import { ExecutionsService } from "../executions/executions.service";
import { HealthService } from "../health/health.service";
import { Job } from "../jobs/entities/job.entity";
import { HttpMethod } from "../common/types/http-method.enum";

const mockJob: Partial<Job> = {
  id: "job-1",
  url: "https://example.com/health",
  method: HttpMethod.GET,
  headers: null,
  body: null,
};

describe("JobExecutorService", () => {
  let service: JobExecutorService;
  let httpService: { get: jest.Mock; post: jest.Mock };
  let executionsService: { create: jest.Mock; updateResult: jest.Mock };
  let healthService: { updateHealthAndNotify: jest.Mock };

  beforeEach(async () => {
    httpService = {
      get: jest.fn().mockReturnValue(of({ status: 200, data: {} })),
      post: jest.fn().mockReturnValue(of({ status: 200, data: {} })),
    };

    executionsService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      updateResult: jest.fn().mockResolvedValue(undefined),
    };

    healthService = {
      updateHealthAndNotify: jest.fn().mockResolvedValue("NORMAL"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobExecutorService,
        { provide: HttpService, useValue: httpService },
        { provide: ExecutionsService, useValue: executionsService },
        { provide: HealthService, useValue: healthService },
        {
          provide: "CONFIGURATION(http)",
          useValue: { timeout: 30000, maxRedirects: 5 },
        },
      ],
    }).compile();

    service = module.get<JobExecutorService>(JobExecutorService);
    jest.clearAllMocks();
  });

  describe("executeJob", () => {
    it("Job 실행 성공", async () => {
      const scheduledAt = new Date();

      await service.executeJob(mockJob as Job, scheduledAt);

      expect(executionsService.create).toHaveBeenCalledWith("job-1", scheduledAt, expect.any(Date));
      expect(executionsService.updateResult).toHaveBeenCalled();
      expect(healthService.updateHealthAndNotify).toHaveBeenCalledWith("job-1");
    });

    it("중복 실행 시 조용히 종료", async () => {
      executionsService.create.mockRejectedValue(new Error("이미 존재하는 Execution입니다: xxx"));

      await service.executeJob(mockJob as Job, new Date());

      expect(healthService.updateHealthAndNotify).not.toHaveBeenCalled();
    });

    it("Execution 생성 후 HTTP 실패 시 updateResult에 에러 기록", async () => {
      const err = Object.assign(new Error("Connection refused"), { code: "ECONNREFUSED" });
      httpService.get.mockReturnValue(throwError(() => err));

      await service.executeJob(mockJob as Job, new Date());

      expect(executionsService.updateResult).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Date),
        false,
        null,
        "NETWORK_ERROR",
        expect.any(String),
        null,
      );
    });
  });
});
