import { Test, TestingModule } from "@nestjs/testing";
import { JobsService } from "../jobs/jobs.service";
import { JobExecutorService } from "./job-executor.service";
import { JobSchedulerService } from "./job-scheduler.service";
import { Job } from "../jobs/entities/job.entity";
import { Health } from "../common/types/health.enum";

const mockJob: Partial<Job> = {
  id: "job-1",
  name: "Test",
  userId: "user-1",
  isActive: true,
  scheduleMinutes: 5,
  nextRunAt: new Date(Date.now() - 60000),
  lastHealth: Health.NORMAL,
  createdAt: new Date(),
};

describe("JobSchedulerService", () => {
  let service: JobSchedulerService;
  let jobsService: { findActiveJobs: jest.Mock; updateNextRunAt: jest.Mock };
  let jobExecutorService: { executeJob: jest.Mock };

  beforeEach(async () => {
    jobsService = {
      findActiveJobs: jest.fn().mockResolvedValue([]),
      updateNextRunAt: jest.fn().mockResolvedValue(undefined),
    };

    jobExecutorService = {
      executeJob: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobSchedulerService,
        { provide: JobsService, useValue: jobsService },
        { provide: JobExecutorService, useValue: jobExecutorService },
      ],
    }).compile();

    service = module.get<JobSchedulerService>(JobSchedulerService);
    jest.clearAllMocks();
  });

  describe("onModuleInit", () => {
    it("초기화 시 활성 Job nextRunAt 설정", async () => {
      jobsService.findActiveJobs.mockResolvedValue([
        { ...mockJob, nextRunAt: null, createdAt: new Date() },
      ]);

      await service.onModuleInit();

      expect(jobsService.updateNextRunAt).toHaveBeenCalled();
    });
  });

  describe("handleCron", () => {
    it("실행 시간이 된 Job 실행", async () => {
      const pastDate = new Date(Date.now() - 60000);
      jobsService.findActiveJobs.mockResolvedValue([
        { ...mockJob, nextRunAt: pastDate, createdAt: new Date(Date.now() - 3600000) },
      ]);

      await service.handleCron();

      expect(jobExecutorService.executeJob).toHaveBeenCalled();
      expect(jobsService.updateNextRunAt).toHaveBeenCalled();
    });

    it("nextRunAt이 null인 Job은 초기화만", async () => {
      jobsService.findActiveJobs.mockResolvedValue([
        { ...mockJob, nextRunAt: null, createdAt: new Date() },
      ]);

      await service.handleCron();

      expect(jobsService.updateNextRunAt).toHaveBeenCalled();
      expect(jobExecutorService.executeJob).not.toHaveBeenCalled();
    });

    it("실행 시간이 안 된 Job은 실행 안 함", async () => {
      const futureDate = new Date(Date.now() + 60000);
      jobsService.findActiveJobs.mockResolvedValue([{ ...mockJob, nextRunAt: futureDate }]);

      await service.handleCron();

      expect(jobExecutorService.executeJob).not.toHaveBeenCalled();
    });
  });
});
