import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { ApiLog } from "./entities/api-log.entity";
import { ApiLogsService } from "./api-logs.service";

@Module({
  imports: [TypeOrmModule.forFeature([ApiLog]), ConfigModule],
  providers: [ApiLogsService],
  exports: [ApiLogsService],
})
export class ApiLogsModule {}
