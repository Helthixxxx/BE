import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { DevicesService } from "./devices.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { DeviceResponseDto } from "./dto/device-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

/**
 * Request 타입 확장 (user는 optional)
 */
interface RequestWithOptionalUser extends Request {
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
    // JWT 인증이 있는 경우 userId 사용, 없으면 null
    const userId = req.user?.id || null;
    return await this.devicesService.upsert(createDeviceDto, userId);
  }

  /**
   * 내 Device 목록 조회
   * 인증 필수
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({
    summary: "내 Device 목록 조회",
    description: "로그인한 사용자의 활성화된 Device 목록을 조회합니다.",
  })
  @ApiResponse({
    status: 200,
    description: "Device 목록 조회 성공",
    type: [DeviceResponseDto],
  })
  async findMyDevices(@CurrentUser() user: User): Promise<DeviceResponseDto[]> {
    return await this.devicesService.findByUserId(user.id);
  }

  /**
   * Device 비활성화
   * 인증 필수
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Device 비활성화",
    description: "Device를 비활성화합니다. 실제 삭제는 하지 않고 isActive를 false로 설정합니다.",
  })
  @ApiResponse({ status: 204, description: "Device 비활성화 성공" })
  @ApiResponse({ status: 404, description: "Device를 찾을 수 없음" })
  async remove(@Param("id") id: string, @CurrentUser() user: User): Promise<void> {
    await this.devicesService.deactivate(id, user.id);
  }
}
