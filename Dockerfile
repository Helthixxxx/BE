# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# package.json과 package-lock.json만 먼저 복사하여 의존성 캐싱 최적화
COPY package*.json ./

# 프로덕션 의존성만 설치 (빌드 도구 포함)
RUN npm ci --only=production=false

# 소스 코드 복사
COPY . .

# 빌드 실행
RUN npm run build && \
    echo "Build completed. Checking dist directory..." && \
    ls -la /app/dist && \
    echo "Checking dist/src directory..." && \
    if [ -d /app/dist/src ]; then \
        echo "Moving dist/src/* to dist/..." && \
        mv /app/dist/src/* /app/dist/ && \
        rmdir /app/dist/src && \
        echo "Files moved successfully"; \
    fi && \
    echo "Checking for main.js..." && \
    test -f /app/dist/main.js || (echo "Error: dist/main.js not found after build" && ls -la /app/dist && exit 1) && \
    echo "Build verification successful"

# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 프로덕션 의존성만 설치 (devDependencies 제외)
# --ignore-scripts: prepare(husky) 등 lifecycle 스크립트 스킵 (husky는 devDependency라 설치 안 됨)
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# builder 스테이지에서 빌드된 파일 복사
COPY --from=builder /app/dist ./dist

# 복사된 파일 확인
RUN ls -la /app/dist && \
    test -f /app/dist/main.js || (echo "Error: dist/main.js not found after copy" && exit 1)

# 비root 사용자로 실행 (보안 강화)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
