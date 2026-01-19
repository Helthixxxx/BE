import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  const allowedOrigins = ['http://localhost:3001', 'https://admin.nextdot.kr'];

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
      // 그 외는 거부
      callback(new Error('CORS 정책에 의해 차단되었습니다.'));
    },
    credentials: true, // 쿠키, 인증 헤더 등 포함
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  // 전역 Exception Filter 설정
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 전역 Interceptor 설정 (성공 응답 envelope)
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  // Swagger 설정
  const swaggerUrl = process.env.SWAGGER_URL || '/api-docs';
  const config = new DocumentBuilder()
    .setTitle('Service Health Monitor API')
    .setDescription('서비스 헬스 모니터링 시스템 API 문서')
    .setVersion('1.0')
    .addTag('auth', '인증 API')
    .addTag('jobs', 'Job 관리 API (User)')
    .addTag('executions', 'Execution 조회 API (User)')
    .addTag('health', 'Health 상태 조회 API (User)')
    .addTag('admin', '관리자 API (Admin)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
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
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}${swaggerUrl}`);
}
void bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
