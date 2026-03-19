#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

SESSION_ID=$(curl -sS -X POST "$BASE_URL/api/session" \
  -H 'Content-Type: application/json' \
  -d '{"title":"checkout incident"}' | jq -r '.id')

echo "session=$SESSION_ID"

curl -sS -X POST "$BASE_URL/api/session/$SESSION_ID/message" \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "이번 배포 이후 checkout 502가 급증했다. 원인 가설과 다음 조치 정리해줘.",
    "structured": true,
    "agent": "plan"
  }' | jq .
