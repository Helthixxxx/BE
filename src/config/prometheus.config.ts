import { registerAs } from "@nestjs/config";

/** Prometheus 설정 (System Health 대시보드용) */
export default registerAs("prometheus", () => ({
  url: process.env.PROMETHEUS_URL || "http://localhost:9090",
  timeoutMs: parseInt(process.env.PROMETHEUS_TIMEOUT_MS || "10000", 10),
}));
