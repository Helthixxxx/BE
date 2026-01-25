import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JobsService } from "./jobs.service";
import { JobsController } from "./jobs.controller";
import { Job } from "./entities/job.entity";
import { HealthModule } from "../health/health.module";

/**
 * JobsModule
 * Job 관련 기능 모듈
 */
@Module({
  imports: [TypeOrmModule.forFeature([Job]), forwardRef(() => HealthModule)],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
