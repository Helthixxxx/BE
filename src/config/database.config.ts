import { registerAs } from "@nestjs/config";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

/** Database 설정 */
export default registerAs(
  "database",
  (): PostgresConnectionOptions => ({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "helthix",
    synchronize: process.env.DB_SYNCHRONIZE === "true",
    logging: process.env.DB_LOGGING === "true",
    entities: [__dirname + "/../**/*.entity{.ts,.js}"],
    migrations: [__dirname + "/../migrations/*{.ts,.js}"],
    migrationsRun: process.env.DB_MIGRATIONS_RUN === "true",
    migrationsTableName: "migrations",
    ssl:
      process.env.DB_HOST && process.env.DB_HOST !== "localhost"
        ? {
            rejectUnauthorized: false,
          }
        : false,
    extra: {
      max: parseInt(process.env.DB_POOL_MAX || "20", 10), // 최대 연결 수
      min: parseInt(process.env.DB_POOL_MIN || "5", 10), // 최소 유지 연결 수
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || "10000", 10), // 연결 타임아웃
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10), // 유휴 연결 타임아웃
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT_MS || "10000", 10), // 연결 획득 타임아웃
    },
    connectTimeoutMS: parseInt(process.env.DB_QUERY_TIMEOUT_MS || "30000", 10), // 쿼리 타임아웃
  }),
);
