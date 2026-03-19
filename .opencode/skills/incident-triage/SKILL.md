---
name: incident-triage
description: diagnose production incidents, failed deploys, error spikes, broken endpoints, and release regressions using repo context, logs, stack traces, test output, and service metadata. use when a user asks to triage an incident, summarize likely root causes, estimate blast radius, propose next actions, or produce a structured incident report for chatops, web backends, or internal support tools.
---

# Incident Triage

## Overview

Produce evidence-first incident triage for web-service operations. Use this skill when the task is to turn messy operational input into a concise diagnosis, a ranked hypothesis list, and a safe next-action plan.

Assume the caller may provide logs, alerts, stack traces, deploy metadata, code snippets, endpoint failures, or partial symptoms. Prefer read-only analysis unless the caller explicitly requests changes and the active agent has approval to do more.

## Triage workflow

Follow this sequence.

1. Identify the trigger.
   - What changed: deploy, config, dependency, traffic shape, data input, infrastructure event, or user behavior.
   - What is failing: endpoint, job, queue, page load, login, payment, webhook, background worker.

2. Extract hard evidence.
   - Exact error text or status code.
   - First known time and most recent time.
   - Affected service, environment, region, tenant, or feature flag.
   - Release SHA, package version, or config version if available.

3. Separate facts from guesses.
   - Label direct observations as **evidence**.
   - Label unproven explanations as **hypotheses**.
   - Label missing but important information as **unknowns**.

4. Estimate impact.
   - User-facing or internal only.
   - Complete outage, degraded performance, or partial failure.
   - Single tenant, cohort, region, or global.

5. Produce the initial response.
   - Give the most likely cause only if supported by evidence.
   - Rank 1 to 3 hypotheses.
   - Recommend the smallest safe next actions that reduce blast radius or increase certainty.

## Decision rules

- Do not claim root cause without citing the evidence that supports it.
- If evidence is incomplete, say the cause is **unconfirmed**.
- Prefer rollback, disable, isolate, or traffic reduction before risky broad changes.
- Treat missing telemetry as unknown, not as healthy.
- Avoid suggesting destructive actions unless the caller explicitly asks for remediation and the environment supports approvals.
- If the problem appears security-related, credential-related, or data-loss-related, say so explicitly and recommend escalation.

## Severity mapping

Use this default scale unless the caller provides their own.

- **sev0**: critical outage, major revenue or safety impact, no reasonable workaround.
- **sev1**: major degradation or high-value workflow broken for many users.
- **sev2**: meaningful but contained degradation, workaround exists, limited blast radius.
- **sev3**: low-severity defect, noise, or localized issue.

When uncertain between two levels, choose the lower level and explain what evidence would justify escalation.

## Output format

Use the user’s language for explanatory prose.

When the caller requests structured output, return a compact JSON object using the field contract in `references/response-contract.md`. Keep JSON keys in English for API stability.

When free-text output is acceptable, use this layout:

### Summary
One paragraph on what is happening and why it matters.

### Severity
`sev0 | sev1 | sev2 | sev3` with one-sentence justification.

### Evidence
3 to 6 bullets with concrete observations.

### Hypotheses
Up to 3 ranked hypotheses. Each must include confidence and what would confirm or falsify it.

### Blast radius
State who or what is affected.

### Next actions
List the smallest actions that either reduce user impact or improve certainty.

### Escalate now?
`yes | no` with reason.

## Examples

- “로그를 붙일게. 이번 배포 이후 502가 늘었는데 원인 추정과 대응 순서 정리해줘.”
- “Look at this stack trace and tell me whether the incident is likely config, dependency, or code regression.”
- “Generate a JSON incident triage object for the web UI.”

## References

- Structured response contract: `references/response-contract.md`
- Prompt and output examples: `references/examples.md`
