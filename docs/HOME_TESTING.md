# Home Testing Without OpenCode

이 문서는 집에서 `opencode` binary나 사내 LLM gateway 없이 이 프로젝트를 실행하고 테스트하는 방법을 정리한다.

## 목적

집에서는 실제 OpenCode 기반 E2E를 재현할 수 없다. 대신 아래를 검증한다.

- 프론트 렌더링
- BFF 입력 검증
- health 실패 처리
- sync / async 흐름
- structured output valid / invalid fallback
- pending permission 목록 / 상세 / 모달
- SSE 이벤트 반영
- permission primary / fallback 응답 경로

검증하지 못하는 항목:

- 실제 agent 동작
- 실제 skill 실행 품질
- 실제 provider/model 호출
- 실제 permission 정책 평가
- 실제 LLM structured output 품질

## 실행 구성

```text
Browser -> React UI -> BFF -> fake-opencode
```

`fake-opencode`는 OpenCode 전체가 아니라 현재 BFF가 실제로 호출하는 최소 API만 흉내 낸다.

## 실행 순서

### 1. fake-opencode

```bash
cd /home/roqkf/opencode-web-react-incident-starter
npm install
npm run mock:opencode
```

### 2. BFF

루트 `.env` 예시:

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

실행:

```bash
npm run start
```

### 3. 프론트

```bash
cd /home/roqkf/opencode-web-react-incident-starter/web
npm install
npm run dev
```

## mock 시나리오

환경 변수 또는 프롬프트 태그로 시나리오를 선택한다.

환경 변수:

```bash
MOCK_SCENARIO=valid npm run mock:opencode
MOCK_SCENARIO=invalid-structured npm run mock:opencode
MOCK_SCENARIO=permission npm run mock:opencode
MOCK_SCENARIO=text-only npm run mock:opencode
```

프롬프트 태그:

```text
[mock:valid]
[mock:invalid-structured]
[mock:permission]
[mock:text-only]
```

프롬프트 태그가 있으면 해당 요청에만 시나리오가 적용된다.

## fallback 경로 테스트

permission 최신 응답 경로를 일부러 `404`로 만들고 싶으면:

```bash
MOCK_SCENARIO=permission MOCK_PERMISSION_PRIMARY_404=true npm run mock:opencode
```

그러면 BFF는 자동으로 구 경로 fallback을 호출한다.

## 권장 점검 순서

### 1. smoke

- fake-opencode를 띄우지 않는다
- BFF와 프론트만 띄운다
- `/health` 실패와 에러 표시만 확인한다

### 2. structured valid

- `MOCK_SCENARIO=valid`
- sync prompt 전송
- structured result 카드 렌더링 확인

### 3. structured invalid

- `MOCK_SCENARIO=invalid-structured`
- fallback UI와 raw structured JSON 확인

### 4. permission

- `MOCK_SCENARIO=permission`
- async prompt 전송
- permission 목록 / modal / 응답 버튼 확인

### 5. permission fallback

- `MOCK_PERMISSION_PRIMARY_404=true`
- permission 응답이 fallback 경로로 처리되는지 확인

## curl 예시

세션 생성:

```bash
curl -sS -X POST http://localhost:3000/api/session \
  -H 'Content-Type: application/json' \
  -d '{"title":"home test"}'
```

sync valid:

```bash
curl -sS -X POST http://localhost:3000/api/session/<SESSION_ID>/message \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"[mock:valid] checkout incident","structured":true,"agent":"plan"}'
```

async permission:

```bash
curl -sS -X POST http://localhost:3000/api/session/<SESSION_ID>/prompt-async \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"[mock:permission] permission flow test","structured":true,"agent":"plan"}'
```

