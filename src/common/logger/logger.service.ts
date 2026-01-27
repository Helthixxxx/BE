import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

/**
 * LoggerService
 * NestJS Logger 인터페이스를 구현한 커스텀 Logger 서비스
 * Pino Logger를 래핑하여 사용
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private readonly logger: PinoLogger) {}

  /**
   * 로그 레벨: debug
   */
  debug(message: unknown, ...optionalParams: unknown[]): void {
    const context = optionalParams[0] as string | undefined;
    this.logger.debug(context ? { context } : {}, String(message));
  }

  /**
   * 로그 레벨: log (info와 동일)
   */
  log(message: unknown, ...optionalParams: unknown[]): void {
    const context = optionalParams[0] as string | undefined;
    this.logger.info(context ? { context } : {}, String(message));
  }

  /**
   * 로그 레벨: info
   */
  info(message: unknown, ...optionalParams: unknown[]): void {
    const context = optionalParams[0] as string | undefined;
    this.logger.info(context ? { context } : {}, String(message));
  }

  /**
   * 로그 레벨: warn
   */
  warn(message: unknown, ...optionalParams: unknown[]): void {
    const context = optionalParams[0] as string | undefined;
    this.logger.warn(context ? { context } : {}, String(message));
  }

  /**
   * 로그 레벨: error
   */
  error(message: unknown, ...optionalParams: unknown[]): void {
    const context = optionalParams[0] as string | undefined;
    const error = optionalParams[1] as Error | undefined;
    this.logger.error(
      { ...(context ? { context } : {}), ...(error ? { error } : {}) },
      String(message),
    );
  }

  /**
   * 로그 레벨: verbose
   */
  verbose(message: unknown, ...optionalParams: unknown[]): void {
    const context = optionalParams[0] as string | undefined;
    this.logger.trace(context ? { context } : {}, String(message));
  }
}
