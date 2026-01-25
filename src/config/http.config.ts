import { registerAs } from "@nestjs/config";

/**
 * HTTP Client 설정
 * axios 기본 timeout 등 공통 설정
 */
export default registerAs("http", () => ({
  timeout: parseInt(process.env.HTTP_TIMEOUT_MS || "30000", 10), // 기본 30초
  maxRedirects: parseInt(process.env.HTTP_MAX_REDIRECTS || "5", 10),
}));
