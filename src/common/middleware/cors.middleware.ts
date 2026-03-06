import { InternalServerErrorException } from "@nestjs/common";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

/**
 * CORS 설정 옵션 생성
 */
export function buildCorsOptions(): CorsOptions {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // origin이 없으면 (같은 도메인 요청 등) 허용
      if (!origin) {
        callback(null, true);
        return;
      }

      // 허용된 origin 목록에 있으면 허용
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // 그 외는 거부
      callback(new InternalServerErrorException("CORS 정책에 의해 차단되었습니다."));
      return;
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}
