import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { User } from "../users/entities/user.entity";
import jwtConfig from "../config/jwt.config";

/**
 * AuthModule
 * 인증 관련 모듈
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],

      useFactory: (configService: ConfigService): any => {
        const secret = configService.get<string>("jwt.access.secret");
        const expiresIn = configService.get<string>("jwt.access.expiresIn");
        if (!secret || !expiresIn) {
          throw new Error("JWT access secret or expiresIn is not defined");
        }
        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule.forFeature(jwtConfig),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
