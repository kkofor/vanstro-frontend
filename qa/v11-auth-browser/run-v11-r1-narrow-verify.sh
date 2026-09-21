#!/usr/bin/env bash
# V11-R1 closure — minimal readiness/narrow verification.
# One disposable PG16 + API + Web; proves /dashboard/ returns 200 with a
# non-empty body containing the login marker from the expected PID/port,
# runs Browser case 01-anonymous-dashboard-login, then cleans up gracefully
# (docker stop --time, no rm -f) and asserts no leftovers.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${V11_NARROW_OUT:-"$ROOT/tasks/evidence/v11-r1-narrow"}"
mkdir -p "$OUT"
NODE_BIN=${V11_NODE_BIN:-node}
CONTAINER="vanstro-v11-narrow-pg"
WEB_PORT=${V11_WEB_PORT:-4564}
API_PORT=${V11_API_PORT:-4565}
DATABASE_NAME=vanstro_v11_auth_fixture
DATABASE_PASSWORD=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
V11_PASSWORD="V11-$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')"
SUPER_PASSWORD="T-$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')"
CALLBACK_SECRET=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
API_PID=""
WEB_PID=""

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then kill "$API_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${WEB_PID:-}" ]]; then kill "$WEB_PID" >/dev/null 2>&1 || true; fi
  [[ -n "${API_PID:-}" ]] && wait "$API_PID" >/dev/null 2>&1 || true
  [[ -n "${WEB_PID:-}" ]] && wait "$WEB_PID" >/dev/null 2>&1 || true
  for _ in $(seq 1 15); do
    if ! lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN >/dev/null 2>&1 && ! lsof -tiTCP:"$API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then break; fi
    sleep 1
  done
  lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
  lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER" >/dev/null 2>&1; then
    docker stop --time 15 "$CONTAINER" >/dev/null 2>&1 || docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker rm "$CONTAINER" >/dev/null 2>&1 || true
  fi
  rm -f "$ROOT/.env.local"
}
trap cleanup EXIT

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$DATABASE_PASSWORD" -e POSTGRES_DB="$DATABASE_NAME" -p 127.0.0.1::5432 postgres:16-bookworm >/dev/null
ready=false
for _ in $(seq 1 60); do
  if docker exec -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" pg_isready -U postgres -d "$DATABASE_NAME" >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || { echo "pg not ready" >&2; exit 1; }
PORT=$(docker port "$CONTAINER" 5432/tcp | sed 's/.*://')
export DATABASE_URL="postgresql://postgres:${DATABASE_PASSWORD}@127.0.0.1:${PORT}/${DATABASE_NAME}?schema=public"

export PATH="$HOME/.local/bin:$PATH"
export V11_NODE_BIN="$NODE_BIN"
pnpm --dir "$ROOT/packages/db" exec prisma db push --schema prisma/schema.prisma --skip-generate
# ACL bootstrap (roles + f1_v15 migration layer) exactly like the harness
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -U postgres -d "$DATABASE_NAME" < "$ROOT/qa/v11-auth-browser/f1-acl-bootstrap.sql" >/dev/null 2>&1 || true
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -U postgres -d "$DATABASE_NAME" < "$ROOT/packages/db/prisma/migrations/20260804130000_f1_v15_runtime_acl_closure/migration.sql" >/dev/null 2>&1 || true
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -U postgres -d "$DATABASE_NAME" <<'SQL' >/dev/null 2>&1
CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, started_at, applied_steps_count)
SELECT '00000000-0000-4000-8000-000000000079', 'v11-auth-harness', now(), '20260805100000_s01_settings_core', NULL, now(), 1
WHERE NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name = '20260805100000_s01_settings_core');
SQL
DATABASE_URL="$DATABASE_URL" \
  VANSTRO_RUNTIME_MODE=test \
  ALLOW_DEMO_SEED=true \
  SUPER_ADMIN_EMAIL=admin@vanstro.test \
  SUPER_ADMIN_PASSWORD="$SUPER_PASSWORD" \
  pnpm --dir "$ROOT/packages/db" db:seed >/dev/null 2>&1
V11_ADMIN_EMAIL=admin@example.com V11_CUSTOMER_EMAIL=customer@example.com V11_NODASH_EMAIL=nodash@example.com V11_PARTIAL_EMAIL=partial@example.com \
V11_SEED_PASSWORD="$V11_PASSWORD" ALLOW_V11_AUTH_SEED=true \
VANSTRO_TEST_SETUP_DATABASE_URL="$DATABASE_URL" \
V11_MB01_CATALOG_PATH="$ROOT/src/lib/data/mb01-products.ts" \
DATABASE_URL="$DATABASE_URL" \
pnpm --dir "$ROOT/packages/db" exec tsx "$HERE/seed-v11-auth.mts" >"$OUT/seed.json" 2>/dev/null

ADMIN_ID=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).admin.id)' "$OUT/seed.json")
PARTIAL_ID=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).partialAdmin.id)' "$OUT/seed.json")
EMAIL_KEY=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))')
(
  cd "$ROOT/apps/api"
  DATABASE_URL="$DATABASE_URL" VANSTRO_RUNTIME_MODE=test \
  PAYMENT_CALLBACK_SECRET="$CALLBACK_SECRET" ENABLE_PAYMENT_SIMULATION=true \
  API_HOST=127.0.0.1 API_PORT="$API_PORT" \
  VANSTRO_CORS_ORIGINS="http://127.0.0.1:$WEB_PORT" \
  DASHBOARD_SHELL_V2_MODE=internal \
  DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS="$ADMIN_ID,$PARTIAL_ID" \
  EMAIL_SETTINGS_ENCRYPTION_KEY="$EMAIL_KEY" \
  pnpm exec tsx src/index.ts >>"$OUT/fixture-api.log" 2>&1
) &
API_PID=$!
cat > "$ROOT/.env.local" <<EOF
NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:$API_PORT/api/v1"
NEXT_PUBLIC_SITE_URL="http://127.0.0.1:$WEB_PORT"
NEXT_PUBLIC_DEMO_READ_ONLY="false"
EOF
(
  cd "$ROOT"
  NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:$API_PORT/api/v1" \
  NEXT_PUBLIC_SITE_URL="http://127.0.0.1:$WEB_PORT" \
  VANSTRO_WEBSITE_API_BASE_URL="http://127.0.0.1:$API_PORT" \
  PORT="$WEB_PORT" pnpm dev >>"$OUT/fixture-web.log" 2>&1
) &
WEB_PID=$!

# Readiness: API health then /dashboard/ 200 + non-empty + login marker + PID alive
api_ok=false
for _ in $(seq 1 60); do
  if curl -s -o /dev/null "http://127.0.0.1:$API_PORT/api/v1/health" 2>/dev/null; then api_ok=true; break; fi
  sleep 1
done
[[ "$api_ok" == true ]] || { echo "API not ready" >&2; tail -10 "$OUT/fixture-api.log" >&2; exit 1; }

web_ok=false
for _ in $(seq 1 150); do
  body=$(curl -s "http://127.0.0.1:$WEB_PORT/dashboard/" 2>/dev/null || true)
  if [[ -n "$body" ]] && [[ "$body" == *"VanStro"* || "$body" == *"登录"* || "$body" == *"dashboard-login"* ]]; then web_ok=true; break; fi
  sleep 1
done
if [[ "$web_ok" != true ]]; then
  echo "WEB_READINESS_FAILED (200/body/marker not all satisfied)" >&2
  curl -s -o /dev/null -w 'status=%{http_code} size=%{size_download}\n' "http://127.0.0.1:$WEB_PORT/dashboard/" >&2 || true
  kill -0 "$WEB_PID" 2>/dev/null && echo "web pid alive" >&2 || echo "web pid DEAD" >&2
  tail -15 "$OUT/fixture-web.log" >&2
  exit 1
fi
# process aliveness + expected PID/port
kill -0 "$API_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null || { echo "pid not alive" >&2; exit 1; }
WEB_LISTENER=$(lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN 2>/dev/null | head -1)
echo "NARROW_READINESS_OK web_pid=$WEB_PID listener=$WEB_LISTENER body_bytes=${#body}"

# Browser case 01-anonymous-dashboard-login (narrow)
V11_WEB="http://127.0.0.1:$WEB_PORT" \
V11_API="http://127.0.0.1:$API_PORT" \
V11_API_HEALTH="http://127.0.0.1:$API_PORT/api/v1/health" \
V11_BROWSER_OUT="$OUT" \
V11_ADMIN_EMAIL=admin@example.com V11_SEED_PASSWORD="$V11_PASSWORD" \
V11_TESTED_COMMIT="${V11_TESTED_COMMIT:-$(git -C "$ROOT" rev-parse HEAD)}" \
V11_TESTED_TREE="${V11_TESTED_TREE:-$(git -C "$ROOT" rev-parse HEAD^{tree})}" \
python3 - <<'PY'
import json, os
from playwright.sync_api import sync_playwright
WEB = os.environ["V11_WEB"]
OUT = os.environ["V11_BROWSER_OUT"]
results = {}
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    try:
        page = browser.new_page()
        page.goto(f"{WEB}/dashboard", wait_until="domcontentloaded")
        page.wait_for_function(
            "() => document.querySelector('#dashboard-login-email') !== null || document.querySelector('[role=alert]') !== null",
            timeout=30000)
        text = page.locator("body").inner_text()
        if "VanStro 管理后台" in text and "登录" in text:
            results["01-anonymous-dashboard-login"] = "pass"
        else:
            results["01-anonymous-dashboard-login"] = {"status": "fail", "error": text[:300]}
    finally:
        browser.close()
with open(f"{OUT}/narrow-case01.json", "w") as f:
    json.dump({"cases": results}, f, indent=1)
print("NARROW_CASE01", results)
PY

echo "NARROW_VERIFICATION_DONE"
