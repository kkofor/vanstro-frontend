#!/usr/bin/env bash
# V11-R1 P4 standalone run — DB fixture + ACL + seed + API + web + P4 acceptance.
# Standalone because the full harness keeps hitting a Docker postmaster exit in
# the late segments; P0-P3 regressions were already proven on the same tree.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${V11_R1_P4_OUT:-"$ROOT/tasks/evidence/v11-r1-p4"}"
mkdir -p "$OUT"
NODE_BIN=${V11_NODE_BIN:-node}
IMAGE=${VANSTRO_TEST_POSTGRES_IMAGE:-postgres:16-bookworm}
CONTAINER="vanstro-v11-r1-p4-pg"
WEB_PORT=${V11_WEB_PORT:-4564}
API_PORT=${V11_API_PORT:-4565}
DATABASE_NAME=${V11_DATABASE_NAME:-vanstro_v11_auth_fixture}
DATABASE_PASSWORD=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
V11_PASSWORD="V11-$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')"
SUPER_PASSWORD="T-$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')"
CALLBACK_SECRET=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
API_PID=""
WEB_PID=""

cleanup() {
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "$WEB_PID" ]] && kill "$WEB_PID" 2>/dev/null || true
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$DATABASE_PASSWORD" -e POSTGRES_DB="$DATABASE_NAME" -p 127.0.0.1::5432 "$IMAGE" >/dev/null
ready=false
for _ in $(seq 1 60); do
  if docker exec -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" pg_isready -U postgres -d "$DATABASE_NAME" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
[[ "$ready" == true ]] || { echo "pg not ready" >&2; exit 1; }
PORT=$(docker port "$CONTAINER" 5432/tcp | sed 's/.*://')
DATABASE_URL="postgresql://postgres:${DATABASE_PASSWORD}@127.0.0.1:${PORT}/${DATABASE_NAME}?schema=public"

export PATH="$HOME/.local/bin:$PATH"
export V11_NODE_BIN="$NODE_BIN"
pnpm --dir "$ROOT/packages/db" exec prisma generate --schema prisma/schema.prisma >/dev/null
pnpm --dir "$ROOT/packages/db" build >/dev/null
DATABASE_URL="$DATABASE_URL" pnpm --dir "$ROOT/packages/db" exec prisma db push --schema prisma/schema.prisma --skip-generate >/dev/null

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

# The API readiness probe requires the source-latest migration record; db push
# does not create the migrations table, so record the applied source baseline.
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<'SQL2' >/dev/null
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
SQL2

DATABASE_URL="$DATABASE_URL" \
  VANSTRO_RUNTIME_MODE=test \
  ALLOW_DEMO_SEED=true \
  SUPER_ADMIN_EMAIL=admin@vanstro.test \
  SUPER_ADMIN_PASSWORD="$SUPER_PASSWORD" \
  pnpm --dir "$ROOT/packages/db" db:seed >/dev/null

V11_ADMIN_EMAIL="${V11_ADMIN_EMAIL:-admin@example.com}" \
V11_CUSTOMER_EMAIL="${V11_CUSTOMER_EMAIL:-customer@example.com}" \
V11_NODASH_EMAIL="${V11_NODASH_EMAIL:-nodash@example.com}" \
V11_PARTIAL_EMAIL="${V11_PARTIAL_EMAIL:-partial@example.com}" \
V11_SEED_PASSWORD="$V11_PASSWORD" \
ALLOW_V11_AUTH_SEED=true \
VANSTRO_TEST_SETUP_DATABASE_URL="$DATABASE_URL" \
V11_MB01_CATALOG_PATH="$ROOT/src/lib/data/mb01-products.ts" \
DATABASE_URL="$DATABASE_URL" \
pnpm --dir "$ROOT/packages/db" exec tsx "$HERE/seed-v11-auth.mts" >"$OUT/seed.json"

ADMIN_ID=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).admin.id)' "$OUT/seed.json")
PARTIAL_ID=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).partialAdmin.id)' "$OUT/seed.json")
EMAIL_KEY=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))')
JOB_KEYSET_JSON=$("$NODE_BIN" -e 'const k=require("node:crypto").randomBytes(32).toString("base64url");process.stdout.write(JSON.stringify({activeKid:"k1",keys:[{kid:"k1",key:k,mode:"active"}]}))')
CURSOR_KEYSET_JSON=$("$NODE_BIN" -e 'const k=require("node:crypto").randomBytes(32).toString("base64url");process.stdout.write(JSON.stringify({activeKid:"c1",keys:[{kid:"c1",key:k,mode:"active"}]}))')
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
  DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS="$ADMIN_ID,$PARTIAL_ID" \
  DASHBOARD_ASYNC_JOB_FOUNDATION_READY=true \
  ASYNC_JOB_IDEMPOTENCY_KEYS="$JOB_KEYSET_JSON" \
  DASHBOARD_QUERY_CURSOR_KEYS="$CURSOR_KEYSET_JSON" \
  EMAIL_SETTINGS_ENCRYPTION_KEY="$EMAIL_KEY" \
  pnpm exec tsx src/index.ts >>"$OUT/fixture-api.log" 2>&1
) &
API_PID=$!
sleep 1
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
  PORT="$WEB_PORT" \
  pnpm dev >>"$OUT/fixture-web.log" 2>&1
) &
WEB_PID=$!

for _ in $(seq 1 90); do
  curl -fsS "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null || { echo "api not ready" >&2; tail -20 "$OUT/fixture-api.log" >&2; exit 1; }
for _ in $(seq 1 120); do
  curl -fsS "http://127.0.0.1:$WEB_PORT/dashboard" >/dev/null 2>&1 && break
  sleep 1
done

V11_WEB="http://127.0.0.1:$WEB_PORT" \
V11_API="http://127.0.0.1:$API_PORT" \
V11_API_HEALTH="http://127.0.0.1:$API_PORT/api/v1/health" \
V11_BROWSER_OUT="$OUT" \
V11_ADMIN_EMAIL="${V11_ADMIN_EMAIL:-admin@example.com}" \
V11_SEED_PASSWORD="$V11_PASSWORD" \
V11_TESTED_COMMIT="${V11_TESTED_COMMIT:-$(git -C "$ROOT" rev-parse HEAD)}" \
V11_TESTED_TREE="${V11_TESTED_TREE:-$(git -C "$ROOT" rev-parse HEAD^{tree})}" \
python3 "$HERE/v11-r1-p4-batch-acceptance.py"
