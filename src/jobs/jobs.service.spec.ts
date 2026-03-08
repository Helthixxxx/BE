import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { JobsService } from "./jobs.service";
import { Job } from "./entities/job.entity";
import { Health } from "../common/types/health.enum";
import { HttpMethod } from "../common/types/http-method.enum";
import { UserRole } from "../users/entities/user.entity";

const mockJob: Partial<Job> = {
  id: "job-1",
  name: "Test Job",
  userId: "user-1",
  isActive: true,
  scheduleMinutes: 5,
  nextRunAt: new Date(),
  lastHealth: Health.NORMAL,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("JobsService", () => {
  let service: JobsService;
  let jobRepository: Record<string, jest.Mock>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    jobRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockResolvedValue({ ...mockJob }),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      remove: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn((fn) =>
        fn({
          getRepository: () => jobRepository,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(Job), useValue: jobRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("Job 생성 성공", async () => {
      jobRepository.save.mockResolvedValue({
        ...mockJob,
        id: "job-1",
        createdAt: new Date(),
        scheduleMinutes: 10,
      });

      const result = await service.create(
        {
          name: "New Job",
          url: "https://example.com",
          scheduleMinutes: 10,
          method: HttpMethod.GET,
        },
        "user-1",
      );

      expect(result).toBeDefined();
      expect(jobRepository.save).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("USER는 자신의 Job만 조회", async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockJob]),
      };
      jobRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll("user-1", UserRole.USER);

      expect(qb.where).toHaveBeenCalledWith("job.userId = :userId", { userId: "user-1" });
      expect(result).toHaveLength(1);
    });

    it("ADMIN은 전체 Job 조회", async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockJob]),
      };
      jobRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll("user-1", UserRole.ADMIN);

      expect(qb.where).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe("findOne", () => {
    it("자신의 Job 조회 성공", async () => {
      jobRepository.findOne.mockResolvedValue({ ...mockJob, userId: "user-1" });

      const result = await service.findOne("job-1", "user-1", UserRole.USER);

      expect(result.userId).toBe("user-1");
    });

    it("다른 사용자 Job 조회 시 ForbiddenException", async () => {
      jobRepository.findOne.mockResolvedValue({ ...mockJob, userId: "other-user" });

      await expect(service.findOne("job-1", "user-1", UserRole.USER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("Job이 없으면 NotFoundException", async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("job-1", "user-1", UserRole.USER)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findActiveJobs", () => {
    it("활성 Job 목록 반환", async () => {
      jobRepository.find.mockResolvedValue([mockJob]);

      const result = await service.findActiveJobs();

      expect(result).toHaveLength(1);
      expect(jobRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { nextRunAt: "ASC" },
      });
    });
  });

  describe("updateLastHealth", () => {
    it("lastHealth 업데이트", async () => {
      await service.updateLastHealth("job-1", Health.DEGRADED);

      expect(jobRepository.update).toHaveBeenCalledWith("job-1", {
        lastHealth: Health.DEGRADED,
      });
    });
  });

  describe("updateNextRunAt", () => {
    it("nextRunAt 업데이트", async () => {
      const nextRun = new Date();
      await service.updateNextRunAt("job-1", nextRun);

      expect(jobRepository.update).toHaveBeenCalledWith("job-1", { nextRunAt: nextRun });
    });
  });

  describe("update", () => {
    it("isActive false에서 true로 변경 시 nextRunAt 재설정", async () => {
      jobRepository.findOne.mockResolvedValue({
        ...mockJob,
        userId: "user-1",
        isActive: false,
        scheduleMinutes: 5,
        createdAt: new Date(),
      });
      jobRepository.save.mockResolvedValue({ ...mockJob, nextRunAt: new Date() });

      await service.update(
        "job-1",
        { isActive: true },
        "user-1",
        UserRole.USER,
      );

      expect(jobRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ nextRunAt: expect.any(Date) }),
      );
    });

    it("scheduleMinutes 변경 시 nextRunAt 재설정", async () => {
      jobRepository.findOne.mockResolvedValue({
        ...mockJob,
        userId: "user-1",
        isActive: true,
        scheduleMinutes: 5,
        createdAt: new Date(),
      });
      jobRepository.save.mockResolvedValue({ ...mockJob });

      await service.update(
        "job-1",
        { scheduleMinutes: 10 },
        "user-1",
        UserRole.USER,
      );

      expect(jobRepository.save).toHaveBeenCalled();
    });
  });

  describe("findOneInternal", () => {
    it("Job 없으면 NotFoundException", async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneInternal("unknown")).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("Job 삭제 성공", async () => {
      jobRepository.findOne.mockResolvedValue({ ...mockJob, userId: "user-1" });

      await service.remove("job-1", "user-1", UserRole.USER);

      expect(jobRepository.remove).toHaveBeenCalled();
    });
  });
});
