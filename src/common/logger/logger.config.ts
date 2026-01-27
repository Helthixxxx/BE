import { registerAs } from "@nestjs/config";

/**
 * Logger 설정
 * 환경변수에서 로깅 관련 설정 로드
 */
export default registerAs("logger", () => ({
  level: process.env.LOG_LEVEL || "info",
  format: process.env.LOG_FORMAT || (process.env.NODE_ENV === "production" ? "json" : "pretty"),
}));
