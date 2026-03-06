import { Controller, Post, Body, Request } from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { DevicesService } from "./devices.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { DeviceResponseDto } from "./dto/device-response.dto";
import { User } from "../users/entities/user.entity";

/**
 * Request 타입 확장 (user는 optional)
 */
interface RequestWithOptionalUser extends ExpressRequest {
  user?: User;
}

/**
 * DevicesController
 * 푸시 토큰 등록/관리 API
 * 로그인 전/후 모두 토큰 등록 가능 (인증 선택적)
 */
@ApiTags("devices")
@Controller("devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * Device 등록/업데이트
   * 인증 선택적: Authorization 헤더가 있으면 userId 연결, 없으면 null
   */
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
    @Request() req: RequestWithOptionalUser,
  ): Promise<DeviceResponseDto> {
    // 우선순위: JWT 인증된 userId > DTO의 userId > null
    const userId = req.user?.id || createDeviceDto.userId || null;
    return await this.devicesService.upsert(createDeviceDto, userId);
  }
}
