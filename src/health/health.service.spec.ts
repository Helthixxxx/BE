import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { HealthService } from "./health.service";
import { JobsService } from "../jobs/jobs.service";
import { ExecutionsService } from "../executions/executions.service";
import { NotificationLogsService } from "../notification-logs/notification-logs.service";
import { NotificationsService } from "../notifications/notifications.service";
import { Health } from "../common/types/health.enum";

const createExecution = (overrides: Partial<{
  id: number;
  success: boolean;
  durationMs: number | null;
  finishedAt: Date | null;
  createdAt: Date;
}> = {}) => ({
  id: 1,
  jobId: "job-1",
  success: true,
  durationMs: 100,
  finishedAt: new Date(),
  createdAt: new Date(),
  ...overrides,
});

describe("HealthService", () => {
  let service: HealthService;
  let jobsService: { findOneInternal: jest.Mock; findOneWithLock: jest.Mock };
  let executionsService: { findRecentByJobId: jest.Mock };

  beforeEach(async () => {
    jobsService = {
      findOneInternal: jest.fn().mockResolvedValue({
        id: "job-1",
        nextRunAt: new Date(Date.now() + 60000),
      }),
      findOneWithLock: jest.fn().mockResolvedValue({
        id: "job-1",
        name: "Test",
        nextRunAt: new Date(Date.now() + 60000),
        lastHealth: Health.NORMAL,
        lastNotificationSentAt: null,
        lastNotificationHealth: null,
      }),
    };

    executionsService = {
      findRecentByJobId: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: JobsService, useValue: jobsService },
        { provide: ExecutionsService, useValue: executionsService },
        {
          provide: NotificationLogsService,
          useValue: { updateStatus: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { sendPushNotification: jest.fn().mockResolvedValue({ success: true, recipientCount: 1 }) },
        },
        {
          provide: "CONFIGURATION(health)",
          useValue: {
            gracePeriodMs: 120000,
            degradedThresholdMs: 800,
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((fn) =>
              fn({
                getRepository: jest.fn().mockReturnValue({
                  create: jest.fn().mockImplementation((d) => d),
                  save: jest.fn().mockResolvedValue({ id: "log-1" }),
                  update: jest.fn(),
                }),
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    jest.clearAllMocks();
  });

  describe("calculateHealth", () => {
    it("Execution이 없으면 NORMAL", async () => {
      executionsService.findRecentByJobId.mockResolvedValue([]);

      const result = await service.calculateHealth("job-1");

      expect(result).toBe(Health.NORMAL);
    });

    it("최근 2회 연속 실패 시 FAILED", async () => {
      executionsService.findRecentByJobId.mockResolvedValue([
        createExecution({ id: 1, success: false, finishedAt: new Date() }),
        createExecution({ id: 2, success: false, finishedAt: new Date() }),
      ]);

      const result = await service.calculateHealth("job-1");

      expect(result).toBe(Health.FAILED);
    });

    it("성공 execution 10개 이상이고 평균이 임계값 초과 시 DEGRADED", async () => {
      const executions = Array.from({ length: 10 }, (_, i) =>
        createExecution({ id: i, success: true, durationMs: 900 }),
      );
      executionsService.findRecentByJobId
        .mockResolvedValueOnce(executions)
        .mockResolvedValueOnce([]);

      const result = await service.calculateHealth("job-1");

      expect(result).toBe(Health.DEGRADED);
    });

    it("정상이면 NORMAL", async () => {
      const executions = Array.from({ length: 10 }, (_, i) =>
        createExecution({ id: i, success: true, durationMs: 100 }),
      );
      executionsService.findRecentByJobId
        .mockResolvedValueOnce(executions)
        .mockResolvedValueOnce(
          Array.from({ length: 20 }, (_, i) =>
            createExecution({ id: i + 10, success: true, durationMs: 100 }),
          ),
        );

      const result = await service.calculateHealth("job-1");

      expect(result).toBe(Health.NORMAL);
    });

    it("nextRunAt + gracePeriod 초과 시 FAILED", async () => {
      const pastDate = new Date(Date.now() - 200000);
      jobsService.findOneInternal.mockResolvedValue({
        id: "job-1",
        nextRunAt: pastDate,
      });
      executionsService.findRecentByJobId.mockResolvedValue([
        createExecution({ id: 1, success: true, durationMs: 100 }),
      ]);

      const result = await service.calculateHealth("job-1");

      expect(result).toBe(Health.FAILED);
    });
  });
});
