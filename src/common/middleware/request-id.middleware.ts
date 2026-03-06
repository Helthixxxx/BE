import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

/**
 * RequestIdMiddleware
 * 모든 요청에 고유한 requestId를 생성하여 request 객체에 저장
 * 이후 Interceptor/Filter에서 응답에 포함하기 위해 사용
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 요청 단위 단일 ID를 보장: 기존 ID가 있으면 재사용, 없으면 생성
    const requestId = req.requestId || randomUUID();
    req.requestId = requestId;
    next();
  }
}
