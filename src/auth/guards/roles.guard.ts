import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { User, UserRole } from "../../users/entities/user.entity";

/**
 * Request 타입 확장 (user 포함)
 */
interface RequestWithUser {
  user: User;
}

/**
 * Roles 가드
 * 사용자의 역할이 요구되는 역할과 일치하는지 확인
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      "roles",
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      // 역할 제한이 없으면 통과
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException("인증이 필요합니다.");
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException("권한이 없습니다.");
    }

    return true;
  }
}
