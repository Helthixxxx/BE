import { registerAs } from '@nestjs/config';

/**
 * JWT 설정
 * Access Token과 Refresh Token의 시크릿 및 만료시간 설정
 */
export default registerAs('jwt', () => ({
  access: {
    secret:
      process.env.JWT_ACCESS_SECRET ||
      'your-access-secret-key-change-in-production',
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m', // 15분
  },
  refresh: {
    secret:
      process.env.JWT_REFRESH_SECRET ||
      'your-refresh-secret-key-change-in-production',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 7일
  },
}));

/**
 * Bcrypt 설정
 * 비밀번호 및 Refresh Token 해싱에 사용
 */
export const bcryptConfig = {
  saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
};
