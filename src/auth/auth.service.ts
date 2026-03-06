import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { User, UserRole } from "../users/entities/user.entity";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { LogoutDto } from "./dto/logout.dto";
import { AuthResponseDto, RefreshResponseDto } from "./dto/auth-response.dto";
import { MeResponseDto } from "./dto/me-response.dto";
import { JwtPayload } from "./strategies/jwt.strategy";
import { bcryptConfig } from "../config/jwt.config";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  /** 회원가입 */
  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { providerId, password } = signupDto;

    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);

      const existingUser = await userRepo.findOne({
        where: { provider: "local", providerId },
      });

      if (existingUser) {
        throw new ConflictException("이미 사용 중인 아이디입니다.");
      }

      // 비밀번호 해시
      const passwordHash = await bcrypt.hash(password, bcryptConfig.saltRounds);

      // User 생성
      const user = userRepo.create({
        provider: "local",
        providerId,
        passwordHash,
        role: UserRole.USER,
      });

      const savedUser = await userRepo.save(user);

      // 토큰 발급
      const tokens = this.generateTokens(savedUser);

      // Refresh Token 해시 저장
      const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, bcryptConfig.saltRounds);
      savedUser.refreshTokenHash = refreshTokenHash;
      await userRepo.save(savedUser);

      return {
        tokens,
        user: this.toUserInfo(savedUser),
      };
    });
  }

  /** 로그인 */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { providerId, password } = loginDto;

    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);

      // 사용자 조회
      const user = await userRepo.findOne({
        where: { provider: "local", providerId },
      });

      if (!user) {
        throw new UnauthorizedException("아이디 또는 비밀번호가 일치하지 않습니다.");
      }

      // 비밀번호 검증
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new UnauthorizedException("아이디 또는 비밀번호가 일치하지 않습니다.");
      }

      // 토큰 발급
      const tokens = this.generateTokens(user);

      // Refresh Token 회전: 새 refreshToken 해시로 갱신
      const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, bcryptConfig.saltRounds);
      user.refreshTokenHash = refreshTokenHash;
      await userRepo.save(user);

      return {
        tokens,
        user: this.toUserInfo(user),
      };
    });
  }

  /** Refresh Token으로 Access Token 재발급 */
  async refresh(refreshDto: RefreshDto): Promise<RefreshResponseDto> {
    const { refreshToken } = refreshDto;

    try {
      // Refresh Token 검증 (서명/만료)
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: this.configService.get<string>("jwt.refresh.secret"),
      });

      return await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);

        // 사용자 조회
        const user = await userRepo.findOne({
          where: { id: payload.sub },
        });

        if (!user) {
          throw new UnauthorizedException("사용자를 찾을 수 없습니다.");
        }

        // DB의 refreshTokenHash와 제출된 refreshToken 비교
        if (!user.refreshTokenHash) {
          throw new UnauthorizedException("유효하지 않은 refresh token입니다.");
        }

        const isTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);

        if (!isTokenValid) {
          throw new UnauthorizedException("유효하지 않은 refresh token입니다.");
        }

        // Access Token 재발급
        const accessToken = this.generateAccessToken(user);

        // Refresh Token 회전: 새 refreshToken 발급 + 해시 갱신
        const newRefreshToken = this.generateRefreshToken(user);
        const refreshTokenHash = await bcrypt.hash(newRefreshToken, bcryptConfig.saltRounds);
        user.refreshTokenHash = refreshTokenHash;
        await userRepo.save(user);

        return {
          tokens: {
            accessToken,
            refreshToken: newRefreshToken,
          },
        };
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // JWT 검증 실패 (만료/위조/파싱불가 등)
      throw new UnauthorizedException("유효하지 않은 refresh token입니다.");
    }
  }

  /** 로그아웃 */
  async logout(logoutDto: LogoutDto): Promise<void> {
    const { refreshToken } = logoutDto;

    // Refresh Token 검증
    const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
      secret: this.configService.get<string>("jwt.refresh.secret"),
    });

    // 사용자 조회 및 refreshTokenHash 폐기
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (user) {
      user.refreshTokenHash = null;
      await this.userRepository.save(user);
    }
  }

  /** 회원탈퇴 */
  async withdraw(user: User): Promise<void> {
    const foundUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!foundUser) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    await this.userRepository.remove(foundUser);
  }

  /** 내 정보 조회 */
  async me(user: User): Promise<MeResponseDto> {
    const foundUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (!foundUser) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    return this.toUserInfo(foundUser);
  }

  /** Access Token + Refresh Token 생성 */
  private generateTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /** Access Token 생성  */
  private generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
    };

    const secret = this.configService.get<string>("jwt.access.secret");
    const expiresIn = this.configService.get<string>("jwt.access.expiresIn");
    if (!secret || !expiresIn) {
      throw new Error("JWT 암호화 키 또는 만료 시간이 설정되지 않았습니다.");
    }

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: expiresIn,
    } as JwtSignOptions);
  }

  /** Refresh Token 생성 */
  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
    };

    const secret = this.configService.get<string>("jwt.refresh.secret");
    const expiresIn = this.configService.get<string>("jwt.refresh.expiresIn");
    if (!secret || !expiresIn) {
      throw new Error("JWT 암호화 키 또는 만료 시간이 설정되지 않았습니다.");
    }

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: expiresIn,
    } as JwtSignOptions);
  }

  /** User 엔티티를 UserInfoDto로 변환 (민감 정보 제외) */
  private toUserInfo(user: User): {
    id: string;
    provider: string;
    providerId: string;
    role: UserRole;
    createdAt: Date;
  } {
    return {
      id: user.id,
      provider: user.provider,
      providerId: user.providerId,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
