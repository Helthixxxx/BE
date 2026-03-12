import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { DevicesService } from "./devices.service";
import { Device } from "./entities/device.entity";
import { DeviceResponseDto } from "./dto/device-response.dto";

const mockDevice: Device = {
  id: "device-1",
  user: null,
  pushToken: "ExponentPushToken[xxx]",
  deviceId: "device-id-1",
  platform: "ios",
  userId: "user-1",
  isActive: true,
  lastUsedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

type DeviceRepoMock = {
  findOne: jest.Mock<Promise<Device | null>, [unknown]>;
  find: jest.Mock<Promise<Device[]>, [unknown?]>;
  create: jest.Mock<Device, [Partial<Device>]>;
  save: jest.Mock<Promise<Device>, [Device]>;
  remove: jest.Mock<Promise<void>, [Device]>;
};

describe("DevicesService", () => {
  let service: DevicesService;
  let deviceRepository: DeviceRepoMock;
  let dataSource: {
    transaction: jest.Mock<
      Promise<DeviceResponseDto>,
      [(manager: unknown) => Promise<DeviceResponseDto>]
    >;
  };

  beforeEach(async () => {
    deviceRepository = {
      findOne: jest.fn<Promise<Device | null>, [unknown]>(),
      find: jest.fn<Promise<Device[]>, [unknown?]>().mockResolvedValue([]),
      create: jest.fn<Device, [Partial<Device>]>((d: Partial<Device>) => d as Device),
      save: jest.fn<Promise<Device>, [Device]>().mockResolvedValue(mockDevice),
      remove: jest.fn<Promise<void>, [Device]>(),
    };

    dataSource = {
      transaction: jest.fn((fn: (manager: unknown) => Promise<DeviceResponseDto>) =>
        fn({
          getRepository: () => deviceRepository,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: getRepositoryToken(Device), useValue: deviceRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    jest.clearAllMocks();
  });

  describe("upsert", () => {
    it("새 Device 등록", async () => {
      deviceRepository.findOne.mockResolvedValue(null);
      deviceRepository.save.mockResolvedValue(mockDevice);

      const result = await service.upsert(
        { pushToken: "ExponentPushToken[xxx]", platform: "ios" },
        "user-1",
      );

      expect(result).toBeDefined();
      expect(result.pushToken).toBe("ExponentPushToken[xxx]");
    });

    it("pushToken 없고 deviceId로 기존 Device 조회 후 업데이트", async () => {
      deviceRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockDevice, deviceId: "device-id-1" });
      deviceRepository.save.mockResolvedValue({ ...mockDevice, userId: "user-1" });

      const result = await service.upsert(
        { pushToken: "ExponentPushToken[new]", deviceId: "device-id-1", platform: "ios" },
        "user-1",
      );

      expect(result).toBeDefined();
    });

    it("기존 Device 업데이트", async () => {
      deviceRepository.findOne.mockResolvedValue({ ...mockDevice });
      deviceRepository.save.mockResolvedValue({ ...mockDevice, userId: "user-1" });

      const result = await service.upsert(
        { pushToken: "ExponentPushToken[xxx]", platform: "ios" },
        "user-1",
      );

      expect(result).toBeDefined();
    });

    it("userId 없이 Device 등록 (비로그인)", async () => {
      deviceRepository.findOne.mockResolvedValue(null);
      deviceRepository.save.mockResolvedValue({ ...mockDevice, userId: null });

      const result = await service.upsert(
        { pushToken: "ExponentPushToken[xxx]", platform: "ios" },
        null,
      );

      expect(result).toBeDefined();
    });
  });

  describe("findActiveDevices", () => {
    it("활성 Device 목록 반환", async () => {
      deviceRepository.find.mockResolvedValue([mockDevice]);

      const result = await service.findActiveDevices();

      expect(result).toHaveLength(1);
      expect(deviceRepository.find).toHaveBeenCalledWith({ where: { isActive: true } });
    });
  });

  describe("remove", () => {
    it("Device 삭제 성공", async () => {
      deviceRepository.findOne.mockResolvedValue(mockDevice);

      await service.remove("device-1");

      expect(deviceRepository.remove).toHaveBeenCalledWith(mockDevice);
    });

    it("Device가 없으면 ConflictException", async () => {
      deviceRepository.findOne.mockResolvedValue(null);

      await expect(service.remove("unknown")).rejects.toThrow(ConflictException);
    });
  });
});
