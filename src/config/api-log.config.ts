import { registerAs } from "@nestjs/config";

/** API 로그 설정 */
export default registerAs("apiLog", () => ({
  /** body 최대 크기 (bytes) */
  bodyMaxBytes: parseInt(process.env.API_LOG_BODY_MAX_BYTES || "10240", 10), // 10KB
  /** 로그 제외 경로 */
  excludedPaths: (
    process.env.API_LOG_EXCLUDED_PATHS || "/health,/api-docs,/api-docs/*,/favicon.ico"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  /** 보관 기간 (일) */
  retentionDays: parseInt(process.env.API_LOG_RETENTION_DAYS || "30", 10),
  /** 마스킹할 필드명 */
  maskedFields: ["password", "refreshToken", "accessToken"] as const,
}));
