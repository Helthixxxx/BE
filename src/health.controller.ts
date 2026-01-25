import { Controller, Get } from "@nestjs/common";
import * as os from "os";

@Controller()
export class HealthController {
  @Get("/health")
  health() {
    const hostname = os.hostname();
    return {
      status: "ok",
      instanceId: hostname,
      timestamp: new Date().toISOString(),
    };
  }
}
