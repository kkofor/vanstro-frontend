#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
IMAGE='postgres:16-bookworm'
CONTAINER="vanstro-p07-m59-${$}"
NODE_BIN=${NODE_BIN:-node}
NODE_MAJOR=$($NODE_BIN -p 'process.versions.node.split(".")[0]')
if [[ "$NODE_MAJOR" != "22" ]]; then
  printf 'migration59 requires Node 22, found %s\n' "$($NODE_BIN -v)" >&2
  exit 1
fi
random_password() {
  "$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))'
}
ADMIN_PASSWORD=$(random_password)
MIGRATOR_PASSWORD=$(random_password)
RUNTIME_PASSWORD=$(random_password)
TEMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/vanstro-m59.XXXXXX")

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

make_schema_snapshots() {
  for target in through58 through59; do
    mkdir -p "$TEMP_ROOT/$target/migrations"
    cp "$ROOT/packages/db/prisma/schema.prisma" "$TEMP_ROOT/$target/schema.prisma"
    cp "$ROOT/packages/db/prisma/migrations/migration_lock.toml" "$TEMP_ROOT/$target/migrations/migration_lock.toml"
  done
  find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d \
    ! -name '20260802153000_dashboard_p07_media_role_boundary' \
    ! -name '20260802154000_dashboard_p07_retry_retention' \
    ! -name '20260802155000_dashboard_p07_source_operation_binding' \
    -exec cp -R {} "$TEMP_ROOT/through58/migrations/" \;
  find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d \
    ! -name '20260802154000_dashboard_p07_retry_retention' \
    ! -name '20260802155000_dashboard_p07_source_operation_binding' \
    -exec cp -R {} "$TEMP_ROOT/through59/migrations/" \;
}

provision_runtime_dml() {
  local database=$1
  docker exec -i -e PGPASSWORD="$ADMIN_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$database" <<'SQL' >/dev/null
GRANT USAGE ON SCHEMA public TO vanstro_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE public.media_assets, public.media_asset_locales, public.media_variants, public.media_usages, public.media_upload_intents, public.media_storage_operations, public.media_retry_commands TO vanstro_runtime;
GRANT DELETE ON TABLE public.media_asset_locales TO vanstro_runtime;
SQL
}

run_attack_matrix() {
  local database=$1
  local asset1 asset2 usage1 usage2
  role_psql vanstro_migrator "$MIGRATOR_PASSWORD" "$database" -Atc "SELECT has_schema_privilege('vanstro_media_guard_owner','public','USAGE'),has_table_privilege('vanstro_media_guard_owner','public.media_assets','SELECT'),(SELECT prosecdef FROM pg_proc WHERE oid='public.guard_media_usage_write()'::regprocedure),(SELECT rolname FROM pg_roles WHERE oid=(SELECT proowner FROM pg_proc WHERE oid='public.guard_media_usage_write()'::regprocedure))" | grep -qx 't|t|t|vanstro_media_guard_owner'
  asset1=$(role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atq -c "INSERT INTO public.media_assets (\"id\",\"contractVersion\",\"schemaVersion\",\"registryVersion\",\"kind\",\"status\",\"originalFilename\",\"safeDisplayName\",\"declaredContentType\",\"expectedBytes\",\"source\",\"provenanceOrigin\",\"storageProvider\",\"processingPolicyVersion\",\"securityPolicyVersion\",\"processingConfigHash\",\"variantSetState\",\"tags\",\"authorizationScopeKind\",\"dealerIds\",\"locationIds\",\"createdByActorType\",\"effectiveRoles\",\"permissionGrants\",\"contextRevision\",\"retentionClass\",\"retentionPolicyVersion\",\"requestId\",\"updatedAt\") VALUES (gen_random_uuid(),'media-asset.v1','media-asset-schema.v1','media-registry.v1','image','ready','one.jpg','one.jpg','image/jpeg',1,'dashboard_upload','human_upload','private_filesystem.v1','media-processing.v1','media-security.v1',repeat('a',43),'resolved','[]','global','[]','[]','system','[]','[]','test','default','media-retention.v1','test',CURRENT_TIMESTAMP) RETURNING id;")
  asset2=$(role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atq -c "INSERT INTO public.media_assets (\"id\",\"contractVersion\",\"schemaVersion\",\"registryVersion\",\"kind\",\"status\",\"originalFilename\",\"safeDisplayName\",\"declaredContentType\",\"expectedBytes\",\"source\",\"provenanceOrigin\",\"storageProvider\",\"processingPolicyVersion\",\"securityPolicyVersion\",\"processingConfigHash\",\"variantSetState\",\"tags\",\"authorizationScopeKind\",\"dealerIds\",\"locationIds\",\"createdByActorType\",\"effectiveRoles\",\"permissionGrants\",\"contextRevision\",\"retentionClass\",\"retentionPolicyVersion\",\"requestId\",\"updatedAt\") VALUES (gen_random_uuid(),'media-asset.v1','media-asset-schema.v1','media-registry.v1','image','ready','two.jpg','two.jpg','image/jpeg',1,'dashboard_upload','human_upload','private_filesystem.v1','media-processing.v1','media-security.v1',repeat('b',43),'resolved','[]','global','[]','[]','system','[]','[]','test','default','media-retention.v1','test',CURRENT_TIMESTAMP) RETURNING id;")
  usage1=$(role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atq -c "INSERT INTO public.media_usages (\"id\",\"assetId\",\"contractVersion\",\"entityType\",\"entityId\",\"slot\",\"requiredLocales\",\"authorizationScopeKind\",\"dealerIds\",\"locationIds\",\"attachedByActorType\",\"permissionGrants\",\"contextRevision\",\"updatedAt\") VALUES (gen_random_uuid(),'${asset1}','media-usage.v1','product',gen_random_uuid()::text,'gallery','[]','global','[]','[]','system','[]','test',CURRENT_TIMESTAMP) RETURNING id;")
  usage2=$(role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atq -c "INSERT INTO public.media_usages (\"id\",\"assetId\",\"contractVersion\",\"entityType\",\"entityId\",\"slot\",\"requiredLocales\",\"authorizationScopeKind\",\"dealerIds\",\"locationIds\",\"attachedByActorType\",\"permissionGrants\",\"contextRevision\",\"updatedAt\") VALUES (gen_random_uuid(),'${asset2}','media-usage.v1','product',gen_random_uuid()::text,'gallery','[]','global','[]','[]','system','[]','test',CURRENT_TIMESTAMP) RETURNING id;")

  for guarded_table in media_assets media_variants media_usages media_upload_intents media_storage_operations media_retry_commands; do
    expect_runtime_failure "$database" "DELETE FROM public.${guarded_table} WHERE id=gen_random_uuid()"
  done
  expect_runtime_failure "$database" "SELECT set_config('vanstro.media_retention_delete','enabled',true); DELETE FROM public.media_usages WHERE id='${usage1}'"
  expect_runtime_failure "$database" "SELECT set_config('vanstro.media_delete_phase','detach',true); SELECT set_config('vanstro.media_delete_nonce',gen_random_uuid()::text,true); DELETE FROM public.media_usages WHERE id='${usage1}'"
  expect_runtime_failure "$database" "ALTER FUNCTION public.guard_media_evidence_delete() RENAME TO forged_guard"
  expect_runtime_failure "$database" "DROP TRIGGER media_usage_delete_guard ON public.media_usages"
  expect_runtime_failure "$database" "CREATE TABLE public.shadow_attack(id integer)"
  expect_runtime_failure "$database" "CREATE SCHEMA runtime_attack"
  expect_runtime_failure "$database" "SET ROLE vanstro_migrator"
  expect_runtime_failure "$database" "SET ROLE vanstro_media_guard_owner"
  expect_runtime_failure "$database" "SELECT public.media_internal_retention_delete('media_usages','${usage1}'::uuid)"
  expect_runtime_failure "$database" "SELECT * FROM public.media_guard_delete_phases"

  test "$(role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc "SELECT public.media_detach_usage('${asset1}'::uuid,'${usage1}'::uuid)")" = 1
  test "$(role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc "SELECT public.media_detach_usage('${asset1}'::uuid,'${usage1}'::uuid)")" = 0
  test "$(role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc "SELECT public.media_detach_usage('${asset1}'::uuid,'${usage2}'::uuid)")" = 0
  test "$(role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc "SELECT count(*) FROM public.media_usages WHERE id='${usage2}'")" = 1

  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" <<SQL >/dev/null
CREATE TEMP TABLE media_usages (id uuid);
SET search_path = pg_temp, public;
SELECT public.media_detach_usage('${asset2}'::uuid, '${usage2}'::uuid);
SQL
  test "$(role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc "SELECT count(*) FROM public.media_usages WHERE id='${usage2}'")" = 0

  if role_psql vanstro_migrator "$MIGRATOR_PASSWORD" "$database" -c "SELECT public.media_internal_retention_delete('media_assets','${asset1}'::uuid)" >/dev/null 2>&1; then
    printf 'expected ineligible asset retention to fail\n' >&2
    exit 1
  fi
  test "$(role_psql vanstro_migrator "$MIGRATOR_PASSWORD" "$database" -Atc "SELECT public.media_internal_retention_delete('media_usages','${usage1}'::uuid)")" = 0
  role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -c "UPDATE public.media_assets SET retiring=true, \"tombstonedAt\"=CURRENT_TIMESTAMP, version=version+1, \"updatedAt\"=CURRENT_TIMESTAMP WHERE id='${asset2}'::uuid" >/dev/null
  test "$(role_psql vanstro_migrator "$MIGRATOR_PASSWORD" "$database" -Atc "SELECT public.media_internal_retention_delete('media_assets','${asset2}'::uuid)")" = 1
  test "$(role_psql vanstro_runtime "$RUNTIME_PASSWORD" "$database" -Atc "SELECT count(*) FROM public.media_assets WHERE id='${asset2}'::uuid")" = 0

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
    SELECT 1 FROM unnest(ARRAY['media_assets','media_variants','media_usages','media_upload_intents','media_storage_operations','media_retry_commands']) table_name
    WHERE has_table_privilege('vanstro_runtime',format('public.%I',table_name),'DELETE')
  )
  AND NOT has_schema_privilege('vanstro_media_guard_owner','public','CREATE')
  AND has_function_privilege('vanstro_runtime','public.media_detach_usage(uuid,uuid)','EXECUTE')
  AND NOT has_function_privilege('vanstro_runtime','public.media_internal_retention_delete(text,uuid)','EXECUTE')
  AND (SELECT r.rolname='vanstro_media_guard_owner' FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid='public.media_detach_usage(uuid,uuid)'::regprocedure)
THEN 'ok' ELSE 'bad' END;
SQL
}

prepare_database vanstro_m59_fresh
prepare_database vanstro_m59_upgrade
make_schema_snapshots
deploy vanstro_m59_fresh "$TEMP_ROOT/through59/schema.prisma"
deploy vanstro_m59_upgrade "$TEMP_ROOT/through58/schema.prisma"
deploy vanstro_m59_upgrade "$TEMP_ROOT/through59/schema.prisma"
printf 'provisioning runtime DML in disposable databases\n'
provision_runtime_dml vanstro_m59_fresh
provision_runtime_dml vanstro_m59_upgrade
printf 'running fresh0->59 attack matrix\n'
run_attack_matrix vanstro_m59_fresh
printf 'running 58->59 attack matrix\n'
run_attack_matrix vanstro_m59_upgrade
printf 'migration59 PostgreSQL 16 fresh0->59 and 58->59 attack matrices passed\n'
