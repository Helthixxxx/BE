import { registerAs } from '@nestjs/config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

/**
 * Database 설정
 * TypeORM 연결 정보를 환경변수에서 로드
 */
export default registerAs(
  'database',
  (): PostgresConnectionOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'shm',
    synchronize: process.env.DB_SYNCHRONIZE === 'true', // 개발 환경에서만 true
    logging: process.env.DB_LOGGING === 'true',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: false,
    migrationsTableName: 'migrations',
  }),
);
