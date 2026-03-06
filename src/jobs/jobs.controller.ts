import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { JobResponseDto } from "./dto/job-response.dto";
import { SuccessResponseDto, ErrorResponseDto } from "../common/types/response-docs.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

/**
 * JobsController
 * Job 관리 API
 */
@ApiTags("jobs")
@Controller("jobs")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({
    summary: "Job 생성",
    description: "새로운 Job을 생성합니다. (USER 또는 ADMIN)",
  })
  @ApiBody({ type: CreateJobDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Job 생성 성공",
    type: SuccessResponseDto<JobResponseDto>,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "API Health Check",
        isActive: true,
        scheduleMinutes: 5,
        timeoutMs: 30000,
        method: "GET",
        url: "https://api.example.com/health",
        headers: { "Content-Type": "application/json" },
        body: null,
        nextRunAt: "2026-01-19T12:00:00.000Z",
        lastHealth: "NORMAL",
        createdAt: "2026-01-19T11:47:42.123Z",
        updatedAt: "2026-01-19T11:47:42.123Z",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Validation 에러",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: {
          name: ["should not be empty"],
          url: ["must be a URL"],
          scheduleMinutes: ["must be an integer", "must be >= 1"],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "인증 실패",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "토큰 만료",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "TOKEN_EXPIRED",
        message: "Token has expired",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "서버 내부 에러",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
  })
  async create(@Body() createJobDto: CreateJobDto, @CurrentUser() user: User) {
    return await this.jobsService.create(createJobDto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: "Job 목록 조회",
    description: "모든 Job 목록을 조회합니다. (USER 또는 ADMIN)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Job 목록 조회 성공",
    type: SuccessResponseDto<JobResponseDto[]>,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      data: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "API Health Check",
          isActive: true,
          scheduleMinutes: 5,
          timeoutMs: 30000,
          method: "GET",
          url: "https://api.example.com/health",
          headers: null,
          body: null,
          nextRunAt: "2026-01-19T12:00:00.000Z",
          lastHealth: "NORMAL",
          createdAt: "2026-01-19T11:47:42.123Z",
          updatedAt: "2026-01-19T11:47:42.123Z",
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "서버 내부 에러",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
  })
  async findAll(@CurrentUser() user: User) {
    return await this.jobsService.findAll(user.id, user.role);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Job 단건 조회",
    description: "특정 Job의 상세 정보를 조회합니다. (USER 또는 ADMIN)",
  })
  @ApiParam({
    name: "id",
    description: "Job ID (UUID)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Job 조회 성공",
    type: SuccessResponseDto<JobResponseDto>,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "API Health Check",
        isActive: true,
        scheduleMinutes: 5,
        timeoutMs: 30000,
        method: "GET",
        url: "https://api.example.com/health",
        headers: { "Content-Type": "application/json" },
        body: null,
        nextRunAt: "2026-01-19T12:00:00.000Z",
        lastHealth: "NORMAL",
        createdAt: "2026-01-19T11:47:42.123Z",
        updatedAt: "2026-01-19T11:47:42.123Z",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Job을 찾을 수 없음",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "NOT_FOUND",
        message: "Job을 찾을 수 없습니다.",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "권한 없음 (해당 Job에 접근할 권한이 없음)",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "FORBIDDEN",
        message: "해당 Job에 접근할 권한이 없습니다.",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "서버 내부 에러",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
  })
  async findOne(@Param("id") id: string, @CurrentUser() user: User) {
    return await this.jobsService.findOne(id, user.id, user.role);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Job 수정",
    description: "특정 Job의 정보를 수정합니다. (USER 또는 ADMIN, USER는 본인 Job만 가능)",
  })
  @ApiParam({
    name: "id",
    description: "Job ID (UUID)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiBody({ type: UpdateJobDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Job 수정 성공",
    type: SuccessResponseDto<JobResponseDto>,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Updated API Health Check",
        isActive: false,
        scheduleMinutes: 10,
        timeoutMs: 30000,
        method: "GET",
        url: "https://api.example.com/health",
        headers: null,
        body: null,
        nextRunAt: "2026-01-19T12:00:00.000Z",
        lastHealth: "NORMAL",
        createdAt: "2026-01-19T11:47:42.123Z",
        updatedAt: "2026-01-19T11:50:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Validation 에러",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: {
          scheduleMinutes: ["must be an integer", "must be >= 1"],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Job을 찾을 수 없음",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "NOT_FOUND",
        message: "Job을 찾을 수 없습니다.",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "서버 내부 에러",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
  })
  async update(
    @Param("id") id: string,
    @Body() updateJobDto: UpdateJobDto,
    @CurrentUser() user: User,
  ) {
    return await this.jobsService.update(id, updateJobDto, user.id, user.role);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Job 삭제",
    description: "특정 Job을 삭제합니다. (USER 또는 ADMIN, USER는 본인 Job만 가능)",
  })
  @ApiParam({
    name: "id",
    description: "Job ID (UUID)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Job 삭제 성공",
    schema: {
      type: "object",
      properties: {
        meta: {
          type: "object",
          properties: {
            requestId: {
              type: "string",
              example: "550e8400-e29b-41d4-a716-446655440000",
            },
            timestamp: {
              type: "string",
              example: "2026-01-19T11:47:42.123Z",
            },
          },
        },
      },
    },
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Job을 찾을 수 없음",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "NOT_FOUND",
        message: "Job을 찾을 수 없습니다.",
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "서버 내부 에러",
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    },
  })
  async remove(@Param("id") id: string, @CurrentUser() user: User) {
    await this.jobsService.remove(id, user.id, user.role);
    return null;
  }
}
