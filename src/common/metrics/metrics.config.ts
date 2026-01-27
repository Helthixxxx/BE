import { registerAs } from "@nestjs/config";

/**
 * Metrics 설정
 * 환경변수에서 메트릭 관련 설정 로드
 */
export default registerAs("metrics", () => ({
  enabled: process.env.METRICS_ENABLED !== "false", // 기본값: true
  path: process.env.METRICS_PATH || "/metrics",
  adminOnly: process.env.METRICS_ADMIN_ONLY !== "false", // 기본값: true
}));
