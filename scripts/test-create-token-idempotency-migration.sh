#!/usr/bin/env bash
set -euo pipefail
# Migration-specific gate for 20260814000000_create_token_idempotency.
# Proves the migration SQL actually runs on a pre-migration baseline and that
# the partial unique index is created with the exact key columns + predicate
# (something `prisma db push` cannot demonstrate). Also proves NULL-key
# coexistence, cross-account key sharing, and same-account same-key conflict.
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CONTAINER="vanstro-create-idem-migration-$$"
DB="create_idem_gate"
PASSWORD=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$PASSWORD" -e POSTGRES_DB="$DB" -p 127.0.0.1::5432 postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do
  if docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" pg_isready -U postgres -d "$DB" >/dev/null 2>&1; then break; fi
  sleep 1
done

psql() { docker exec -i -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DB" "$@"; }

# Pre-migration baseline: service_account_tokens WITHOUT createIdempotencyKey.
psql <<'SQL' >/dev/null
CREATE TABLE service_account_tokens (
  "id" text PRIMARY KEY,
  "serviceAccountId" text NOT NULL,
  "tokenHash" text NOT NULL UNIQUE,
  "name" text,
  "expiresAt" timestamptz,
  "revokedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
SQL

# Actually execute the migration SQL.
psql < "$ROOT/packages/db/prisma/migrations/20260814000000_create_token_idempotency/migration.sql" >/dev/null

# Catalog assertions on the partial unique index.
DEF=$(docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -tA -U postgres -d "$DB" \
  -c "SELECT pg_get_indexdef(i.indexrelid) FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname = 'service_account_tokens_create_idempotency_uidx';")
[[ "$DEF" == *"CREATE UNIQUE INDEX"* ]] || { echo "CREATE_TOKEN_IDEMPOTENCY_UIDX_NOT_UNIQUE: $DEF"; exit 1; }
[[ "$DEF" == *"serviceAccountId"* ]] || { echo "CREATE_TOKEN_IDEMPOTENCY_UIDX_MISSING_SERVICE_ACCOUNT_ID: $DEF"; exit 1; }
[[ "$DEF" == *"createIdempotencyKey"* ]] || { echo "CREATE_TOKEN_IDEMPOTENCY_UIDX_MISSING_KEY: $DEF"; exit 1; }
[[ "$DEF" == *"IS NOT NULL"* ]] || { echo "CREATE_TOKEN_IDEMPOTENCY_UIDX_MISSING_PREDICATE: $DEF"; exit 1; }

# NULL-key coexistence (old tokens created before the feature).
psql <<'SQL' >/dev/null
INSERT INTO service_account_tokens ("id","serviceAccountId","tokenHash","createIdempotencyKey") VALUES
  ('n1','acct1','h1',NULL), ('n2','acct1','h2',NULL);
SQL

# Different accounts may share the same key hash (domain-separated by account).
psql <<'SQL' >/dev/null
INSERT INTO service_account_tokens ("id","serviceAccountId","tokenHash","createIdempotencyKey") VALUES
  ('k1','acctA','h3','keyhash-1'), ('k2','acctB','h4','keyhash-1');
SQL

# Same account + same key: second insert must violate the partial unique index.
set +e
psql -c "INSERT INTO service_account_tokens (\"id\",\"serviceAccountId\",\"tokenHash\",\"createIdempotencyKey\") VALUES ('k3','acctA','h5','keyhash-1');" >/dev/null 2>&1
CONFLICT_STATUS=$?
set -e
if [[ "$CONFLICT_STATUS" -eq 0 ]]; then
  echo "CREATE_TOKEN_IDEMPOTENCY_UIDX_CONFLICT_NOT_ENFORCED"; exit 1
fi

echo "CREATE_TOKEN_IDEMPOTENCY_MIGRATION_GATE_OK"
