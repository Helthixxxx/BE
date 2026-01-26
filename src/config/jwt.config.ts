import { registerAs } from "@nestjs/config";

/**
 * JWT 설정
 * Access Token과 Refresh Token의 시크릿 및 만료시간 설정
 * 프로덕션 환경에서는 반드시 환경 변수로 설정해야 함
 */
export default registerAs("jwt", () => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret) {
    throw new Error("JWT_ACCESS_SECRET 환경 변수가 설정되지 않았습니다.");
  }

  if (!refreshSecret) {
    throw new Error("JWT_REFRESH_SECRET 환경 변수가 설정되지 않았습니다.");
  }

  return {
    access: {
      secret: accessSecret,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m", // 15분
    },
    refresh: {
      secret: refreshSecret,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d", // 7일
    },
  };
});

/**
 * Bcrypt 설정
 * 비밀번호 및 Refresh Token 해싱에 사용
 */
export const bcryptConfig = {
  saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10),
};
