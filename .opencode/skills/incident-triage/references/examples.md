# Prompt and output examples

## Example 1

### Input

이번 배포 이후 로그인 API 응답이 간헐적으로 500이 난다. 스택트레이스와 최근 변경 파일 목록을 보고 triage 해줘.

### Desired behavior

- 먼저 배포 타이밍과 오류 타이밍을 맞춘다.
- evidence 와 hypothesis 를 분리한다.
- rollback, feature flag off, config diff 확인처럼 작은 조치를 우선 제안한다.

## Example 2

### Input

Create a JSON incident object for a web dashboard. We suspect a dependency regression after upgrading a database driver.

### Desired behavior

- Return stable English JSON keys.
- Use `sev0` to `sev3`.
- Include `open_questions` when evidence is incomplete.
- Do not claim root cause unless the logs or code changes support it.
