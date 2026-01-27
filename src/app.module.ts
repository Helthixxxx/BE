import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import * as Joi from "joi";
import { CommonModule } from "./common/common.module";
import { JobsModule } from "./jobs/jobs.module";
import { ExecutionsModule } from "./executions/executions.module";
import { HealthModule } from "./health/health.module";
import { NotificationLogsModule } from "./notification-logs/notification-logs.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { AuthModule } from "./auth/auth.module";
import { DevicesModule } from "./devices/devices.module";
import { FakeApiModule } from "./fake-api/fake-api.module";
import databaseConfig from "./config/database.config";
import httpConfig from "./config/http.config";
import jwtConfig from "./config/jwt.config";
import healthConfig from "./config/health.config";
import loggerConfig from "./common/logger/logger.config";
import { LoggerModule } from "./common/logger/logger.module";
import metricsConfig from "./common/metrics/metrics.config";
import { MetricsModule } from "./common/metrics/metrics.module";
import { HealthController } from "./health.controller";
import { MetricsController } from "./metrics.controller";

/**
 * AppModule
 * 애플리케이션 루트 모듈
 */
@Module({
  imports: [
    // LoggerModule: 구조화된 로깅 (가장 먼저 로드)
    LoggerModule,
    // MetricsModule: 메트릭 수집
    MetricsModule,
    // ConfigModule: 환경변수 관리
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        httpConfig,
        jwtConfig,
        healthConfig,
        loggerConfig,
        metricsConfig,
      ],
      envFilePath: [`.env.${process.env.NODE_ENV || "local"}`, ".env"],
      validationSchema: Joi.object({
        // JWT 필수 환경 변수
        JWT_ACCESS_SECRET: Joi.string().required().messages({
          "any.required": "JWT_ACCESS_SECRET 환경 변수가 필요합니다.",
          "string.empty": "JWT_ACCESS_SECRET은 비어있을 수 없습니다.",
        }),
        JWT_REFRESH_SECRET: Joi.string().required().messages({
          "any.required": "JWT_REFRESH_SECRET 환경 변수가 필요합니다.",
          "string.empty": "JWT_REFRESH_SECRET은 비어있을 수 없습니다.",
        }),
        // 데이터베이스 필수 환경 변수
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
      }),
      validationOptions: {
        allowUnknown: true, // 스키마에 정의되지 않은 환경 변수 허용
        abortEarly: false, // 모든 검증 오류를 한 번에 표시
      },
    }),
    // TypeORM: 데이터베이스 연결
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig =
          configService.get<ReturnType<typeof databaseConfig>>("database");
        if (!dbConfig) {
          throw new Error("Database config is not defined");
        }
        return {
          ...dbConfig,
        };
      },
      inject: [ConfigService],
    }),
    // 공통 모듈
    CommonModule,
    // 인증 모듈
    AuthModule,
    // 도메인 모듈
    JobsModule,
    ExecutionsModule,
    HealthModule,
    NotificationLogsModule,
    DevicesModule,
    // 스케줄러 모듈
    SchedulerModule,
    // 테스트용 FAKE API 모듈
    FakeApiModule,
  ],
  controllers: [HealthController, MetricsController],
})
export class AppModule {}
