import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

/**
 * 초기 테이블 생성 Migration
 * - jobs: 감시 대상 정의
 * - executions: 실행 이력 (append-only)
 * - notification_logs: 상태 전이 로그
 */
export class CreateInitialTables1737129600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // jobs 테이블 생성
    await queryRunner.createTable(
      new Table({
        name: 'jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'schedule_minutes',
            type: 'int',
          },
          {
            name: 'timeout_ms',
            type: 'int',
          },
          {
            name: 'method',
            type: 'enum',
            enum: ['GET', 'POST'],
            default: "'GET'",
          },
          {
            name: 'url',
            type: 'varchar',
            length: '2048',
          },
          {
            name: 'headers',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'body',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'next_run_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'last_health',
            type: 'enum',
            enum: ['NORMAL', 'DEGRADED', 'STALLED', 'FAILED'],
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // jobs 인덱스 (이미 존재하면 스킵)
    const jobsTable = await queryRunner.getTable('jobs');
    const hasJobsIndex = jobsTable?.indices.some(
      (idx) => idx.name === 'IDX_jobs_is_active',
    );

    if (!hasJobsIndex) {
      await queryRunner.createIndex(
        'jobs',
        new TableIndex({
          name: 'IDX_jobs_is_active',
          columnNames: ['is_active'],
        }),
      );
    }

    // executions 테이블 생성
    await queryRunner.createTable(
      new Table({
        name: 'executions',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'job_id',
            type: 'uuid',
          },
          {
            name: 'scheduled_at',
            type: 'timestamptz',
          },
          {
            name: 'started_at',
            type: 'timestamptz',
          },
          {
            name: 'finished_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'duration_ms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'success',
            type: 'boolean',
          },
          {
            name: 'http_status',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'error_type',
            type: 'enum',
            enum: ['NONE', 'HTTP_ERROR', 'TIMEOUT', 'NETWORK_ERROR', 'UNKNOWN'],
            default: "'NONE'",
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'response_snippet',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'execution_key',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // executions 외래키 (이미 존재하면 스킵)
    const executionsTable = await queryRunner.getTable('executions');
    const hasExecutionsForeignKey = executionsTable?.foreignKeys.some(
      (fk) =>
        fk.columnNames.includes('job_id') && fk.referencedTableName === 'jobs',
    );

    if (!hasExecutionsForeignKey) {
      await queryRunner.createForeignKey(
        'executions',
        new TableForeignKey({
          columnNames: ['job_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'jobs',
          onDelete: 'CASCADE',
        }),
      );
    }

    // executions 인덱스 및 유니크 제약 (이미 존재하면 스킵)
    const hasExecutionsIndex = executionsTable?.indices.some(
      (idx) => idx.name === 'IDX_executions_job_created_id',
    );

    if (!hasExecutionsIndex) {
      await queryRunner.createIndex(
        'executions',
        new TableIndex({
          name: 'IDX_executions_job_created_id',
          columnNames: ['job_id', 'created_at', 'id'],
        }),
      );
    }

    const hasExecutionsUnique = executionsTable?.uniques.some(
      (uq) => uq.name === 'UQ_executions_execution_key',
    );

    if (!hasExecutionsUnique) {
      await queryRunner.createUniqueConstraint(
        'executions',
        new TableUnique({
          name: 'UQ_executions_execution_key',
          columnNames: ['execution_key'],
        }),
      );
    }

    // notification_logs 테이블 생성
    await queryRunner.createTable(
      new Table({
        name: 'notification_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'job_id',
            type: 'uuid',
          },
          {
            name: 'prev_health',
            type: 'enum',
            enum: ['NORMAL', 'DEGRADED', 'STALLED', 'FAILED'],
            isNullable: true,
          },
          {
            name: 'next_health',
            type: 'enum',
            enum: ['NORMAL', 'DEGRADED', 'STALLED', 'FAILED'],
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'sent_at',
            type: 'timestamptz',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // notification_logs 외래키 (이미 존재하면 스킵)
    const notificationLogsTable =
      await queryRunner.getTable('notification_logs');
    const hasNotificationLogsForeignKey =
      notificationLogsTable?.foreignKeys.some(
        (fk) =>
          fk.columnNames.includes('job_id') &&
          fk.referencedTableName === 'jobs',
      );

    if (!hasNotificationLogsForeignKey) {
      await queryRunner.createForeignKey(
        'notification_logs',
        new TableForeignKey({
          columnNames: ['job_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'jobs',
          onDelete: 'CASCADE',
        }),
      );
    }

    // notification_logs 인덱스 (이미 존재하면 스킵)
    const hasNotificationLogsIndex = notificationLogsTable?.indices.some(
      (idx) => idx.name === 'IDX_notification_logs_job_sent',
    );

    if (!hasNotificationLogsIndex) {
      await queryRunner.createIndex(
        'notification_logs',
        new TableIndex({
          name: 'IDX_notification_logs_job_sent',
          columnNames: ['job_id', 'sent_at'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notification_logs', true);
    await queryRunner.dropTable('executions', true);
    await queryRunner.dropTable('jobs', true);
  }
}
