import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { JobsModule } from './jobs/jobs.module';
import { ExecutionsModule } from './executions/executions.module';
import { HealthModule } from './health/health.module';
import { NotificationLogsModule } from './notification-logs/notification-logs.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './config/database.config';
import httpConfig from './config/http.config';
import jwtConfig from './config/jwt.config';
import healthConfig from './config/health.config';
import { HealthController } from './health.controller';

/**
 * AppModule
 * 애플리케이션 루트 모듈
 */
@Module({
  imports: [
    // ConfigModule: 환경변수 관리
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, httpConfig, jwtConfig, healthConfig],
      envFilePath: [`.env.${process.env.NODE_ENV || 'local'}`, '.env'],
    }),
    // TypeORM: 데이터베이스 연결
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig =
          configService.get<ReturnType<typeof databaseConfig>>('database');
        if (!dbConfig) {
          throw new Error('Database config is not defined');
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
    // 스케줄러 모듈
    SchedulerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
