import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * RemoveTimeoutMsFromJobs Migration
 * jobs 테이블에서 timeout_ms 컬럼 제거
 * timeoutMs는 더 이상 사용자 입력이 아닌 시스템 기본값 사용
 */
export class RemoveTimeoutMsFromJobs1737200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // timeout_ms 컬럼이 존재하는지 확인 후 제거
    const table = await queryRunner.getTable("jobs");
    const hasTimeoutMsColumn = table?.columns.some((column) => column.name === "timeout_ms");

    if (hasTimeoutMsColumn) {
      await queryRunner.dropColumn("jobs", "timeout_ms");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: timeout_ms 컬럼이 없으면 복구 (기본값 30000ms)
    const table = await queryRunner.getTable("jobs");
    const hasTimeoutMsColumn = table?.columns.some((column) => column.name === "timeout_ms");

    if (!hasTimeoutMsColumn) {
      await queryRunner.addColumn(
        "jobs",
        new TableColumn({
          name: "timeout_ms",
          type: "int",
          default: 30000,
        }),
      );
    }
  }
}
