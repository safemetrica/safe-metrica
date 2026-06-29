#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://www.safemetrica.com}"
BASE_URL="${BASE_URL%/}"

FAILURES=0

check_route() {
  local path="$1"
  local label="$2"
  local required_pattern="${3:-}"
  local url="${BASE_URL}${path}"
  local tmp_file
  local status

  tmp_file="$(mktemp)"

  status="$(
    curl -sS -L \
      -o "$tmp_file" \
      -w "%{http_code}" \
      "$url" || echo "curl_failed"
  )"

  if [[ "$status" == "curl_failed" ]]; then
    echo "FAIL ${label}: curl failed (${url})"
    FAILURES=$((FAILURES + 1))
    rm -f "$tmp_file"
    return
  fi

  if [[ "$status" != "200" ]]; then
    echo "FAIL ${label}: expected HTTP 200, got ${status} (${url})"
    FAILURES=$((FAILURES + 1))
  fi

  if rg -qi "tenant_required|/login\?error|__next_error__|500 Internal Server Error" "$tmp_file"; then
    echo "FAIL ${label}: found login/error marker (${url})"
    FAILURES=$((FAILURES + 1))
  fi

  if [[ -n "$required_pattern" ]] && ! rg -qi "$required_pattern" "$tmp_file"; then
    echo "FAIL ${label}: required marker not found: ${required_pattern} (${url})"
    FAILURES=$((FAILURES + 1))
  fi

  if [[ "$status" == "200" ]]; then
    echo "PASS ${label}: ${path}"
  fi

  rm -f "$tmp_file"
}

echo "SafeMetrica legacy route smoke test"
echo "BASE_URL=${BASE_URL}"
echo

check_route "/tbm?company=daedo" "Daedo TBM legacy direct route" "TBM|대도|daedo"
check_route "/tbm?company=richi" "Richi TBM direct route" "TBM|리치|richi"
check_route "/field/participation?company=richi" "Richi field participation route" "SafeMetrica|현장|리치|richi"
check_route "/manager/risk-share?company=richi" "Richi manager operation route" "SafeMetrica|리치|richi|운영"
check_route "/monthly-report/risk-share?company=richi" "Richi monthly operation route" "SafeMetrica|리치|richi|월간"

echo

if [[ "$FAILURES" -gt 0 ]]; then
  echo "Smoke test failed: ${FAILURES} issue(s)"
  exit 1
fi

echo "Smoke test passed"
