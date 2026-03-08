import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ExecutionsService } from "./executions.service";
import { Execution } from "./entities/execution.entity";
import { JobsService } from "../jobs/jobs.service";
import { ExecutionErrorCode } from "../common/types/execution-error-type.enum";
import { UserRole } from "../users/entities/user.entity";

const mockExecution: Partial<Execution> = {
  id: 1,
  jobId: "job-1",
  scheduledAt: new Date(),
  startedAt: new Date(),
  finishedAt: null,
  success: false,
  durationMs: null,
  errorType: ExecutionErrorCode.NONE,
  executionKey: "job-1:2025-01-01T00:00:00.000Z",
};

describe("ExecutionsService", () => {
  let service: ExecutionsService;
  let executionRepository: Record<string, jest.Mock>;
  let jobsService: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    executionRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockResolvedValue({ ...mockExecution }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    jobsService = {
      findOne: jest.fn().mockResolvedValue({ id: "job-1" }),
    };

    dataSource = {
      transaction: jest.fn((fn) =>
        fn({
          getRepository: () => executionRepository,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionsService,
        { provide: getRepositoryToken(Execution), useValue: executionRepository },
        { provide: JobsService, useValue: jobsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ExecutionsService>(ExecutionsService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("Execution 생성 성공", async () => {
      executionRepository.findOne.mockResolvedValue(null);
      executionRepository.save.mockResolvedValue(mockExecution);

      const scheduledAt = new Date("2025-01-01T00:00:00.000Z");
      const startedAt = new Date();

      const result = await service.create("job-1", scheduledAt, startedAt);

      expect(result).toBeDefined();
    });

    it("이미 존재하는 executionKey면 Error", async () => {
      executionRepository.findOne.mockResolvedValue(mockExecution);

      const scheduledAt = new Date("2025-01-01T00:00:00.000Z");

      await expect(service.create("job-1", scheduledAt, new Date())).rejects.toThrow(
        "이미 존재하는 Execution입니다",
      );
    });

    it("duplicate key 에러 시 동일 메시지로 변환", async () => {
      executionRepository.findOne.mockResolvedValue(null);
      executionRepository.save.mockRejectedValue(new Error("duplicate key value violates unique constraint"));

      const scheduledAt = new Date("2025-01-01T00:00:00.000Z");

      await expect(service.create("job-1", scheduledAt, new Date())).rejects.toThrow(
        "이미 존재하는 Execution입니다",
      );
    });
  });

  describe("updateResult", () => {
    it("Execution 결과 업데이트 성공", async () => {
      executionRepository.findOne.mockResolvedValue({
        ...mockExecution,
        startedAt: new Date("2025-01-01T00:00:00.000Z"),
      });
      executionRepository.save.mockResolvedValue({});

      await service.updateResult(
        1,
        new Date("2025-01-01T00:00:01.000Z"),
        true,
        200,
        ExecutionErrorCode.NONE,
        null,
        null,
      );

      expect(executionRepository.save).toHaveBeenCalled();
    });

    it("Execution이 없으면 NotFoundException", async () => {
      executionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateResult(999, new Date(), true, 200, ExecutionErrorCode.NONE, null, null),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByJobId", () => {
    it("Job의 Execution 목록 조회", async () => {
      executionRepository.createQueryBuilder = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });
      executionRepository.find = jest.fn().mockResolvedValue([]);

      const result = await service.findByJobId("job-1", 20, undefined, "user-1", UserRole.USER);

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(jobsService.findOne).toHaveBeenCalledWith("job-1", "user-1", UserRole.USER);
    });

    it("cursor와 함께 조회 시 andWhere 호출", async () => {
      const execs = Array.from({ length: 2 }, (_, i) => ({
        id: 10 - i,
        jobId: "job-1",
        createdAt: new Date(),
        durationMs: 100,
        finishedAt: new Date(),
        success: true,
      }));
      executionRepository.createQueryBuilder = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(execs),
      });
      executionRepository.find = jest.fn().mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          id: 20 - i,
          jobId: "job-1",
          createdAt: new Date(),
          durationMs: 100,
          finishedAt: new Date(),
          success: true,
        })),
      );

      const cursor = Buffer.from(
        JSON.stringify({ createdAt: "2025-01-02T00:00:00.000Z", id: 5 }),
      ).toString("base64");
      const result = await service.findByJobId("job-1", 2, cursor, "user-1", UserRole.USER);

      expect(result.items).toBeDefined();
    });
  });

  describe("findRecentByJobId", () => {
    it("최근 Execution 목록 조회", async () => {
      executionRepository.find.mockResolvedValue([mockExecution]);

      const result = await service.findRecentByJobId("job-1", 10);

      expect(result).toHaveLength(1);
      expect(executionRepository.find).toHaveBeenCalledWith({
        where: { jobId: "job-1" },
        order: { createdAt: "DESC", id: "DESC" },
        take: 10,
      });
    });
  });
});
