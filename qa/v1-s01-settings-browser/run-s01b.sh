#!/usr/bin/env bash
# S01B Settings browser acceptance wrapper: starts the web fixture and the
# fixture API, runs the Playwright acceptance, stops everything, and cleans
# ports/processes. testedCommit is bound dynamically from the current HEAD.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WEB_PORT=${S01B_WEB_PORT:-4550}
API_PORT=${S01B_API_PORT:-4551}
OUT=${S01B_BROWSER_OUT:-"$ROOT/tasks/evidence/v1-s01b-settings-browser"}
TESTED_COMMIT=${S01B_TESTED_COMMIT:-$(git -C "$ROOT" rev-parse HEAD)}
TESTED_TREE=${S01B_TESTED_TREE:-$(git -C "$ROOT" rev-parse 'HEAD^{tree}')}
mkdir -p "$OUT"

# Start the fixture API and a Next.js dev server whose client resolves the
# dashboard API at the fixture origin (NEXT_PUBLIC_API_BASE_URL), matching the
# established browser-harness architecture (real Next.js + controlled API).
python3 "$HERE/s01b-fixture.py" "$API_PORT" >"$OUT/fixture-api.log" 2>&1 &
FIXTURE_PID=$!
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
  kill "$FIXTURE_PID" "$WEB_PID" >/dev/null 2>&1 || true
  wait "$FIXTURE_PID" "$WEB_PID" >/dev/null 2>&1 || true
  # pnpm/next dev can leave an orphaned next-server child holding the port
  # after the wrapper is killed; sweep any listener on the suite ports.
  for port in "$WEB_PORT" "$API_PORT"; do
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -s "http://127.0.0.1:$API_PORT/control/state" >/dev/null 2>&1; then break; fi
  sleep 0.3
done

S01B_WEB="http://127.0.0.1:$WEB_PORT" \
S01B_API="http://127.0.0.1:$API_PORT" \
S01B_BROWSER_OUT="$OUT" \
S01B_TESTED_COMMIT="$TESTED_COMMIT" \
S01B_TESTED_TREE="$TESTED_TREE" \
python3 "$HERE/s01b-acceptance.py"
