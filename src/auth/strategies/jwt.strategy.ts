import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { User } from "../../users/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

/**
 * JWT Payload 타입
 * Access Token payload: { sub: userId, role }
 */
export interface JwtPayload {
  sub: string; // userId
  role: string;
}

/**
 * JWT Strategy
 * Access Token 검증 전략
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const secret = configService.get<string>("jwt.access.secret");
    if (!secret) {
      throw new Error("JWT access secret is not defined");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * JWT 검증 후 실행되는 메서드
   * payload에서 사용자 정보를 추출하고, DB에서 사용자 존재 여부 확인
   */
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException("사용자를 찾을 수 없습니다.");
    }

    return user;
  }
}
