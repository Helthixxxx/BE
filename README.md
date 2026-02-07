# Service Health Monitor (Backend)

개인 사이드프로젝트 및 소규모 서비스에서 운영 중인 **API / 작업(Job)** 이
정상적으로 동작하고 있는지를 주기적으로 확인하고,
실행 이력을 기반으로 **현재 상태(Health)** 를 자동 판단하여 알려주는
개인용 서비스 헬스 모니터링 시스템이다.

본 프로젝트는 실제 사용자 확보나 상용화를 목표로 하지 않으며,
**운영 관점의 백엔드 설계 경험과 크로스 플랫폼 앱 배포 경험**을 목적으로 한다.

---

## 기술 스택

- **Framework**: NestJS
- **Language**: TypeScript
- **ORM**: TypeORM
- **Database**: PostgreSQL (AWS RDS)
- **HTTP Client**: axios (@nestjs/axios)
- **Scheduler**: @nestjs/schedule
- **Validation**: class-validator + ValidationPipe
- **Config**: ConfigModule + .env

---

## 실행 방법

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수를 설정합니다:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=shm
DB_SYNCHRONIZE=false
DB_LOGGING=false

# Server
PORT=8080

# HTTP Client
HTTP_TIMEOUT_MS=30000
HTTP_MAX_REDIRECTS=5

# Health 설정
HEALTH_DEGRADED_THRESHOLD_MS=800
HEALTH_GRACE_PERIOD_MS=120000

# JWT 설정
JWT_ACCESS_SECRET=your-access-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
```

### 2. 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행
npm run migration:run

# 마이그레이션 되돌리기
npm run migration:revert
```

### 3. 애플리케이션 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod
```

애플리케이션은 기본적으로 `http://localhost:8080`에서 실행됩니다.

---

## API 엔드포인트

### Jobs

- `POST /jobs` - Job 생성
- `GET /jobs` - Job 목록 조회
  - `?includeHealth=true` - Health 상태 포함
- `GET /jobs/:id` - Job 단건 조회
- `PATCH /jobs/:id` - Job 수정
- `DELETE /jobs/:id` - Job 삭제

### Executions

- `GET /jobs/:id/executions` - Execution 목록 조회 (cursor pagination)
  - `?limit=20` - 페이지 크기 (기본값: 20, 최대: 100)
  - `?cursor=<cursor>` - 다음 페이지 커서

### Health

- `GET /health/summary` - 전체 Health 요약

### Auth

- `POST /auth/signup` - 회원가입
- `POST /auth/login` - 로그인
- `POST /auth/refresh` - Access Token 갱신
- `POST /auth/logout` - 로그아웃
- `GET /auth/me` - 내 정보 조회 (Bearer 인증 필요)
- `POST /auth/withdraw` - 회원탈퇴 (Bearer 인증 필요, 상세는 [회원탈퇴 API 연동 가이드](docs/WITHDRAW_API.md) 참고)

---

## 응답 규약 (Envelope)

모든 API 응답은 다음 규칙을 따릅니다.

### 성공 응답 (2xx)

```json
{
  "meta": {
    "requestId": "<server-generated-id>",
    "timestamp": "<ISO timestamp>"
  },
  "data": {
    // 엔드포인트별 데이터
  }
}
```

### 실패 응답 (4xx/5xx)

```json
{
  "meta": {
    "requestId": "<server-generated-id>",
    "timestamp": "<ISO timestamp>"
  },
  "error": {
    "code": "<ERROR_CODE>",
    "message": "<human readable message>",
    "details": {
      // 선택적 상세 정보
    }
  }
}
```

### Validation 에러 (400)

Validation 에러의 경우 `error.details`에 필드별 에러가 포함됩니다:

```json
{
  "meta": {
    "requestId": "...",
    "timestamp": "..."
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {
      "name": ["should not be empty"],
      "url": ["must be a URL"],
      "scheduleMinutes": ["must be an integer", "must be >= 1"]
    }
  }
}
```

---

## Cursor Pagination

Execution 조회는 cursor 기반 pagination을 사용합니다.

### Cursor 포맷

- cursor는 base64 인코딩된 JSON 문자열입니다
- 형식: `base64('{"createdAt":"2026-01-17T12:34:56.000Z","id":12345}')`

### 사용 방법

```bash
# 첫 페이지
GET /jobs/:id/executions?limit=20

# 다음 페이지
GET /jobs/:id/executions?limit=20&cursor=<previous-response-nextCursor>
```

### 응답 예시

```json
{
  "meta": {
    "requestId": "...",
    "timestamp": "..."
  },
  "data": {
    "items": [
      // Execution 배열
    ],
    "nextCursor": "base64-encoded-string" | null
  }
}
```

### 정렬 규칙

- 정렬: `createdAt DESC, id DESC`
- cursor는 `createdAt`과 `id`를 함께 사용하여 tie-breaker 역할을 합니다

---

## Health 상태 정의

Health는 다음 4가지 상태로 구분됩니다:

- **NORMAL**: 정상 상태
- **DEGRADED**: 성능 저하 또는 일부 실패
- **STALLED**: 실행이 멈춤 (nextRunAt이 현재 시간보다 과거인 경우)
- **FAILED**: 최근 3회 연속 실패

---

## Health 판단 기준

Health는 실시간으로 계산되며, 다음 우선순위로 판단합니다:

### 1. STALLED

```
now > job.nextRunAt
```

- nextRunAt이 현재 시간보다 과거인 경우
- Job이 실행되지 않고 있음을 의미

### 2. FAILED

```
최근 3회 연속 실패
```

- 최근 3개의 Execution이 모두 실패한 경우
- 심각한 장애 상태

### 3. DEGRADED

다음 조건 중 하나라도 만족하면 DEGRADED:

```
최근 10회 중 실패 3회 이상
```

또는

```
최근 10개 평균 durationMs >= 이전 10개 평균 durationMs * 1.5
```

- 일부 실패 또는 응답 지연이 발생하고 있음을 의미
- 상대적 성능 저하 기준: 최근 평균이 이전 평균보다 50% 이상 느려짐

### 4. NORMAL

위 조건에 해당하지 않는 경우

---

## Job 실행 로직

### 스케줄링

- `@nestjs/schedule`의 `@Cron` 데코레이터를 사용하여 매분 실행
- 각 Job의 `scheduleMinutes`에 따라 실행 시간 결정
- 실행 시간은 분 단위로 정렬 (초/밀리초는 0으로 설정)

### 중복 실행 방지

- `executionKey = jobId + scheduledAt`로 생성
- `executionKey`에 UNIQUE 제약을 두어 중복 실행 방지
- 이미 존재하는 executionKey로 실행 시도 시 해당 슬롯 실행 스킵

### HTTP 호출

- `@nestjs/axios`의 `HttpService` 사용
- 시스템 기본 타임아웃 사용 (`HTTP_TIMEOUT_MS` 환경변수, 기본값: 30초)
- 실패 유형 분류:
  - `HTTP_ERROR`: HTTP 상태 코드 4xx, 5xx
  - `TIMEOUT`: 요청 타임아웃
  - `NETWORK_ERROR`: 네트워크 연결 실패
  - `UNKNOWN`: 기타 에러

### Health 업데이트

- Execution 완료 후 Health 계산
- 상태 전이 시 `NotificationLog` 기록
- Job의 `lastHealth` 업데이트

---

## 데이터베이스 스키마

### jobs

- `id` (uuid, PK)
- `name` (string)
- `isActive` (boolean)
- `scheduleMinutes` (int)
- `method` (enum: GET, POST)
- `url` (string)
- `headers` (jsonb, nullable)
- `body` (jsonb, nullable)
- `nextRunAt` (timestamptz, nullable)
- `lastHealth` (enum, nullable)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

### executions

- `id` (bigint, PK, auto increment)
- `jobId` (uuid, FK)
- `scheduledAt` (timestamptz)
- `startedAt` (timestamptz)
- `finishedAt` (timestamptz, nullable)
- `durationMs` (int, nullable)
- `success` (boolean)
- `httpStatus` (int, nullable)
- `errorType` (enum)
- `errorMessage` (text, nullable)
- `responseSnippet` (text, nullable, max 1KB)
- `executionKey` (string, UNIQUE)
- `createdAt` (timestamptz)

**성능 추이 정보 (API 응답에 포함)**
- `performanceTrend`: 이전 10개 Execution 평균 대비 현재 Execution의 성능 변화
  - `previousAvg`: 이전 10개 평균 durationMs
  - `currentAvg`: 현재 Execution의 durationMs
  - `changePercent`: 변화율 (양수: 느려짐, 음수: 빨라짐)
  - `trend`: 성능 추이 (`improved` | `stable` | `degraded`)
    - `improved`: 10% 이상 빨라짐
    - `stable`: -10% ~ 50% 사이
    - `degraded`: 50% 이상 느려짐

### notification_logs

- `id` (uuid, PK)
- `jobId` (uuid, FK)
- `prevHealth` (enum, nullable)
- `nextHealth` (enum)
- `reason` (string)
- `sentAt` (timestamptz)
- `createdAt` (timestamptz)

---

## 인덱스

- `executions`: `(jobId, createdAt DESC, id DESC)` - pagination 최적화
- `executions`: `(executionKey)` UNIQUE - 중복 실행 방지
- `jobs`: `(isActive)` - 활성 Job 조회 최적화
- `notification_logs`: `(jobId, sentAt)` - 로그 조회 최적화

---

## 보안 고려사항

- 민감 정보(headers/body)는 로그 출력 금지
- `responseSnippet`은 최대 1KB로 truncate
- RDS Public access = No
- RDS Security Group Inbound: EC2 Security Group만 허용

---

## 개발 가이드

### 코드 스타일

- 모든 코드에는 "왜 이렇게 설계했는지"를 설명하는 주석 포함
- 애매한 설계가 나오면 구현 전에 선택지와 장단점을 먼저 제시

### 모듈 구조

```
src/
├── common/           # 공통 모듈 (Middleware, Interceptor, Filter)
├── config/           # 설정 파일
├── jobs/             # Job 모듈
├── executions/       # Execution 모듈
├── health/           # Health 계산 모듈
├── notification-logs/ # NotificationLog 모듈
├── scheduler/         # 스케줄러 모듈
└── migrations/       # 데이터베이스 마이그레이션
```

---

## Motivation

개인 프로젝트나 소규모 서비스 환경에서는 다음과 같은 문제가 자주 발생한다.

- API가 배포 이후에도 정상 동작하는지 지속적으로 확인하기 어렵다
- 단순 성공/실패 로그만으로는 "현재 상태"를 판단하기 힘들다
- 장애나 지연을 사람이 직접 확인해야 한다
- 테스트 코드는 배포 전 검증까지만 담당하고, 운영 중 상태 판단은 공백으로 남는다

이 프로젝트는 이러한 문제를 해결하기 위해
**운영 중인 시스템의 실행 이력을 기반으로 상태를 판단하는 구조**를 구현한다.

---

## Core Concept

이 시스템은 세 가지 핵심 개념으로 구성된다.

### Job

주기적으로 실행되어야 하는 작업 또는 API 호출 단위

예:
- 로그인 API 호출
- 액세스 토큰 갱신 API 호출
- 특정 엔드포인트 헬스 체크

### Execution

Job이 실제로 실행된 **한 번의 실행 기록**

- 시작/종료 시각
- 성공/실패 여부
- 소요 시간
- 에러 유형

### Health

최근 Execution 이력을 기반으로 계산된 **현재 상태**

예시 상태:
- `NORMAL` : 정상
- `DEGRADED` : 일부 실패 또는 응답 지연
- `STALLED` : 실행 누락
- `FAILED` : 연속 실패

---

## Out of Scope

다음 항목은 의도적으로 프로젝트 범위에서 제외한다.

- 실제 배치 실행 시스템 구현
- 서버 인프라 관리
- 로그 수집/분석 플랫폼
- 일반 사용자 대상 서비스 기능

본 프로젝트는 **운영 상태 판단과 모니터링에만 집중**한다.
