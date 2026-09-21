#!/usr/bin/env bash
set -euo pipefail
[[ "$(node -p 'process.versions.node.split(`.`)[0]')" == 22 ]] || { echo 'P09 owned harness requires Node22' >&2; exit 1; }
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd); IMAGE=postgres:16-bookworm; C="vanstro-p09-owned-$$"; OUT=${P09_OWNED_OUT:-"${CLAUDE_JOB_DIR:-${TMPDIR:-/tmp}}/p09-owned"}; mkdir -p "$OUT"
secret(){ node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))'; }; A=$(secret); M=$(secret); R=$(secret); S="T-$(secret)"; CALLBACK=$(secret)
cleanup(){ docker rm -f "$C" >/dev/null 2>&1||true; }; trap cleanup EXIT
docker run -d --name "$C" -e POSTGRES_PASSWORD="$A" -p 127.0.0.1::5432 "$IMAGE" >/dev/null
for _ in $(seq 1 60); do docker exec -e PGPASSWORD="$A" "$C" pg_isready -U postgres >/dev/null 2>&1&&break; sleep 1; done
PORT=$(docker port "$C" 5432/tcp|sed 's/.*://'); admin(){ docker exec -i -e PGPASSWORD="$A" "$C" psql -X -v ON_ERROR_STOP=1 -U postgres "$@"; }
admin -d postgres <<SQL >/dev/null
CREATE ROLE vanstro_media_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p08_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p09_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '$M';
CREATE ROLE vanstro_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '$R';
GRANT vanstro_media_guard_owner,vanstro_p08_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner TO vanstro_migrator;
SQL
create_db(){ local db=$1; admin -d postgres -c "CREATE DATABASE \"$db\" OWNER vanstro_migrator" >/dev/null; local murl="postgresql://vanstro_migrator:$M@127.0.0.1:$PORT/$db"; DATABASE_URL="$murl" pnpm --dir "$ROOT/packages/db" exec prisma migrate deploy --schema prisma/schema.prisma >/dev/null; admin -d "$db" <<'SQL' >/dev/null
GRANT USAGE ON SCHEMA public TO vanstro_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO vanstro_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO vanstro_runtime;
REVOKE ALL ON runtime_config_version,feature_flag_version FROM vanstro_runtime;
REVOKE DELETE ON media_assets,media_variants,media_usages,media_upload_intents,media_storage_operations,media_retry_commands,media_hmac_kid_retirements FROM vanstro_runtime;
REVOKE SELECT,UPDATE ON media_retry_commands FROM vanstro_runtime;
REVOKE SELECT ON media_guard_binding_phases FROM vanstro_runtime;
GRANT SELECT,UPDATE ON media_retry_commands TO vanstro_migrator;
SQL
}
urls(){ MIGRATOR_URL="postgresql://vanstro_migrator:$M@127.0.0.1:$PORT/$1"; RUNTIME_URL="postgresql://vanstro_runtime:$R@127.0.0.1:$PORT/$1"; export MIGRATOR_URL RUNTIME_URL; }
# Full DB serial inventory.
create_db p09_db_serial_owned_disposable; urls p09_db_serial_owned_disposable
DATABASE_URL="$MIGRATOR_URL" VANSTRO_TEST_SETUP_DATABASE_URL="$MIGRATOR_URL" TEST_RUNTIME_DATABASE_URL="$RUNTIME_URL" pnpm --dir "$ROOT/packages/db" exec tsx --test --test-concurrency=1 'src/**/*.test.ts' >"$OUT/db-serial.tap" 2>&1
# Default per-file inventory: each file gets a fresh owned database, preventing cross-file destructive fixture pollution.
: >"$OUT/db-default-per-file.tap"
find "$ROOT/packages/db/src" -maxdepth 1 -name '*.test.ts' | LC_ALL=C sort >"$OUT/db-files.txt"
i=0
while IFS= read -r -u 3 file; do i=$((i+1)); db="p09_db_file_${i}_owned_disposable"; create_db "$db"; urls "$db"; printf '\n# FILE %s DATABASE %s\n' "${file#$ROOT/}" "$db" >>"$OUT/db-default-per-file.tap"; DATABASE_URL="$MIGRATOR_URL" VANSTRO_TEST_SETUP_DATABASE_URL="$MIGRATOR_URL" TEST_RUNTIME_DATABASE_URL="$RUNTIME_URL" pnpm --dir "$ROOT/packages/db" exec tsx --test "$file" </dev/null >>"$OUT/db-default-per-file.tap" 2>&1; done 3<"$OUT/db-files.txt"
# Full API owned inventory uses runtime for product paths and setup-only migrator.
create_db p09_api_owned_disposable; urls p09_api_owned_disposable
DATABASE_URL="$MIGRATOR_URL" VANSTRO_RUNTIME_MODE=test ALLOW_DEMO_SEED=true SUPER_ADMIN_EMAIL=admin@vanstro.test SUPER_ADMIN_PASSWORD="$S" pnpm --dir "$ROOT/packages/db" db:seed >/dev/null
pnpm --dir "$ROOT/packages/db" build >/dev/null
DATABASE_URL="$RUNTIME_URL" VANSTRO_TEST_SETUP_DATABASE_URL="$MIGRATOR_URL" VANSTRO_RUNTIME_MODE=test PAYMENT_CALLBACK_SECRET="$CALLBACK" ENABLE_PAYMENT_SIMULATION=true SUPER_ADMIN_EMAIL=admin@vanstro.test SUPER_ADMIN_PASSWORD="$S" pnpm --dir "$ROOT/apps/api" exec tsx --test --test-concurrency=1 'src/**/*.test.ts' >"$OUT/api-owned.tap" 2>&1
# Worker gated proof really executes with runtime role.
create_db p09_worker_owned_disposable; urls p09_worker_owned_disposable
pnpm --dir "$ROOT/packages/db" build >/dev/null
DATABASE_URL="$RUNTIME_URL" VANSTRO_RUNTIME_MODE=test pnpm --dir "$ROOT/apps/worker" exec tsx --test --test-concurrency=1 src/async-job-dispatcher.integration.test.ts >"$OUT/worker-owned.tap" 2>&1
# Critical timing/concurrency suites repeat twice, each round on a fresh DB.
: >"$OUT/critical-repeats.tap"
for round in 1 2; do db="p09_critical_${round}_owned_disposable"; create_db "$db"; urls "$db"; for file in async-jobs.integration.test.ts async-jobs-media-binding.integration.test.ts work-queue.integration.test.ts; do printf '\n# ROUND %s FILE %s DATABASE %s\n' "$round" "$file" "$db" >>"$OUT/critical-repeats.tap"; DATABASE_URL="$MIGRATOR_URL" VANSTRO_TEST_SETUP_DATABASE_URL="$MIGRATOR_URL" TEST_RUNTIME_DATABASE_URL="$RUNTIME_URL" pnpm --dir "$ROOT/packages/db" exec tsx --test --test-concurrency=1 "$ROOT/packages/db/src/$file" >>"$OUT/critical-repeats.tap" 2>&1; done; done
# Permission sentinels after all runtime paths.
admin -d p09_api_owned_disposable -Atq <<'SQL' | grep -qx ok
SELECT CASE WHEN NOT has_table_privilege('vanstro_runtime','runtime_config_version','SELECT')
 AND NOT has_table_privilege('vanstro_runtime','feature_flag_version','UPDATE')
 AND NOT has_schema_privilege('vanstro_runtime','public','CREATE')
 AND NOT pg_has_role('vanstro_runtime','vanstro_migrator','MEMBER')
 AND NOT pg_has_role('vanstro_runtime','vanstro_p09_guard_owner','MEMBER') THEN 'ok' ELSE 'bad' END;
SQL
printf 'P09 owned PG16 complete: DB serial, DB default-per-file, API runtime, Worker runtime, critical repeats x2; artifacts=%s\n' "$OUT"
