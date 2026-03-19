# Quickstart

이 문서는 `opencode-web-react-incident-starter`를 로컬에서 순차적으로 실행하는 가장 빠른 절차를 정리한다.

처음 앱을 쓰는 사용자는 실행 전에 [USER_MANUAL](/home/roqkf/opencode-web-react-incident-starter/docs/USER_MANUAL.md)부터 읽는 편이 좋다.

## 1. 사전 준비

로컬에 아래가 설치되어 있어야 한다.

- `npm`
- Node.js 20 이상

작업 디렉터리:

```bash
cd /home/roqkf/opencode-web-react-incident-starter
```

## 2. 실행 모드 선택

집에서는 아래 2가지 모드 중 하나로 실행한다.

- `Mode A: no-upstream smoke`
  - OpenCode 없이 프론트와 BFF만 띄워 네트워크 실패 처리와 기본 UI만 확인
- `Mode B: fake-opencode integration`
  - 로컬 mock upstream을 띄워 세션/메시지/permission/SSE까지 확인

권장 기본값은 `Mode B`다.

## 3. OpenCode 설정 확인

먼저 [opencode.json](/home/roqkf/opencode-web-react-incident-starter/opencode.json)을 로컬 환경에 맞게 확인한다.

특히 아래 값을 점검한다.

- `provider.corp.options.baseURL`
- `provider.corp.models`
- `server.cors`

## 4. Mode A: OpenCode 없이 smoke test

이 모드는 upstream이 없는 상태에서 실패 처리만 보는 용도다.

### 4.1 BFF `.env`

예시:

```env
PORT=3000
OPENCODE_URL=http://127.0.0.1:4096
OPENCODE_USERNAME=opencode
OPENCODE_PASSWORD=
ALLOWED_ORIGIN=http://localhost:5173
DEFAULT_AGENT=plan
DEFAULT_PROVIDER_ID=corp
DEFAULT_MODEL_ID=ops-coder
```

### 4.2 BFF 실행

```bash
cd /home/roqkf/opencode-web-react-incident-starter
npm install
npm run start
```

### 4.3 프론트 실행

```bash
cd /home/roqkf/opencode-web-react-incident-starter/web
npm install
npm run dev
```

### 4.4 smoke 확인 항목

- UI가 정상 로드되는지
- `/health` 실패 시 상태 패널에 degraded가 보이는지
- 세션 생성/프롬프트 전송 시 JSON 에러 메시지가 보이는지
- `Last error`가 갱신되는지

이 모드에서는 실제 triage 성공은 기대하지 않는다.

## 5. Mode B: fake-opencode integration

집에서 실제로 확인할 때는 mock upstream을 띄운다.

### 5.1 fake-opencode 서버 실행

기본 시나리오는 `valid`다.

```bash
cd /home/roqkf/opencode-web-react-incident-starter
npm install
npm run mock:opencode
```

다른 시나리오 예시:

```bash
MOCK_SCENARIO=invalid-structured npm run mock:opencode
MOCK_SCENARIO=permission npm run mock:opencode
MOCK_SCENARIO=permission MOCK_PERMISSION_PRIMARY_404=true npm run mock:opencode
```

지원 시나리오:

- `valid`
- `invalid-structured`
- `permission`
- `text-only`

추가로 프롬프트 안에 `[mock:valid]`, `[mock:invalid-structured]`, `[mock:permission]`, `[mock:text-only]`를 넣으면 요청별로 시나리오를 덮어쓸 수 있다.

### 5.2 BFF `.env`

mock 기준으로 아래처럼 둔다.

```env
PORT=3000
OPENCODE_URL=http://127.0.0.1:4096
OPENCODE_USERNAME=opencode
OPENCODE_PASSWORD=
ALLOWED_ORIGIN=http://localhost:5173
DEFAULT_AGENT=plan
DEFAULT_PROVIDER_ID=corp
DEFAULT_MODEL_ID=ops-coder
```

### 5.3 BFF 실행

```bash
cd /home/roqkf/opencode-web-react-incident-starter
npm run start
```

### 5.4 프론트 실행

```bash
cd /home/roqkf/opencode-web-react-incident-starter/web
npm install
npm run dev
```

## 6. legacy OpenCode 서버 실행

회사 환경 등에서 실제 OpenCode를 쓸 수 있을 때만 아래를 쓴다.

터미널에서 OpenCode 서버 비밀번호를 export 한다.

```bash
export OPENCODE_SERVER_PASSWORD='change-me'
```

`change-me`는 실제 로컬 비밀번호로 바꿔도 된다.

## 7. OpenCode 서버 실행

새 터미널 또는 같은 터미널에서 OpenCode 서버를 실행한다.

```bash
opencode serve --hostname 127.0.0.1 --port 4096
```

정상 실행되면 OpenCode 서버가 `127.0.0.1:4096`에서 대기한다.

## 8. BFF 환경 파일 준비

프로젝트 루트에서 `.env`를 준비한다.

```bash
cd /home/roqkf/opencode-web-react-incident-starter
cp .env.example .env
```

만약 `.env.example` 파일이 없다면 `.env`를 직접 만든다.

예시:

```env
PORT=3000
OPENCODE_URL=http://127.0.0.1:4096
OPENCODE_USERNAME=opencode
OPENCODE_PASSWORD=
ALLOWED_ORIGIN=http://localhost:5173
DEFAULT_AGENT=plan
DEFAULT_PROVIDER_ID=corp
DEFAULT_MODEL_ID=ops-coder
```

실제 OpenCode를 쓸 때만 `OPENCODE_PASSWORD`에 맞는 값을 넣는다.

## 9. BFF 의존성 설치 및 실행

프로젝트 루트에서 실행한다.

```bash
npm install
npm run start
```

정상 실행되면 BFF는 기본적으로 `http://localhost:3000`에서 동작한다.

## 10. 프론트 환경 파일 준비

다른 터미널에서 프론트 디렉터리로 이동한다.

```bash
cd /home/roqkf/opencode-web-react-incident-starter/web
cp .env.example .env
```

`.env.example`이 없다면 `.env`를 직접 만든다.

보통 개발 환경에서는 아래만 있으면 충분하다.

```env
VITE_API_BASE_URL=
```

빈 값이면 Vite dev server가 같은 origin 기준으로 `/api`, `/health`를 프록시한다.

## 11. 프론트 의존성 설치 및 실행

```bash
npm install
npm run dev
```

정상 실행되면 보통 `http://localhost:5173`가 출력된다.

## 12. 브라우저에서 접속

브라우저에서 아래 주소를 연다.

```text
http://localhost:5173
```

## 13. UI에서 첫 실행

화면에서 아래 순서로 확인한다.

1. `Session` 패널에서 세션 생성
2. `Prompt` 패널에 incident 설명 입력
3. mock upstream 테스트 시 필요하면 프롬프트에 시나리오 태그 추가

```text
[mock:valid]
[mock:invalid-structured]
[mock:permission]
```

4. `Delivery mode`를 `async` 또는 `sync`로 선택
5. 필요하면 `structured`, `agent`, `provider`, `model`, `system prompt` 조정
6. `Send prompt` 실행
7. 중앙의 structured triage result 확인
8. 우측의 pending approval / event stream 확인

## 14. 집에서 권장 테스트 시나리오

### 14.1 valid

- `MOCK_SCENARIO=valid npm run mock:opencode`
- sync prompt 전송
- structured result 카드가 정상 렌더링되는지 확인

### 14.2 invalid structured fallback

- `MOCK_SCENARIO=invalid-structured npm run mock:opencode`
- sync 또는 async prompt 전송
- fallback 배너, assistant text, invalid structured JSON 원문이 보이는지 확인

### 14.3 permission flow

- `MOCK_SCENARIO=permission npm run mock:opencode`
- async prompt 전송
- pending permission 목록/상세/모달이 보이는지 확인
- `once`, `always`, `reject` 각각 테스트

### 14.4 permission fallback path

- `MOCK_SCENARIO=permission MOCK_PERMISSION_PRIMARY_404=true npm run mock:opencode`
- permission 응답 시 BFF가 구 경로 fallback으로 처리하는지 확인

### 14.5 no-upstream smoke

- fake-opencode를 끄고 BFF + 프론트만 실행
- `/health` 실패와 에러 메시지만 확인

## 15. Health 확인

연결 문제가 있으면 먼저 BFF health를 확인한다.

브라우저 또는 터미널에서:

```text
http://localhost:3000/health
```

프론트에서도 상태 패널에 아래가 표시된다.

- `BFF / Upstream health`
- `Stream status`
- `Current session`
- `Last error`

mock upstream health는 기본적으로 성공을 반환한다.

## 16. curl 예시

mock 서버와 BFF가 떠 있으면 아래 예시도 사용할 수 있다.

```bash
BASE_URL=http://localhost:3000 bash examples/curl.sh
```

permission 시나리오 예시:

```bash
curl -sS -X POST http://localhost:3000/api/session \
  -H 'Content-Type: application/json' \
  -d '{"title":"permission test"}'
```

세션 ID를 얻은 뒤:

```bash
curl -sS -X POST http://localhost:3000/api/session/<SESSION_ID>/prompt-async \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"[mock:permission] permission flow test","structured":true,"agent":"plan"}'
```

## 17. 프로덕션 스타일 실행

프론트를 먼저 빌드하고 BFF가 정적 파일을 함께 서빙하게 할 수 있다.

### 17.1 프론트 빌드

```bash
cd /home/roqkf/opencode-web-react-incident-starter/web
npm install
npm run build
```

### 17.2 BFF 실행

```bash
cd /home/roqkf/opencode-web-react-incident-starter
npm install
npm run start
```

이 경우 `web/dist`가 존재하면 [src/server.js](/home/roqkf/opencode-web-react-incident-starter/src/server.js)가 정적 프론트를 함께 서빙한다.

## 18. 문제 해결 메모

### fake-opencode 실행

- `npm run mock:opencode`로 mock upstream을 먼저 띄운다
- 포트 충돌 시 `MOCK_OPENCODE_PORT=4097 npm run mock:opencode`로 바꿀 수 있다
- 포트를 바꾸면 BFF의 `OPENCODE_URL`도 같은 값으로 맞춘다

### OpenCode 연결 실패

- `OPENCODE_URL`이 `http://127.0.0.1:4096`인지 확인
- 실제 OpenCode 대신 mock을 쓴다면 `npm run mock:opencode`가 떠 있는지 확인
- 실제 OpenCode를 쓴다면 OpenCode 서버가 떠 있는지 확인
- 실제 OpenCode를 쓸 때만 `OPENCODE_PASSWORD`와 `OPENCODE_SERVER_PASSWORD` 일치 여부를 본다

### 프론트에서 API 호출 실패

- BFF가 `http://localhost:3000`에서 떠 있는지 확인
- `ALLOWED_ORIGIN=http://localhost:5173`인지 확인
- Vite dev server가 실행 중인지 확인

### structured result가 안 보임

- 모델이 structured output을 반환하지 않았을 수 있다
- 이 경우 UI는 assistant text fallback을 보여 준다
- `structured output on/off` 설정이 `on`인지 확인

### pending approval이 안 뜸

- mock 테스트라면 `[mock:permission]` 또는 `MOCK_SCENARIO=permission`을 사용했는지 확인
- 실제 OpenCode 테스트라면 현재 permission 정책이 `ask`인지 확인
- [opencode.json](/home/roqkf/opencode-web-react-incident-starter/opencode.json)의 `permission` 설정을 확인
