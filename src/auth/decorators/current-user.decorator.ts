import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";

/**
 * Request 타입 확장 (user 포함)
 */
interface RequestWithUser {
  user: User;
}

/**
 * CurrentUser 데코레이터
 * 요청에서 인증된 사용자 정보를 추출
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();

  return request.user;
});
