import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableColumn,
} from "typeorm";

/**
 * 푸시 알림 관련 테이블 및 필드 추가 Migration
 * - devices: 푸시 토큰 관리
 * - notification_recipients: 개별 발송 로그
 * - jobs 테이블 확장: last_notification_sent_at, last_notification_health
 * - notification_logs 테이블 확장: notification_type, status, error_message, recipient_count
 */
export class AddPushNotificationTables1737900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. devices 테이블 생성
    const devicesTableExists = await queryRunner.hasTable("devices");
    if (!devicesTableExists) {
      await queryRunner.createTable(
        new Table({
          name: "devices",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              generationStrategy: "uuid",
              default: "uuid_generate_v4()",
            },
            {
              name: "user_id",
              type: "uuid",
              isNullable: true,
            },
            {
              name: "push_token",
              type: "varchar",
              length: "255",
            },
            {
              name: "device_id",
              type: "varchar",
              length: "255",
              isNullable: true,
            },
            {
              name: "platform",
              type: "varchar",
              length: "50",
              default: "'ios'",
            },
            {
              name: "is_active",
              type: "boolean",
              default: true,
            },
            {
              name: "last_used_at",
              type: "timestamptz",
              isNullable: true,
            },
            {
              name: "created_at",
              type: "timestamptz",
              default: "CURRENT_TIMESTAMP",
            },
            {
              name: "updated_at",
              type: "timestamptz",
              default: "CURRENT_TIMESTAMP",
            },
          ],
        }),
        true,
      );

      // devices 인덱스 및 제약
      await queryRunner.createIndex(
        "devices",
        new TableIndex({
          name: "IDX_devices_user_id_is_active",
          columnNames: ["user_id", "is_active"],
        }),
      );

      await queryRunner.createIndex(
        "devices",
        new TableIndex({
          name: "UQ_devices_push_token",
          columnNames: ["push_token"],
          isUnique: true,
        }),
      );

      // devices 외래키 (users)
      await queryRunner.createForeignKey(
        "devices",
        new TableForeignKey({
          name: "FK_devices_user_id",
          columnNames: ["user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "SET NULL",
        }),
      );
    }

    // 2. notification_recipients 테이블 생성
    const notificationRecipientsTableExists = await queryRunner.hasTable("notification_recipients");
    if (!notificationRecipientsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: "notification_recipients",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              generationStrategy: "uuid",
              default: "uuid_generate_v4()",
            },
            {
              name: "notification_log_id",
              type: "uuid",
            },
            {
              name: "device_id",
              type: "uuid",
              isNullable: true,
            },
            {
              name: "user_id",
              type: "uuid",
              isNullable: true,
            },
            {
              name: "status",
              type: "varchar",
              length: "50",
              default: "'pending'",
            },
            {
              name: "error_message",
              type: "varchar",
              length: "500",
              isNullable: true,
            },
            {
              name: "sent_at",
              type: "timestamptz",
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

      // notification_recipients 인덱스
      await queryRunner.createIndex(
        "notification_recipients",
        new TableIndex({
          name: "IDX_notification_recipients_notification_log_id",
          columnNames: ["notification_log_id"],
        }),
      );

      await queryRunner.createIndex(
        "notification_recipients",
        new TableIndex({
          name: "IDX_notification_recipients_device_id_sent_at",
          columnNames: ["device_id", "sent_at"],
        }),
      );

      await queryRunner.createIndex(
        "notification_recipients",
        new TableIndex({
          name: "IDX_notification_recipients_user_id_sent_at",
          columnNames: ["user_id", "sent_at"],
        }),
      );

      // notification_recipients 외래키
      const recipientsTable = await queryRunner.getTable("notification_recipients");
      if (
        recipientsTable &&
        !recipientsTable.foreignKeys.find(
          (fk) => fk.name === "FK_notification_recipients_notification_log_id",
        )
      ) {
        await queryRunner.createForeignKey(
          "notification_recipients",
          new TableForeignKey({
            name: "FK_notification_recipients_notification_log_id",
            columnNames: ["notification_log_id"],
            referencedTableName: "notification_logs",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          }),
        );
      }

      if (
        recipientsTable &&
        !recipientsTable.foreignKeys.find(
          (fk) => fk.name === "FK_notification_recipients_device_id",
        )
      ) {
        await queryRunner.createForeignKey(
          "notification_recipients",
          new TableForeignKey({
            name: "FK_notification_recipients_device_id",
            columnNames: ["device_id"],
            referencedTableName: "devices",
            referencedColumnNames: ["id"],
            onDelete: "SET NULL",
          }),
        );
      }

      if (
        recipientsTable &&
        !recipientsTable.foreignKeys.find((fk) => fk.name === "FK_notification_recipients_user_id")
      ) {
        await queryRunner.createForeignKey(
          "notification_recipients",
          new TableForeignKey({
            name: "FK_notification_recipients_user_id",
            columnNames: ["user_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "SET NULL",
          }),
        );
      }
    }

    // 3. jobs 테이블 확장
    const jobsTable = await queryRunner.getTable("jobs");
    if (jobsTable && !jobsTable.findColumnByName("last_notification_sent_at")) {
      await queryRunner.addColumn(
        "jobs",
        new TableColumn({
          name: "last_notification_sent_at",
          type: "timestamptz",
          isNullable: true,
        }),
      );
    }

    if (jobsTable && !jobsTable.findColumnByName("last_notification_health")) {
      await queryRunner.addColumn(
        "jobs",
        new TableColumn({
          name: "last_notification_health",
          type: "enum",
          enum: ["NORMAL", "DEGRADED", "FAILED"],
          isNullable: true,
        }),
      );
    }

    // 4. notification_logs 테이블 확장
    const notificationLogsTable = await queryRunner.getTable("notification_logs");
    if (notificationLogsTable && !notificationLogsTable.findColumnByName("notification_type")) {
      await queryRunner.addColumn(
        "notification_logs",
        new TableColumn({
          name: "notification_type",
          type: "varchar",
          length: "50",
          default: "'push'",
        }),
      );
    }

    if (notificationLogsTable && !notificationLogsTable.findColumnByName("status")) {
      await queryRunner.addColumn(
        "notification_logs",
        new TableColumn({
          name: "status",
          type: "varchar",
          length: "50",
          default: "'pending'",
        }),
      );
    }

    if (notificationLogsTable && !notificationLogsTable.findColumnByName("error_message")) {
      await queryRunner.addColumn(
        "notification_logs",
        new TableColumn({
          name: "error_message",
          type: "varchar",
          length: "500",
          isNullable: true,
        }),
      );
    }

    if (notificationLogsTable && !notificationLogsTable.findColumnByName("recipient_count")) {
      await queryRunner.addColumn(
        "notification_logs",
        new TableColumn({
          name: "recipient_count",
          type: "int",
          default: 0,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // notification_logs 테이블 확장 필드 제거
    await queryRunner.dropColumn("notification_logs", "recipient_count");
    await queryRunner.dropColumn("notification_logs", "error_message");
    await queryRunner.dropColumn("notification_logs", "status");
    await queryRunner.dropColumn("notification_logs", "notification_type");

    // jobs 테이블 확장 필드 제거
    await queryRunner.dropColumn("jobs", "last_notification_health");
    await queryRunner.dropColumn("jobs", "last_notification_sent_at");

    // notification_recipients 테이블 삭제
    await queryRunner.dropTable("notification_recipients", true);

    // devices 테이블 삭제
    await queryRunner.dropTable("devices", true);
  }
}
