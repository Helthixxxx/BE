import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { buildCorsOptions } from "./common/middleware/cors.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
