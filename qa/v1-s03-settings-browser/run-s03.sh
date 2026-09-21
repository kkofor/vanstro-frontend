#!/usr/bin/env bash
# S03 Commerce Settings browser acceptance wrapper: starts the fixture API and
# a Next.js dev server whose client resolves the API at the fixture origin
# (NEXT_PUBLIC_API_BASE_URL), runs the Playwright acceptance against real
# Google Chrome, stops everything, and cleans ports/processes. testedCommit is
# bound dynamically from the current HEAD.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WEB_PORT=${S03_WEB_PORT:-4554}
API_PORT=${S03_API_PORT:-4555}
OUT=${S03_BROWSER_OUT:-"$ROOT/tasks/evidence/v1-s03-settings-browser"}
TESTED_COMMIT=${S03_TESTED_COMMIT:-$(git -C "$ROOT" rev-parse HEAD)}
TESTED_TREE=${S03_TESTED_TREE:-$(git -C "$ROOT" rev-parse 'HEAD^{tree}')}
mkdir -p "$OUT"

# Deterministic builds: a stale turbopack .next cache can bake an old
# NEXT_PUBLIC_API_BASE_URL into client chunks. A leaked next-server from a
# previous run holds open handles into .next and corrupts the dev build; kill
# any process with open handles there and anything bound to our ports before
# clearing the dev build outputs.
lsof +D "$ROOT/.next" -t 2>/dev/null | xargs kill >/dev/null 2>&1 || true
lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
sleep 1
rm -rf "$ROOT/.next" 2>/dev/null || true

# The dev server reads .env from the workspace root and may not inline shell
# NEXT_PUBLIC_* vars otherwise; write a worktree-local .env.local for this run.
cat > "$ROOT/.env.local" <<EOF
NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:$API_PORT"
NEXT_PUBLIC_SITE_URL="http://127.0.0.1:$WEB_PORT"
NEXT_PUBLIC_DEMO_READ_ONLY="false"
EOF

python3 "$HERE/s03-fixture.py" "$API_PORT" >"$OUT/fixture-api.log" 2>&1 &
FIXTURE_PID=$!
sleep 1
if kill -0 "$FIXTURE_PID" 2>/dev/null; then echo "S03_FIXTURE_ALIVE pid=$FIXTURE_PID" >&2; else echo "S03_FIXTURE_DEAD pid=$FIXTURE_PID" >&2; fi
(
  cd "$ROOT"
  NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:$API_PORT" \
  NEXT_PUBLIC_SITE_URL="http://127.0.0.1:$WEB_PORT" \
  VANSTRO_WEBSITE_API_BASE_URL="http://127.0.0.1:$API_PORT" \
  PORT="$WEB_PORT" \
  pnpm dev >"$OUT/fixture-web.log" 2>&1
) &
WEB_PID=$!

cleanup() {
  pkill -P "$WEB_PID" >/dev/null 2>&1 || true
  kill "$FIXTURE_PID" "$WEB_PID" >/dev/null 2>&1 || true
  wait "$FIXTURE_PID" "$WEB_PID" >/dev/null 2>&1 || true
  lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
  rm -f "$ROOT/.env.local"
}
trap cleanup EXIT

for _ in $(seq 1 40); do
  if curl -s "http://127.0.0.1:$API_PORT/control/state" >/dev/null 2>&1; then break; fi
  sleep 0.3
done

for _ in $(seq 1 120); do
  if curl -s -o /dev/null "http://127.0.0.1:$WEB_PORT/dashboard/settings/commerce"; then break; fi
  sleep 0.5
done

echo "RUN acceptance start" >&2
S03_WEB="http://127.0.0.1:$WEB_PORT" \
S03_API="http://127.0.0.1:$API_PORT" \
S03_BROWSER_OUT="$OUT" \
S03_TESTED_COMMIT="$TESTED_COMMIT" \
S03_TESTED_TREE="$TESTED_TREE" \
python3 -u "$HERE/s03-acceptance.py"
