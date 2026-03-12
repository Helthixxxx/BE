import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiLog } from "../api-logs/entities/api-log.entity";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Execution } from "../executions/entities/execution.entity";
import { Job } from "../jobs/entities/job.entity";
import { ApiLogsModule } from "../api-logs/api-logs.module";
import databaseConfig from "../config/database.config";
import healthConfig from "../config/health.config";
import httpConfig from "../config/http.config";
import apiLogConfig from "../config/api-log.config";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Execution, ApiLog]),
    ConfigModule.forFeature(databaseConfig),
    ConfigModule.forFeature(healthConfig),
    ConfigModule.forFeature(httpConfig),
    ConfigModule.forFeature(apiLogConfig),
    ApiLogsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}
