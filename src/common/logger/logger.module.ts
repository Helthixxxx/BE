import { Module, Global } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Params } from "nestjs-pino";
import loggerConfig from "./logger.config";
import { v4 as uuidv4 } from "uuid";
import { LoggerService } from "./logger.service";
import { hostname as osHostname } from "os";

/**
 * LoggerModule
 * Pino 기반 구조화된 로깅 모듈
 * 전역 모듈로 등록하여 모든 모듈에서 사용 가능
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Params => {
        const loggerConf = configService.get<ReturnType<typeof loggerConfig>>("logger");
        const isProduction = process.env.NODE_ENV === "production";
        const format = loggerConf?.format || (isProduction ? "json" : "pretty");
        const level = loggerConf?.level || (isProduction ? "info" : "debug");

        return {
          pinoHttp: {
            level,
            // pid 제거 (기본 base에 포함되는 pid/hostname 중 pid만 제외)
            // - base를 명시하면 기본 pid/hostname이 자동으로 추가되지 않습니다.
            // - 운영(log format=json)에서 pid가 더 이상 출력되지 않습니다.
            base: {
              hostname: process.env.HOSTNAME || osHostname(),
            },
            // JSON 로그에서 level을 숫자 대신 영문(label)로 출력
            // - 개발(pretty) 출력은 pino-pretty가 numeric level을 기대하므로 건드리지 않습니다.
            ...(format === "json"
              ? {
                  formatters: {
                    level: (label: string) => ({ level: label }),
                  },
                }
              : {}),
            transport:
              format === "pretty"
                ? {
                    target: "pino-pretty",
                    options: {
                      colorize: true,
                      singleLine: false,
                      translateTime: "yyyy-mm-dd HH:MM:ss",
                      ignore: "pid,hostname",
                    },
                  }
                : undefined,
            // pino-http 자동 access log 비활성화
            // - "request completed" 같은 로그가 출력되지 않도록 함
            // - access log는 LoggingInterceptor(커스텀 상세 로그)만 사용
            autoLogging: false,
            serializers: {
              // requestId는 최상위(requestId)로만 남기고, req에는 핵심 필드만 남김
              req: (req: { method?: string; url?: string }) => ({
                method: req.method,
                url: req.url,
                // 헤더는 민감 정보 포함 가능하므로 제외
              }),
              res: (res: { statusCode?: number }) => ({
                statusCode: res.statusCode,
              }),
              err: (err: { type?: string; message?: string; stack?: string }) => ({
                type: err.type,
                message: err.message,
                stack: err.stack,
              }),
            },
            // requestId를 로그에 포함
            genReqId: (req) => {
              const typedReq = req as { requestId?: string; id?: string };
              // requestId / req.id를 항상 동일 값으로 유지
              if (typedReq.requestId && typedReq.id && typedReq.requestId !== typedReq.id) {
                typedReq.id = typedReq.requestId;
                return typedReq.requestId;
              }
              if (typedReq.requestId) {
                typedReq.id = typedReq.requestId;
                return typedReq.requestId;
              }
              if (typedReq.id) {
                typedReq.requestId = typedReq.id;
                return typedReq.id;
              }
              const newId = uuidv4();
              typedReq.id = newId;
              typedReq.requestId = newId;
              return newId;
            },
          },
        };
      },
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
