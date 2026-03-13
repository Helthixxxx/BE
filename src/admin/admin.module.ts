import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiLog } from "../api-logs/entities/api-log.entity";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Execution } from "../executions/entities/execution.entity";
import { Job } from "../jobs/entities/job.entity";
import { ApiLogsModule } from "../api-logs/api-logs.module";
import apiLogConfig from "../config/api-log.config";
import databaseConfig from "../config/database.config";
import healthConfig from "../config/health.config";
import httpConfig from "../config/http.config";
import prometheusConfig from "../config/prometheus.config";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PrometheusClient } from "./infra/prometheus.client";

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Execution, ApiLog]),
    ConfigModule.forFeature(databaseConfig),
    ConfigModule.forFeature(healthConfig),
    ConfigModule.forFeature(httpConfig),
    ConfigModule.forFeature(apiLogConfig),
    ConfigModule.forFeature(prometheusConfig),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const httpConfigValue = configService.get<{ timeout: number; maxRedirects: number }>("http");
        return {
          timeout: httpConfigValue?.timeout ?? 30000,
          maxRedirects: httpConfigValue?.maxRedirects ?? 5,
        };
      },
      inject: [ConfigService],
    }),
    ApiLogsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, PrometheusClient, RolesGuard],
})
export class AdminModule {}
