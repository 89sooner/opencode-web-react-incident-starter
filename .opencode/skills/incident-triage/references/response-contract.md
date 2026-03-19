# Structured response contract

Use this contract when the caller asks for JSON or when the output will be consumed by a web backend.

## Field guide

- `summary`: one-paragraph explanation of the incident.
- `severity`: one of `sev0`, `sev1`, `sev2`, `sev3`.
- `confidence`: decimal from `0` to `1` representing confidence in the top hypothesis.
- `user_impact`: short description of user-visible impact.
- `blast_radius`: list of affected systems, tenants, regions, or cohorts.
- `evidence`: concrete observed facts only.
- `hypotheses`: ranked list of possible causes.
- `recommended_actions`: smallest safe next steps.
- `escalate_now`: whether immediate escalation is warranted.
- `open_questions`: data needed to confirm the cause.

## Example JSON

```json
{
  "summary": "Requests to /checkout started failing after the 2026-03-18 deployment. Evidence points to a missing upstream credential in the payments worker rollout, but the root cause is not yet confirmed.",
  "severity": "sev1",
  "confidence": 0.72,
  "user_impact": "A subset of checkout attempts return 502 and cannot complete payment.",
  "blast_radius": ["payments-api", "checkout-web", "eu-west"],
  "evidence": [
    "502 rate increased within 4 minutes of deploy 7d92f12",
    "payments worker logs show repeated upstream auth failures",
    "rollback in staging removes the error"
  ],
  "hypotheses": [
    {
      "rank": 1,
      "title": "missing rotated credential in new worker release",
      "confidence": 0.72,
      "why": "The error starts immediately after rollout and matches auth-failure log lines.",
      "confirm_by": ["compare secret versions", "restart worker with previous secret mount"]
    },
    {
      "rank": 2,
      "title": "region-specific upstream outage",
      "confidence": 0.18,
      "why": "The failures are concentrated in eu-west, but deploy timing makes this less likely.",
      "confirm_by": ["check upstream status by region", "route traffic to another region"]
    }
  ],
  "recommended_actions": [
    "pause further rollout",
    "verify secret version mounted in payments workers",
    "rollback eu-west if auth mismatch is confirmed"
  ],
  "escalate_now": true,
  "open_questions": [
    "Did the secret rotation happen within the same window?",
    "Are non-EU regions affected by the same auth error?"
  ]
}
```
