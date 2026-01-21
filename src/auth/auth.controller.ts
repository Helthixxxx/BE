import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import {
  AuthResponseDto,
  RefreshResponseDto,
  LogoutResponseDto,
} from './dto/auth-response.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  SuccessResponseDto,
  ErrorResponseDto,
} from '../common/dto/response.dto';

/**
 * AuthController
 * 인증 관련 API 엔드포인트
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '회원가입',
    description: '새로운 사용자를 등록하고 즉시 로그인 처리합니다.',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    type: SuccessResponseDto<AuthResponseDto>,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      data: {
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          provider: 'local',
          providerId: 'user123',
          role: 'USER',
          createdAt: '2026-01-19T11:47:42.123Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '입력값 검증 실패',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: {
          providerId: ['providerId는 최소 3자 이상이어야 합니다.'],
          password: ['비밀번호는 최소 8자 이상이어야 합니다.'],
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '이미 사용 중인 providerId',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'HTTP_ERROR',
        message: '이미 사용 중인 아이디입니다.',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: '서버 내부 오류',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
  })
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그인',
    description: 'providerId와 비밀번호로 로그인합니다.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    type: SuccessResponseDto<AuthResponseDto>,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      data: {
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          provider: 'local',
          providerId: 'user123',
          role: 'USER',
          createdAt: '2026-01-19T11:47:42.123Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '입력값 검증 실패',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: {
          providerId: ['providerId는 최소 3자 이상이어야 합니다.'],
          password: ['비밀번호는 최소 8자 이상이어야 합니다.'],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '아이디 또는 비밀번호 불일치',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'UNAUTHORIZED',
        message: '아이디 또는 비밀번호가 일치하지 않습니다.',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: '서버 내부 오류',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Access Token 갱신',
    description:
      'Refresh Token으로 새로운 Access Token과 Refresh Token을 발급받습니다.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({
    status: 200,
    description: '토큰 갱신 성공',
    type: SuccessResponseDto<RefreshResponseDto>,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      data: {
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '입력값 검증 실패',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: {
          refreshToken: ['refreshToken은 필수입니다.'],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '유효하지 않은 refresh token',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'UNAUTHORIZED',
        message: '유효하지 않은 refresh token입니다.',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '토큰 만료',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: '서버 내부 오류',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
  })
  async refresh(@Body() refreshDto: RefreshDto): Promise<RefreshResponseDto> {
    return this.authService.refresh(refreshDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그아웃',
    description: 'Refresh Token을 폐기하여 로그아웃합니다. (best-effort)',
  })
  @ApiBody({ type: LogoutDto })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공 (200 응답으로 성공 확인)',
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '입력값 검증 실패',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: {
          refreshToken: ['refreshToken은 필수입니다.'],
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: '서버 내부 오류',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
  })
  async logout(@Body() logoutDto: LogoutDto): Promise<LogoutResponseDto> {
    return this.authService.logout(logoutDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '내 정보 조회',
    description: 'Access Token으로 인증된 사용자의 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '내 정보 조회 성공',
    type: SuccessResponseDto<MeResponseDto>,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        provider: 'local',
        providerId: 'user123',
        role: 'USER',
        createdAt: '2026-01-19T11:47:42.123Z',
        updatedAt: '2026-01-19T11:47:42.123Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '토큰 만료',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: '서버 내부 오류',
    type: ErrorResponseDto,
    example: {
      meta: {
        requestId: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-01-19T11:47:42.123Z',
      },
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
  })
  async me(@CurrentUser() user: User): Promise<MeResponseDto> {
    return this.authService.me(user);
  }
}
