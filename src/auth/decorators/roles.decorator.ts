import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Roles 데코레이터
 * 컨트롤러나 핸들러에 필요한 역할을 지정
 * @param roles 허용할 역할 배열
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
