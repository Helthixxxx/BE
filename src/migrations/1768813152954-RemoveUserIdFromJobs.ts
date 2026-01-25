import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

/**
 * RemoveUserIdFromJobs Migration
 * jobs 테이블에서 user_id 컬럼 및 인덱스 제거
 */
export class RemoveUserIdFromJobs1768813152954 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("jobs");
    const hasUserIdIndex = table?.indices.some((idx) => idx.name === "IDX_jobs_user_id");

    // user_id 인덱스 제거
    if (hasUserIdIndex) {
      await queryRunner.dropIndex("jobs", "IDX_jobs_user_id");
    }

    const hasUserIdColumn = table?.columns.some((column) => column.name === "user_id");

    // user_id 컬럼 제거
    if (hasUserIdColumn) {
      await queryRunner.dropColumn("jobs", "user_id");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: user_id 컬럼 및 인덱스 복구
    const table = await queryRunner.getTable("jobs");
    const hasUserIdColumn = table?.columns.some((column) => column.name === "user_id");

    if (!hasUserIdColumn) {
      // user_id 컬럼 추가
      await queryRunner.addColumn(
        "jobs",
        new TableColumn({
          name: "user_id",
          type: "uuid",
          isNullable: true,
        }),
      );

      // user_id 인덱스 추가
      const hasUserIdIndex = table?.indices.some((idx) => idx.name === "IDX_jobs_user_id");

      if (!hasUserIdIndex) {
        await queryRunner.createIndex(
          "jobs",
          new TableIndex({
            name: "IDX_jobs_user_id",
            columnNames: ["user_id"],
          }),
        );
      }
    }
  }
}
