#!/usr/bin/env bash
# S02 Settings browser acceptance wrapper: starts the fixture API and a
# Next.js dev server whose client resolves the API at the fixture origin
# (NEXT_PUBLIC_API_BASE_URL), runs the Playwright acceptance against real
# Google Chrome, stops everything, and cleans ports/processes. testedCommit is
# bound dynamically from the current HEAD.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WEB_PORT=${S02_WEB_PORT:-4560}
API_PORT=${S02_API_PORT:-4561}
OUT=${S02_BROWSER_OUT:-"$ROOT/tasks/evidence/v1-s02-settings-browser"}
TESTED_COMMIT=${S02_TESTED_COMMIT:-$(git -C "$ROOT" rev-parse HEAD)}
TESTED_TREE=${S02_TESTED_TREE:-$(git -C "$ROOT" rev-parse 'HEAD^{tree}')}
mkdir -p "$OUT"

# Deterministic builds: a stale turbopack .next cache can bake an old
# NEXT_PUBLIC_API_BASE_URL into client chunks. Clear the dev build outputs so
# this run's env vars are always inlined fresh.
rm -rf "$ROOT/.next/cache" "$ROOT/.next/static" "$ROOT/.next/server" "$ROOT/.next/dev" 2>/dev/null || true

# The dev server reads .env from the workspace root and may not inline shell
# NEXT_PUBLIC_* vars otherwise; write a worktree-local .env.local for this run.
cat > "$ROOT/.env.local" <<EOF
NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:$API_PORT"
NEXT_PUBLIC_SITE_URL="http://127.0.0.1:$WEB_PORT"
NEXT_PUBLIC_DEMO_READ_ONLY="false"
EOF

# Start the fixture API and a Next.js dev server whose client resolves the
# dashboard and storefront API at the fixture origin (NEXT_PUBLIC_API_BASE_URL),
# matching the established browser-harness architecture (real Next.js +
# controlled fixture API).
python3 "$HERE/s02-fixture.py" "$API_PORT" >"$OUT/fixture-api.log" 2>&1 &
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

kill_tree() {
  local pid=$1
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do kill_tree "$child"; done
  kill "$pid" >/dev/null 2>&1 || true
}

cleanup() {
  # pnpm spawns node -> next-server children; kill the whole tree so no
  # orphan dev-server process keeps a port or .next lock after the run.
  kill_tree "$FIXTURE_PID"
  kill_tree "$WEB_PID"
  wait "$FIXTURE_PID" "$WEB_PID" >/dev/null 2>&1 || true
  rm -f "$ROOT/.env.local"
}
trap cleanup EXIT

for _ in $(seq 1 40); do
  if curl -s "http://127.0.0.1:$API_PORT/control/state" >/dev/null 2>&1; then break; fi
  sleep 0.3
done

S02_WEB="http://127.0.0.1:$WEB_PORT" \
S02_API="http://127.0.0.1:$API_PORT" \
S02_BROWSER_OUT="$OUT" \
S02_TESTED_COMMIT="$TESTED_COMMIT" \
S02_TESTED_TREE="$TESTED_TREE" \
python3 "$HERE/s02-acceptance.py"
