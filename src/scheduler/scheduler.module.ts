import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JobSchedulerService } from "./job-scheduler.service";
import { JobExecutorService } from "./job-executor.service";
import { LogCleanupService } from "./log-cleanup.service";
import { JobsModule } from "../jobs/jobs.module";
import { ExecutionsModule } from "../executions/executions.module";
import { HealthModule } from "../health/health.module";
import { ApiLogsModule } from "../api-logs/api-logs.module";

/** HTTP 설정 타입 */
interface HttpConfig {
  timeout: number;
  maxRedirects: number;
}

/**
 * SchedulerModule
 * Job 스케줄링 및 실행 모듈
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const httpConfigValue = configService.get<HttpConfig>("http");
        if (!httpConfigValue) {
          throw new Error("HTTP 설정이 정의되지 않았습니다.");
        }
        return {
          timeout: httpConfigValue.timeout,
          maxRedirects: httpConfigValue.maxRedirects,
        };
      },
      inject: [ConfigService],
    }),
    JobsModule,
    ExecutionsModule,
    HealthModule,
    ApiLogsModule,
  ],
  providers: [JobSchedulerService, JobExecutorService, LogCleanupService],
})
export class SchedulerModule {}
