import { Injectable, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Device } from "./entities/device.entity";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { DeviceResponseDto } from "./dto/device-response.dto";

/**
 * DevicesService
 * Device(푸시 토큰) 관리 로직
 */
@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly dataSource: DataSource,
  ) {}

  /** Device 등록/업데이트 */
  async upsert(
    createDeviceDto: CreateDeviceDto,
    userId: string | null = null,
  ): Promise<DeviceResponseDto> {
    const { pushToken, deviceId, platform = "ios" } = createDeviceDto;

    // 트랜잭션 내에서 처리 (중복 등록 방지)
    return await this.dataSource.transaction(async (manager) => {
      const deviceRepo = manager.getRepository(Device);

      // 1. pushToken 기준으로 기존 Device 조회
      let device = await deviceRepo.findOne({
        where: { pushToken },
      });

      // 2. pushToken이 없고 deviceId가 제공된 경우, deviceId로 조회
      if (!device && deviceId) {
        device = await deviceRepo.findOne({
          where: { deviceId },
        });
      }

      // 3. 기존 Device가 있는 경우 업데이트
      if (device) {
        // userId가 제공된 경우 업데이트 (로그인 후 토큰 연결)
        if (userId !== null) {
          device.userId = userId;
        }
        // deviceId가 제공된 경우 업데이트
        if (deviceId) {
          device.deviceId = deviceId;
        }
        // platform 업데이트
        device.platform = platform;
        // lastUsedAt 업데이트
        device.lastUsedAt = new Date();
        // isActive 활성화
        device.isActive = true;

        const updated = await deviceRepo.save(device);
        return this.toResponseDto(updated);
      }

      // 4. 새 Device 생성
      const newDevice = deviceRepo.create({
        pushToken,
        deviceId: deviceId || null,
        platform,
        userId: userId || null,
        isActive: true,
        lastUsedAt: new Date(),
      });

      const saved = await deviceRepo.save(newDevice);
      return this.toResponseDto(saved);
    });
  }

  /**
   * 모든 활성화된 Device 조회 (알림 발송용)
   */
  async findActiveDevices(): Promise<Device[]> {
    return await this.deviceRepository.find({
      where: { isActive: true },
    });
  }

  /**
   * Device 삭제
   */
  async remove(deviceId: string, userId?: string): Promise<void> {
    const where: { id: string; userId?: string } = { id: deviceId };
    if (userId) {
      where.userId = userId;
    }

    const device = await this.deviceRepository.findOne({ where });

    if (!device) {
      throw new ConflictException("Device를 찾을 수 없습니다.");
    }

    await this.deviceRepository.remove(device);
  }

  /**
   * Device 엔티티를 ResponseDto로 변환
   */
  private toResponseDto(device: Device): DeviceResponseDto {
    return {
      id: device.id,
      userId: device.userId,
      pushToken: device.pushToken,
      deviceId: device.deviceId,
      platform: device.platform,
      isActive: device.isActive,
      lastUsedAt: device.lastUsedAt,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }
}
