import { registerAs } from "@nestjs/config";

/** Health 설정 */
export default registerAs("health", () => ({
  /**
   * DEGRADED 절대 임계값 (밀리초)
   * 최근 평균이 이 값을 초과하면 DEGRADED로 판정
   */
  degradedThresholdMs: parseInt(process.env.HEALTH_DEGRADED_THRESHOLD_MS || "800", 10),

  /**
   * nextRunAt 기반 FAILED 판정 시 grace period (밀리초)
   * nextRunAt이 현재 시간보다 과거여도 이 시간만큼 여유를 둠
   */
  gracePeriodMs: parseInt(process.env.HEALTH_GRACE_PERIOD_MS || "120000", 10),
}));
