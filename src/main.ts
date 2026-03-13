import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { buildCorsOptions } from "./common/middleware/cors.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // requestId를 최상단에서 모든 요청에 적용 (500 에러 시 api_logs 저장 보장)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.requestId = req.requestId || randomUUID();
    const reqExt = req as Request & { startAt?: number };
    reqExt.startAt = reqExt.startAt ?? Date.now();
    next();
  });

  // CORS 설정
  app.enableCors(buildCorsOptions());

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

  // Swagger 설정
  const swaggerUrl = process.env.SWAGGER_URL || "/api-docs";
  const config = new DocumentBuilder()
    .setTitle("Helthix API")
    .setDescription("Helthix API 문서")
    .setVersion("1.0")
    .addTag("auth", "인증 API")
    .addTag("jobs", "Job 관리 API")
    .addTag("executions", "Execution 조회 API")
    .addTag("admin", "어드민 대시보드 API")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth",
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerUrl, app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 새로고침 시에도 토큰 값 유지
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
void bootstrap().catch((error) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});
