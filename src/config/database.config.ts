import { registerAs } from "@nestjs/config";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

/**
 * Database 설정
 * TypeORM 연결 정보를 환경변수에서 로드
 */
export default registerAs(
  "database",
  (): PostgresConnectionOptions => ({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "shm",
    synchronize: process.env.DB_SYNCHRONIZE === "true", // 개발 환경에서만 true
    logging: process.env.DB_LOGGING === "true",
    entities: [__dirname + "/../**/*.entity{.ts,.js}"],
    migrations: [__dirname + "/../migrations/*{.ts,.js}"],
    migrationsRun: process.env.DB_MIGRATIONS_RUN === "true", // 환경변수로 제어 가능
    migrationsTableName: "migrations",
    // SSL 설정: AWS RDS는 기본적으로 SSL을 지원하므로 활성화
    // 로컬 개발 환경(DB_HOST가 localhost인 경우)이 아닐 때만 SSL 사용
    ssl:
      process.env.DB_HOST && process.env.DB_HOST !== "localhost"
        ? {
            rejectUnauthorized: false, // RDS 자체 서명 인증서 사용
          }
        : false,
  }),
);
