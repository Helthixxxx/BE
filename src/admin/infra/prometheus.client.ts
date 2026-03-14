import { HttpService } from "@nestjs/axios";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import prometheusConfig from "../../config/prometheus.config";

type PrometheusVectorResult = Array<{
  metric: Record<string, string>;
  value: [number, string];
}>;

type PrometheusMatrixResult = Array<{
  metric: Record<string, string>;
  values: Array<[number, string]>;
}>;

type PrometheusApiResponse =
  | { status: "success"; data: { resultType: "vector"; result: PrometheusVectorResult } }
  | { status: "success"; data: { resultType: "matrix"; result: PrometheusMatrixResult } }
  | { status: "error"; errorType: string; error: string };

@Injectable()
export class PrometheusClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    @Inject(prometheusConfig.KEY)
    config: ConfigType<typeof prometheusConfig>,
  ) {
    this.baseUrl = config.url.replace(/\/$/, "");
    this.timeout = config.timeoutMs;
  }

  async query(query: string, time?: Date): Promise<PrometheusVectorResult> {
    const url = `${this.baseUrl}/api/v1/query`;
    const params: Record<string, string> = { query };
    if (time) {
      params.time = Math.floor(time.getTime() / 1000).toString();
    }

    const response = await firstValueFrom(
      this.httpService.get<PrometheusApiResponse>(url, {
        params,
        timeout: this.timeout,
        validateStatus: (s) => s === 200,
      }),
    );

    const body = response.data;
    if (body.status === "error") {
      throw new Error(`Prometheus query failed: ${body.error}`);
    }
    if (body.data.resultType !== "vector") {
      throw new Error(`Unexpected result type: ${body.data.resultType}`);
    }
    return body.data.result;
  }

  async queryRange(
    query: string,
    start: Date,
    end: Date,
    step: string,
  ): Promise<PrometheusMatrixResult> {
    const url = `${this.baseUrl}/api/v1/query_range`;
    const params = {
      query,
      start: Math.floor(start.getTime() / 1000),
      end: Math.floor(end.getTime() / 1000),
      step,
    };

    const response = await firstValueFrom(
      this.httpService.get<PrometheusApiResponse>(url, {
        params,
        timeout: this.timeout,
        validateStatus: (s) => s === 200,
      }),
    );

    const body = response.data;
    if (body.status === "error") {
      throw new Error(`Prometheus query failed: ${body.error}`);
    }
    if (body.data.resultType !== "matrix") {
      throw new Error(`Unexpected result type: ${body.data.resultType}`);
    }
    return body.data.result;
  }

  /** 클러스터 평균 CPU 사용률 (%) */
  async getCpuUsagePercent(time?: Date): Promise<number> {
    const query = `100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`;
    const result = await this.query(query, time);
    if (result.length === 0) return 0;
    const value = parseFloat(result[0].value[1]);
    return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
  }

  /** 메모리 사용량 (usedGb, totalGb, percent) */
  async getMemoryUsage(time?: Date): Promise<{ usedGb: number; totalGb: number; percent: number }> {
    const totalQuery = `sum(node_memory_MemTotal_bytes)`;
    const availableQuery = `sum(node_memory_MemAvailable_bytes)`;
    const [totalResult, availableResult] = await Promise.all([
      this.query(totalQuery, time),
      this.query(availableQuery, time),
    ]);
    const totalBytes = totalResult.length > 0 ? parseFloat(totalResult[0].value[1]) : 0;
    const availableBytes = availableResult.length > 0 ? parseFloat(availableResult[0].value[1]) : 0;
    const usedBytes = Math.max(0, totalBytes - availableBytes);
    const totalGb = totalBytes / 1024 ** 3;
    const usedGb = usedBytes / 1024 ** 3;
    const percent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
    return {
      usedGb: Math.round(usedGb * 100) / 100,
      totalGb: Math.round(totalGb * 100) / 100,
      percent: Math.round(percent * 100) / 100,
    };
  }

  /** 네트워크 트래픽 (Mbps) - 인바운드/아웃바운드 합계 */
  async getNetworkMbps(time?: Date): Promise<{ inboundMbps: number; outboundMbps: number }> {
    const inQuery = `sum(rate(node_network_receive_bytes_total{device!="lo"}[5m])) * 8 / 1e6`;
    const outQuery = `sum(rate(node_network_transmit_bytes_total{device!="lo"}[5m])) * 8 / 1e6`;
    const [inResult, outResult] = await Promise.all([
      this.query(inQuery, time),
      this.query(outQuery, time),
    ]);
    const inboundMbps = inResult.length > 0 ? parseFloat(inResult[0].value[1]) : 0;
    const outboundMbps = outResult.length > 0 ? parseFloat(outResult[0].value[1]) : 0;
    return {
      inboundMbps: Math.round(inboundMbps * 100) / 100,
      outboundMbps: Math.round(outboundMbps * 100) / 100,
    };
  }

  /** CPU/메모리 시계열 (range) */
  async getCpuTimeSeries(
    start: Date,
    end: Date,
    stepMinutes: number,
  ): Promise<Array<{ timestamp: string; value: number }>> {
    const step = `${stepMinutes}m`;
    const query = `100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) by () * 100)`;
    const result = await this.queryRange(query, start, end, step);
    const points: Array<{ timestamp: string; value: number }> = [];
    for (const series of result) {
      for (const [ts, val] of series.values) {
        points.push({
          timestamp: new Date(ts * 1000).toISOString(),
          value: Math.round(Math.max(0, Math.min(100, parseFloat(val))) * 100) / 100,
        });
      }
    }
    points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return points;
  }

  async getMemoryTimeSeries(
    start: Date,
    end: Date,
    stepMinutes: number,
  ): Promise<Array<{ timestamp: string; value: number }>> {
    const step = `${stepMinutes}m`;
    const query = `100 * (1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes))`;
    const result = await this.queryRange(query, start, end, step);
    const points: Array<{ timestamp: string; value: number }> = [];
    for (const series of result) {
      for (const [ts, val] of series.values) {
        points.push({
          timestamp: new Date(ts * 1000).toISOString(),
          value: Math.round(Math.max(0, Math.min(100, parseFloat(val))) * 100) / 100,
        });
      }
    }
    points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return points;
  }

  /** 노드별 CPU, 메모리, 파드(컨테이너) 수 */
  async getNodes(time?: Date): Promise<
    Array<{
      name: string;
      role: string;
      cpuPercent: number;
      memoryPercent: number;
      pods: number;
      status: string;
    }>
  > {
    const instanceToNode: Record<string, string> = {
      "ec2-1": "node-helthix-01",
      "ec2-2": "node-helthix-02",
    };
    const nodeRoles: Record<string, string> = {
      "node-helthix-01": "master",
      "node-helthix-02": "worker",
    };

    const cpuQuery = `100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance) * 100)`;
    const memQuery = `100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))`;
    const upQuery = `up{job=~"node-ec2-.*"}`;

    const [cpuResult, memResult, upResult] = await Promise.all([
      this.query(cpuQuery, time),
      this.query(memQuery, time),
      this.query(upQuery, time),
    ]);

    const cpuByInstance = new Map<string, number>();
    for (const r of cpuResult) {
      const inst = r.metric.instance || "";
      cpuByInstance.set(inst, Math.round(parseFloat(r.value[1]) * 100) / 100);
    }
    const memByInstance = new Map<string, number>();
    for (const r of memResult) {
      const inst = r.metric.instance || "";
      memByInstance.set(inst, Math.round(parseFloat(r.value[1]) * 100) / 100);
    }
    const upByInstance = new Map<string, number>();
    for (const r of upResult) {
      const inst = r.metric.instance || "";
      upByInstance.set(inst, parseFloat(r.value[1]));
    }

    const containerCountQuery = `count(container_last_seen{name!="",name!="/"}) by (instance)`;
    const containerResult = await this.query(containerCountQuery, time).catch(() => []);
    const cadvisorToNode: Record<string, string> = {
      "ec2-1": "node-helthix-01",
      "ec2-2": "node-helthix-02",
    };
    const podsByNode = new Map<string, number>();
    for (const r of containerResult) {
      const inst = r.metric.instance || "";
      const node = cadvisorToNode[inst] ?? inst;
      const prev = podsByNode.get(node) ?? 0;
      podsByNode.set(node, prev + (parseInt(r.value[1], 10) || 0));
    }

    const nodes: Array<{
      name: string;
      role: string;
      cpuPercent: number;
      memoryPercent: number;
      pods: number;
      status: string;
    }> = [];

    for (const [instance, nodeName] of Object.entries(instanceToNode)) {
      const cpu = cpuByInstance.get(instance) ?? 0;
      const mem = memByInstance.get(instance) ?? 0;
      const up = upByInstance.get(instance) ?? 0;
      const pods = podsByNode.get(nodeName) ?? 0;
      nodes.push({
        name: nodeName,
        role: nodeRoles[nodeName] ?? "worker",
        cpuPercent: cpu,
        memoryPercent: mem,
        pods,
        status: up >= 1 ? "ready" : "not_ready",
      });
    }

    return nodes;
  }

  /** 파드(컨테이너) 목록 */
  async getPods(time?: Date): Promise<
    Array<{
      name: string;
      namespace: string;
      ready: string;
      restarts: number;
      age: string;
    }>
  > {
    const startTimeQuery = `container_start_time_seconds{name!="",name!="/"}`;
    const lastSeenQuery = `container_last_seen{name!="",name!="/"}`;
    const restartQuery = `container_restart_count{name!="",name!="/"}`;

    const [startResult, lastSeenResult, restartResult] = await Promise.all([
      this.query(startTimeQuery, time),
      this.query(lastSeenQuery, time),
      this.query(restartQuery, time).catch(() => []),
    ]);

    const restartByKey = new Map<string, number>();
    for (const r of restartResult) {
      const key = r.metric.name || "";
      restartByKey.set(key, parseInt(r.value[1], 10) || 0);
    }

    const now = (time || new Date()).getTime() / 1000;
    const pods: Array<{
      name: string;
      namespace: string;
      ready: string;
      restarts: number;
      age: string;
    }> = [];

    const seen = new Set<string>();
    for (const r of startResult) {
      const name = (r.metric.name || "").replace(/^\//, "");
      // POD, k8s_* 만 제외 (node-exporter, cadvisor 등 인프라 컨테이너 포함 → nodes[].pods 개수와 일치)
      if (!name || name === "POD" || /^k8s_/.test(name)) continue;
      if (seen.has(name)) continue;
      seen.add(name);

      const startSec = parseFloat(r.value[1]);
      const ageSec = now - startSec;
      const ageStr = formatAge(ageSec);
      const lastSeen = lastSeenResult.find(
        (x) => (x.metric.name || "").replace(/^\//, "") === name,
      );
      const isReady = lastSeen && now - parseFloat(lastSeen.value[1]) < 120;
      const restarts = restartByKey.get(r.metric.name || "") ?? 0;

      pods.push({
        name: name || "unknown",
        namespace: "default",
        ready: isReady ? "1/1" : "0/1",
        restarts,
        age: ageStr,
      });
    }

    return pods.slice(0, 50);
  }

  /** Database Health: 커넥션 현황 (postgres_exporter) */
  async getDatabaseConnectionStats(
    time?: Date,
  ): Promise<{ active: number; idle: number; max: number } | null> {
    const db = "helthix";
    try {
      const activeQuery = `sum(pg_stat_activity_count{datname="${db}",state="active"}) or vector(0)`;
      const idleQuery = `sum(pg_stat_activity_count{datname="${db}",state="idle"}) or vector(0)`;
      const maxQuery = `pg_settings_max_connections{datname="${db}"}`;

      const [activeRes, idleRes, maxRes] = await Promise.all([
        this.query(activeQuery, time).catch(() => []),
        this.query(idleQuery, time).catch(() => []),
        this.query(maxQuery, time).catch(() => []),
      ]);

      const active = activeRes.length > 0 ? Math.round(parseFloat(activeRes[0].value[1])) : 0;
      const idle = idleRes.length > 0 ? Math.round(parseFloat(idleRes[0].value[1])) : 0;
      const max = maxRes.length > 0 ? Math.round(parseFloat(maxRes[0].value[1])) : 0;

      return { active, idle, max };
    } catch {
      return null;
    }
  }

  /** Database Health: Read QPS (초당 읽기 처리량, tup_returned + tup_fetched) */
  async getDatabaseReadQps(time?: Date): Promise<number | null> {
    const db = "helthix";
    const queries = [
      `sum(rate(pg_stat_database_tup_returned{datname="${db}"}[1m])) + sum(rate(pg_stat_database_tup_fetched{datname="${db}"}[1m]))`,
      `sum(rate(pg_stat_database_tup_returned[1m])) + sum(rate(pg_stat_database_tup_fetched[1m]))`,
    ];
    for (const query of queries) {
      try {
        const result = await this.query(query, time);
        if (result.length > 0) {
          return Math.round(parseFloat(result[0].value[1]) * 100) / 100;
        }
      } catch {
        // 다음 쿼리 시도
      }
    }
    return null;
  }

  /** Database Health: Write QPS (초당 쓰기 처리량, insert+update+delete) */
  async getDatabaseWriteQps(time?: Date): Promise<number | null> {
    const db = "helthix";
    const queries = [
      `sum(rate(pg_stat_database_tup_inserted{datname="${db}"}[1m])) + sum(rate(pg_stat_database_tup_updated{datname="${db}"}[1m])) + sum(rate(pg_stat_database_tup_deleted{datname="${db}"}[1m]))`,
      `sum(rate(pg_stat_database_tup_inserted[1m])) + sum(rate(pg_stat_database_tup_updated[1m])) + sum(rate(pg_stat_database_tup_deleted[1m]))`,
    ];
    for (const query of queries) {
      try {
        const result = await this.query(query, time);
        if (result.length > 0) {
          return Math.round(parseFloat(result[0].value[1]) * 100) / 100;
        }
      } catch {
        // 다음 쿼리 시도
      }
    }
    return null;
  }

  /** Database Health: QPS 시계열 */
  async getDatabaseQpsTimeSeries(
    start: Date,
    end: Date,
    stepMinutes: number,
  ): Promise<{
    read: Array<{ timestamp: string; value: number }>;
    write: Array<{ timestamp: string; value: number }>;
  }> {
    const db = "helthix";
    const step = `${stepMinutes}m`;
    const rateWindow = "1m";
    const readQueries = [
      `sum(rate(pg_stat_database_tup_returned{datname="${db}"}[${rateWindow}])) + sum(rate(pg_stat_database_tup_fetched{datname="${db}"}[${rateWindow}]))`,
      `sum(rate(pg_stat_database_tup_returned[${rateWindow}])) + sum(rate(pg_stat_database_tup_fetched[${rateWindow}]))`,
    ];
    const writeQueries = [
      `sum(rate(pg_stat_database_tup_inserted{datname="${db}"}[${rateWindow}])) + sum(rate(pg_stat_database_tup_updated{datname="${db}"}[${rateWindow}])) + sum(rate(pg_stat_database_tup_deleted{datname="${db}"}[${rateWindow}]))`,
      `sum(rate(pg_stat_database_tup_inserted[${rateWindow}])) + sum(rate(pg_stat_database_tup_updated[${rateWindow}])) + sum(rate(pg_stat_database_tup_deleted[${rateWindow}]))`,
    ];

    const toPoints = (
      result: PrometheusMatrixResult,
    ): Array<{ timestamp: string; value: number }> => {
      const points: Array<{ timestamp: string; value: number }> = [];
      for (const series of result) {
        for (const [ts, val] of series.values) {
          points.push({
            timestamp: new Date(ts * 1000).toISOString(),
            value: Math.round(parseFloat(val) * 100) / 100,
          });
        }
      }
      points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return points;
    };

    let readResult: PrometheusMatrixResult = [];
    let writeResult: PrometheusMatrixResult = [];
    for (const q of readQueries) {
      try {
        readResult = await this.queryRange(q, start, end, step);
        break;
      } catch {
        // 다음 쿼리 시도
      }
    }
    for (const q of writeQueries) {
      try {
        writeResult = await this.queryRange(q, start, end, step);
        break;
      } catch {
        // 다음 쿼리 시도
      }
    }
    return {
      read: toPoints(readResult),
      write: toPoints(writeResult),
    };
  }
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
