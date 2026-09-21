#!/usr/bin/env bash
# V11-R1 Functional First — F4 catalog/dealer closed-loop acceptance harness.
#
# Real-backend acceptance on a disposable PostgreSQL 16 container:
#   1. the promotion status surface accepts only draft|active|archived
#      (API 400 on inactive, UI select without the inactive option);
#   2. dealer locations round-trip through the real Dashboard UI/API:
#      create -> edit -> archive (soft, confirm) -> restore;
#   3. dealer ERP links round-trip: add -> list -> unlink (confirm);
#   4. a dealers.read-only admin sees the data but zero write affordances,
#      and every direct write is 403.
#
# Reuses the run-v11-auth seed (qa/v11-auth-browser/seed-v11-auth.mts) and
# the storefront harness startup chain (db push + ACL bootstrap + runtime ACL
# closure + demo seed). Credentials exist only in this process; no production
# database, no real payment.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WEB_PORT=${V11_CD_WEB_PORT:-4666}
API_PORT=${V11_CD_API_PORT:-4667}
OUT=${V11_CD_OUT:-"$ROOT/tasks/evidence/v11-r1-functional-first-catalog-dealer"}
IMAGE=${VANSTRO_TEST_POSTGRES_IMAGE:-postgres:16-bookworm}
CONTAINER="vanstro-v11-catalogdealer-pg16-${$}"
DATABASE_NAME=${V11_CD_DATABASE_NAME:-vanstro_v11_catalog_dealer_fixture}
TESTED_COMMIT=${V11_TESTED_COMMIT:-$(git -C "$ROOT" rev-parse HEAD)}
TESTED_TREE=${V11_TESTED_TREE:-$(git -C "$ROOT" rev-parse 'HEAD^{tree}')}
mkdir -p "$OUT"

NODE_BIN=${V11_NODE_BIN:-node}
NODE_MAJOR=$("$NODE_BIN" -p 'process.versions.node.split(`.`)[0]')
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  printf 'Catalog/dealer harness requires Node >= 22 (found %s). Set V11_NODE_BIN to a Node 22 binary.\n' "$NODE_MAJOR" >&2
  exit 1
fi

# Deterministic build guard: this harness mutates .next/.env.local and owns
# its ports. Refuse (never kill) when another live harness holds them.
if [[ -e "$ROOT/.env.local" ]]; then
  printf 'Refusing to run: %s/.env.local exists (another harness is live). Remove it or wait for that harness to finish.\n' "$ROOT" >&2
  exit 1
fi
if lsof -tiTCP:"$WEB_PORT" -sTCP:LISTEN >/dev/null 2>&1 || lsof -tiTCP:"$API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  printf 'Refusing to run: ports %s/%s are already in use. Override V11_CD_WEB_PORT/V11_CD_API_PORT.\n' "$WEB_PORT" "$API_PORT" >&2
  exit 1
fi
if lsof +D "$ROOT/.next" -t >/dev/null 2>&1; then
  printf 'Refusing to run: %s/.next is held by another process.\n' "$ROOT" >&2
  exit 1
fi

DATABASE_PASSWORD=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
SUPER_PASSWORD="T-$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
CALLBACK_SECRET=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
CD_PASSWORD="CD-$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')"
CD_ADMIN_EMAIL="cd-admin-${$}@vanstro.test"
CD_PARTIAL_EMAIL="cd-partial-${$}@vanstro.test"
CD_READONLY_EMAIL="cd-readonly-${$}@vanstro.test"
API_PID=""
WEB_PID=""

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then kill "$API_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${WEB_PID:-}" ]]; then kill "$WEB_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${API_PID:-}" ]]; then wait "$API_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${WEB_PID:-}" ]]; then wait "$WEB_PID" >/dev/null 2>&1 || true; fi
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
  unset DATABASE_PASSWORD SUPER_PASSWORD CALLBACK_SECRET CD_PASSWORD
}
trap cleanup EXIT

# Deterministic dev build: clear stale outputs on our own ports only.
rm -rf "$ROOT/.next" 2>/dev/null || true

docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD="$DATABASE_PASSWORD" \
  -e POSTGRES_DB="$DATABASE_NAME" \
  -p 127.0.0.1::5432 \
  "$IMAGE" >/dev/null
ready=false
for _ in $(seq 1 60); do
  if docker exec -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
    pg_isready -U postgres -d "$DATABASE_NAME" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  printf 'Catalog/dealer fixture PostgreSQL did not become ready\n' >&2
  exit 1
fi

PORT=$(docker port "$CONTAINER" 5432/tcp | sed 's/.*://')
DATABASE_URL="postgresql://postgres:${DATABASE_PASSWORD}@127.0.0.1:${PORT}/${DATABASE_NAME}?schema=public"

rm -rf "$ROOT/node_modules/.pnpm/@prisma+client@6.19.0_prisma@6.19.0_typescript@6.0.3__typescript@6.0.3/node_modules/.prisma/client" 2>/dev/null || true
pnpm --dir "$ROOT/packages/db" exec prisma generate --schema prisma/schema.prisma >/dev/null
pnpm --dir "$ROOT/packages/db" build >/dev/null
DATABASE_URL="$DATABASE_URL" pnpm --dir "$ROOT/packages/db" exec prisma db push \
  --schema prisma/schema.prisma --skip-generate >/dev/null

# Runtime ACL bootstrap (roles/extensions/indexes/guard owners) — same surface
# the regular PG16 harness and run-v11-auth.sh provision before migrations.
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

# Auth/ACL function layer — applied as superuser exactly like run-v11-auth.sh.
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" \
  < "$ROOT/packages/db/prisma/migrations/20260804130000_f1_v15_runtime_acl_closure/migration.sql" >/dev/null

# API readiness probe requires the source-latest migration record.
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
SELECT '00000000-0000-4000-8000-000000000079', 'v11-functional-first-catalog-dealer', now(), '20260805100000_s01_settings_core', NULL, now(), 1
WHERE NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name = '20260805100000_s01_settings_core');
SQL

# Super admin (dashboard.access + all canonical grants) with a real password.
DATABASE_URL="$DATABASE_URL" \
  VANSTRO_RUNTIME_MODE=test \
  ALLOW_DEMO_SEED=true \
  SUPER_ADMIN_EMAIL=admin@vanstro.test \
  SUPER_ADMIN_PASSWORD="$SUPER_PASSWORD" \
  pnpm --dir "$ROOT/packages/db" db:seed >/dev/null

# Reused run-v11-auth seed: synthetic admin (full dashboard grants) + partial
# admin (dashboard.access only) + mb01 disposable catalog. Never real accounts.
V11_ADMIN_EMAIL="$CD_ADMIN_EMAIL" \
V11_PARTIAL_EMAIL="$CD_PARTIAL_EMAIL" \
V11_SEED_PASSWORD="$CD_PASSWORD" \
ALLOW_V11_AUTH_SEED=true \
VANSTRO_TEST_SETUP_DATABASE_URL="$DATABASE_URL" \
V11_MB01_CATALOG_PATH="$ROOT/src/lib/data/mb01-products.ts" \
DATABASE_URL="$DATABASE_URL" \
pnpm --dir "$ROOT/packages/db" exec tsx "$ROOT/qa/v11-auth-browser/seed-v11-auth.mts" >"$OUT/seed.json"

# Dealers-read-only admin (dashboard.access + dealers.read, no settings.write):
# the "partial admin" for the F4 control/403 gate. The password hash is
# computed in-process (pbkdf2_sha256, same parameters as packages/db) and
# never persisted as evidence.
RO_HASH=$("$NODE_BIN" -e '
const {pbkdf2Sync, randomBytes} = require("node:crypto");
const password = process.argv[1];
const salt = randomBytes(16).toString("hex");
const hash = pbkdf2Sync(password, salt, 310000, 32, "sha256").toString("hex");
process.stdout.write(JSON.stringify({ salt, hash }));
' "$CD_PASSWORD")
RO_SALT=$("$NODE_BIN" -e 'process.stdout.write(JSON.parse(process.argv[1]).salt)' "$RO_HASH")
RO_PASSWORD_HASH=$("$NODE_BIN" -e 'process.stdout.write(JSON.parse(process.argv[1]).hash)' "$RO_HASH")
RO_ROLE_ID=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomUUID())')
RO_USER_ID=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomUUID())')
RO_USER_ROLE_ID=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomUUID())')
RO_CREDENTIAL_ID=$("$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomUUID())')
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<SQL >/dev/null
INSERT INTO roles (id, key, name, "createdAt", "updatedAt") VALUES ('$RO_ROLE_ID', 'f4-cd-readonly-${$}', 'F4 CD Read-Only', now(), now());
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), '$RO_ROLE_ID', p.id, now() FROM permissions p WHERE p.key IN ('dashboard.access', 'dealers.read');
INSERT INTO users (id, email, kind, status, "createdAt", "updatedAt")
VALUES ('$RO_USER_ID', '$CD_READONLY_EMAIL', 'admin', 'active', now(), now());
INSERT INTO user_roles (id, "userId", "roleId", "createdAt")
VALUES ('$RO_USER_ROLE_ID', '$RO_USER_ID', '$RO_ROLE_ID', now());
INSERT INTO password_credentials (id, "userId", algorithm, "passwordHash", "passwordSalt", iterations, "createdAt", "updatedAt")
VALUES ('$RO_CREDENTIAL_ID', '$RO_USER_ID', 'pbkdf2_sha256', '$RO_PASSWORD_HASH', '$RO_SALT', 310000, now(), now());
SQL

JOB_KEYSET_JSON=$("$NODE_BIN" -e 'const k=require("node:crypto").randomBytes(32).toString("base64url");process.stdout.write(JSON.stringify({activeKid:"k1",keys:[{kid:"k1",key:k,mode:"active"}]}))')
CURSOR_KEYSET_JSON=$("$NODE_BIN" -e 'const k=require("node:crypto").randomBytes(32).toString("base64url");process.stdout.write(JSON.stringify({activeKid:"c1",keys:[{kid:"c1",key:k,mode:"active"}]}))')

# Real API server (test mode, cookie sessions, payment simulation enabled).
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
  DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS="$("$NODE_BIN" -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).admin.id)' "$OUT/seed.json"),$RO_USER_ID" \
  DASHBOARD_ASYNC_JOB_FOUNDATION_READY=true \
  ASYNC_JOB_IDEMPOTENCY_KEYS="$JOB_KEYSET_JSON" \
  DASHBOARD_QUERY_CURSOR_KEYS="$CURSOR_KEYSET_JSON" \
  pnpm exec tsx src/index.ts >>"$OUT/fixture-api.log" 2>&1
) &
API_PID=$!

# Next.js dev server whose client and server fetch resolve the fixture API.
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

V11_CD_API="http://127.0.0.1:$API_PORT" \
V11_CD_WEB="http://127.0.0.1:$WEB_PORT" \
V11_CD_OUT="$OUT" \
V11_CD_SEED="$OUT/seed.json" \
V11_CD_ADMIN_EMAIL="$CD_ADMIN_EMAIL" \
V11_CD_READONLY_EMAIL="$CD_READONLY_EMAIL" \
V11_CD_PASSWORD="$CD_PASSWORD" \
V11_TESTED_COMMIT="$TESTED_COMMIT" \
V11_TESTED_TREE="$TESTED_TREE" \
python3 "$HERE/v11-functional-first-catalog-dealer-acceptance.py"

printf 'Catalog/dealer closed-loop disposable PostgreSQL 16 gate passed\n'
