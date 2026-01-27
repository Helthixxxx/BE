import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { MetricsInterceptor } from "./common/metrics/metrics.interceptor";

/**
 * Request 타입 확장 (requestId 포함)
 */
interface RequestWithId extends Request {
  requestId?: string;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  // RequestIdMiddleware를 가장 먼저 실행되도록 등록
  // CORS 에러 등 미들웨어 실행 전 에러에도 requestId를 포함하기 위함
  app.use((req: Request, res: Response, next: NextFunction) => {
    // requestId를 request 객체에 저장
    // - pino-http가 사용하는 req.id와 requestId를 동일 값으로 맞춰 "요청 단위 1개 ID"를 고정
    // - 어떤 순서로 미들웨어가 실행되더라도 두 값이 엇갈리지 않도록 상호 보정
    const typedReq = req as unknown as { id?: string } & RequestWithId;

    if (
      typedReq.requestId &&
      typedReq.id &&
      typedReq.requestId !== typedReq.id
    ) {
      // 둘 다 존재하지만 값이 다르면 requestId를 우선(응답 meta/비즈니스 추적용)
      typedReq.id = typedReq.requestId;
    } else if (typedReq.requestId && !typedReq.id) {
      typedReq.id = typedReq.requestId;
    } else if (!typedReq.requestId && typedReq.id) {
      typedReq.requestId = typedReq.id;
    } else if (!typedReq.requestId && !typedReq.id) {
      const newId = uuidv4();
      typedReq.id = newId;
      typedReq.requestId = newId;
    }
    next();
  });

  // 민감한 헤더 마스킹 유틸리티 함수
  const maskSensitiveHeaders = (
    headers: Record<string, unknown>,
  ): Record<string, unknown> => {
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
    const masked: Record<string, unknown> = { ...headers };

    for (const key of Object.keys(masked)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        masked[key] = "***";
      }
    }

    return masked;
  };

  // 에러 핸들링 미들웨어 (CORS 에러 등 미들웨어 레벨 에러 로깅)
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as RequestWithId).requestId || "unknown";

    // CORS 에러 등 미들웨어 레벨 에러 로깅 (민감 정보 마스킹)
    logger.error({
      type: "MIDDLEWARE_ERROR",
      requestId,
      method: req.method,
      url: req.url,
      headers: maskSensitiveHeaders(req.headers as Record<string, unknown>),
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      timestamp: new Date().toISOString(),
    });

    // CORS 에러인 경우
    if (err.message.includes("CORS")) {
      res.status(500).json({
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
        error: {
          code: "CORS_ERROR",
          message: err.message,
        },
      });
      return;
    }

    next(err);
  });

  // CORS 설정
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://shm-admin.nextdot.kr",
    "https://shm-api.nextdot.kr",
    "https://admin.nextdot.kr",
  ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // origin이 없으면 (같은 도메인 요청 등) 허용
      if (!origin) {
        callback(null, true);
        return;
      }
      // 허용된 origin 목록에 있으면 허용
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // 그 외는 거부 (로깅 포함)
      const error = new Error("CORS 정책에 의해 차단되었습니다.");
      logger.warn({
        type: "CORS_ERROR",
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString(),
      });
      callback(error);
    },
    credentials: true, // 쿠키, 인증 헤더 등 포함
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // 전역 ValidationPipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 에러
      transform: true, // 자동 타입 변환
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 전역 Exception Filter 설정 (DI 컨테이너에서 가져오기)
  const globalExceptionFilter = app.get(GlobalExceptionFilter);
  app.useGlobalFilters(globalExceptionFilter);

  // 전역 Interceptor 설정 (DI 컨테이너에서 가져오기)
  const loggingInterceptor = app.get(LoggingInterceptor);
  const metricsInterceptor = app.get(MetricsInterceptor);
  app.useGlobalInterceptors(
    metricsInterceptor, // 메트릭 수집을 먼저
    loggingInterceptor,
    new ResponseEnvelopeInterceptor(),
  );

  // Swagger 설정
  const swaggerUrl = process.env.SWAGGER_URL || "/api-docs";
  const config = new DocumentBuilder()
    .setTitle("Service Health Monitor API")
    .setDescription("서비스 헬스 모니터링 시스템 API 문서")
    .setVersion("1.0")
    .addTag("auth", "인증 API")
    .addTag("jobs", "Job 관리 API")
    .addTag("executions", "Execution 조회 API")
    .addTag("metrics", "메트릭 조회 API")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth", // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerUrl, app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 새로고침 시에도 토큰 값 유지
    },
  });

  const port = process.env.PORT || 8080;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}${swaggerUrl}`);
}
void bootstrap().catch((error) => {
  const logger = new Logger("Bootstrap");
  logger.error("Failed to start application:", error);
  process.exit(1);
});
