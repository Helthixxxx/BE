import { Module, Global } from "@nestjs/common";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { Registry, collectDefaultMetrics } from "prom-client";
import { MetricsService } from "./metrics.service";

/**
 * MetricsModule
 * Prometheus 메트릭 수집 모듈
 * 전역 모듈로 등록하여 모든 모듈에서 사용 가능
 */
@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: "shm_",
        },
      },
    }),
  ],
  providers: [
    {
      provide: "PROM_REGISTRY",
      useFactory: () => {
        const registry = new Registry();
        collectDefaultMetrics({ register: registry, prefix: "shm_" });
        return registry;
      },
    },
    MetricsService,
  ],
  exports: [MetricsService, PrometheusModule, "PROM_REGISTRY"],
})
export class MetricsModule {}
