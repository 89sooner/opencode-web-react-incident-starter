# OpenCode Web + React Incident Starter

이 스타터는 **브라우저 -> React UI -> BFF -> OpenCode 서버** 구조로 시작하는 최소 운영형 예제다.

포함 항목:
- `.opencode/skills/incident-triage/`: 즉시 로드 가능한 skill
- `opencode.json`: 사내 모델 게이트웨이 + 보수적 권한 정책 예제
- `src/server.js`: Node/Express 기반 BFF
- `web/`: React + Vite 기반 최소 UI
- `docs/FIRST_PRINCIPLES.md`: 왜 이 구성이 최소인지 설명

## 핵심 철학

이 스타터는 **일론 머스크식 제1원칙**으로 설계했다.

버려도 되는 것을 버리고, 운영에 필요한 최소 상태만 남겼다.
- session
- prompt
- structured result
- pending permission
- SSE event log

## 폴더 구조

```text
opencode-web-react-incident-starter/
  .opencode/skills/incident-triage/
  docs/FIRST_PRINCIPLES.md
  opencode.json
  src/server.js
  src/schema.js
  web/
    src/App.js
    src/api.js
    src/sse.js
    src/styles.css
```

## 1. 사내 LLM 게이트웨이와 OpenCode 설정

`opencode.json`에서 아래를 너희 환경에 맞게 바꿔라.
- `provider.corp.options.baseURL`
- `provider.corp.models`
- `server.cors`
- `bash` 허용 규칙

초기 운영 권장값은 다음이다.
- 기본 agent: `plan`
- `edit`: `deny`
- `bash`: 기본 `deny`, 읽기성 명령만 `allow`
- `skill`: `incident-triage`만 `allow`
- `share`: `disabled`

## 2. OpenCode 서버 실행

```bash
export OPENCODE_SERVER_PASSWORD='change-me'
opencode serve --hostname 127.0.0.1 --port 4096
```

## 3. BFF 실행

```bash
cp .env.example .env
npm install
npm run start
```

## 4. React UI 실행

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

기본값에서는 Vite dev server가 `/api`와 `/health`를 BFF(`http://localhost:3000`)로 프록시한다.

## 5. 프로덕션 방식

### 옵션 A. 프론트 정적 파일을 별도 서빙

```bash
cd web
npm run build
```

생성된 `web/dist`를 Nginx나 사내 CDN에서 서빙한다.

### 옵션 B. BFF가 빌드된 프론트를 함께 서빙

```bash
cd web
npm run build
cd ..
npm run start
```

`web/dist`가 존재하면 `src/server.js`가 정적 파일을 함께 서빙한다.

## 6. 프론트 기능

- 세션 생성
- incident prompt 전송
- global SSE 구독
- pending permission 모달/버튼
- structured triage result 카드
- raw messages 패널
- event log 패널

## 7. 권한 응답 호환성

BFF는 아래 둘 다 지원한다.
- 최신 경로: `POST /permission/:requestID/reply`
- 구 경로 fallback: `POST /session/:sessionID/permissions/:permissionID`

프론트는 BFF의 `/api/permissions/:requestId/reply`만 호출하면 된다.

## 8. 왜 approval을 먼저 붙였나

운영환경에서는 “예쁜 채팅”보다 “누가 무엇을 승인했는가”가 더 중요하다.
그래서 이 스타터는 메시지 UI보다 approval과 SSE 관측면을 먼저 붙였다.

## 9. 다음 확장 추천

1. 사내 SSO/JWT를 붙여 사용자 ID를 세션에 연결
2. approval 이력을 DB에 저장
3. 팀/프로젝트별 worker pool 분리
4. 읽기 전용 MCP 또는 내부 검색 연결
5. remediation tool을 좁은 scope로 추가
