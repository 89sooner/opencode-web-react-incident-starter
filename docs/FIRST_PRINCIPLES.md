# First Principles for This Starter

## 1. 일반적으로 받아들이는 가정
- 채팅 UI는 메시지 목록부터 크게 만들어야 한다.
- 승인 UI는 나중에 붙여도 된다.
- 이벤트 스트림은 있어도 되고 없어도 된다.
- 프론트는 멋있게, BFF는 단순 프록시로만 두면 된다.

## 2. 원자 단위로 분해
이 서비스가 실제로 다루는 원자는 아래뿐이다.
- 세션 1개
- 사용자 입력 prompt 1개
- structured triage result 1개
- pending permission request 0..n개
- event stream 1개

## 3. 전제 제거
운영에서 가장 중요한 것은 UI 장식이 아니라 아래다.
- 현재 어떤 session이 돌고 있는가
- 지금 approval이 필요한가
- agent가 어떤 evidence와 hypothesis를 냈는가
- 어떤 이벤트가 방금 발생했는가

## 4. 핵심 원리
- UI는 상태를 숨기지 말고 드러내야 한다.
- 승인은 부가 기능이 아니라 핵심 제어면이다.
- SSE 로그는 디버깅용이 아니라 운영 신뢰성을 위한 관측면이다.
- structured output은 화면 분해를 쉽게 한다.

## 5. 그래서 이렇게 설계했다
- 왼쪽: session, prompt, raw messages
- 가운데: structured triage result
- 오른쪽: approval + event log
- SSE는 원문에 가깝게 유지하되, permission만 UI 상태로 승격
- approval reply는 새 경로와 구 경로를 둘 다 지원

## 6. 내일 바로 할 수 있는 다음 실험
- 로그인 사용자 ID를 BFF audit log에 저장
- project/worker 분리 키를 세션 생성 시 강제
- pending permissions를 DB에 저장하고 재조회 가능하게 확장
- structured result에 schema version 추가
