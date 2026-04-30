#!/usr/bin/env bash
# Smoke test against the production focus-game deploy.
#
#   ./scripts/smoke.sh                    # run against default URL
#   ./scripts/smoke.sh https://other.url  # run against a specific deployment
#
# Validates: function alive, env vars wired, PWA artefacts present, rate-limit
# enforces, X-Request-Id correlation header is set. Exits non-zero on first
# failure so you can wire it into CI.

set -u
BASE="${1:-https://focus-game-nine.vercel.app}"
PASS=0
FAIL=0
WARN=0

ok()   { echo "  PASS  $1";          PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1";          FAIL=$((FAIL + 1)); }
warn() { echo "  WARN  $1";          WARN=$((WARN + 1)); }

echo "==> Smoke against ${BASE}"

# -------- /api/health --------
HEALTH_BODY=$(curl -s -m 10 "${BASE}/api/health?cb=$RANDOM" || true)
HEALTH_CODE=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "${BASE}/api/health?cb=$RANDOM" || true)
echo "[/api/health] HTTP ${HEALTH_CODE}: ${HEALTH_BODY}"
case "${HEALTH_CODE}" in
  200) ok "/api/health 200" ;;
  *)   fail "/api/health HTTP ${HEALTH_CODE} — function may be down" ;;
esac

case "${HEALTH_BODY}" in
  *'"hasSupabase":true'*)  ok "Supabase env wired" ;;
  *'"hasSupabase":false'*) warn "Supabase env NOT set in Vercel — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY" ;;
  *)                        warn "Could not parse hasSupabase from /api/health response" ;;
esac

# -------- X-Request-Id correlation --------
RID_HEADER=$(curl -s -m 10 -D - -H 'X-Request-Id: smoke-claude' "${BASE}/api/health" -o /dev/null | tr -d '\r' | grep -i '^x-request-id:' || true)
case "${RID_HEADER}" in
  *smoke-claude*) ok "X-Request-Id is echoed back to client" ;;
  *)              fail "X-Request-Id missing or not echoed: ${RID_HEADER:-<none>}" ;;
esac

# -------- /api/auth/verify shape --------
AUTH_BODY=$(curl -s -m 10 -H 'Content-Type: application/json' -X POST -d '{}' "${BASE}/api/auth/verify" || true)
echo "[/api/auth/verify {}] ${AUTH_BODY}"
case "${AUTH_BODY}" in
  *'"reason":"bot_token_missing"'*) warn "BOT_TOKEN not set in Vercel — Telegram auth will not work" ;;
  *'"reason":"missing_initdata_or_token"'*) ok "BOT_TOKEN wired (handler reached the validate step)" ;;
  *'"ok":false'*) ok "/api/auth/verify reached and returned a sane shape" ;;
  *) fail "/api/auth/verify returned unexpected body: ${AUTH_BODY}" ;;
esac

# -------- Rate-limit enforcement --------
RL_OK=0; RL_429=0
for i in $(seq 1 35); do
  c=$(curl -s -m 5 -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -X POST -d '{}' "${BASE}/api/auth/verify")
  case "$c" in 200|400|401) RL_OK=$((RL_OK + 1)) ;; 429) RL_429=$((RL_429 + 1)) ;; esac
done
if [ "${RL_429}" -gt 0 ]; then
  ok "rate-limit enforces after ${RL_OK} OKs (${RL_429}× 429)"
else
  warn "no 429 in 35 hits — rate-limit may be misconfigured (or limit is higher than tested)"
fi

# -------- PWA artefacts --------
for asset in manifest.webmanifest sw.js icon-192.png icon-512.png; do
  c=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "${BASE}/${asset}?cb=$RANDOM")
  case "$c" in
    200) ok "/${asset} 200" ;;
    *)   fail "/${asset} HTTP ${c}" ;;
  esac
done

# -------- /api/* path under SPA fallback --------
NOT_FOUND_CODE=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "${BASE}/api/__nope_${RANDOM}")
case "${NOT_FOUND_CODE}" in
  404) ok "/api/<unknown> returns 404 (function reachable)" ;;
  200) fail "/api/<unknown> returned 200 — likely SPA fallback is catching /api routes" ;;
  *)   warn "/api/<unknown> HTTP ${NOT_FOUND_CODE} — investigate" ;;
esac

echo
echo "==> ${PASS} pass, ${FAIL} fail, ${WARN} warn"
[ "${FAIL}" -eq 0 ]
