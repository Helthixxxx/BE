import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthService } from './health.service';
import { JobsModule } from '../jobs/jobs.module';
import { ExecutionsModule } from '../executions/executions.module';
import { NotificationLogsModule } from '../notification-logs/notification-logs.module';
import healthConfig from '../config/health.config';

/**
 * HealthModule
 * Health 계산 및 조회 기능 모듈
 */
@Module({
  imports: [
    ConfigModule.forFeature(healthConfig),
    forwardRef(() => JobsModule),
    ExecutionsModule,
    NotificationLogsModule,
  ],
  controllers: [],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
