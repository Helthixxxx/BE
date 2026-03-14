import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { ApiLog } from "./entities/api-log.entity";
import { CreateApiLogDto } from "./dto/create-api-log.dto";

/** API 로그 설정 타입 */
interface ApiLogConfig {
  bodyMaxBytes: number;
  maskedFields: readonly string[];
  retentionDays: number;
  excludedPaths: string[];
}

const MASK = "***";

@Injectable()
export class ApiLogsService {
  private readonly bodyMaxBytes: number;
  private readonly maskedFields: readonly string[];
  private readonly excludedPaths: string[];

  constructor(
    @InjectRepository(ApiLog)
    private readonly apiLogRepository: Repository<ApiLog>,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get<ApiLogConfig>("apiLog");
    this.bodyMaxBytes = config?.bodyMaxBytes ?? 10240;
    this.maskedFields = config?.maskedFields ?? ["password", "refreshToken", "accessToken"];
    this.excludedPaths = config?.excludedPaths ?? [
      "/health",
      "/api-docs",
      "/api-docs/*",
      "/favicon.ico",
    ];
  }

  /** 로그 제외 경로 여부 */
  isExcludedPath(path: string): boolean {
    const normalized = path.toLowerCase();

    if (normalized.endsWith(".php")) {
      return true;
    }

    return this.excludedPaths.some((excluded) => {
      const e = excluded.toLowerCase().trim();
      if (e.endsWith("/*")) {
        const prefix = e.slice(0, -2);
        return normalized === prefix || normalized.startsWith(prefix + "/");
      }
      if (e.startsWith("*")) {
        const suffix = e.slice(1);
        return suffix.length > 0 && normalized.endsWith(suffix);
      }
      return normalized === e || normalized.startsWith(e + "/");
    });
  }

  /**
   * API 로그 저장 (비동기 fire-and-forget)
   * 마스킹 및 body 크기 제한 적용
   */
  saveLog(dto: CreateApiLogDto): void {
    const truncatedRequest = this.truncateAndMask(dto.requestBody);
    const truncatedResponse = this.truncateAndMask(dto.responseBody);

    const log = this.apiLogRepository.create({
      requestId: dto.requestId,
      method: dto.method,
      url: dto.url,
      query: dto.query,
      statusCode: dto.statusCode,
      durationMs: dto.durationMs,
      requestBody: truncatedRequest,
      responseBody: truncatedResponse,
      userId: dto.userId ?? null,
      errorMessage: dto.errorMessage ?? null,
    });

    this.apiLogRepository.save(log).catch((err) => {
      // 로그 저장 실패는 콘솔에만 출력 (앱 동작에 영향 없도록)
      console.error("[ApiLogsService] Failed to save log:", (err as Error)?.message);
    });
  }

  /**
   * 지정 기간 이전 로그 삭제 (배치용)
   */
  async deleteOlderThan(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.apiLogRepository
      .createQueryBuilder()
      .delete()
      .where("created_at < :cutoff", { cutoff })
      .execute();

    return result.affected ?? 0;
  }

  /** 마스킹 적용 및 크기 제한 */
  private truncateAndMask(value: unknown): unknown {
    if (value === undefined || value === null) {
      return value;
    }

    const masked = this.maskSensitiveFields(value);
    const str = JSON.stringify(masked);
    if (str.length <= this.bodyMaxBytes) {
      return masked;
    }

    return {
      _truncated: true,
      _originalLength: str.length,
      _preview: str.slice(0, this.bodyMaxBytes - 50) + "...[truncated]",
    };
  }

  /** 민감 필드 마스킹 */
  private maskSensitiveFields(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.maskSensitiveFields(item));
    }

    if (typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        const lowerKey = key.toLowerCase();
        if (this.maskedFields.some((f) => f.toLowerCase() === lowerKey)) {
          result[key] = MASK;
        } else {
          result[key] = this.maskSensitiveFields(val);
        }
      }
      return result;
    }

    return value;
  }
}
