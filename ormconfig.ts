import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: '.env.local' });

/**
 * TypeORM DataSource 설정
 * Migration 실행 시 사용
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'shm',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
  // SSL 설정: AWS RDS는 기본적으로 SSL을 지원하므로 활성화
  // 로컬 개발 환경(DB_HOST가 localhost인 경우)이 아닐 때만 SSL 사용
  ssl:
    process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
      ? {
          rejectUnauthorized: false, // RDS 자체 서명 인증서 사용
        }
      : false,
});
