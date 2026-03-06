import { registerAs } from "@nestjs/config";

/** JWT 설정 */
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
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    },
    refresh: {
      secret: refreshSecret,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },
  };
});

/** Bcrypt 설정 */
export const bcryptConfig = {
  saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10),
};
