import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { ApiLogsService } from "../api-logs/api-logs.service";

@Injectable()
export class LogCleanupService {
  constructor(
    private readonly apiLogsService: ApiLogsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 매일 오전 00시 실행
   * 보관 기간(일) 이전 api_logs 삭제
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleApiLogCleanup() {
    const config = this.configService.get<{ retentionDays: number }>("apiLog");
    const retentionDays = config?.retentionDays ?? 30;

    const deleted = await this.apiLogsService.deleteOlderThan(retentionDays);
    if (deleted > 0) {
      console.log(`[LogCleanupService] 30일 이전 API 로그 ${deleted}개 삭제`);
    }
  }
}
