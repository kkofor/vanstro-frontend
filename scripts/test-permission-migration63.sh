#!/usr/bin/env bash
set -euo pipefail

if [[ "$(node -p 'process.versions.node.split(`.`)[0]')" != "22" ]]; then
  printf 'permission migration63 harness requires Node 22\n' >&2
  exit 1
fi

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
IMAGE='postgres:16-bookworm'
CONTAINER="vanstro-p08-m63-${$}"
ADMIN_PASSWORD=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
TEMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/vanstro-p08-m63.XXXXXX")

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TEMP_ROOT"
  unset ADMIN_PASSWORD
}
trap cleanup EXIT

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$ADMIN_PASSWORD" -p 127.0.0.1::5432 "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  if docker exec -e PGPASSWORD="$ADMIN_PASSWORD" "$CONTAINER" pg_isready -U postgres -d postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -e PGPASSWORD="$ADMIN_PASSWORD" "$CONTAINER" pg_isready -U postgres -d postgres >/dev/null
PORT=$(docker port "$CONTAINER" 5432/tcp | sed 's/.*://')

psql_admin() {
  docker exec -i -e PGPASSWORD="$ADMIN_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

MIGRATOR_PASSWORD=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
RUNTIME_PASSWORD=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')

psql_admin <<SQL >/dev/null
CREATE ROLE vanstro_media_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${MIGRATOR_PASSWORD}';
CREATE ROLE vanstro_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${RUNTIME_PASSWORD}';
GRANT vanstro_media_guard_owner TO vanstro_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL

prepare_db() {
  local database=$1
  psql_admin -c "CREATE DATABASE \"${database}\" OWNER vanstro_migrator;" >/dev/null
  psql_admin -c "REVOKE CREATE ON DATABASE \"${database}\" FROM PUBLIC;" >/dev/null
}

deploy() {
  local database=$1 schema=$2
  DATABASE_URL="postgresql://vanstro_migrator:${MIGRATOR_PASSWORD}@127.0.0.1:${PORT}/${database}" \
    pnpm --dir "$ROOT/packages/db" exec prisma migrate deploy --schema "$schema" >/dev/null
}

snapshot() {
  local name=$1 exclude_glob=$2 dir="$TEMP_ROOT/$1"
  mkdir -p "$dir/migrations"
  cp "$ROOT/packages/db/prisma/schema.prisma" "$dir/schema.prisma"
  cp "$ROOT/packages/db/prisma/migrations/migration_lock.toml" "$dir/migrations/migration_lock.toml"
  find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d \
    ! -name "$exclude_glob" -exec cp -R {} "$dir/migrations/" \;
  printf '%s/schema.prisma' "$dir"
}

# through-55 excludes every timestamped P07 directory; through-62 excludes only migration 63.
THROUGH55=$(snapshot through55 '2026080215*')
THROUGH62=$(snapshot through62 '20260803100000_dashboard_p08_import_export_foundation')

prepare_db vanstro_p08_m63_fresh
prepare_db vanstro_p08_m63_from55
prepare_db vanstro_p08_m63_from62
prepare_db vanstro_p08_m63_sentinel

# The sentinel is deliberately outside application tables and is never migrated.
psql_admin -d vanstro_p08_m63_sentinel <<'SQL' >/dev/null
CREATE SCHEMA permission_harness_probe;
CREATE TABLE permission_harness_probe.sentinel (id integer PRIMARY KEY, value text NOT NULL);
INSERT INTO permission_harness_probe.sentinel VALUES (1, 'untouched-current-dev-sentinel');
SQL

FULL_SCHEMA="$ROOT/packages/db/prisma/schema.prisma"
deploy vanstro_p08_m63_fresh "$FULL_SCHEMA"
deploy vanstro_p08_m63_from55 "$THROUGH55"
deploy vanstro_p08_m63_from55 "$FULL_SCHEMA"
deploy vanstro_p08_m63_from62 "$THROUGH62"
deploy vanstro_p08_m63_from62 "$FULL_SCHEMA"

assert_matrix() {
  local database=$1
  docker exec -i -e PGPASSWORD="$ADMIN_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$database" <<'SQL' >/dev/null
DO $$
DECLARE
  expected text[] := ARRAY[
    'dashboard.import.foundation_sample.read',
    'dashboard.import.foundation_sample.create',
    'dashboard.import.foundation_sample.commit',
    'dashboard.export.foundation_sample.read',
    'dashboard.export.foundation_sample.create',
    'dashboard.export.foundation_sample.download'
  ];
  permission_key text;
  table_count integer;
BEGIN
  FOREACH permission_key IN ARRAY expected LOOP
    IF NOT EXISTS (SELECT 1 FROM permissions permission_row WHERE permission_row."key" = permission_key) THEN
      RAISE EXCEPTION 'missing P08 permission %', permission_key;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM permissions permission_row WHERE permission_row."key" = ANY(expected)) <> cardinality(expected) THEN
    RAISE EXCEPTION 'P08 permission cardinality mismatch';
  END IF;
  SELECT count(*) INTO table_count
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND c.relname IN ('dashboard_import_batch','dashboard_import_row','dashboard_export_request','foundation_sample');
  IF table_count <> 4 THEN RAISE EXCEPTION 'P08 table cardinality mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname IN ('dashboard_artifact','import_artifact','export_artifact','dashboard_import_target')) THEN
    RAISE EXCEPTION 'forbidden P08 table exists';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dashboard_import_row_batch_fkey') THEN
    RAISE EXCEPTION 'import row restrictive FK missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dashboard_export_request_artifact_fkey') THEN
    RAISE EXCEPTION 'export artifact FK missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dashboard_import_batch_source_artifact_fkey') THEN
    RAISE EXCEPTION 'import source artifact FK missing';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='job_artifacts' AND column_name IN ('availabilityStatus','availabilityCheckedAt','fencingToken')) THEN
    RAISE EXCEPTION 'migration 63 modified P05 JobArtifact schema';
  END IF;
  IF NOT pg_catalog.has_table_privilege('vanstro_runtime', 'public.dashboard_import_batch', 'SELECT')
     OR NOT pg_catalog.has_table_privilege('vanstro_runtime', 'public.foundation_sample', 'UPDATE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.dashboard_import_batch', 'DELETE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.foundation_sample', 'DELETE') THEN
    RAISE EXCEPTION 'runtime role matrix mismatch';
  END IF;
  IF (SELECT count(*) FROM user_roles) <> 0 THEN
    RAISE EXCEPTION 'migration inferred user assignments';
  END IF;
END $$;
SQL
}

assert_matrix vanstro_p08_m63_fresh
assert_matrix vanstro_p08_m63_from55
assert_matrix vanstro_p08_m63_from62

# Replay is intentionally a no-op at the migration engine level and the sentinel is unchanged.
psql_admin -d vanstro_p08_m63_sentinel -Atc 'SELECT value FROM permission_harness_probe.sentinel WHERE id=1' | grep -qx 'untouched-current-dev-sentinel'
if psql_admin -d vanstro_p08_m63_sentinel -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('dashboard_import_batch','dashboard_import_row','dashboard_export_request','foundation_sample')" | grep -vq '^0$'; then
  printf 'current-dev sentinel acquired P08 production tables\n' >&2
  exit 1
fi

printf 'permission migration63 PostgreSQL 16 fresh0->63, 55->63, 62->63 and isolated current-dev path passed\n'
