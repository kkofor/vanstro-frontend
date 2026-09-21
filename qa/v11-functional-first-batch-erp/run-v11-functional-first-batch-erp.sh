#!/usr/bin/env bash
# V11-R1 functional-first F4 — batch kinds + ERP v1 real-backend acceptance.
# Runs a disposable PG16 fixture + the real API process and drives the case
# matrix in v11-functional-first-batch-erp-acceptance.py (real API, no mocks).
# Reuses the P4/P6 startup chain (db push + f1 ACL bootstrap + runtime ACL
# closure + S08 SA migration + demo seed + v11 auth seed + SA token insert).
# Evidence persists to $OUT/acceptance-results.json; no credentials or tokens
# are stored (logs are redacted, seed/keysets stay in process memory).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${V11_BATCHERP_OUT:-$ROOT/tasks/evidence/v11-r1-functional-first-batch-erp}"
NODE_BIN=${V11_NODE_BIN:-node}
CONTAINER="vanstro-v11-batcherp-pg"
API_PORT=${V11_BATCHERP_API_PORT:-4566}
DATABASE_NAME=vanstro_v11_auth_fixture
DATABASE_PASSWORD=$($NODE_BIN -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
V11_PASSWORD="V11-$($NODE_BIN -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')"
SUPER_PASSWORD="T-$($NODE_BIN -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')"
JOB_KEYSET_JSON=$($NODE_BIN -e 'const k=require("node:crypto").randomBytes(32).toString("base64url");process.stdout.write(JSON.stringify({activeKid:"k1",keys:[{kid:"k1",key:k,mode:"active"}]}))')
CURSOR_KEYSET_JSON=$($NODE_BIN -e 'const k=require("node:crypto").randomBytes(32).toString("base64url");process.stdout.write(JSON.stringify({activeKid:"c1",keys:[{kid:"c1",key:k,mode:"active"}]}))')
EMAIL_KEY=$($NODE_BIN -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))')
API_PID=""
SEED_FILE=$(mktemp)
API_LOG=$(mktemp)

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then kill "$API_PID" >/dev/null 2>&1 || true; fi
  [[ -n "${API_PID:-}" ]] && wait "$API_PID" >/dev/null 2>&1 || true
  listeners=$(lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null || true)
  [[ -z "$listeners" ]] || kill $listeners >/dev/null 2>&1 || true
  sleep 2
  listeners=$(lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null || true)
  [[ -z "$listeners" ]] || kill -KILL $listeners >/dev/null 2>&1 || true
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if [[ -n "${API_LOG:-}" && -f "$API_LOG" ]]; then
    sed -E 's#postgresql://[^ @/]+:[^ @/]*@#postgresql://***@#g; s#(PGPASSWORD|POSTGRES_PASSWORD|DATABASE_PASSWORD)=([^ ]+)#\1=***#g' "$API_LOG" > "$OUT/api.log"
  fi
  rm -f "$SEED_FILE" "$API_LOG"
}
trap cleanup EXIT

mkdir -p "$OUT"
if lsof -tiTCP:"$API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "batch-erp API port already in use" >&2
  exit 1
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$DATABASE_PASSWORD" -e POSTGRES_DB="$DATABASE_NAME" -p 127.0.0.1::5432 postgres:16-bookworm >/dev/null
ready=false
for _ in $(seq 1 60); do
  if docker exec -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" pg_isready -U postgres -d "$DATABASE_NAME" >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || { echo "batch-erp postgres not ready" >&2; exit 1; }
PORT=$(docker port "$CONTAINER" 5432/tcp | sed 's/.*://')
export DATABASE_URL="postgresql://postgres:${DATABASE_PASSWORD}@127.0.0.1:${PORT}/${DATABASE_NAME}?schema=public"
export PATH="$HOME/.local/bin:$PATH"
export V11_NODE_BIN="$NODE_BIN"

pnpm --dir "$ROOT/packages/db" exec prisma db push --schema prisma/schema.prisma --skip-generate >/dev/null 2>&1
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -U postgres -d "$DATABASE_NAME" < "$ROOT/qa/v11-auth-browser/f1-acl-bootstrap.sql" >/dev/null 2>&1 || true
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -U postgres -d "$DATABASE_NAME" < "$ROOT/packages/db/prisma/migrations/20260804130000_f1_v15_runtime_acl_closure/migration.sql" >/dev/null 2>&1 || true
node "$ROOT/scripts/s01-function-layer.mjs" "$ROOT/packages/db/prisma/migrations/20260808000000_s08_api_service_accounts/migration.sql" | docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" >/dev/null
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<'SQL' >/dev/null
-- Replicate the real migration chain's grants to vanstro_p09_guard_owner
-- (settings_command_ledger/audit_events etc. are postgres-owned after db push,
-- so the SECURITY DEFINER settings functions need the same table privileges
-- the s01/s02 migrations grant in a migrate-deployed database).
GRANT SELECT, INSERT, UPDATE ON TABLE public.runtime_config_version, public.feature_flag_version TO vanstro_p09_guard_owner;
GRANT INSERT ON TABLE public.audit_events TO vanstro_p09_guard_owner;
GRANT SELECT,INSERT,UPDATE ON public.settings_command_ledger TO vanstro_p09_guard_owner;
GRANT SELECT,INSERT ON TABLE public.s01_settings_publication_event TO vanstro_p09_guard_owner;
GRANT SELECT ON TABLE public.runtime_config_version,public.settings_command_ledger,public.s01_settings_publication_event TO vanstro_p09_guard_owner;
SQL
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<'SQL' >/dev/null
GRANT SELECT ON TABLE public.runtime_config_version,public.settings_command_ledger,public.s01_settings_publication_event TO vanstro_p09_guard_owner;
REVOKE ALL ON FUNCTION public.s08_settings_authorize_v2(text,text,boolean),public.s08_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s08_settings_ledger_v1(text,text,text,text),public.s08_settings_value_shape_valid(jsonb),public.s08_settings_value_business_valid(jsonb) FROM PUBLIC,vanstro_worker_runtime,vanstro_migrator;
GRANT EXECUTE ON FUNCTION public.p02_dashboard_authorization_context_v1(text,text) TO vanstro_p09_guard_owner;
GRANT EXECUTE ON FUNCTION public.s08_settings_rows_v2(text,text),public.s08_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s08_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s08_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s08_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s08_settings_events_v2(text,text) TO vanstro_runtime;
SQL
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

DATABASE_URL="$DATABASE_URL" VANSTRO_RUNTIME_MODE=test ALLOW_DEMO_SEED=true SUPER_ADMIN_EMAIL=admin@vanstro.test SUPER_ADMIN_PASSWORD="$SUPER_PASSWORD" pnpm --dir "$ROOT/packages/db" db:seed >/dev/null 2>&1
V11_ADMIN_EMAIL=admin@example.com V11_CUSTOMER_EMAIL=customer@example.com V11_NODASH_EMAIL=nodash@example.com V11_PARTIAL_EMAIL=partial@example.com V11_SEED_PASSWORD="$V11_PASSWORD" ALLOW_V11_AUTH_SEED=true VANSTRO_TEST_SETUP_DATABASE_URL="$DATABASE_URL" V11_MB01_CATALOG_PATH="$ROOT/src/lib/data/mb01-products.ts" DATABASE_URL="$DATABASE_URL" pnpm --dir "$ROOT/packages/db" exec tsx "$ROOT/qa/v11-auth-browser/seed-v11-auth.mts" >"$SEED_FILE" 2>/dev/null

ADMIN_ID=$($NODE_BIN -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).admin.id)' "$SEED_FILE")
PARTIAL_ID=$($NODE_BIN -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).partialAdmin.id)' "$SEED_FILE")
SERVICE_ACCOUNT_ID=$($NODE_BIN -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).serviceAccount.id)' "$SEED_FILE")
SA_TOKEN="vsa_$($NODE_BIN -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
SA_TOKEN_HASH=$($NODE_BIN -e 'process.stdout.write(require("node:crypto").createHash("sha256").update(process.argv[1]).digest("hex"))' "$SA_TOKEN")
SA_TOKEN_ID=$($NODE_BIN -e 'process.stdout.write(require("node:crypto").randomUUID())')
docker exec -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -U postgres -d "$DATABASE_NAME" -c "INSERT INTO service_account_tokens (id, \"serviceAccountId\", \"tokenHash\", name, \"createdAt\") VALUES ('$SA_TOKEN_ID', '$SERVICE_ACCOUNT_ID', '$SA_TOKEN_HASH', 'batch-erp-evidence', now())" >/dev/null

(
  cd "$ROOT/apps/api"
  DATABASE_URL="$DATABASE_URL" VANSTRO_RUNTIME_MODE=test PAYMENT_CALLBACK_SECRET="callback-$SA_TOKEN_ID" ENABLE_PAYMENT_SIMULATION=true API_HOST=127.0.0.1 API_PORT="$API_PORT" VANSTRO_CORS_ORIGINS="http://127.0.0.1:$API_PORT" DASHBOARD_SHELL_V2_MODE=internal DASHBOARD_SHELL_V2_INTERNAL_ACTOR_IDS="$ADMIN_ID,$PARTIAL_ID" DASHBOARD_ASYNC_JOB_FOUNDATION_READY=true ASYNC_JOB_IDEMPOTENCY_KEYS="$JOB_KEYSET_JSON" DASHBOARD_QUERY_CURSOR_KEYS="$CURSOR_KEYSET_JSON" EMAIL_SETTINGS_ENCRYPTION_KEY="$EMAIL_KEY" pnpm exec tsx src/index.ts >>"$API_LOG" 2>&1
) &
API_PID=$!

api_ok=false
for _ in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null 2>&1; then api_ok=true; break; fi
  sleep 1
done
[[ "$api_ok" == true ]] || { echo "batch-erp API not ready" >&2; exit 1; }

TESTED_COMMIT=$(git -C "$ROOT" rev-parse HEAD)
TESTED_TREE=$(git -C "$ROOT" rev-parse 'HEAD^{tree}')
V11_BATCHERP_API="http://127.0.0.1:$API_PORT" V11_BATCHERP_OUT="$OUT" V11_ADMIN_EMAIL=admin@example.com V11_PARTIAL_EMAIL=partial@example.com V11_SEED_PASSWORD="$V11_PASSWORD" V11_SA_TOKEN="$SA_TOKEN" V11_PG_CONTAINER="$CONTAINER" V11_DB_PASSWORD="$DATABASE_PASSWORD" V11_DB_NAME="$DATABASE_NAME" V11_TESTED_COMMIT="$TESTED_COMMIT" V11_TESTED_TREE="$TESTED_TREE" python3 "$HERE/v11-functional-first-batch-erp-acceptance.py"
echo "BATCH_ERP_EVIDENCE_EXIT=$?"
