import { Controller, Post, Body, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { DevicesService } from "./devices.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { DeviceResponseDto } from "./dto/device-response.dto";
import { User } from "../users/entities/user.entity";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";

/**
 * DevicesController
 * 푸시 토큰 등록/관리 API
 */
@ApiTags("devices")
@Controller("devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /** Device 등록/업데이트 */
  @Post()
  @ApiOperation({
    summary: "푸시 토큰 등록/업데이트",
    description: "Expo Push Token을 등록하거나 업데이트합니다. 로그인 전/후 모두 사용 가능합니다.",
  })
  @ApiBody({ type: CreateDeviceDto })
  @ApiResponse({
    status: 201,
    description: "Device 등록/업데이트 성공",
    type: DeviceResponseDto,
  })
  @ApiResponse({ status: 400, description: "잘못된 요청" })
  async create(
    @Body() createDeviceDto: CreateDeviceDto,
    @CurrentUser() user?: User,
  ): Promise<DeviceResponseDto> {
    const userId = user?.id || createDeviceDto.userId || null;
    return await this.devicesService.upsert(createDeviceDto, userId);
  }
}
