import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpException,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { SuccessResponseDto, ErrorResponseDto } from "../common/dto/response.dto";

/**
 * FakeApiResponseDto
 * FAKE API 성공 응답 데이터
 */
class FakeApiResponseDto {
  message: string;
  timestamp: string;
}

/**
 * FakeApiController
 * 테스트용 FAKE API 컨트롤러
 * 인증 없이 접근 가능
 */
@ApiTags("fake-api")
@Controller("fake-api")
export class FakeApiController {
  /**
   * 항상 200 정상 응답
   */
  @Get("success")
  @ApiOperation({
    summary: "항상 200 정상 응답",
    description: "항상 성공(200) 응답을 반환합니다.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "성공 응답",
    type: SuccessResponseDto<FakeApiResponseDto>,
  })
  success(): FakeApiResponseDto {
    return {
      message: "Success response",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 항상 500 에러 응답
   */
  @Get("error")
  @ApiOperation({
    summary: "항상 500 에러 응답",
    description: "항상 서버 에러(500) 응답을 반환합니다.",
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "서버 에러 응답",
    type: ErrorResponseDto,
  })
  error(): never {
    throw new HttpException(
      {
        message: "Internal server error",
        error: "HTTP_ERROR",
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * N% 확률로 실패 응답
   */
  @Get("random")
  @ApiOperation({
    summary: "N% 확률로 실패 응답",
    description:
      "rate 파라미터로 지정한 확률(%)로 실패(500) 응답을 반환합니다. 기본값은 50%입니다.",
  })
  @ApiQuery({
    name: "rate",
    required: false,
    type: Number,
    description: "실패 확률 (0-100 사이의 숫자)",
    example: 30,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "성공 응답 (확률에 따라)",
    type: SuccessResponseDto<FakeApiResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "실패 응답 (확률에 따라)",
    type: ErrorResponseDto,
  })
  random(
    @Query("rate", new DefaultValuePipe(50), new ParseIntPipe())
    rate: number,
  ): FakeApiResponseDto | never {
    // rate 유효성 검사
    if (rate < 0 || rate > 100) {
      throw new HttpException(
        {
          message: "Rate must be between 0 and 100",
          error: "BAD_REQUEST",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 0-100 사이의 랜덤 숫자 생성
    const randomValue = Math.random() * 100;

    // rate% 확률로 실패
    if (randomValue < rate) {
      throw new HttpException(
        {
          message: `Random failure (rate: ${rate}%)`,
          error: "HTTP_ERROR",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 성공 응답
    return {
      message: `Success (rate: ${rate}%, random: ${randomValue.toFixed(2)})`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * N초 지연 응답
   */
  @Get("delay")
  @ApiOperation({
    summary: "N초 지연 응답",
    description:
      "seconds 파라미터로 지정한 시간(초)만큼 지연 후 성공(200) 응답을 반환합니다. 기본값은 1초입니다.",
  })
  @ApiQuery({
    name: "seconds",
    required: false,
    type: Number,
    description: "지연 시간 (초 단위, 양수)",
    example: 5,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "지연 후 성공 응답",
    type: SuccessResponseDto<FakeApiResponseDto>,
  })
  async delay(
    @Query("seconds", new DefaultValuePipe(1), new ParseIntPipe())
    seconds: number,
  ): Promise<FakeApiResponseDto> {
    // seconds 유효성 검사
    if (seconds < 0) {
      throw new HttpException(
        {
          message: "Seconds must be a positive number",
          error: "BAD_REQUEST",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 최대 지연 시간 제한 (60초)
    const maxDelay = 60;
    const delaySeconds = Math.min(seconds, maxDelay);

    // 지연 실행
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));

    return {
      message: `Delayed response (${delaySeconds} seconds)`,
      timestamp: new Date().toISOString(),
    };
  }
}
