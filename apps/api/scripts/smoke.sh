#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-https://lumen-api.fly.dev}"
EMAIL="${SMOKE_EMAIL:-qa@example.com}"

printf "\n[smoke] API_URL=%s\n" "$API_URL"

health_status=$(curl -sS -o /tmp/lumen_health.json -w "%{http_code}" "$API_URL/v1/health")
if [[ "$health_status" != "200" ]]; then
  echo "[smoke] FAIL: /v1/health returned $health_status"
  cat /tmp/lumen_health.json || true
  exit 1
fi
echo "[smoke] PASS: /v1/health"

request_status=$(curl -sS -o /tmp/lumen_request_link.json -w "%{http_code}" \
  -X POST "$API_URL/v1/auth/request-link" \
  -H 'content-type: application/json' \
  --data "{\"email\":\"$EMAIL\"}")

if [[ "$request_status" != "200" ]]; then
  echo "[smoke] FAIL: /v1/auth/request-link returned $request_status"
  cat /tmp/lumen_request_link.json || true
  exit 1
fi

echo "[smoke] PASS: /v1/auth/request-link"

echo "[smoke] Completed successfully"
