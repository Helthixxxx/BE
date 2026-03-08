import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

/**
 * api_logs 테이블 생성 Migration
 * API 요청/응답 로그 저장
 */
export class CreateApiLogsTable1769000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "api_logs",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "request_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "method",
            type: "varchar",
            length: "10",
          },
          {
            name: "url",
            type: "varchar",
            length: "500",
          },
          {
            name: "query",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "status_code",
            type: "int",
          },
          {
            name: "duration_ms",
            type: "int",
          },
          {
            name: "request_body",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "response_body",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "error_message",
            type: "text",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "api_logs",
      new TableIndex({ name: "IDX_api_logs_created_at", columnNames: ["created_at"] }),
    );
    await queryRunner.createIndex(
      "api_logs",
      new TableIndex({ name: "IDX_api_logs_request_id", columnNames: ["request_id"] }),
    );
    await queryRunner.createIndex(
      "api_logs",
      new TableIndex({
        name: "IDX_api_logs_created_at_method",
        columnNames: ["created_at", "method"],
      }),
    );
    await queryRunner.createIndex(
      "api_logs",
      new TableIndex({
        name: "IDX_api_logs_created_at_status_code",
        columnNames: ["created_at", "status_code"],
      }),
    );
    await queryRunner.createIndex(
      "api_logs",
      new TableIndex({
        name: "IDX_api_logs_created_at_user_id",
        columnNames: ["created_at", "user_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("api_logs", true);
  }
}
