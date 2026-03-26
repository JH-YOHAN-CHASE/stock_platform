# StockIndex — 나만의 포트폴리오 & 경제 지수 플랫폼

## 프로젝트 개요

- **포트폴리오 관리**: 원하는 종목으로 포트폴리오를 만들고 다른 사용자와 비교
- **나만의 지수**: 금리·환율·유가·관세·CPI·고용지표 등으로 커스텀 경제 지수 설계
- **소셜 로그인**: Google / 네이버 OAuth2
- **공개/비공개**: 포트폴리오·지수를 공개해 다른 사용자와 공유

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Spring Boot 3.2, Java 17, Spring Security, Spring Data JPA |
| DB | MySQL 8.0 |
| 인증 | OAuth2 (Google, Naver) + JWT |
| 프론트엔드 | React 18, TypeScript, Vite, Recharts, Zustand |

---

## 프로젝트 구조

```
stock-project/
├── backend/
│   ├── settings.gradle          ← 멀티모듈 루트
│   ├── build.gradle             ← 공통 의존성
│   ├── application/             ← 컨트롤러·서비스·컨버터·보안
│   │   └── src/main/java/stock/
│   │       ├── controller/      ← REST API
│   │       ├── converter/       ← DTO ↔ Entity
│   │       ├── service/         ← 비즈니스 로직
│   │       ├── security/        ← JWT, OAuth2
│   │       ├── config/          ← SecurityConfig, ExceptionHandler
│   │       └── dto/             ← Request/Response DTO
│   └── db/
│       └── src/main/java/
│           ├── entity/          ← User, Portfolio, CustomIndex 등
│           └── repository/      ← Spring Data JPA
├── frontend/
│   └── src/
│       ├── api/                 ← Axios API 클라이언트
│       ├── pages/               ← 각 화면
│       ├── components/          ← 공통 컴포넌트
│       ├── store/               ← Zustand 상태 관리
│       └── types/               ← TypeScript 타입
└── docker-compose.yml
```

---

## 데이터 흐름

```
HTTP Request
    ↓
Controller  (입력 검증 @Valid, RequestDTO로만 받음)
    ↓
Converter   (RequestDTO → Entity)
    ↓
Service     (비즈니스 로직, 권한 확인)
    ↓
Repository  (DB 처리)
    ↓
Converter   (Entity → ResponseDTO)
    ↓
HTTP Response (ApiResponse<T> 래퍼)
```

---

## 실행 방법

### 1. MySQL 실행 (Docker)

```bash
docker-compose up -d
```

### 2. 환경변수 설정

`.env.example`을 참고해 실제 키를 발급하세요.

**Google OAuth2**
- https://console.cloud.google.com → OAuth 2.0 클라이언트 ID 생성
- 승인된 리디렉션 URI: `http://localhost:8083/login/oauth2/code/google`

**네이버 OAuth2**
- https://developers.naver.com → 애플리케이션 등록
- 콜백 URL: `http://localhost:8083/login/oauth2/code/naver`

### 3. 백엔드 실행

```bash
cd backend
# 환경변수 설정 후 실행
export GOOGLE_CLIENT_ID=...
export GOOGLE_CLIENT_SECRET=...
export NAVER_CLIENT_ID=...
export NAVER_CLIENT_SECRET=...

./gradlew :application:bootRun
# 포트: 8083
```

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
# 포트: 3000
```

브라우저에서 `http://localhost:3000` 접속

---

## 주요 API 엔드포인트

### 인증
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/oauth2/authorization/google` | Google 로그인 |
| GET | `/oauth2/authorization/naver` | 네이버 로그인 |
| GET | `/api/auth/me` | 내 정보 조회 |
| POST | `/api/auth/refresh` | 토큰 재발급 |

### 포트폴리오
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/portfolios/my` | 내 포트폴리오 목록 |
| GET | `/api/portfolios/public` | 공개 포트폴리오 목록 |
| GET | `/api/portfolios/compare?ids=1,2,3` | 포트폴리오 비교 |
| GET | `/api/portfolios/{id}` | 포트폴리오 상세 |
| POST | `/api/portfolios` | 포트폴리오 생성 |
| PUT | `/api/portfolios/{id}` | 포트폴리오 수정 |
| DELETE | `/api/portfolios/{id}` | 포트폴리오 삭제 |

### 나만의 지수
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/indexes/my` | 내 지수 목록 |
| GET | `/api/indexes/public` | 공개 지수 목록 |
| GET | `/api/indexes/accessible` | 접근 가능한 지수 |
| GET | `/api/indexes/{id}` | 지수 상세 |
| POST | `/api/indexes` | 지수 생성 |
| PUT | `/api/indexes/{id}` | 지수 수정 |
| DELETE | `/api/indexes/{id}` | 지수 삭제 |

---

## 지원 지표 유형

| 코드 | 한국어 |
|------|--------|
| INTEREST_RATE | 금리 |
| EXCHANGE_RATE | 환율 |
| OIL_PRICE | 국제유가 |
| TARIFF | 관세 |
| CPI | 소비자물가지수 |
| EMPLOYMENT | 고용지표 |
| GDP | GDP |
| PMI | 구매관리자지수 |
| YIELD_CURVE | 장단기 금리차 |
| CUSTOM | 사용자 정의 |
