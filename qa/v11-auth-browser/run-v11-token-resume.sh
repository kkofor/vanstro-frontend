#!/usr/bin/env bash
# V11-2 Dashboard Authentication & Session — real Backend browser harness.
#
# Creates a disposable PostgreSQL 16 container, builds the schema (prisma db
# push + the f1_v15 auth/ACL function layer), seeds a synthetic super admin
# (db:seed) plus synthetic customer / no-dashboard admin actors
# (seed-v11-auth.mts), starts the real VanStro API and the Next.js dev
# server, runs the Playwright acceptance matrix, then destroys everything.
# Credentials exist only in this process; never real accounts or persistent
# databases.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WEB_PORT=${V11_WEB_PORT:-4564}
API_PORT=${V11_API_PORT:-4565}
OUT=${V11_BROWSER_OUT:-"$ROOT/tasks/evidence/v11-auth-browser"}
IMAGE=${VANSTRO_TEST_POSTGRES_IMAGE:-postgres:16-bookworm}
CONTAINER=${V11_POSTGRES_CONTAINER:-"vanstro-v11-auth-pg16-${$}"}
DATABASE_NAME=${V11_DATABASE_NAME:-vanstro_v11_auth_fixture}
TESTED_COMMIT=${V11_TESTED_COMMIT:-$(git -C "$ROOT" rev-parse HEAD)}
TESTED_TREE=${V11_TESTED_TREE:-$(git -C "$ROOT" rev-parse 'HEAD^{tree}')}
mkdir -p "$OUT"
NEXT_ENV_BACKUP=$(mktemp)
cp "$ROOT/next-env.d.ts" "$NEXT_ENV_BACKUP"

NODE_BIN=${V11_NODE_BIN:-node}
NODE_MAJOR=$("$NODE_BIN" -p 'process.versions.node.split(`.`)[0]')
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  printf 'V11 auth browser harness requires Node >= 22 (found %s). Set V11_NODE_BIN to a Node 22 binary.\n' "$NODE_MAJOR" >&2
  exit 1
fi

DATABASE_PASSWORD=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
SUPER_PASSWORD="T-$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
CALLBACK_SECRET=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
V11_PASSWORD="V11-$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')"
V11_ADMIN_EMAIL="v11-admin-${$}@vanstro.test"
V11_CUSTOMER_EMAIL="v11-customer-${$}@vanstro.test"
V11_NODASH_EMAIL="v11-nodash-${$}@vanstro.test"
V11_PARTIAL_EMAIL="v11-partial-${$}@vanstro.test"
V11_READER_EMAIL="v11-reader-${$}@vanstro.test"
API_PID=""
WEB_PID=""

cleanup() {
  if [[ -n "${WATCHDOG_PID:-}" ]]; then kill "$WATCHDOG_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${API_PID:-}" ]]; then kill "$API_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${WEB_PID:-}" ]]; then kill "$WEB_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${API_PID:-}" ]]; then wait "$API_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${WEB_PID:-}" ]]; then wait "$WEB_PID" >/dev/null 2>&1 || true; fi
  # SIGTERM the real port owners first (the recorded PIDs are the pnpm
  # wrapper chain, not the listeners), then give them a grace window;
  # SIGKILL whatever survives so no fixture process can leak past the run.
  lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
  lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
  for _ in $(seq 1 15); do
    if ! lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN >/dev/null 2>&1 && ! lsof -tiTCP:"$API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then break; fi
    sleep 1
  done
  lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill -9 >/dev/null 2>&1 || true
  lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill -9 >/dev/null 2>&1 || true
  # Postgres declares /var/lib/postgresql/data as VOLUME. Always remove the
  # fixture container with -v so its anonymous data volume cannot survive.
  docker stop --time 15 "$CONTAINER" >/dev/null 2>&1 || docker rm -f -v "$CONTAINER" >/dev/null 2>&1 || true
  docker rm -f -v "$CONTAINER" >/dev/null 2>&1 || true
  rm -f "$ROOT/.env.local" "${API_PID_FILE:-}"
  if [[ -f "$NEXT_ENV_BACKUP" ]]; then cp "$NEXT_ENV_BACKUP" "$ROOT/next-env.d.ts"; rm -f "$NEXT_ENV_BACKUP"; fi
  unset DATABASE_PASSWORD SUPER_PASSWORD CALLBACK_SECRET V11_PASSWORD
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Deterministic dev build: kill leaked servers holding .next, clear outputs.
lsof +D "$ROOT/.next" -t 2>/dev/null | xargs kill >/dev/null 2>&1 || true
lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
sleep 1
rm -rf "$ROOT/.next" 2>/dev/null || true

docker run -d --rm --name "$CONTAINER" \
  -e POSTGRES_PASSWORD="$DATABASE_PASSWORD" \
  -e POSTGRES_DB="$DATABASE_NAME" \
  -p 127.0.0.1::5432 \
  "$IMAGE" >/dev/null
ready=false
if [[ "${V11_CONTAINER_CLEANUP_PROBE:-}" != "ready-failure" ]]; then
  for _ in $(seq 1 60); do
    if docker exec -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
      pg_isready -U postgres -d "$DATABASE_NAME" >/dev/null 2>&1; then
      ready=true
      break
    fi
    sleep 1
  done
fi
if [[ "$ready" != true ]]; then
  printf 'V11 auth PostgreSQL fixture did not become ready\n' >&2
  exit 1
fi
case "${V11_CONTAINER_CLEANUP_PROBE:-}" in
  success) exit 0 ;;
  nonzero) exit 42 ;;
  wait)
    printf 'V11 cleanup probe ready: %s\n' "$CONTAINER"
    while true; do sleep 1; done
    ;;
esac

PORT=$(docker port "$CONTAINER" 5432/tcp | sed 's/.*://')
DATABASE_URL="postgresql://postgres:${DATABASE_PASSWORD}@127.0.0.1:${PORT}/${DATABASE_NAME}?schema=public"

rm -rf "$ROOT/node_modules/.pnpm/@prisma+client@6.19.0_prisma@6.19.0_typescript@6.0.3__typescript@6.0.3/node_modules/.prisma/client" 2>/dev/null || true
pnpm --dir "$ROOT/packages/db" exec prisma generate --schema prisma/schema.prisma >/dev/null
pnpm --dir "$ROOT/packages/db" build >/dev/null
DATABASE_URL="$DATABASE_URL" pnpm --dir "$ROOT/packages/db" exec prisma db push \
  --schema prisma/schema.prisma --skip-generate >/dev/null


# Runtime ACL bootstrap (roles/extensions/indexes/guard owners) — the exact
# surface the regular PG16 harness provisions before its migration layers.
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<'SQL' >/dev/null
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE vanstro_media_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE UNIQUE INDEX IF NOT EXISTS audit_events_dedup_unique ON audit_events("eventVersion",source,"idempotencyKeyHash") WHERE "idempotencyKeyHash" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS async_jobs_jobType_idempotencyKeyHash_key ON async_jobs("jobType","idempotencyKeyHash") WHERE "idempotencyKeyHash" IS NOT NULL;
CREATE OR REPLACE FUNCTION public.auth_admin_revoke_user_sessions_v1(session_token_hash text,expected_actor_id text,target_user_id text) RETURNS bigint LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$ DECLARE context jsonb;n bigint;BEGIN context:=public.p02_dashboard_authorization_context_v1(session_token_hash,expected_actor_id);IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(context->'permissionGrants') g WHERE g->>'permissionKey'='sessions.revoke' AND (g->>'global')::boolean) THEN RAISE EXCEPTION 'AUTH_SESSION_REVOKE_DENIED' USING ERRCODE='42501';END IF;UPDATE public.refresh_sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE "userId"=target_user_id AND "revokedAt" IS NULL;GET DIAGNOSTICS n=ROW_COUNT;RETURN n;END $fn$;
CREATE FUNCTION public.p09_worker_observation_v3()
RETURNS TABLE(active_count bigint,draining_count bigint,shutdown_count bigint,stale_count bigint,total_capacity bigint,latest_succeeded_at timestamptz,latest_failed_at timestamptz,latest_error_code text,observed_at timestamptz)
LANGUAGE sql STABLE AS $$ SELECT 0::bigint,0::bigint,0::bigint,0::bigint,0::bigint,NULL::timestamptz,NULL::timestamptz,NULL::text,CURRENT_TIMESTAMP $$;
CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT vanstro_media_guard_owner TO vanstro_migrator;
CREATE ROLE vanstro_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_worker_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p02_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p04_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p09_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner;
GRANT SELECT ON refresh_sessions,users,user_roles,roles,role_permissions,permissions,dealer_memberships,dealer_membership_roles,dealer_membership_locations,dealers,dealer_locations TO vanstro_p02_guard_owner;
GRANT SELECT,INSERT ON audit_events TO vanstro_p04_guard_owner;
GRANT USAGE,CREATE ON SCHEMA public TO vanstro_p09_guard_owner;
GRANT SELECT,INSERT,UPDATE ON runtime_config_version,feature_flag_version TO vanstro_p09_guard_owner;
GRANT INSERT ON audit_events TO vanstro_p09_guard_owner;
GRANT SELECT ON privacy_consent_events TO vanstro_p10_guard_owner;
GRANT vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner TO vanstro_migrator;
SQL

# Auth/ACL function layer (auth challenge/session/rotation, P02 authorization
# context, P04 audit, P09/P10 ACLs) — applied as the superuser exactly like
# the regular PG16 harness.
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" \
  < "$ROOT/packages/db/prisma/migrations/20260804130000_f1_v15_runtime_acl_closure/migration.sql" >/dev/null

# Runtime role table/sequence access (mirrors the regular PG16 harness): the
# settings functions are SECURITY DEFINER but the runtime role still needs the
# underlying settings tables (runtime_config_version, settings_command_ledger,
# s01_settings_publication_event) for the settings read paths.
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<'SQL' >/dev/null
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO vanstro_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO vanstro_runtime;
SQL

# S08 settings function layer (settings.api-service-account) — applied the same
# way the regular PG16 harness does, because `prisma db push` builds the tables
# but not the settings SQL function/trigger/grant layer.
node "$ROOT/scripts/s01-function-layer.mjs" "$ROOT/packages/db/prisma/migrations/20260808000000_s08_api_service_accounts/migration.sql" | \
  docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" >/dev/null

# S08 settings functions are SECURITY DEFINER owned by vanstro_p09_guard_owner
# and call the P02 authorization context; the guard owner needs EXECUTE on the
# P02 context function (mirrors the regular PG16 harness grant layer).
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<'SQL' >/dev/null
GRANT EXECUTE ON FUNCTION public.p02_dashboard_authorization_context_v1(text,text) TO vanstro_p09_guard_owner;
GRANT SELECT,INSERT ON public.s01_settings_publication_event TO vanstro_p09_guard_owner;
GRANT SELECT,INSERT,UPDATE ON public.settings_command_ledger TO vanstro_p09_guard_owner;
SQL

# The API readiness probe requires the source-latest migration record; db push
# does not create the migrations table, so record the applied source baseline.
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<'SQL' >/dev/null
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

# Super admin (dashboard.access + all canonical grants) with a real password.
DATABASE_URL="$DATABASE_URL" \
  VANSTRO_RUNTIME_MODE=test \
  ALLOW_DEMO_SEED=true \
  SUPER_ADMIN_EMAIL=admin@vanstro.test \
  SUPER_ADMIN_PASSWORD="$SUPER_PASSWORD" \
  pnpm --dir "$ROOT/packages/db" db:seed >/dev/null

# Synthetic customer + no-dashboard admin (password-based login actors).
V11_ADMIN_EMAIL="$V11_ADMIN_EMAIL" \
V11_CUSTOMER_EMAIL="$V11_CUSTOMER_EMAIL" \
V11_NODASH_EMAIL="$V11_NODASH_EMAIL" \
V11_PARTIAL_EMAIL="$V11_PARTIAL_EMAIL" \
V11_READER_EMAIL="$V11_READER_EMAIL" \
V11_SEED_PASSWORD="$V11_PASSWORD" \
ALLOW_V11_AUTH_SEED=true \
VANSTRO_TEST_SETUP_DATABASE_URL="$DATABASE_URL" \
V11_MB01_CATALOG_PATH="$ROOT/src/lib/data/mb01-products.ts" \
DATABASE_URL="$DATABASE_URL" \
pnpm --dir "$ROOT/packages/db" exec tsx "$HERE/seed-v11-auth.mts" >"$OUT/seed.json"

ADMIN_ID=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).admin.id)' "$OUT/seed.json")
PARTIAL_ID=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).partialAdmin.id)' "$OUT/seed.json")
READER_ID=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).reader.id)' "$OUT/seed.json")

# Real API server (test mode, cookie sessions, internal Dashboard shell).
# The API is launched through a watchdog so the acceptance matrix can restart
# it once (SIGTERM) after case 13 (the 8th login): the real auth rate limit
# (10 logins / 15 min per IP) lives in the API's in-process bucket and the
# 20-case matrix performs 16 logins (including the case-13 re-login after
# server-side session revocation). Sessions live in the DB, so a restart
# invalidates nothing; the watchdog relaunches the API with the same env and
# records the fresh PID in $API_PID_FILE for cleanup and the acceptance env.
JOB_KEYSET_JSON=$("$NODE_BIN" -e 'const k=require("node:crypto").randomBytes(32).toString("base64url");process.stdout.write(JSON.stringify({activeKid:"k1",keys:[{kid:"k1",key:k,mode:"active"}]}))')
CURSOR_KEYSET_JSON=$("$NODE_BIN" -e 'const k=require("node:crypto").randomBytes(32).toString("base64url");process.stdout.write(JSON.stringify({activeKid:"c1",keys:[{kid:"c1",key:k,mode:"active"}]}))')
API_PID_FILE="$OUT/api.pid"
launch_api() {
  # The acceptance matrix may have killed the API port holder directly; any
  # orphaned pnpm/tsx chain from a previous launch must release the port
  # before a fresh instance can listen (EADDRINUSE guard).
  lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
  sleep 1
  (
    cd "$ROOT/apps/api"
    DATABASE_URL="$DATABASE_URL" \
    VANSTRO_RUNTIME_MODE=test \
    PAYMENT_CALLBACK_SECRET="$CALLBACK_SECRET" \
    ENABLE_PAYMENT_SIMULATION=true \
    API_HOST=127.0.0.1 \
    API_PORT="$API_PORT" \
    VANSTRO_CORS_ORIGINS="http://127.0.0.1:$WEB_PORT" \
    DASHBOARD_SHELL_V2_MODE=internal \
    DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS="$ADMIN_ID,$PARTIAL_ID,$READER_ID" \
    DASHBOARD_ASYNC_JOB_FOUNDATION_READY=true \
    ASYNC_JOB_IDEMPOTENCY_KEYS="$JOB_KEYSET_JSON" \
    DASHBOARD_QUERY_CURSOR_KEYS="$CURSOR_KEYSET_JSON" \
    pnpm exec tsx src/index.ts >>"$OUT/fixture-api.log" 2>&1
  ) &
  echo $! > "$API_PID_FILE"
}
: > "$OUT/fixture-api.log"
launch_api
API_PID=$(cat "$API_PID_FILE")
(
  while true; do
    sleep 1
    if ! kill -0 "$(cat "$API_PID_FILE" 2>/dev/null)" 2>/dev/null; then
      launch_api
    fi
  done
) &
WATCHDOG_PID=$!

# Between acceptance files: restart the API once to reset the in-process
# auth rate-limit bucket (10 logins / 15 min per IP). Every acceptance file
# is designed around its own fresh 10-login window (files with more logins
# carry their own mid-file reset); without a restart here the previous
# file's tail leaks into the next file's window and the 11th combined login
# 429s. Sessions live in the DB, so the restart invalidates nothing; the
# watchdog relaunches the API and records the fresh PID in $API_PID_FILE.
restart_api_window() {
  lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
  local down=false
  for _ in $(seq 1 30); do
    if ! curl -fsS "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null 2>&1; then down=true; break; fi
    sleep 0.5
  done
  if [[ "$down" != true ]]; then
    lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill -9 >/dev/null 2>&1 || true
    for _ in $(seq 1 30); do
      if ! curl -fsS "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null 2>&1; then down=true; break; fi
      sleep 0.5
    done
  fi
  if [[ "$down" != true ]]; then
    printf 'restart_api_window: API never went down between acceptance files\n' >&2
    return 1
  fi
  for _ in $(seq 1 120); do
    if curl -fsS "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null 2>&1; then return 0; fi
    sleep 0.5
  done
  printf 'restart_api_window: API did not come back up between acceptance files\n' >&2
  return 1
}
# Next.js dev server whose client resolves the API at the fixture origin.
cat > "$ROOT/.env.local" <<EOF
NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:$API_PORT/api/v1"
NEXT_PUBLIC_SITE_URL="http://127.0.0.1:$WEB_PORT"
NEXT_PUBLIC_DEMO_READ_ONLY="false"
EOF
(
  cd "$ROOT"
  NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:$API_PORT/api/v1" \
  NEXT_PUBLIC_SITE_URL="http://127.0.0.1:$WEB_PORT" \
  VANSTRO_WEBSITE_API_BASE_URL="http://127.0.0.1:$API_PORT/api/v1" \
  PORT="$WEB_PORT" \
  pnpm dev >"$OUT/fixture-web.log" 2>&1
) &
WEB_PID=$!

for _ in $(seq 1 60); do
  if curl -s -o /dev/null "http://127.0.0.1:$API_PORT/api/v1/health"; then break; fi
  sleep 0.5
done
for _ in $(seq 1 120); do
  if curl -s -o /dev/null "http://127.0.0.1:$WEB_PORT/dashboard/login"; then break; fi
  sleep 0.5
done

V11_WEB="http://127.0.0.1:$WEB_PORT" \
V11_API="http://127.0.0.1:$API_PORT" \
V11_API_PID="$(cat "$API_PID_FILE")" \
V11_API_HEALTH="http://127.0.0.1:$API_PORT/api/v1/health" \
V11_BROWSER_OUT="$OUT" \
V11_ADMIN_EMAIL="$V11_ADMIN_EMAIL" \
V11_CUSTOMER_EMAIL="$V11_CUSTOMER_EMAIL" \
V11_NODASH_EMAIL="$V11_NODASH_EMAIL" \
V11_PARTIAL_EMAIL="$V11_PARTIAL_EMAIL" \
V11_SEED_PASSWORD="$V11_PASSWORD" \
V11_TESTED_COMMIT="$TESTED_COMMIT" \
V11_TESTED_TREE="$TESTED_TREE" \
python3 "$HERE/${V11_ACCEPTANCE_SCRIPT:-v11-token-resume-acceptance.py}"

printf 'V11 token/resume disposable PostgreSQL 16 browser gate passed\n'
