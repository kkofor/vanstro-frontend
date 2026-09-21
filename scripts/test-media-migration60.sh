#!/usr/bin/env bash
set -euo pipefail

if [[ "$(node -p 'process.versions.node.split(`.`)[0]')" != "22" ]]; then
  printf 'migration60 harness requires Node 22\n' >&2
  exit 1
fi

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
IMAGE='postgres:16-bookworm'
CONTAINER="vanstro-p07-m60-${$}"
random_password() {
  node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))'
}
ADMIN_PASSWORD=$(random_password)
MIGRATOR_PASSWORD=$(random_password)
RUNTIME_PASSWORD=$(random_password)
TEMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/vanstro-m60.XXXXXX")

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TEMP_ROOT"
  unset ADMIN_PASSWORD MIGRATOR_PASSWORD RUNTIME_PASSWORD
}
trap cleanup EXIT

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$ADMIN_PASSWORD" -p 127.0.0.1::5432 "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  if docker exec -e PGPASSWORD="$ADMIN_PASSWORD" "$CONTAINER" pg_isready -U postgres -d postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -e PGPASSWORD="$ADMIN_PASSWORD" "$CONTAINER" pg_isready -U postgres -d postgres >/dev/null
PORT=$(docker port "$CONTAINER" 5432/tcp | sed 's/.*://')

admin_psql() {
  docker exec -i -e PGPASSWORD="$ADMIN_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}
role_psql() {
  local role=$1 password=$2 database=$3
  shift 3
  docker exec -i -e PGPASSWORD="$password" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$role" -d "$database" "$@"
}
expect_runtime_failure() {
  local database=$1 sql=$2
  if role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -c "$sql" >/dev/null 2>&1; then
    printf 'expected runtime attack to fail: %s\n' "$sql" >&2
    exit 1
  fi
}
expect_migrator_failure() {
  local database=$1 sql=$2
  if role_psql vanstro_migrator "$MIGRATOR_PASSWORD" "$database" -c "$sql" >/dev/null 2>&1; then
    printf 'expected migrator attack to fail: %s\n' "$sql" >&2
    exit 1
  fi
}

admin_psql <<SQL
CREATE ROLE vanstro_media_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${MIGRATOR_PASSWORD}';
CREATE ROLE vanstro_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${RUNTIME_PASSWORD}';
GRANT vanstro_media_guard_owner TO vanstro_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL

prepare_database() {
  local database=$1
  admin_psql -c "CREATE DATABASE \"${database}\" OWNER vanstro_migrator;" >/dev/null
  admin_psql -c "REVOKE CREATE ON DATABASE \"${database}\" FROM PUBLIC;" >/dev/null
}

deploy() {
  local database=$1 schema=$2
  DATABASE_URL="postgresql://vanstro_migrator:${MIGRATOR_PASSWORD}@127.0.0.1:${PORT}/${database}" \
    pnpm --dir "$ROOT/packages/db" exec prisma migrate deploy --schema "$schema"
}

make_schema_through_59() {
  mkdir -p "$TEMP_ROOT/through59/migrations"
  cp "$ROOT/packages/db/prisma/schema.prisma" "$TEMP_ROOT/through59/schema.prisma"
  cp "$ROOT/packages/db/prisma/migrations/migration_lock.toml" "$TEMP_ROOT/through59/migrations/migration_lock.toml"
  find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d \
    ! -name '20260802154000_dashboard_p07_retry_retention' \
    ! -name '20260802155000_dashboard_p07_source_operation_binding' \
    -exec cp -R {} "$TEMP_ROOT/through59/migrations/" \;
}

provision_runtime_dml() {
  local database=$1
  docker exec -i -e PGPASSWORD="$ADMIN_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$database" <<'SQL' >/dev/null
GRANT USAGE ON SCHEMA public TO vanstro_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE public.async_jobs, public.media_assets TO vanstro_runtime;
GRANT SELECT, INSERT ON TABLE public.media_retry_commands TO vanstro_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE public.media_hmac_kid_retirements TO vanstro_runtime;
SQL
}

insert_asset_and_job() {
  local database=$1 suffix=$2
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atq <<SQL
WITH asset AS (
  INSERT INTO public.media_assets (
    "id","contractVersion","schemaVersion","registryVersion","kind","status",
    "originalFilename","safeDisplayName","declaredContentType","expectedBytes","source",
    "provenanceOrigin","storageProvider","processingPolicyVersion","securityPolicyVersion",
    "processingConfigHash","variantSetState","tags","authorizationScopeKind","dealerIds",
    "locationIds","createdByActorType","effectiveRoles","permissionGrants","contextRevision",
    "retentionClass","retentionPolicyVersion","requestId","updatedAt"
  ) VALUES (
    gen_random_uuid(),'media-asset.v1','media-asset-schema.v1','media-registry.v1','image','ready',
    '${suffix}.jpg','${suffix}.jpg','image/jpeg',1,'dashboard_upload','human_upload',
    'private_filesystem.v1','media-processing.v1','media-security.v1',repeat('a',43),'resolved',
    '[]','global','[]','[]','system','[]','[]','test','default','media-retention.v1','${suffix}',CURRENT_TIMESTAMP
  ) RETURNING id
), job AS (
  INSERT INTO public.async_jobs (
    "contractVersion","schemaVersion","jobType","jobTypeVersion","payloadSchemaVersion",
    "resultSchemaVersion","status","createdByActorType","effectiveRoles","permissionGrants",
    "authorizationScopeKind","dealerIds","locationIds","contextRevision","payload",
    "payloadIdentityHash","progressKind","progressStage","progressUpdatedAt","maxAttempts",
    "maxRetryGenerations","requestId","retentionClass","retentionPolicyVersion","expiresAt","updatedAt"
  ) VALUES (
    'async-job.v1','async-job-schema.v1','media.process','media.process.v1','media-process-input.v1',
    'media-process-result.v1','queued','system','[]','[]','global','[]','[]','test','{}',
    repeat('b',64),'indeterminate','queued',CURRENT_TIMESTAMP,3,3,'${suffix}','default',
    'async-job-retention.v1',CURRENT_TIMESTAMP+interval '40 days',CURRENT_TIMESTAMP
  ) RETURNING id
)
SELECT asset.id || '|' || job.id FROM asset CROSS JOIN job;
SQL
}

insert_command() {
  local database=$1 kid=$2 created_expression=$3 suffix=$4
  local pair asset_id job_id
  pair=$(insert_asset_and_job "$database" "$suffix")
  asset_id=${pair%%|*}
  job_id=${pair##*|}
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atq <<SQL
INSERT INTO public.media_retry_commands (
  "id","assetId","jobId","contractVersion","commandKeyKid","commandKeyHash","intentHash",
  "actorId","contextRevision","authorizationScopeKind","dealerIds","locationIds",
  "retryGeneration","executionBinding","responseProjection","createdAt","expiresAt"
) VALUES (
  gen_random_uuid(),'${asset_id}'::uuid,'${job_id}'::uuid,'media-retry-command.v1','${kid}',
  repeat('${suffix}',43),repeat('c',43),'actor','test','global','[]','[]',1,'{}','{}',
  ${created_expression},${created_expression}+interval '8 days'
) RETURNING id;
SQL
}

run_matrix() {
  local database=$1 command_id pair asset_id job_id start_ms elapsed_ms

  role_psql vanstro_migrator "$MIGRATOR_PASSWORD" "$database" -At <<'SQL' | grep -qx 'ok'
SELECT CASE WHEN
  current_setting('server_version_num')::integer >= 160000
  AND (SELECT rolcanlogin AND NOT rolinherit FROM pg_roles WHERE rolname='vanstro_runtime')
  AND (SELECT rolcanlogin AND NOT rolinherit FROM pg_roles WHERE rolname='vanstro_migrator')
  AND (SELECT NOT rolcanlogin AND NOT rolinherit FROM pg_roles WHERE rolname='vanstro_media_guard_owner')
  AND NOT pg_has_role('vanstro_runtime','vanstro_migrator','MEMBER')
  AND NOT pg_has_role('vanstro_runtime','vanstro_media_guard_owner','MEMBER')
  AND NOT has_database_privilege('vanstro_runtime',current_database(),'CREATE')
  AND NOT has_schema_privilege('vanstro_runtime','public','CREATE')
  AND NOT has_schema_privilege(0,'public','CREATE')
  AND NOT EXISTS (
    SELECT 1
    FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid=relation.relnamespace
    JOIN pg_roles owner_role ON owner_role.oid=relation.relowner
    WHERE namespace.nspname='public'
      AND (relation.relname LIKE 'media\_%' ESCAPE '\' OR relation.relname='async_jobs')
      AND owner_role.rolname='vanstro_runtime'
  )
  AND NOT has_table_privilege('vanstro_runtime','public.media_retry_commands','UPDATE')
  AND NOT has_table_privilege('vanstro_runtime','public.media_retry_commands','DELETE')
  AND NOT has_table_privilege('vanstro_runtime','public.media_hmac_kid_retirements','DELETE')
  AND NOT has_table_privilege('vanstro_migrator','public.media_retry_commands','DELETE')
  AND NOT has_table_privilege('vanstro_migrator','public.media_hmac_kid_retirements','DELETE')
  AND has_function_privilege('vanstro_runtime','public.media_cleanup_retry_retention(integer,timestamptz)','EXECUTE')
  AND NOT has_function_privilege('public','public.media_cleanup_retry_retention(integer,timestamptz)','EXECUTE')
  AND NOT has_function_privilege('vanstro_runtime','public.media_internal_retention_delete(text,uuid)','EXECUTE')
  AND (SELECT r.rolname='vanstro_media_guard_owner' AND p.prosecdef
       FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
       WHERE p.oid='public.media_cleanup_retry_retention(integer,timestamptz)'::regprocedure)
THEN 'ok' ELSE 'bad' END;
SQL

  command_id=$(insert_command "$database" before "CURRENT_TIMESTAMP-interval '7 days 23 hours 59 minutes'" d)
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"commandsDeleted\"||'|'||\"retirementsDeleted\" FROM public.media_cleanup_retry_retention(100,CURRENT_TIMESTAMP)" | grep -qx '0|0'
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT count(*) FROM public.media_retry_commands WHERE id='${command_id}'::uuid" | grep -qx 1

  command_id=$(insert_command "$database" boundary "CURRENT_TIMESTAMP-interval '8 days'" e)
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT count(*) FROM public.media_retry_commands WHERE id='${command_id}'::uuid" | grep -qx 1
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT count(*) FROM public.media_retry_commands WHERE id='${command_id}'::uuid AND \"expiresAt\">CURRENT_TIMESTAMP" | grep -qx 0
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"commandsDeleted\" FROM public.media_cleanup_retry_retention(1,CURRENT_TIMESTAMP)" | grep -qx 1
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT count(*) FROM public.media_retry_commands WHERE id='${command_id}'::uuid" | grep -qx 0

  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -c \
    "INSERT INTO public.media_hmac_kid_retirements (kid,\"lastCommandExpiresAt\",\"removeAfter\",\"updatedAt\") VALUES ('boundary',CURRENT_TIMESTAMP-interval '31 days',CURRENT_TIMESTAMP-interval '30 days',CURRENT_TIMESTAMP) ON CONFLICT (kid) DO UPDATE SET \"removeAfter\"=EXCLUDED.\"removeAfter\",\"updatedAt\"=CURRENT_TIMESTAMP" >/dev/null
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"retirementsDeleted\" FROM public.media_cleanup_retry_retention(100,CURRENT_TIMESTAMP)" | grep -qx 1

  command_id=$(insert_command "$database" referenced "CURRENT_TIMESTAMP-interval '7 days 23 hours 59 minutes 58 seconds'" f)
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -c \
    "INSERT INTO public.media_hmac_kid_retirements (kid,\"lastCommandExpiresAt\",\"removeAfter\",\"updatedAt\") VALUES ('referenced',CURRENT_TIMESTAMP-interval '31 days',CURRENT_TIMESTAMP-interval '31 days',CURRENT_TIMESTAMP) ON CONFLICT (kid) DO UPDATE SET \"removeAfter\"=EXCLUDED.\"removeAfter\",\"updatedAt\"=CURRENT_TIMESTAMP" >/dev/null
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -c \
    "INSERT INTO public.media_hmac_kid_retirements (kid,\"lastCommandExpiresAt\",\"removeAfter\",\"updatedAt\") VALUES ('later-eligible',CURRENT_TIMESTAMP-interval '30 days',CURRENT_TIMESTAMP-interval '30 days',CURRENT_TIMESTAMP)" >/dev/null
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"retirementsDeleted\" FROM public.media_cleanup_retry_retention(1,CURRENT_TIMESTAMP)" | grep -qx 1
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT (SELECT count(*) FROM public.media_hmac_kid_retirements WHERE kid='referenced')||'|'||(SELECT count(*) FROM public.media_hmac_kid_retirements WHERE kid='later-eligible')" | grep -qx '1|0'
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT count(*) FROM public.media_hmac_kid_retirements WHERE kid='referenced'" | grep -qx 1
  sleep 3
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"commandsDeleted\"||'|'||\"retirementsDeleted\" FROM public.media_cleanup_retry_retention(100,CURRENT_TIMESTAMP)" | grep -Eq '^[1-9][0-9]*\|1$'

  insert_command "$database" batch1 "CURRENT_TIMESTAMP-interval '8 days'" g >/dev/null
  insert_command "$database" batch2 "CURRENT_TIMESTAMP-interval '8 days'" h >/dev/null
  insert_command "$database" batch3 "CURRENT_TIMESTAMP-interval '8 days'" i >/dev/null
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"commandsDeleted\" FROM public.media_cleanup_retry_retention(2,CURRENT_TIMESTAMP)" | grep -qx 2
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"commandsDeleted\" FROM public.media_cleanup_retry_retention(2,CURRENT_TIMESTAMP)" | grep -qx 1
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"commandsDeleted\"||'|'||\"retirementsDeleted\" FROM public.media_cleanup_retry_retention(2,CURRENT_TIMESTAMP)" | grep -qx '0|0'

  expect_runtime_failure "$database" "UPDATE public.media_retry_commands SET \"expiresAt\"=CURRENT_TIMESTAMP WHERE id=gen_random_uuid()"
  expect_runtime_failure "$database" "DELETE FROM public.media_retry_commands WHERE id=gen_random_uuid()"
  expect_runtime_failure "$database" "DELETE FROM public.media_hmac_kid_retirements WHERE kid='x'"
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -c \
    "INSERT INTO public.media_hmac_kid_retirements (kid,\"lastCommandExpiresAt\",\"removeAfter\",\"updatedAt\") VALUES ('monotonic',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+interval '1 day',CURRENT_TIMESTAMP)" >/dev/null
  expect_runtime_failure "$database" "UPDATE public.media_hmac_kid_retirements SET \"lastCommandExpiresAt\"=CURRENT_TIMESTAMP-interval '2 days',\"removeAfter\"=CURRENT_TIMESTAMP-interval '1 day',revision=revision+1,\"updatedAt\"=CURRENT_TIMESTAMP WHERE kid='monotonic'"
  expect_runtime_failure "$database" "UPDATE public.media_hmac_kid_retirements SET \"removeAfter\"=CURRENT_TIMESTAMP-interval '31 days',revision=revision+1,\"updatedAt\"=CURRENT_TIMESTAMP WHERE kid='monotonic'"
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -c \
    "UPDATE public.media_hmac_kid_retirements SET \"lastCommandExpiresAt\"=CURRENT_TIMESTAMP+interval '1 day',\"removeAfter\"=CURRENT_TIMESTAMP+interval '2 days',revision=revision+1,\"updatedAt\"=CURRENT_TIMESTAMP WHERE kid='monotonic'" >/dev/null
  expect_runtime_failure "$database" "SELECT set_config('vanstro.media_delete_phase','retention',true); SELECT set_config('vanstro.media_delete_nonce',gen_random_uuid()::text,true); DELETE FROM public.media_retry_commands WHERE id=gen_random_uuid()"
  expect_runtime_failure "$database" "SELECT public.media_internal_retention_delete('media_retry_commands',gen_random_uuid())"
  expect_runtime_failure "$database" "SELECT * FROM public.media_cleanup_retry_retention(0,CURRENT_TIMESTAMP)"
  expect_runtime_failure "$database" "SELECT * FROM public.media_cleanup_retry_retention(101,CURRENT_TIMESTAMP)"
  expect_runtime_failure "$database" "SELECT * FROM public.media_cleanup_retry_retention(1,CURRENT_TIMESTAMP-interval '6 seconds')"
  expect_runtime_failure "$database" "CREATE TABLE public.shadow_attack(id integer)"
  expect_runtime_failure "$database" "SET ROLE vanstro_media_guard_owner"
  expect_migrator_failure "$database" "DELETE FROM public.media_retry_commands WHERE id=gen_random_uuid()"
  expect_migrator_failure "$database" "SELECT * FROM public.media_cleanup_retry_retention(1,CURRENT_TIMESTAMP)"

  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" <<'SQL' >/dev/null
CREATE TEMP TABLE media_retry_commands(id uuid);
CREATE TEMP TABLE media_hmac_kid_retirements(kid text);
SET search_path=pg_temp,public;
SELECT * FROM public.media_cleanup_retry_retention(1,CURRENT_TIMESTAMP);
SQL

  pair=$(insert_asset_and_job "$database" race)
  asset_id=${pair%%|*}
  job_id=${pair##*|}
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -c \
    "INSERT INTO public.media_hmac_kid_retirements (kid,\"lastCommandExpiresAt\",\"removeAfter\",\"updatedAt\") VALUES ('race',CURRENT_TIMESTAMP-interval '31 days',CURRENT_TIMESTAMP-interval '30 days',CURRENT_TIMESTAMP)" >/dev/null
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" <<SQL >/dev/null &
BEGIN;
INSERT INTO public.media_retry_commands (
  "id","assetId","jobId","contractVersion","commandKeyKid","commandKeyHash","intentHash",
  "actorId","contextRevision","authorizationScopeKind","dealerIds","locationIds",
  "retryGeneration","executionBinding","responseProjection","createdAt","expiresAt"
) VALUES (
  gen_random_uuid(),'${asset_id}'::uuid,'${job_id}'::uuid,'media-retry-command.v1','race',
  repeat('j',43),repeat('k',43),'actor','test','global','[]','[]',1,'{}','{}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+interval '8 days'
);
INSERT INTO public.media_hmac_kid_retirements (kid,"lastCommandExpiresAt","removeAfter","updatedAt")
VALUES ('race',CURRENT_TIMESTAMP+interval '8 days',CURRENT_TIMESTAMP+interval '9 days',CURRENT_TIMESTAMP)
ON CONFLICT (kid) DO UPDATE SET
  "lastCommandExpiresAt"=EXCLUDED."lastCommandExpiresAt",
  "removeAfter"=EXCLUDED."removeAfter",
  "revision"=public.media_hmac_kid_retirements."revision"+1,
  "updatedAt"=CURRENT_TIMESTAMP;
SELECT pg_sleep(0.5);
COMMIT;
SQL
  local inserter_pid=$!
  sleep 0.25
  start_ms=$(node -e 'process.stdout.write(String(Date.now()))')
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"retirementsDeleted\" FROM public.media_cleanup_retry_retention(100,CURRENT_TIMESTAMP)" | grep -qx 0
  elapsed_ms=$(( $(node -e 'process.stdout.write(String(Date.now()))') - start_ms ))
  wait "$inserter_pid"
  test "$elapsed_ms" -lt 1500
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT (SELECT count(*) FROM public.media_retry_commands WHERE \"commandKeyKid\"='race')||'|'||(SELECT count(*) FROM public.media_hmac_kid_retirements WHERE kid='race')" | grep -qx '1|1'

  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -At <<'SQL' | grep -qx 'ok'
SELECT CASE WHEN
  EXISTS (
    SELECT 1 FROM public.media_retry_commands command
    JOIN public.media_hmac_kid_retirements retirement ON retirement.kid=command."commandKeyKid"
    WHERE command."commandKeyKid"='race' AND command."expiresAt">CURRENT_TIMESTAMP
      AND retirement."removeAfter">CURRENT_TIMESTAMP
  )
THEN 'ok' ELSE 'bad' END;
SQL

  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -c \
    "INSERT INTO public.media_hmac_kid_retirements (kid,\"lastCommandExpiresAt\",\"removeAfter\",\"updatedAt\") VALUES ('timeout',CURRENT_TIMESTAMP-interval '31 days',CURRENT_TIMESTAMP-interval '30 days',CURRENT_TIMESTAMP)" >/dev/null
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" <<'SQL' >/dev/null &
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('vanstro:media-retry-kid:v1:timeout',0));
SELECT pg_sleep(3);
COMMIT;
SQL
  local blocker_pid=$!
  sleep 0.25
  start_ms=$(node -e 'process.stdout.write(String(Date.now()))')
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT count(*) FROM public.media_hmac_kid_retirements WHERE kid='timeout'" | grep -qx 1
  elapsed_ms=$(( $(node -e 'process.stdout.write(String(Date.now()))') - start_ms ))
  test "$elapsed_ms" -lt 1000
  start_ms=$(node -e 'process.stdout.write(String(Date.now()))')
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"retirementsDeleted\" FROM public.media_cleanup_retry_retention(100,CURRENT_TIMESTAMP)" | grep -qx 0
  elapsed_ms=$(( $(node -e 'process.stdout.write(String(Date.now()))') - start_ms ))
  test "$elapsed_ms" -lt 1000
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT count(*) FROM public.media_hmac_kid_retirements WHERE kid='timeout'" | grep -qx 1
  wait "$blocker_pid"
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc \
    "SELECT \"retirementsDeleted\" FROM public.media_cleanup_retry_retention(100,CURRENT_TIMESTAMP)" | grep -qx 1
}

prepare_database vanstro_m60_fresh
prepare_database vanstro_m60_upgrade
make_schema_through_59
deploy vanstro_m60_fresh "$ROOT/packages/db/prisma/schema.prisma"
deploy vanstro_m60_upgrade "$TEMP_ROOT/through59/schema.prisma"
deploy vanstro_m60_upgrade "$ROOT/packages/db/prisma/schema.prisma"
printf 'provisioning runtime DML in disposable PostgreSQL 16 databases\n'
provision_runtime_dml vanstro_m60_fresh
provision_runtime_dml vanstro_m60_upgrade
printf 'running fresh0->60 retention and attack matrix\n'
run_matrix vanstro_m60_fresh
printf 'running 59->60 retention and attack matrix\n'
run_matrix vanstro_m60_upgrade
printf 'migration60 PostgreSQL 16 fresh0->60 and 59->60 matrices passed\n'
