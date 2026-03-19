# PRD — OpenCode 기반 운영형 Incident Triage 웹 서비스

- 문서 버전: v0.9 (draft)
- 문서 상태: 상세 PRD / 구현 착수 기준안
- 대상 릴리스: v0 (사내 파일럿), v1 (제한적 운영), v2 (확장 운영)
- 문서 작성일: 2026-03-19
- 작성 기준: 현재 생성된 `opencode-web-react-incident-starter` 구조를 기준으로 제품 요구사항으로 정리

---

## 1. 문서 목적

이 문서는 **OpenCode + Skill + 사내 모델 게이트웨이**를 사용하여, 운영 이슈를 빠르게 정리하고 인간 승인 하에 다음 조치를 결정할 수 있는 **웹 서비스형 Incident Triage 제품**의 요구사항을 정의한다.

이 문서는 단순한 데모 설명서가 아니라 다음을 위한 기준 문서다.

1. 무엇을 만들 것인가를 명확히 한다.
2. 무엇을 만들지 않을 것인가를 먼저 제거한다.
3. 왜 이 구조가 운영환경에 맞는지를 설명한다.
4. 프론트엔드, BFF, OpenCode, Skill, 권한정책, 운영지표를 한 문서로 묶는다.
5. 파일럿에서 운영까지의 단계적 확장 기준을 정의한다.

---

## 2. 제1원칙 분석

### 2.1 현재 상식 파악

이 영역에서 흔히 받아들여지는 가정은 아래와 같다.

- 채팅형 AI 서비스는 먼저 예쁜 대화 UI를 크게 만들어야 한다.
- LLM 서비스는 모델 품질이 핵심이고, 승인·감사·이벤트 관측은 나중 문제다.
- CLI 기반 엔진은 데모에는 적합하지만 운영형 웹 서비스에는 부적합하다.
- Skill은 프롬프트 모음이므로 제품 아키텍처의 핵심 요소가 되기 어렵다.
- 운영환경에서 에이전트를 쓰려면 완전 자동화 또는 완전 수동화 둘 중 하나를 선택해야 한다.

### 2.2 원자 단위로 분해

이 제품이 실제로 다루는 최소 구성요소는 아래뿐이다.

- **Session**: 사용자 요청과 모델 상호작용이 묶이는 실행 단위
- **Prompt**: 운영 이슈를 설명하는 입력
- **Structured Result**: 이슈를 정리한 JSON 결과
- **Permission Request**: 모델이 추가 행동 전에 요구하는 승인 요청
- **Event Stream**: 세션 중 발생하는 상태 변화 이벤트
- **Skill**: triage 절차와 출력 규약을 담은 재사용 가능한 작업 정의
- **BFF**: 사용자 신원, 권한, 감사, 정책을 실제 서비스 레이어에서 책임지는 제어면

즉, 이 제품의 본질은 “채팅앱”이 아니라 **승인 가능한 운영 분석기**다.

### 2.3 전제 제거 및 검증

절대적인 것은 아래뿐이다.

- 운영에서는 누가 어떤 액션을 요청했고 승인했는지 남아야 한다.
- 모델은 실수할 수 있으므로 고위험 액션은 사람 승인을 거쳐야 한다.
- 운영자는 결과보다도 **근거, 가설, 영향범위, 다음 액션**을 구조적으로 봐야 한다.
- 브라우저는 최종 사용자 환경이고, OpenCode는 실행 엔진이므로 둘 사이에 서비스 제어면이 필요하다.

관행일 뿐 제거 가능한 전제는 아래다.

- “채팅 메시지 목록이 UX의 중심이어야 한다.”
- “승인 UI는 부가기능이다.”
- “완전 자동화가 아니면 가치가 없다.”
- “Skill은 단지 프롬프트 저장소다.”

### 2.4 근본 원리만 남기기

이 제품의 핵심 원리는 아래 5개다.

1. **사용자에게 필요한 것은 채팅이 아니라 운영 판단 보조다.**
2. **운영 판단 보조는 자유형 텍스트보다 구조화된 결과가 더 유용하다.**
3. **운영 신뢰성은 모델 자체보다 승인, 감사, 격리, 관측에서 나온다.**
4. **Skill은 서비스가 아니라 절차 표준화 레이어다.**
5. **OpenCode는 제품 그 자체가 아니라 실행 엔진이다.**

### 2.5 새로운 해결책 설계

따라서 제품은 다음처럼 설계한다.

- 브라우저는 사용자 경험만 담당한다.
- BFF는 사용자 인증, 세션 관리, 승인 중계, 감사 로깅, 정책 적용을 담당한다.
- OpenCode는 headless 실행 엔진으로만 사용한다.
- Skill은 incident triage의 절차, 결과 구조, 작업 규칙을 담는다.
- 승인 대상 행위는 UI에서 명시적으로 노출한다.
- 결과는 JSON schema를 통해 구조화하고 카드 UI로 보여준다.
- raw message와 event log를 숨기지 않고 운영자가 볼 수 있게 유지한다.

### 2.6 실행 가능한 첫 단계

이미 구현한 최소 스타터는 아래를 포함한다.

- 세션 생성
- 프롬프트 전송
- structured output 표시
- pending permission 표시 및 승인 응답
- SSE 기반 이벤트 로그 표시
- `incident-triage` Skill 연동

이 PRD는 이 최소 스타터를 파일럿과 운영형 제품으로 확장하는 기준이다.

---

## 3. 제품 개요

### 3.1 제품명

**OpenCode Incident Triage Web**

### 3.2 한 줄 설명

운영자가 장애·이상징후·배포문제를 입력하면, 시스템이 이를 **evidence / hypotheses / blast radius / recommended actions** 형태로 구조화해 보여주고, 추가 작업은 **명시적 승인** 하에서만 진행하는 운영형 웹 서비스.

### 3.3 제품 비전

사내 운영 조직이 장애 탐지 후 5분 안에 아래 질문에 답하도록 돕는다.

- 지금 무슨 일이 일어나고 있는가?
- 누구에게 어떤 영향이 있는가?
- 가장 가능성 높은 원인은 무엇인가?
- 지금 가장 작은 안전한 다음 행동은 무엇인가?
- 즉시 escalation이 필요한가?

### 3.4 목표 사용자

1. **SRE / 인프라 운영자**
2. **서비스 백엔드 온콜 엔지니어**
3. **플랫폼 운영팀**
4. **배포/릴리스 매니저**
5. **개발 리더 또는 incident commander**

---

## 4. 문제 정의

### 4.1 현재 문제

운영 이슈 초기에 가장 큰 병목은 “조치 능력 부족”이 아니라 “상황 정리 실패”다.

초기 10분 안에 아래 문제가 반복된다.

- 로그, 알람, 배포정보, 사용자 제보가 흩어져 있다.
- 여러 사람이 서로 다른 언어로 상황을 설명한다.
- 중요한 근거와 추측이 섞인다.
- 누가 무엇을 시도했는지 추적이 어렵다.
- 모델이 제안한 행동을 운영에 반영하려면 사람 승인과 기록이 필요하다.

### 4.2 해결하려는 핵심 문제

이 제품은 “자동 복구 엔진”이 아니라 아래 문제를 해결한다.

> **운영자가 불완전한 입력만으로도 빠르게 구조화된 triage 결과를 얻고, 필요한 행동은 통제된 승인 흐름을 통해 안전하게 이어갈 수 있도록 한다.**

### 4.3 해결하지 않는 문제

초기 버전에서 해결하지 않는 문제는 아래와 같다.

- 완전 무인 자동 remediation
- 모든 내부 도구와의 전면 통합
- 모든 incident 유형에 대한 완전한 도메인 추론
- 고가용성 multi-region 실시간 SaaS 수준의 외부 고객 제공
- 정교한 incident timeline 재구성 엔진
- 장기 보고서 자동 작성

---

## 5. 목표와 비목표

### 5.1 제품 목표

#### G1. 빠른 상황 구조화
사용자는 자연어 입력만으로도 1회 요청 안에 구조화된 triage 결과를 받아야 한다.

#### G2. 승인 중심 운영
고위험 작업은 사용자 승인 없이는 실행되지 않아야 한다.

#### G3. 운영 가시성 확보
사용자는 세션 상태, pending permission, 최근 이벤트, raw message를 확인할 수 있어야 한다.

#### G4. Skill 기반 표준화
팀은 triage 절차를 `SKILL.md`로 버전 관리 가능해야 한다.

#### G5. 사내 모델 게이트웨이 연동
사내 모델 또는 내부 LLM proxy를 provider 형태로 연결할 수 있어야 한다.

### 5.2 비목표

- GA 단계의 셀프서브 멀티테넌트 제품화
- 자동 액션의 광범위한 허용
- 외부 고객 노출형 퍼블릭 서비스
- 운영자를 대체하는 완전자율 에이전트

---

## 6. 사용자 및 JTBD

### 6.1 Persona A — On-call Backend Engineer

- 상황: 새 배포 직후 오류율 상승
- 목적: 사용자 영향과 원인 후보를 3분 내 정리
- 성공: evidence와 next action을 팀에 바로 공유 가능

### 6.2 Persona B — SRE / Incident Commander

- 상황: 다수 시스템 경보 발생
- 목적: 영향 범위, 우선순위, escalation 필요 여부 판단
- 성공: 추측보다 근거 중심으로 triage 가능

### 6.3 Persona C — Release Manager

- 상황: 특정 릴리스가 장애와 연관되는지 확인 필요
- 목적: 배포 관련성 가설과 확인 절차 도출
- 성공: rollback / hold / monitor 중 결정을 빠르게 지원

### 6.4 Jobs To Be Done

- “운영 이슈를 구조화해서 팀이 같은 상황을 보게 해달라.”
- “근거와 추측을 분리해서 보여달라.”
- “가장 작은 안전한 다음 행동을 제안해달라.”
- “모델이 위험한 동작을 시도하려면 내가 승인할 수 있게 해달라.”
- “결과를 세션 단위로 추적 가능하게 해달라.”

---

## 7. 제품 범위

### 7.1 v0 범위 (현재 스타터 + 파일럿 준비)

포함 기능:

- 단일 화면 기반 triage UI
- 세션 생성
- incident prompt 전송
- structured output 렌더링
- pending permission 목록 및 승인/거절
- SSE 이벤트 로그 표시
- raw messages 보기
- `incident-triage` Skill 사용
- 보수적 `plan` agent 기본값
- BFF를 통한 OpenCode server 호출

제약:

- 인증 없음 또는 개발용 인증만 존재
- 감사 로그 DB 저장 없음
- 단일 프로젝트/단일 팀 수준 사용 가정
- 내부 API / MCP 연결 없음

### 7.2 v1 범위 (제한적 운영)

추가 기능:

- SSO/JWT 기반 사용자 식별
- approval audit log 저장
- session과 user / team / project 연동
- worker 격리 정책
- incident template presets
- 읽기 전용 internal search 또는 MCP 1~2개 연결
- 기본 대시보드: 세션 수, 승인 수, 실패 수

### 7.3 v2 범위 (확장 운영)

추가 기능:

- remediation tool 1~2개를 좁은 scope로 추가
- 팀별 Skill 버전 관리 및 rollout
- incident 유형별 schema 분기
- 비동기 작업 큐 / 재시도 / dead-letter 처리
- 테넌트/프로젝트별 라우팅 강화
- 보존기간 정책 및 데이터 파기 자동화

---

## 8. 핵심 사용자 시나리오

### 8.1 시나리오 A — 배포 직후 장애 triage

1. 사용자가 웹 UI에서 새 세션 생성
2. “10:02 배포 후 checkout 5xx 급증, ap-northeast-2 중심, DB latency 증가” 입력
3. BFF가 OpenCode 세션에 prompt_async 또는 message 전송
4. OpenCode가 `incident-triage` Skill을 사용해 구조화된 결과 생성
5. 프론트는 SSE를 통해 상태를 갱신
6. 사용자는 severity, evidence, hypotheses, next actions를 확인
7. 추가 파일 조회나 명령 실행이 필요하면 permission request가 뜸
8. 사용자가 `once` 또는 `reject` 응답
9. 모델이 추가 근거를 반영해 triage 결과 보강

### 8.2 시나리오 B — 승인이 필요한 조사 요청

1. 모델이 bash/read/skill/task 등 제한된 동작을 요청
2. OpenCode가 permission event 생성
3. BFF가 event를 받아 UI용 상태로 노출
4. 사용자는 permission 종류, 패턴, 메타데이터를 보고 승인 여부 결정
5. 응답은 신규 permission reply 경로를 우선 사용하고, 필요 시 구 경로로 fallback
6. 승인 결과는 event log와 감사 로그에 남음

### 8.3 시나리오 C — 결과를 팀에 공유하기 위한 구조화 확인

1. 사용자는 raw message보다 result card 중심으로 상태를 본다.
2. 필요 시 evidence / hypotheses / open questions를 복사해 Slack/issue에 붙인다.
3. 이후 단계에서 export 또는 공유 기능으로 확장 가능하다.

---

## 9. 사용자 가치 제안

### 9.1 사용자에게 주는 즉시 가치

- 자유형 입력을 구조화된 triage로 바꿔준다.
- 근거와 추측을 분리해준다.
- 영향범위를 빠르게 정리해준다.
- 작은 다음 행동을 제안해준다.
- 승인 없는 위험 행동을 막아준다.
- 세션/이벤트 단위로 관측 가능하다.

### 9.2 조직에 주는 가치

- triage 품질의 편차를 줄인다.
- 신규 온콜 인력의 초기 대응 품질을 끌어올린다.
- 승인 이력을 남겨 운영 통제를 강화한다.
- Skill을 통해 조직 지식을 재사용 가능하게 만든다.

---

## 10. 시스템 아키텍처

### 10.1 상위 아키텍처

```text
[Browser / React UI]
        |
        v
[BFF / Node API]
  - auth
  - session orchestration
  - permission mediation
  - audit logging
  - policy enforcement
        |
        v
[OpenCode Server]
  - sessions
  - messages
  - skills
  - permissions
  - events
        |
        v
[Internal LLM Gateway]
        |
        v
[Model Provider(s)]
```

### 10.2 설계 원칙

- 브라우저는 OpenCode server에 직접 붙지 않는다.
- OpenCode는 실행 엔진으로만 사용한다.
- 사용자 identity는 반드시 BFF에서 관리한다.
- 권한과 승인 흐름은 UI에서 1급 객체로 다룬다.
- Structured output이 우선이며, raw text는 보조다.
- 운영환경에서는 보수적 permission이 기본이다.

### 10.3 현재 구현물 기준 컴포넌트

- `web/` — React + Vite 단일 화면 UI
- `src/server.js` — Express 기반 BFF
- `src/schema.js` — incident triage JSON schema
- `.opencode/skills/incident-triage/` — triage Skill
- `opencode.json` — provider / permission / agent 정책

---

## 11. 정보 구조 및 화면 구성

### 11.1 화면 원칙

운영에서 중요한 상태를 숨기지 않는다.

### 11.2 단일 화면 구성

#### 좌측 패널
- 세션 생성
- 현재 세션 ID / title
- 프롬프트 입력
- raw messages 리스트

#### 중앙 패널
- structured result card
- severity
- confidence
- user impact
- blast radius
- evidence
- ranked hypotheses
- recommended actions
- open questions

#### 우측 패널
- pending permission 목록
- 승인 버튼 (`once`, `always`, `reject`)
- SSE event log

### 11.3 UX 원칙

- primary value는 result card에 둔다.
- 운영 통제 value는 permission 패널에 둔다.
- 디버깅/신뢰성 value는 event log에 둔다.
- raw messages는 숨기지 않되 보조 역할로 둔다.

---

## 12. 상세 기능 요구사항

## 12.1 세션 생성

### 설명
사용자는 새로운 운영 이슈마다 별도 세션을 생성할 수 있어야 한다.

### 요구사항
- 사용자는 세션 제목을 선택적으로 입력할 수 있어야 한다.
- 제목이 없으면 프롬프트 앞부분을 사용해 기본 제목을 생성할 수 있어야 한다.
- 세션 생성 성공 시 세션 ID를 반환해야 한다.
- UI는 현재 활성 세션을 명시해야 한다.
- 추후 user/team/project 메타데이터를 연결할 수 있어야 한다.

### 성공 기준
- 세션 생성 후 즉시 메시지 전송 가능
- 세션 전환 시 잘못된 권한 요청이 섞이지 않음

## 12.2 프롬프트 전송

### 설명
사용자는 incident 설명을 자연어로 입력해 triage를 요청할 수 있어야 한다.

### 요구사항
- sync 요청과 async 요청 둘 다 지원해야 한다.
- 기본 agent는 `plan`이어야 한다.
- structured output 사용 여부를 설정할 수 있어야 한다.
- 필요 시 provider/model override 가능해야 한다.
- system prompt 오버라이드를 지원할 수 있어야 한다.

### 입력 예시
- “10:02 배포 후 checkout 5xx 급증. 서울 리전 중심. p95 latency 4배 증가.”
- “queue backlog 급증, worker CPU 95%, dead letter 증가. 최근 config 변경과 연관 의심.”

## 12.3 Structured Result Rendering

### 설명
triage 결과는 JSON schema 기반으로 구조화되어야 한다.

### 필수 필드
- `summary`
- `severity`
- `confidence`
- `user_impact`
- `blast_radius`
- `evidence`
- `hypotheses`
- `recommended_actions`
- `escalate_now`
- `open_questions`

### 요구사항
- 필수 필드 누락 시 fallback UI를 보여야 한다.
- 유효한 structured output이 있으면 그 결과를 우선 렌더링해야 한다.
- structured output이 없으면 assistant text를 fallback으로 사용해야 한다.
- schema version을 향후 추가할 수 있도록 확장 가능해야 한다.

## 12.4 Permission Handling

### 설명
고위험 행동이나 정책상 승인 대상 행동은 사용자 승인 후에만 실행되어야 한다.

### 요구사항
- UI는 pending permission을 실시간에 가깝게 표시해야 한다.
- permission 카드에는 최소 아래를 표시해야 한다.
  - request ID
  - session ID
  - permission type
  - patterns
  - metadata
- 사용자는 `once`, `always`, `reject` 중 하나를 선택할 수 있어야 한다.
- BFF는 최신 permission reply 경로를 우선 사용하고, 실패 시 호환 fallback을 지원해야 한다.
- 사용자의 응답 결과는 화면에 반영되어야 한다.
- 추후 DB에 audit record로 저장 가능해야 한다.

## 12.5 SSE Event Subscription

### 설명
사용자는 세션 진행 중 발생하는 이벤트를 확인할 수 있어야 한다.

### 요구사항
- 프론트는 BFF를 통해 SSE를 구독해야 한다.
- 네트워크 끊김 시 자동 재연결을 지원해야 한다.
- 최소 이벤트 타입, 시간, 세션 ID, payload 일부를 볼 수 있어야 한다.
- permission event는 별도 상태로 승격해 UI action과 연결해야 한다.
- event log는 운영자 디버깅과 신뢰 확보를 위해 유지해야 한다.

## 12.6 Raw Message View

### 설명
사용자는 모델의 raw output과 세션 메시지를 확인할 수 있어야 한다.

### 요구사항
- 최신 assistant 메시지를 쉽게 식별 가능해야 한다.
- structured output과 raw text를 모두 볼 수 있어야 한다.
- 추후 export 기능을 붙일 수 있어야 한다.

## 12.7 Health Check

### 설명
운영자는 UI/BFF/OpenCode 상태를 빠르게 확인할 수 있어야 한다.

### 요구사항
- `/health` 또는 동등한 진단 경로를 제공해야 한다.
- upstream OpenCode 상태 확인이 가능해야 한다.
- 프론트에서 서버 연결 상태를 최소한으로 표시해야 한다.

## 12.8 Static Asset Serving

### 설명
프론트 빌드 결과를 별도 CDN 또는 BFF 내장 정적 서빙 방식 둘 다 지원해야 한다.

### 요구사항
- 개발 환경에서는 Vite dev server + API proxy 사용 가능해야 한다.
- 운영 환경에서는 BFF가 `web/dist`를 함께 서빙할 수 있어야 한다.
- 별도 정적 호스팅 방식도 지원 가능해야 한다.

---

## 13. Skill 요구사항

### 13.1 Skill 목적

`incident-triage` Skill은 운영 이슈 triage 절차를 재사용 가능한 행동 정의로 캡슐화한다.

### 13.2 Skill 책임

- evidence와 hypothesis를 구분한다.
- blast radius를 명시한다.
- 다음 행동을 “작고 안전한 단계” 중심으로 제안한다.
- 불확실성과 open question을 숨기지 않는다.
- escalation 필요 여부를 이진 플래그로 반환한다.

### 13.3 Skill 비책임

- 무조건 실행 가능한 remediation 수행
- 제품 외부 시스템에 대한 광범위한 자율 행동
- 승인 체계를 우회하는 자동 실행

### 13.4 Skill 운영 요구사항

- Git으로 버전 관리 가능해야 한다.
- 프로젝트 로컬 `.opencode/skills`에서 로드 가능해야 한다.
- agent permission에 따라 로드 허용 여부를 제어할 수 있어야 한다.
- 추후 팀별 variation을 둘 수 있어야 한다.

---

## 14. BFF 요구사항

### 14.1 BFF의 존재 이유

BFF는 단순 프록시가 아니다. 다음을 책임진다.

- 사용자 identity 연결
- API 표면 단순화
- permission mediation
- audit logging
- upstream credential 은닉
- 정책 일관성 유지
- 프론트와 OpenCode 버전 차이 흡수

### 14.2 필수 엔드포인트

- `POST /api/session`
- `GET /api/session/:id/messages`
- `POST /api/session/:id/message`
- `POST /api/session/:id/prompt-async`
- `GET /api/permissions`
- `POST /api/permissions/:requestId/reply`
- `GET /api/events`
- `GET /health`

### 14.3 BFF 정책

- OpenCode server URL, auth, model config는 브라우저에 노출하지 않는다.
- 브라우저는 항상 BFF만 호출한다.
- permission reply는 신규 방식 우선, 호환 fallback 지원
- 입력 스키마 검증을 수행한다.
- 오류는 프론트가 다룰 수 있는 JSON 형태로 정규화한다.

### 14.4 향후 확장 책임

- JWT 검증
- user/team/project 메타데이터 부착
- audit DB 적재
- request correlation ID 발급
- rate limit 및 abuse control
- feature flag 주입

---

## 15. OpenCode 연동 요구사항

### 15.1 Provider

- 사내 LLM gateway를 custom provider로 설정할 수 있어야 한다.
- `baseURL`과 모델 매핑은 `opencode.json` 또는 상위 config에서 관리 가능해야 한다.
- provider ID와 model ID를 UI에서 override할 수 있는 여지를 남겨야 한다.

### 15.2 Agent

- 기본 agent는 `plan`
- 고위험 agent 또는 build 계열은 명시적 전환 또는 정책 허용 시에만 사용
- agent별 permission override 가능해야 함

### 15.3 Permission

초기 운영 권장 기본값:

- `*`: `ask` 또는 보수적 기본 정책
- `edit`: `deny`
- `bash`: `deny` 기본, 안전한 읽기성 명령 일부 `allow`
- `skill`: allowlist 기반
- `read`: 민감 파일 패턴 deny 유지

### 15.4 Config

- 프로젝트 로컬 `opencode.json`으로 초기 정책을 정의 가능해야 한다.
- 조직 기본값과 프로젝트 오버라이드를 병행할 수 있어야 한다.
- `share`는 초기 운영에서 비활성화해야 한다.

---

## 16. 데이터 모델

### 16.1 Session

| 필드 | 설명 |
|---|---|
| id | OpenCode session ID |
| title | 사용자가 입력하거나 추론한 세션 제목 |
| createdAt | 세션 생성 시각 |
| createdBy | 사용자 ID (v1+) |
| teamId | 팀 식별자 (v1+) |
| projectId | 프로젝트 식별자 (v1+) |
| status | active / idle / error / closed |

### 16.2 TriageResult

| 필드 | 타입 | 설명 |
|---|---|---|
| summary | string | 상황 요약 |
| severity | enum | sev0~sev3 |
| confidence | number | 상위 가설 확신도 |
| user_impact | string | 사용자 영향 |
| blast_radius | string[] | 영향 범위 |
| evidence | string[] | 관측된 사실 |
| hypotheses | object[] | 랭크된 가설 |
| recommended_actions | string[] | 다음 안전한 행동 |
| escalate_now | boolean | 즉시 escalation 필요 여부 |
| open_questions | string[] | 남은 질문 |
| schema_version | string | 향후 추가 |

### 16.3 PermissionRequest

| 필드 | 설명 |
|---|---|
| id | permission request ID |
| sessionId | 연관 세션 |
| permission | action type |
| patterns | 허용/차단 대상 패턴 |
| always | remember 시 허용될 패턴 |
| metadata | 추가 설명 |
| state | pending / replied / expired |
| repliedBy | 사용자 ID (v1+) |
| reply | once / always / reject |
| repliedAt | 응답 시각 |

### 16.4 EventLog

| 필드 | 설명 |
|---|---|
| id | 내부 event id |
| type | event type |
| sessionId | 관련 세션 |
| ts | 이벤트 시각 |
| payload | raw payload 일부 |
| source | opencode / bff / frontend |

---

## 17. 비기능 요구사항

## 17.1 보안

### 요구사항
- 브라우저는 OpenCode server 자격증명을 직접 알면 안 된다.
- BFF는 upstream 인증을 캡슐화해야 한다.
- 운영환경에서는 SSO/JWT를 사용해야 한다.
- 민감 경로 및 `.env` 계열 파일은 기본 deny를 유지해야 한다.
- 모든 approval response는 사용자 식별자와 함께 감사 가능해야 한다.
- `share`는 기본 비활성화여야 한다.

## 17.2 신뢰성

### 목표
- BFF는 upstream 에러를 의미 있는 JSON으로 반환해야 한다.
- SSE 연결 끊김 시 자동 재연결해야 한다.
- OpenCode 버전 차이에 대해 permission API 호환성을 유지해야 한다.
- 세션/이벤트 조회 실패가 전체 UI를 죽이지 않아야 한다.

## 17.3 성능

### 제안 목표
- BFF 추가 오버헤드 p95 300ms 이하 (모델 추론 제외)
- 세션 생성 응답 p95 1초 이하
- permission reply 반영 p95 500ms 이하
- 프론트 초기 화면 로드 p95 2초 이하 (사내 네트워크 기준)

## 17.4 관측성

### 요구사항
- 요청 ID / 세션 ID / 사용자 ID / permission ID 기준으로 상관관계 추적 가능해야 한다.
- BFF access log, error log, approval audit log를 분리할 수 있어야 한다.
- OpenCode upstream health를 확인할 수 있어야 한다.
- 중요 이벤트는 UI와 로그 양쪽에 기록되어야 한다.

## 17.5 확장성

### 요구사항
- worker pool 분리 가능해야 한다.
- 팀/프로젝트 단위 라우팅이 가능해야 한다.
- 추후 multiple skill / multiple tool / limited MCP 확장이 가능해야 한다.

## 17.6 접근성 / 국제화

### 초기 원칙
- 사내 운영툴 특성상 접근성 최소 기준은 준수한다.
- 한국어 중심 UI를 기본으로 하되, 키 라벨은 영어 병기 가능하다.
- v1 이후 i18n은 선택사항이다.

---

## 18. 운영 정책

### 18.1 권한 정책 기본값

초기 운영에서는 **최소권한 원칙**을 따른다.

- 읽기 > 허용 범위 확대 가능
- 수정 > 기본 차단
- 셸 > 기본 차단 또는 읽기성 명령만 일부 허용
- skill > allowlist 기반 허용
- 고위험 외부 액션 > deny 또는 ask

### 18.2 승인 정책

- `once`: 1회성 승인
- `always`: 세션 내 반복 패턴 승인
- `reject`: 요청 거절

### 18.3 로그 정책

v1 기준 최소 저장 항목:

- user ID
- session ID
- prompt summary
- permission request ID
- permission type
- reply
- reply timestamp
- upstream status

### 18.4 데이터 보존

초기 제안:

- raw event log: 7~30일
- approval audit log: 90일 이상
- incident result summary: 90일 이상
- 민감 원문 prompt는 정책에 따라 마스킹 또는 보존기간 축소

---

## 19. API 계약 초안

## 19.1 세션 생성

### Request
```json
{
  "title": "checkout 5xx after deploy"
}
```

### Response
```json
{
  "id": "sess_123",
  "title": "checkout 5xx after deploy"
}
```

## 19.2 메시지 전송

### Request
```json
{
  "prompt": "10:02 배포 후 checkout 5xx 급증, 서울 리전 중심, DB latency 증가",
  "agent": "plan",
  "structured": true
}
```

### Response (정규화 후)
```json
{
  "id": "msg_123",
  "assistantText": "...",
  "structuredOutput": {
    "summary": "...",
    "severity": "sev1",
    "confidence": 0.82,
    "user_impact": "결제 실패율 증가",
    "blast_radius": ["checkout", "ap-northeast-2"],
    "evidence": ["..."],
    "hypotheses": [
      {
        "rank": 1,
        "title": "deployment introduced DB query regression",
        "confidence": 0.82,
        "why": "...",
        "confirm_by": ["rollback compare", "slow query check"]
      }
    ],
    "recommended_actions": ["stop rollout", "check DB slow query logs"],
    "escalate_now": true,
    "open_questions": ["is only one region affected?"]
  }
}
```

## 19.3 permission reply

### Request
```json
{
  "sessionId": "sess_123",
  "response": "once",
  "remember": false
}
```

### Response
```json
{
  "ok": true,
  "mode": "primary"
}
```

---

## 20. 성공 지표

## 20.1 북극성 지표

**Time to Structured Triage (TTST)**

사용자가 첫 prompt를 보낸 시점부터 구조화된 triage result가 화면에 표시될 때까지의 시간.

### 목표
- 파일럿: 중앙값 90초 이하
- 운영 초기: 중앙값 60초 이하

## 20.2 보조 지표

- structured output 유효성 비율
- permission 처리 완료율
- first-response 이후 추가 clarification 필요 비율
- false escalation 비율
- 모델 제안 후 실제 승인된 action 비율
- active session 당 평균 triage 완료 시간
- UI/BFF/OpenCode end-to-end 실패율

## 20.3 품질 지표

- evidence와 hypothesis 혼동률
- blast radius 누락률
- recommended action의 안전성 검토 점수
- 운영자 만족도 (1~5)

---

## 21. 출시 전략

### 21.1 Phase 0 — 내부 개발 검증

목표:
- 기술 연결성 확인
- basic session/message/permission/event 흐름 검증

완료 기준:
- 로컬 또는 개발환경에서 end-to-end 성공
- structured output 스키마 안정화
- permission UI 동작 확인

### 21.2 Phase 1 — 제한적 파일럿

대상:
- 1~2개 운영팀
- 1~2개 incident 유형

목표:
- 실제 온콜 triage 흐름에 투입
- 승인 패턴 수집
- false positive / false escalation 분석

완료 기준:
- 운영자 만족도 평균 4.0 이상
- major security issue 없음
- audit logging 완성

### 21.3 Phase 2 — 제한적 운영

목표:
- SSO 적용
- project/team 라우팅
- 제한된 internal data source 연결

완료 기준:
- 사용 빈도 주 10회 이상
- 주요 incident 유형 3종 이상 커버
- 운영 문서/런북 반영

---

## 22. 리스크와 대응

### R1. 모델 hallucination으로 잘못된 triage

대응:
- structured output 강제
- evidence/hypothesis 분리
- confidence 표시
- open questions 강제 노출
- 승인 없는 위험 행동 차단

### R2. OpenCode / permission API 버전 차이

대응:
- BFF에서 compatibility layer 유지
- 신규 경로 우선 + 구 경로 fallback
- versioned adapter 도입

### R3. 브라우저가 엔진 세부사항을 너무 많이 알아버림

대응:
- 브라우저는 BFF만 호출
- OpenCode URL / credential / raw config 은닉
- 프론트 API를 제품 관점으로 재정의

### R4. 운영자 신뢰 부족

대응:
- raw messages 제공
- event log 제공
- approval trace 제공
- “모르겠다”를 표현하도록 Skill 설계

### R5. 권한이 너무 느슨해져 사고 유발

대응:
- 기본 deny/ask
- allowlist 정책
- skill/task/bash 분리 정책
- rollout 전에 permission 리뷰 필수

### R6. 과도한 scope 확장

대응:
- v0는 triage only
- remediation은 v2 이후 좁은 범위로만 추가
- MCP/tool은 최소 연결로 시작

---

## 23. 의존성

### 필수 의존성

- OpenCode server 실행 환경
- 사내 LLM gateway 또는 내부 provider endpoint
- BFF 배포 환경
- React 정적 자산 배포 환경

### v1 추가 의존성

- SSO/JWT provider
- audit log 저장소
- 관측성 스택 (logs / metrics / traces)

### v2 추가 의존성

- internal search 또는 MCP server
- remediation 대상 시스템 API
- 프로젝트/팀 라우팅 메타데이터 소스

---

## 24. 오픈 이슈

1. user/team/project를 어떤 authoritative source와 연결할 것인가?
2. approval audit log는 어떤 저장소를 표준으로 쓸 것인가?
3. 사내 모델 게이트웨이의 rate limit / timeout 정책은 무엇인가?
4. 민감한 incident payload를 얼마나 저장할 것인가?
5. v1에서 연결할 첫 internal data source는 무엇인가?
6. incident severity를 모델이 직접 결정하게 할지, 운영자가 수정 가능하게 할지?
7. 세션 보존기간과 삭제 정책을 누가 소유할 것인가?

---

## 25. 수용 기준 (Acceptance Criteria)

### A. 기능
- 사용자는 웹 UI에서 세션을 생성할 수 있다.
- 사용자는 prompt를 보내 structured result를 받을 수 있다.
- 시스템은 severity, impact, evidence, hypotheses, actions, questions를 표시한다.
- pending permission이 UI에 표시된다.
- 사용자는 `once`, `always`, `reject`를 선택할 수 있다.
- 이벤트 로그가 실시간에 가깝게 갱신된다.

### B. 보안/운영
- 브라우저는 OpenCode credential을 직접 알지 않는다.
- `share`는 기본 비활성화다.
- `plan` agent가 기본이다.
- `edit`는 기본 차단이다.
- approval response는 사용자 기준으로 추적 가능하다. (v1)

### C. 신뢰성
- upstream 실패 시 BFF는 의미 있는 오류 JSON을 반환한다.
- SSE 재연결이 가능하다.
- permission API 차이에 대해 호환 동작한다.

### D. 확장성
- Skill 교체 또는 업데이트가 가능하다.
- provider baseURL 교체가 가능하다.
- 향후 internal search / MCP / remediation tool 추가가 가능하다.

---

## 26. 구현 매핑

현재 스타터 구현과 PRD 요구사항의 대응은 아래와 같다.

| PRD 항목 | 현재 상태 | 비고 |
|---|---|---|
| 세션 생성 | 구현됨 | BFF + UI 연동 |
| 메시지 전송 | 구현됨 | sync/async 엔드포인트 보유 |
| structured output | 구현됨 | schema 기반 |
| result card | 구현됨 | 핵심 필드 표시 |
| permission UI | 구현됨 | pending list + reply |
| SSE event log | 구현됨 | global event 기반 |
| raw messages | 구현됨 | 보조 패널 |
| SSO/JWT | 미구현 | v1 |
| audit DB | 미구현 | v1 |
| worker 분리 | 미구현 | v1/v2 |
| internal search/MCP | 미구현 | v1/v2 |
| remediation tool | 미구현 | v2 |

---

## 27. 다음 실행 권고

### 내일 바로 해야 할 첫 행동

1. 이 PRD를 기준으로 **v0 범위 동결**
2. BFF에 **user identity placeholder** 추가
3. approval reply를 **audit log sink**에 남기는 stub 추가
4. `incident-triage` schema에 **schema_version** 추가
5. 운영팀 1곳을 파일럿 사용자로 지정

### 가장 작은 운영 실험

- 대상: 한 운영팀
- 사용 시간: 1주
- 범위: 읽기 중심 triage only
- 금지: 자동 remediation
- 측정: TTST, approval 수, structured output 유효성, 운영자 만족도

---

## 28. 부록 — 제안 우선순위

### Must
- session
- prompt
- structured output
- permission approval
- SSE log
- BFF mediation
- restrictive permissions

### Should
- SSO
- audit logging
- project/team mapping
- health dashboard

### Could
- internal search
- export/share
- schema variants
- limited remediation

### Won’t (초기 버전)
- full autonomous remediation
- public multi-tenant SaaS
- broad write access
- unreviewed external actions

---

## 29. 결론

이 제품의 본질은 “AI 채팅 웹앱”이 아니다.

이 제품의 본질은 다음과 같다.

> **운영자가 불완전한 입력으로도 빠르게 구조화된 triage 결과를 얻고, 위험한 후속 작업은 명시적으로 승인하며, 세션과 이벤트를 관측 가능한 상태로 유지하는 운영 제어형 웹 서비스**

제1원칙으로 보면, 이 제품에서 꼭 필요한 것은 많지 않다.

- 세션
- 구조화된 결과
- 승인
- 이벤트 관측
- 최소권한

그 외 대부분은 운영이 검증된 뒤 붙이면 된다.
