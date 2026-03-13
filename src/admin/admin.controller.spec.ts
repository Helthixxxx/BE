import { Test, TestingModule } from "@nestjs/testing";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminApiErrorsQueryDto } from "./dto/admin-api-errors-query.dto";
import { AdminDashboardQueryDto } from "./dto/admin-dashboard-query.dto";

describe("AdminController", () => {
  let controller: AdminController;
  let adminService: {
    getCommon: jest.Mock;
    getOverview: jest.Mock;
    getAppMetrics: jest.Mock;
    getApiErrors: jest.Mock;
  };

  beforeEach(async () => {
    adminService = {
      getCommon: jest.fn().mockResolvedValue({ serviceName: "Helthix" }),
      getOverview: jest.fn().mockResolvedValue({ totalRequests: 10 }),
      getAppMetrics: jest.fn().mockResolvedValue({ timeSeries: [] }),
      getApiErrors: jest.fn().mockResolvedValue({ items: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it("common 조회 시 service.getCommon 호출", async () => {
    const result = await controller.getCommon();

    expect(adminService.getCommon).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ serviceName: "Helthix" });
  });

  it("overview 조회 시 service.getOverview 호출", async () => {
    const query: AdminDashboardQueryDto = { hours: 24, bucketMinutes: 60, topEndpointsLimit: 5 };

    const result = await controller.getOverview(query);

    expect(adminService.getOverview).toHaveBeenCalledWith(query);
    expect(result).toEqual({ totalRequests: 10 });
  });

  it("app-metrics 조회 시 service.getAppMetrics 호출", async () => {
    const query: AdminDashboardQueryDto = { hours: 24, bucketMinutes: 60, topEndpointsLimit: 5 };

    const result = await controller.getAppMetrics(query);

    expect(adminService.getAppMetrics).toHaveBeenCalledWith(query);
    expect(result).toEqual({ timeSeries: [] });
  });

  it("api-errors 조회 시 service.getApiErrors 호출", async () => {
    const query: AdminApiErrorsQueryDto = { hours: 24, limit: 20 };

    const result = await controller.getApiErrors(query);

    expect(adminService.getApiErrors).toHaveBeenCalledWith(query);
    expect(result).toEqual({ items: [] });
  });
});
