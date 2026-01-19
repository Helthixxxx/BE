import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { Execution } from './entities/execution.entity';
import { JobsModule } from '../jobs/jobs.module';

/**
 * ExecutionsModule
 * Execution 관련 기능 모듈
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Execution]),
    forwardRef(() => JobsModule),
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
