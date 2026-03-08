import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { User, UserRole } from "../users/entities/user.entity";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed"),
  compare: jest.fn(),
}));

const mockUser: User = {
  id: "user-1",
  provider: "local",
  providerId: "testuser",
  passwordHash: "hashed",
  role: UserRole.USER,
  refreshTokenHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AuthService", () => {
  let service: AuthService;
  let userRepository: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock; remove: jest.Mock };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const mockTransaction = (fn: (manager: EntityManager) => Promise<unknown>) => {
    const mockManager = {
      getRepository: jest.fn().mockReturnValue(userRepository),
    };
    return fn(mockManager as unknown as EntityManager);
  };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: "user-1" })),
      remove: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue("token"),
      verify: jest.fn().mockReturnValue({ sub: "user-1" }),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, string> = {
          "jwt.access.secret": "access-secret",
          "jwt.access.expiresIn": "15m",
          "jwt.refresh.secret": "refresh-secret",
          "jwt.refresh.expiresIn": "7d",
        };
        return map[key];
      }),
    };

    dataSource = {
      transaction: jest.fn((fn) => mockTransaction(fn)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe("signup", () => {
    it("새 사용자 회원가입 성공", async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.save
        .mockResolvedValueOnce({ ...mockUser, id: "user-1", providerId: "newuser" })
        .mockResolvedValueOnce({ ...mockUser, id: "user-1", providerId: "newuser" });

      const result = await service.signup({
        providerId: "newuser",
        password: "password123",
      });

      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe("token");
      expect(result.tokens.refreshToken).toBe("token");
      expect(result.user.providerId).toBe("newuser");
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { provider: "local", providerId: "newuser" },
      });
    });

    it("이미 존재하는 아이디로 회원가입 시 ConflictException", async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.signup({ providerId: "testuser", password: "pass" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("로그인 성공", async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        providerId: "testuser",
        password: "password",
      });

      expect(result.tokens).toBeDefined();
      expect(result.user.providerId).toBe("testuser");
    });

    it("존재하지 않는 사용자 로그인 시 UnauthorizedException", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ providerId: "unknown", password: "pass" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("비밀번호 불일치 시 UnauthorizedException", async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ providerId: "testuser", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    it("Refresh Token으로 Access Token 재발급 성공", async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: "hashed",
      });
      userRepository.save.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockImplementation((payload) =>
        payload.role ? "new-access-token" : "new-refresh-token",
      );

      const result = await service.refresh({ refreshToken: "valid-token" });

      expect(result.tokens.accessToken).toBe("new-access-token");
      expect(result.tokens.refreshToken).toBe("new-refresh-token");
    });

    it("refreshTokenHash가 없으면 UnauthorizedException", async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
      });

      await expect(
        service.refresh({ refreshToken: "token" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("유효하지 않은 refresh token이면 UnauthorizedException", async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("invalid");
      });

      await expect(
        service.refresh({ refreshToken: "invalid" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("로그아웃 시 refreshTokenHash 폐기", async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: "hash",
      });
      userRepository.save.mockResolvedValue(mockUser);

      await service.logout({ refreshToken: "token" });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ refreshTokenHash: null }),
      );
    });
  });

  describe("withdraw", () => {
    it("회원탈퇴 성공", async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await service.withdraw(mockUser);

      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it("사용자를 찾을 수 없으면 NotFoundException", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.withdraw(mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe("me", () => {
    it("내 정보 조회 성공", async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.me(mockUser);

      expect(result.id).toBe("user-1");
      expect(result.providerId).toBe("testuser");
    });

    it("사용자를 찾을 수 없으면 NotFoundException", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.me(mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
