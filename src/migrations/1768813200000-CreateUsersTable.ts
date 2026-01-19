import { MigrationInterface, QueryRunner, Table, TableUnique } from 'typeorm';

/**
 * Users 테이블 생성 Migration
 * - users: 사용자 인증 정보
 */
export class CreateUsersTable1768813200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // users 테이블 생성
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            default: "'local'",
          },
          {
            name: 'provider_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['USER', 'ADMIN'],
            default: "'USER'",
          },
          {
            name: 'refresh_token_hash',
            type: 'varchar',
            length: '255',
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

    // users 복합 유니크 제약 (provider, provider_id)
    // 유니크 제약은 자동으로 인덱스를 생성하므로 별도 인덱스 생성 불필요
    const usersTable = await queryRunner.getTable('users');
    const hasUsersUnique = usersTable?.uniques.some(
      (uq) => uq.name === 'UQ_users_provider_provider_id',
    );

    if (!hasUsersUnique) {
      await queryRunner.createUniqueConstraint(
        'users',
        new TableUnique({
          name: 'UQ_users_provider_provider_id',
          columnNames: ['provider', 'provider_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users', true);
    // enum 타입은 TypeORM이 자동으로 생성하므로 자동으로 삭제됨
  }
}
