import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request 타입 확장 (requestId 포함)
 */
interface RequestWithId extends Request {
  requestId: string;
}

/**
 * RequestIdMiddleware
 * 모든 요청에 고유한 requestId를 생성하여 request 객체에 저장
 * 이후 Interceptor/Filter에서 응답에 포함하기 위해 사용
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // requestId를 request 객체에 저장
    (req as RequestWithId).requestId = uuidv4();
    next();
  }
}
