# User Manual

이 문서는 `opencode-web-react-incident-starter`를 처음 사용하는 사람을 위한 실사용 안내서다.

전제 조건:

- 브라우저에서 UI에 접속할 수 있어야 한다
- BFF가 실행 중이어야 한다
- 집에서는 보통 `fake-opencode`를 함께 실행한다

실행 방법 자체는 아래 문서를 본다.

- [Quickstart](/home/roqkf/opencode-web-react-incident-starter/docs/QUICKSTART.md)
- [Home Testing Without OpenCode](/home/roqkf/opencode-web-react-incident-starter/docs/HOME_TESTING.md)

## 1. 이 앱으로 할 수 있는 것

이 앱은 운영 이슈를 입력하면 구조화된 triage 결과를 보여 주고, 필요하면 permission 승인까지 처리할 수 있는 콘솔이다.

이 화면에서 할 수 있는 일:

- 새 `Session` 만들기
- incident 설명을 `Prompt`로 보내기
- `Structured triage result` 읽기
- `Pending approval`에서 `once`, `always`, `reject` 응답하기
- `Event stream`과 `Messages`로 내부 진행 상태 확인하기

## 2. 화면 구성

화면은 크게 4개 영역으로 보면 된다.

### 상단 배지

상단에는 현재 상태 요약이 나온다.

- `stream connected` 또는 `stream reconnecting`
- `upstream healthy` 또는 `upstream degraded`
- 현재 session ID

즉, 상단만 봐도 SSE 연결과 upstream 상태를 빠르게 알 수 있다.

### 좌측

좌측은 입력과 기본 상태를 다룬다.

- `1. Session`
  - 세션 생성
  - 현재 health, stream status, current session, `Last error` 확인
- `2. Prompt`
  - incident 설명 입력
  - `Delivery mode`, `Structured output`, `Agent`, `Provider ID`, `Model ID`, `System prompt override` 설정
- `3. Messages`
  - assistant text와 `Structured output` 원문 확인

### 중앙

중앙은 가장 중요한 결과 영역이다.

- `4. Structured triage result`
  - summary
  - severity
  - confidence
  - user impact
  - blast radius
  - evidence
  - ranked hypotheses
  - recommended actions
  - open questions

### 우측

우측은 통제와 디버깅 영역이다.

- `5. Pending approval`
  - permission 요청 목록
  - 선택한 요청 상세
  - `once`, `always`, `reject`
- `6. Event stream`
  - session, message, permission 관련 이벤트 로그

## 3. 처음 사용하는 순서

처음에는 아래 순서만 따라 하면 된다.

### 1. Session 만들기

좌측 `1. Session`에서 `Session title`을 입력하거나 비워 둔 뒤 `Create session`을 누른다.

- 제목을 비워 두면 BFF가 prompt 내용으로 기본 제목을 만든다
- 생성이 성공하면 `Current session`에 session ID가 보인다

### 2. Prompt 입력하기

좌측 `2. Prompt`에 현재 incident 설명을 입력한다.

예시:

```text
10:02 배포 후 checkout 5xx 급증. 서울 리전 중심. DB latency 증가.
```

집에서 mock 테스트를 할 때는 앞에 시나리오 태그를 붙일 수 있다.

```text
[mock:valid]
[mock:invalid-structured]
[mock:permission]
[mock:text-only]
```

### 3. Delivery mode 고르기

`Delivery mode`는 두 가지가 있다.

- `sync`
  - 바로 응답을 받고 싶을 때 사용
  - 결과를 즉시 확인하기 쉽다
- `async`
  - 요청을 먼저 보내고 SSE로 상태 변화를 받는다
  - permission, event 흐름까지 보고 싶을 때 유리하다

처음에는 `sync`로 시작하는 편이 이해하기 쉽다.

### 4. Structured output 설정 보기

`Structured output`은 기본적으로 `on`이면 된다.

- `on`
  - structured result 카드를 우선 렌더링한다
- `off`
  - structured JSON 없이 assistant text 중심으로 확인할 때 쓴다

처음에는 `on`으로 둔다.

### 5. 나머지 옵션은 필요할 때만 사용

- `Agent`
  - 기본값은 `plan`
- `Provider ID`
  - 보통 비워 둔다
- `Model ID`
  - 보통 비워 둔다
- `System prompt override`
  - 특별한 이유가 없으면 비워 둔다

### 6. Send prompt 실행

`Send prompt`를 누르면 결과가 아래처럼 나온다.

- 중앙 `Structured triage result`
- 좌측 `Messages`
- 우측 `Pending approval`
- 우측 `Event stream`

## 4. 각 입력 항목 설명

### Session title

이 세션의 이름이다.

- 직접 입력 가능
- 비워 두면 자동 생성

### Incident prompt

현재 상황 설명이다. 가장 중요한 입력이다.

좋은 prompt에는 아래가 들어가면 좋다.

- 언제부터 문제인지
- 무엇이 실패하는지
- 어떤 리전/서비스/기능인지
- 최근 배포나 변경이 있었는지

### Delivery mode

- `sync`: 바로 결과 확인용
- `async`: SSE와 permission 흐름 확인용

### Structured output

- `on`: structured result 카드 우선
- `off`: assistant text 중심

### Agent

현재 기본값은 `plan`이다. 일반 사용자는 그대로 두면 된다.

### Provider ID

provider override가 필요할 때만 넣는다. 집 테스트에서는 보통 비워 둔다.

### Model ID

model override가 필요할 때만 넣는다. 집 테스트에서는 보통 비워 둔다.

### System prompt override

기본 동작을 바꾸고 싶을 때만 사용한다. 일반 사용자는 비워 두는 편이 안전하다.

## 5. 결과 읽는 법

중앙 `Structured triage result`는 운영자가 빠르게 판단할 수 있도록 만든 카드다.

### summary

지금 무슨 일이 일어나는지 한 문단으로 요약한다.

### severity

장애 심각도다. 보통 `sev0`이 가장 심각하고 `sev3`이 가장 낮다.

### confidence

가장 유력한 가설에 대한 확신도다. 숫자가 높을수록 더 강한 추정이다.

### user impact

실제 사용자에게 어떤 영향이 있는지 설명한다.

### blast radius

영향받는 서비스, 리전, 기능 범위다.

### evidence

관측된 사실이다. 로그, 지표, 타이밍 같은 근거를 본다.

### ranked hypotheses

가능성이 높은 원인 후보를 순서대로 본다.

### recommended actions

가장 작은 다음 행동을 본다. 바로 실행이 아니라 “안전한 다음 단계”를 읽는 용도다.

### open questions

아직 확인되지 않은 중요한 질문이다.

### fallback mode가 보일 때

중앙에 `fallback mode` 배너가 보이면 structured output이 비어 있거나 필수 필드가 깨졌다는 뜻이다.

이 경우 화면은:

- assistant text를 우선 보여 주고
- invalid structured JSON 원문을 같이 보여 준다

즉, 결과가 완전히 실패한 것은 아니고 structured rendering만 fallback으로 내려간 상태다.

### Messages와 Structured result의 차이

- `Messages`
  - 원문에 가까운 assistant text와 `Structured output` JSON을 보여 준다
- `Structured triage result`
  - 그중 중요한 필드를 운영자 관점으로 정리해 보여 준다

문제가 생기면 먼저 중앙 결과를 보고, 이상하면 좌측 `Messages`에서 원문을 확인하면 된다.

## 6. permission 처리 방법

permission 요청이 생기면 우측 `Pending approval`과 modal에 동시에 표시될 수 있다.

### 목록

우측 카드에는 현재 pending request들이 목록으로 보인다.

보는 정보:

- permission type
- request ID
- session ID
- patterns / always scope
- metadata

### 상세

목록에서 특정 요청을 보면 아래 상세 패널에 더 자세한 정보가 나온다.

### modal

새 요청이 오면 modal이 자동으로 뜰 수 있다. modal은 빠르게 응답할 때 쓰면 된다.

### 응답 버튼 의미

- `once`
  - 이번 요청만 1회 승인
- `always`
  - 반복 패턴까지 계속 허용하는 의미
- `reject`
  - 요청 거절

집 테스트에서는 세 버튼을 모두 눌러 보면서 UI 반응을 확인할 수 있다.

## 7. Event stream 해석

우측 `Event stream`은 내부 진행 상태를 거의 원문 그대로 보여 준다.

주로 아래 이벤트를 보면 된다.

### message.updated

assistant 메시지가 갱신되었다는 뜻이다. async 모드에서 결과가 들어올 때 자주 보인다.

### session.idle

현재 세션 처리가 끝나고 idle 상태로 돌아왔다는 뜻이다.

### session.error

세션 처리 중 에러가 발생했다는 뜻이다. 이때는 `Last error`와 이벤트 payload를 같이 본다.

### permission.asked

새 permission 요청이 생겼다는 뜻이다. `Pending approval`과 연결된다.

### permission.replied

사용자가 permission 응답을 보냈고 반영되었다는 뜻이다.

## 8. 따라 하기 시나리오

아래 시나리오를 순서대로 따라 하면 앱 사용법을 빠르게 익힐 수 있다.

### 시나리오 A: 정상 triage

실행 준비:

- `fake-opencode`를 `MOCK_SCENARIO=valid`로 실행
- BFF 실행
- 프론트 실행

사용자 행동:

1. 브라우저 접속
2. `Create session`
3. prompt에 `[mock:valid] checkout incident test` 입력
4. `Delivery mode`를 `sync`로 선택
5. `Structured output`은 `on`
6. `Send prompt` 클릭

기대 결과:

- 중앙에 structured result 카드가 정상 표시된다
- 좌측 `Messages`에 assistant text와 `Structured output` JSON이 둘 다 보인다
- severity, evidence, hypotheses, recommended actions가 채워진다

### 시나리오 B: fallback 확인

실행 준비:

- `fake-opencode`를 `MOCK_SCENARIO=invalid-structured`로 실행

사용자 행동:

1. 세션 생성
2. prompt에 `[mock:invalid-structured] fallback test` 입력
3. `sync` 또는 `async` 선택
4. `Send prompt` 클릭

기대 결과:

- 중앙에 `fallback mode` 배너가 보인다
- assistant text가 우선 렌더링된다
- invalid structured JSON 원문이 같이 표시된다

### 시나리오 C: approval 흐름

실행 준비:

- `fake-opencode`를 `MOCK_SCENARIO=permission`으로 실행

사용자 행동:

1. 세션 생성
2. prompt에 `[mock:permission] approval flow test` 입력
3. `Delivery mode`를 `async`로 선택
4. `Send prompt` 클릭
5. 나타난 `Pending approval` 또는 modal에서 `once`, `always`, `reject` 중 하나 선택

기대 결과:

- 우측에 permission 목록이 나타난다
- 상세 패널에 `request ID`, `session ID`, `patterns`, `metadata`가 보인다
- modal에서도 같은 요청을 확인할 수 있다
- 응답 후 `permission.replied` 이벤트가 보이고 pending 목록이 줄어든다

### 시나리오 D: upstream 없음

실행 준비:

- `fake-opencode`를 실행하지 않는다
- BFF와 프론트만 실행한다

사용자 행동:

1. 브라우저 접속
2. 상태 패널 확인
3. 세션 생성 또는 prompt 전송 시도

기대 결과:

- health가 degraded로 보인다
- 요청이 실패해도 UI가 죽지 않는다
- `Last error`와 상태 문구에 실패 이유가 보인다

## 9. FAQ

### 왜 결과가 안 뜨는가?

보통 아래 중 하나다.

- upstream이 안 떠 있다
- `Delivery mode=async`인데 아직 SSE 이벤트를 기다리는 중이다
- prompt 전송이 실패했다

먼저 상단 배지, `BFF / Upstream health`, `Last error`, `Event stream`을 본다.

### 왜 fallback mode가 보이는가?

structured output이 비었거나 필수 필드가 깨졌기 때문이다. 이 경우 assistant text를 먼저 읽으면 된다.

### 왜 Pending approval이 안 뜨는가?

permission 시나리오가 아니면 요청이 안 뜰 수 있다. 집 테스트라면 `[mock:permission]` 또는 `MOCK_SCENARIO=permission`을 사용한다.

### sync와 async는 언제 쓰는가?

- `sync`: 빨리 결과만 보고 싶을 때
- `async`: SSE 이벤트와 permission 흐름까지 보고 싶을 때

처음에는 `sync`, permission 테스트는 `async`가 편하다.

### Provider ID와 Model ID는 꼭 넣어야 하는가?

아니다. 일반 사용자는 비워 두면 된다. 필요할 때만 override 용도로 쓴다.

### 집에서 실제 OpenCode 없이 무엇까지 믿을 수 있는가?

믿을 수 있는 것:

- UI 동작
- BFF 계약
- structured/fallback 렌더링
- permission 처리 흐름
- SSE 상태 반영

믿을 수 없는 것:

- 실제 AI 품질
- 실제 skill 추론 품질
- 실제 provider/model 응답 품질

