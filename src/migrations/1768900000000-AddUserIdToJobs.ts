import { MigrationInterface, QueryRunner, TableColumn, TableIndex, TableForeignKey } from "typeorm";

/**
 * AddUserIdToJobs Migration
 * jobs 테이블에 user_id 컬럼 및 인덱스, 외래키 추가
 */
export class AddUserIdToJobs1768900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("jobs");
    const hasUserIdColumn = table?.columns.some((column) => column.name === "user_id");

    // user_id 컬럼 추가
    if (!hasUserIdColumn) {
      await queryRunner.addColumn(
        "jobs",
        new TableColumn({
          name: "user_id",
          type: "uuid",
          isNullable: true,
        }),
      );
    }

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

    // user_id 외래키 추가
    const hasUserIdForeignKey = table?.foreignKeys.some(
      (fk) => fk.columnNames.includes("user_id") && fk.referencedTableName === "users",
    );

    if (!hasUserIdForeignKey) {
      await queryRunner.createForeignKey(
        "jobs",
        new TableForeignKey({
          name: "FK_jobs_user_id",
          columnNames: ["user_id"],
          referencedColumnNames: ["id"],
          referencedTableName: "users",
          onDelete: "SET NULL",
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: user_id 외래키, 인덱스, 컬럼 제거
    const table = await queryRunner.getTable("jobs");

    const hasUserIdForeignKey = table?.foreignKeys.some((fk) => fk.name === "FK_jobs_user_id");

    if (hasUserIdForeignKey) {
      await queryRunner.dropForeignKey("jobs", "FK_jobs_user_id");
    }

    const hasUserIdIndex = table?.indices.some((idx) => idx.name === "IDX_jobs_user_id");

    if (hasUserIdIndex) {
      await queryRunner.dropIndex("jobs", "IDX_jobs_user_id");
    }

    const hasUserIdColumn = table?.columns.some((column) => column.name === "user_id");

    if (hasUserIdColumn) {
      await queryRunner.dropColumn("jobs", "user_id");
    }
  }
}
