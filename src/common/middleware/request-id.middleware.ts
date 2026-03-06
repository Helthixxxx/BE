import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

/**
 * RequestIdMiddleware
 * 모든 요청에 고유한 requestId를 생성하여 request 객체에 저장
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.requestId || randomUUID();
    req.requestId = requestId;
    next();
  }
}
