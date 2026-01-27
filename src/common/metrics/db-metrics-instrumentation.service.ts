import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DataSource, QueryRunner } from "typeorm";
import { MetricsService } from "./metrics.service";

/**
 * DbMetricsInstrumentationService
 *
 * TypeORM QueryRunner의 query()를 감싸서 DB 쿼리 메트릭을 기록합니다.
 * - shm_db_query_duration_seconds{operation,table} (Histogram)
 * - shm_db_connections_active (Gauge) (best-effort)
 *
 * 주의:
 * - TypeORM/driver 내부 구조는 버전/드라이버에 따라 다를 수 있어, 연결 수는 best-effort로만 갱신합니다.
 */
@Injectable()
export class DbMetricsInstrumentationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DbMetricsInstrumentationService.name);
  private connectionsInterval: NodeJS.Timeout | null = null;
  private alreadyWrapped = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly metricsService: MetricsService,
  ) {}

  onModuleInit() {
    this.wrapQueryRunner();
    this.startConnectionsSampler();
  }

  onModuleDestroy() {
    if (this.connectionsInterval) {
      clearInterval(this.connectionsInterval);
      this.connectionsInterval = null;
    }
  }

  private wrapQueryRunner() {
    if (this.alreadyWrapped) return;

    const ds = this.dataSource as unknown as {
      createQueryRunner?: (...args: unknown[]) => QueryRunner;
    };

    if (!ds.createQueryRunner) {
      this.logger.warn("DataSource.createQueryRunner를 찾지 못해 DB 메트릭 계측을 건너뜁니다.");
      return;
    }

    const originalCreate = ds.createQueryRunner.bind(this.dataSource);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ds.createQueryRunner = (...args: any[]) => {
      const runner = originalCreate(...args) as QueryRunner;
      const originalQuery = runner.query.bind(runner);

      /**
       * TypeORM QueryRunner.query 시그니처를 그대로 유지해야 합니다.
       * (특히 useStructuredResult 같은 3번째 인자를 누락하면 내부 로직이 깨질 수 있음)
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      runner.query = async (...queryArgs: any[]) => {
        const query = queryArgs[0];
        const start = process.hrtime.bigint();
        try {
          return await originalQuery(...queryArgs);
        } finally {
          const end = process.hrtime.bigint();
          const durationMs = Number(end - start) / 1_000_000;
          const { operation, table } = this.parseQuery(String(query));
          this.metricsService.recordDbQuery(operation, table, durationMs);
        }
      };

      return runner;
    };

    this.alreadyWrapped = true;
  }

  /**
   * 매우 단순한 SQL 파서 (best-effort)
   * - operation: SELECT/INSERT/UPDATE/DELETE 등
   * - table: FROM/INTO/UPDATE 뒤의 토큰
   */
  private parseQuery(sql: string): { operation: string; table: string } {
    const normalized = sql.trim().replace(/\s+/g, " ");
    const opMatch = normalized.match(/^([A-Z]+)/i);
    const operation = opMatch?.[1]?.toUpperCase() || "UNKNOWN";

    // INSERT INTO <table>
    const insertMatch = normalized.match(/\bINSERT\s+INTO\s+([^\s(]+)/i);
    if (insertMatch?.[1]) return { operation, table: this.cleanTable(insertMatch[1]) };

    // UPDATE <table>
    const updateMatch = normalized.match(/\bUPDATE\s+([^\s(]+)/i);
    if (updateMatch?.[1]) return { operation, table: this.cleanTable(updateMatch[1]) };

    // DELETE FROM <table> / SELECT ... FROM <table>
    const fromMatch = normalized.match(/\bFROM\s+([^\s(]+)/i);
    if (fromMatch?.[1]) return { operation, table: this.cleanTable(fromMatch[1]) };

    return { operation, table: "unknown" };
  }

  private cleanTable(raw: string): string {
    // schema.table / "table" / `table` 등 기본 정리
    return raw.replace(/^[`"']|[`"']$/g, "");
  }

  private startConnectionsSampler() {
    // 10초마다 best-effort로 active connection 수를 갱신
    this.connectionsInterval = setInterval(() => {
      try {
        const active = this.getActiveConnectionsBestEffort();
        if (active !== null) {
          this.metricsService.updateDbConnections(active);
        }
      } catch (e: unknown) {
        // 운영 안정성 우선: 샘플링 실패는 조용히 무시
        this.logger.debug(
          `DB connection 샘플링 실패: ${e instanceof Error ? e.message : "unknown"}`,
        );
      }
    }, 10_000);
  }

  private getActiveConnectionsBestEffort(): number | null {
    // PostgreSQL(pg) pool 기준 (typeorm driver master에 Pool이 들어오는 경우)
    // - totalCount: 총 연결
    // - idleCount: 유휴 연결
    // active ≈ total - idle
    const driver = (this.dataSource as unknown as { driver?: unknown }).driver as
      | {
          master?: {
            totalCount?: number;
            idleCount?: number;
          };
        }
      | undefined;

    const master = driver?.master;
    if (
      master &&
      typeof master.totalCount === "number" &&
      typeof master.idleCount === "number"
    ) {
      return Math.max(0, master.totalCount - master.idleCount);
    }

    return null;
  }
}

