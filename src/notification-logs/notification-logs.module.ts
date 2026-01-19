import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLogsService } from './notification-logs.service';
import { NotificationLog } from './entities/notification-log.entity';

/**
 * NotificationLogsModule
 * NotificationLog 관련 기능 모듈
 */
@Module({
  imports: [TypeOrmModule.forFeature([NotificationLog])],
  providers: [NotificationLogsService],
  exports: [NotificationLogsService],
})
export class NotificationLogsModule {}
