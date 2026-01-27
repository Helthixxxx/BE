import { Controller, Get } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as os from "os";

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get("/health")
  async health() {
    const hostname = os.hostname();
    const uptime = process.uptime();

    // DB 연결 상태 확인
    let database = "unknown";
    try {
      await this.dataSource.query("SELECT 1");
      database = "connected";
    } catch {
      database = "disconnected";
    }

    return {
      status: database === "connected" ? "ok" : "degraded",
      instanceId: hostname,
      uptime: Math.floor(uptime),
      checks: {
        database,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
