import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ExecutionsService } from "./executions.service";
import { ExecutionQueryDto } from "./dto/execution-query.dto";
import { ExecutionListResponseDto } from "./dto/execution-response.dto";
import {
  SuccessResponseDto,
  ErrorResponseDto,
} from "../common/dto/response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

/**
 * ExecutionsController
 * Execution 조회 API 엔드포인트
 * USER 또는 ADMIN 모두 모든 Job의 Execution 조회 가능
 */
@ApiTags("executions")
@Controller("jobs/:jobId/executions")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  @ApiOperation({
    summary: "Execution 목록 조회",
    description:
      "특정 Job의 Execution 목록을 cursor pagination으로 조회합니다. (USER 또는 ADMIN)",
  })
  @ApiParam({
    name: "jobId",
    description: "Job ID (UUID)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "페이지 크기 (기본값: 20, 최대: 100)",
    example: 20,
  })
  @ApiQuery({
    name: "cursor",
    required: false,
    type: String,
    description: "다음 페이지 커서 (base64 인코딩된 JSON 문자열)",
    example:
      "eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTE5VDEyOjAwOjAwLjAwMFoiLCJpZCI6MTIzNDV9",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Execution 목록 조회 성공",
    type: SuccessResponseDto<ExecutionListResponseDto>,
    example: {
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2026-01-19T11:47:42.123Z",
      },
      data: {
        items: [
          {
            id: 12345,
            jobId: "550e8400-e29b-41d4-a716-446655440000",
            scheduledAt: "2026-01-19T12:00:00.000Z",
            startedAt: "2026-01-19T12:00:00.123Z",
            finishedAt: "2026-01-19T12:00:00.456Z",
            durationMs: 333,
            success: true,
            httpStatus: 200,
            errorType: "NONE",
            errorMessage: null,
            responseSnippet: '{"status":"ok"}',
            createdAt: "2026-01-19T12:00:00.123Z",
          },
          {
            id: 12344,
            jobId: "550e8400-e29b-41d4-a716-446655440000",
            scheduledAt: "2026-01-19T11:55:00.000Z",
            startedAt: "2026-01-19T11:55:00.100Z",
            finishedAt: "2026-01-19T11:55:00.500Z",
            durationMs: 400,
            success: false,
            httpStatus: 500,
            errorType: "HTTP_ERROR",
            errorMessage: "Internal Server Error",
            responseSnippet: '{"error":"Internal Server Error"}',
            createdAt: "2026-01-19T11:55:00.100Z",
          },
        ],
        nextCursor:
          "eyJjcmVhdGVkQXQiOiIyMDI2LTAxLTE5VDExOjUwOjAwLjAwMFoiLCJpZCI6MTIzNDN9",
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
          limit: ["must be an integer", "must be >= 1", "must be <= 100"],
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
  async findAll(
    @Param("jobId") jobId: string,
    @Query() query: ExecutionQueryDto,
    @CurrentUser() user: User,
  ) {
    return await this.executionsService.findByJobId(
      jobId,
      query.limit || 20,
      query.cursor,
      user.id,
      user.role,
    );
  }
}
