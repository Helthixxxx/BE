/** Express 요청 인터페이스 확장 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export {};
