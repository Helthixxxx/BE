import { registerAs } from "@nestjs/config";

/** HTTP Client 설정 */
export default registerAs("http", () => ({
  timeout: parseInt(process.env.HTTP_TIMEOUT_MS || "30000", 10),
  maxRedirects: parseInt(process.env.HTTP_MAX_REDIRECTS || "5", 10),
}));
