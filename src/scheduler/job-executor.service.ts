import { Injectable, Inject } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { AxiosResponse } from "axios";
import { firstValueFrom } from "rxjs";
import { ConfigType } from "@nestjs/config";
import { ExecutionsService } from "../executions/executions.service";
import { HealthService } from "../health/health.service";
import { Job } from "../jobs/entities/job.entity";
import { HttpMethod } from "../common/types/http-method.enum";
import { ExecutionErrorCode } from "../common/types/execution-error-type.enum";
import httpConfig from "../config/http.config";

/**
 * Job 실행 로직 처리
 * HTTP 호출 및 Execution 결과 저장
 */
@Injectable()
export class JobExecutorService {
  constructor(
    private readonly httpService: HttpService,
    private readonly executionsService: ExecutionsService,
    private readonly healthService: HealthService,
    @Inject(httpConfig.KEY)
    private readonly httpConfiguration: ConfigType<typeof httpConfig>,
  ) {}

  /**
   * Job 실행
   * 1. Execution 생성 (중복 실행 방지)
   * 2. HTTP 호출
   * 3. Execution 결과 업데이트
   * 4. Health 업데이트 및 NotificationLog 기록
   */
  async executeJob(job: Job, scheduledAt: Date): Promise<void> {
    const startedAt = new Date();
    let executionId: number | undefined;

    try {
      // Execution 생성 (executionKey unique constraint로 중복 실행 방지)
      const execution = await this.executionsService.create(job.id, scheduledAt, startedAt);
      executionId = execution.id;

      // HTTP 호출
      const result = await this.executeHttpCall(job);

      // Execution 결과 업데이트
      const finishedAt = new Date();
      await this.executionsService.updateResult(
        executionId,
        finishedAt,
        result.success,
        result.httpStatus,
        result.errorType,
        result.errorMessage,
        result.responseSnippet,
      );

      // Health 업데이트 및 NotificationLog 기록
      await this.healthService.updateHealthAndNotify(job.id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Execution 생성 실패 (중복 실행 등)
      if (error instanceof Error && errorMessage.includes("already exists")) {
        return;
      }

      // Execution이 생성된 경우 결과 업데이트
      if (executionId) {
        const finishedAt = new Date();
        await this.executionsService.updateResult(
          executionId,
          finishedAt,
          false,
          null,
          ExecutionErrorCode.UNKNOWN,
          errorMessage,
          null,
        );
      }
    }
  }

  /**
   * HTTP 호출 실행
   * axios를 사용하여 HTTP 요청 수행
   * timeout, errorType 분류 처리
   */
  private async executeHttpCall(job: Job): Promise<{
    success: boolean;
    httpStatus: number | null;
    errorType: ExecutionErrorCode;
    errorMessage: string | null;
    responseSnippet: string | null;
  }> {
    try {
      const config = {
        timeout: this.httpConfiguration.timeout,
        headers: job.headers || {},
        validateStatus: () => true, // 모든 상태 코드 허용
      };

      let response: AxiosResponse<unknown>;
      if (job.method === HttpMethod.POST) {
        response = await firstValueFrom(
          this.httpService.post<unknown>(job.url, job.body || {}, config as never),
        );
      } else {
        response = await firstValueFrom(this.httpService.get<unknown>(job.url, config as never));
      }

      const httpStatus = response.status;
      // 3xx 리다이렉트도 성공으로 처리 (200-399)
      const success = httpStatus >= 200 && httpStatus < 400;

      // responseSnippet 생성 (최대 1KB)
      let responseSnippet: string | null = null;
      try {
        const responseData = JSON.stringify(response.data);
        responseSnippet = responseData.substring(0, 1024);
      } catch {
        // JSON 변환 실패 시 무시
      }

      return {
        success,
        httpStatus,
        errorType: success ? ExecutionErrorCode.NONE : ExecutionErrorCode.HTTP_ERROR,
        errorMessage: success ? null : `HTTP ${httpStatus}`,
        responseSnippet,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // error 객체에서 code 추출
      let errorCode: string | undefined;
      if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: unknown }).code;
        errorCode = typeof code === "string" ? code : String(code);
      }

      // 타임아웃 체크
      if (errorCode === "ECONNABORTED" || errorMessage.includes("timeout")) {
        return {
          success: false,
          httpStatus: null,
          errorType: ExecutionErrorCode.TIMEOUT,
          errorMessage: "Request timeout",
          responseSnippet: null,
        };
      }

      // 네트워크 에러 체크
      if (errorCode === "ECONNREFUSED" || errorCode === "ENOTFOUND" || errorCode === "ECONNRESET") {
        return {
          success: false,
          httpStatus: null,
          errorType: ExecutionErrorCode.NETWORK_ERROR,
          errorMessage: errorMessage || "Network error",
          responseSnippet: null,
        };
      }

      // 기타 에러
      return {
        success: false,
        httpStatus: null,
        errorType: ExecutionErrorCode.UNKNOWN,
        errorMessage: errorMessage || "Unknown error",
        responseSnippet: null,
      };
    }
  }
}
