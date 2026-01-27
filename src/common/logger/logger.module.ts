import { Module, Global } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Params } from "nestjs-pino";
import loggerConfig from "./logger.config";

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
            serializers: {
              req: (req: { id?: string; method?: string; url?: string }) => ({
                id: req.id,
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
              const requestId = (req as { requestId?: string }).requestId;
              return requestId || req.id || `req-${Date.now()}`;
            },
            // 커스텀 로거 설정
            customProps: (req) => {
              return {
                requestId: (req as { requestId?: string }).requestId,
              };
            },
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
