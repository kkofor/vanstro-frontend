#!/usr/bin/env bash
set -euo pipefail

if [[ "$(node -p 'process.versions.node.split(`.`)[0]')" != "22" ]]; then
  printf 'regular API harness requires Node 22\n' >&2
  exit 1
fi

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
IMAGE=${VANSTRO_TEST_POSTGRES_IMAGE:-postgres:16-bookworm}
CONTAINER="vanstro-api-regular-pg16-${$}"
DATABASE_NAME=${VANSTRO_REGULAR_DATABASE_NAME:-vanstro_api_regular_fixture}
TEST_FILES=("$@")
if [[ ${#TEST_FILES[@]} -eq 0 ]]; then TEST_FILES=('src/**/*.test.ts'); fi
DATABASE_PASSWORD=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
SUPER_PASSWORD="T-$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
CALLBACK_SECRET=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  unset DATABASE_PASSWORD SUPER_PASSWORD CALLBACK_SECRET
}
trap cleanup EXIT

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
  printf 'regular API PostgreSQL fixture did not become ready\n' >&2
  exit 1
fi

PORT=$(docker port "$CONTAINER" 5432/tcp | sed 's/.*://')
DATABASE_URL="postgresql://postgres:${DATABASE_PASSWORD}@127.0.0.1:${PORT}/${DATABASE_NAME}?schema=public"

pnpm --dir "$ROOT/packages/db" build >/dev/null
DATABASE_URL="$DATABASE_URL" pnpm --dir "$ROOT/packages/db" exec prisma db push \
  --schema prisma/schema.prisma --skip-generate >/dev/null
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<'SQL' >/dev/null
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE vanstro_media_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE UNIQUE INDEX IF NOT EXISTS audit_events_dedup_unique ON audit_events("eventVersion",source,"idempotencyKeyHash") WHERE "idempotencyKeyHash" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS async_jobs_jobType_idempotencyKeyHash_key ON async_jobs("jobType","idempotencyKeyHash") WHERE "idempotencyKeyHash" IS NOT NULL;
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
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" \
  psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" \
  < "$ROOT/packages/db/prisma/migrations/20260804130000_f1_v15_runtime_acl_closure/migration.sql" >/dev/null
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<SQL >/dev/null
ALTER ROLE vanstro_migrator PASSWORD '$DATABASE_PASSWORD';
GRANT USAGE,CREATE ON SCHEMA public TO vanstro_migrator;
DO \$\$ DECLARE item record; BEGIN
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO vanstro_migrator',item.tablename);
  END LOOP;
  FOR item IN SELECT sequencename FROM pg_sequences WHERE schemaname='public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO vanstro_migrator',item.sequencename);
  END LOOP;
END \$\$;
DO \$\$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.media_storage_operations'::regclass
      AND conname = 'media_storage_operations_jobId_fkey'
  ) THEN
    ALTER TABLE public.media_storage_operations
      ADD CONSTRAINT "media_storage_operations_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES public.async_jobs(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END \$\$;
SQL
MIGRATOR_URL="postgresql://vanstro_migrator:${DATABASE_PASSWORD}@127.0.0.1:${PORT}/${DATABASE_NAME}"
for migration in \
  "$ROOT/packages/db/prisma/migrations/20260802152000_dashboard_p07_consolidated_guards/migration.sql" \
  "$ROOT/packages/db/prisma/migrations/20260802153000_dashboard_p07_media_role_boundary/migration.sql" \
  "$ROOT/packages/db/prisma/migrations/20260802155000_dashboard_p07_source_operation_binding/migration.sql" \
  "$ROOT/packages/db/prisma/migrations/20260802156000_dashboard_p07_source_binding_audit_metadata/migration.sql"; do
  docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" -c "ALTER SCHEMA public OWNER TO vanstro_migrator; GRANT USAGE,CREATE ON SCHEMA public TO vanstro_migrator; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO vanstro_migrator; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO vanstro_migrator" >/dev/null
  PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 < "$migration" >/dev/null
done
docker exec -i -e PGPASSWORD="$DATABASE_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<'SQL' >/dev/null
GRANT EXECUTE ON FUNCTION public.media_retry_required_kids(),public.media_find_retry_command(uuid,uuid,text,text,text,jsonb,jsonb,text[]) TO vanstro_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO vanstro_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO vanstro_runtime;
SQL
# S01 migrations 73/74 own DDL for a fresh library; this environment builds
# tables via prisma db push, so only the S01 function/trigger/grant layer is
# applied here (migration73/74 DDL statements are skipped).
# S02 migration75 adds its own s02_* controlled functions and the
# forward-extended ledger operation CHECK; the function layer is applied the
# same way (the CHECK constraint DDL is applied below with the migrator role).
for migration in \
  "$ROOT/packages/db/prisma/migrations/20260805100000_s01_settings_core/migration.sql" \
  "$ROOT/packages/db/prisma/migrations/20260805110000_s01_settings_contract_closure/migration.sql"; do
  PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 \
    -c "ALTER SCHEMA public OWNER TO vanstro_migrator; GRANT USAGE,CREATE ON SCHEMA public TO vanstro_migrator; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO vanstro_migrator; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO vanstro_migrator" >/dev/null
  SKIP=$(basename "$migration" | grep -q s01_settings_contract_closure && echo skip-owner || echo "")
  # Function bodies run as the S01 guard owner: the guard owner must own the
  # SECURITY DEFINER functions. ACL lines (GRANT/REVOKE) are applied below.
  {
    printf 'SET ROLE vanstro_p09_guard_owner;\n'
    node "$ROOT/scripts/s01-function-layer.mjs" "$migration" "$SKIP"
    printf 'RESET ROLE;\n'
  } | PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 >/dev/null
done
# S01 trigger + ACL surface: triggers as the table owner (migrator), table
# ACLs as the table owner, function EXECUTE ACLs as the function owner
# (vanstro_p09_guard_owner).
PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE TRIGGER s01_settings_ledger_immutable BEFORE UPDATE OR DELETE ON public.settings_command_ledger FOR EACH ROW EXECUTE FUNCTION public.s01_settings_ledger_immutable_v1();
CREATE TRIGGER s01_settings_publication_event_immutable BEFORE UPDATE OR DELETE ON public.s01_settings_publication_event FOR EACH ROW EXECUTE FUNCTION public.s01_settings_publication_event_immutable_v1();
GRANT SELECT,INSERT,UPDATE ON public.settings_command_ledger TO vanstro_p09_guard_owner;
REVOKE ALL ON TABLE public.settings_command_ledger FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
GRANT SELECT,INSERT ON public.s01_settings_publication_event TO vanstro_p09_guard_owner;
REVOKE ALL ON TABLE public.s01_settings_publication_event FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
SET ROLE vanstro_p09_guard_owner;
GRANT EXECUTE ON FUNCTION public.s01_settings_rows_v2(text,text),public.s01_settings_create_draft_v2(text,text,integer,integer,text,text,text,text,uuid),public.s01_settings_update_draft_v2(text,text,uuid,integer,integer,text,text,text,text),public.s01_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s01_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s01_settings_events_v2(text,text) TO vanstro_runtime;
REVOKE ALL ON FUNCTION public.s01_settings_authorize_v2(text,text,boolean),public.s01_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s01_settings_ledger_v1(text,text,text,text),public.s01_settings_ledger_immutable_v1(),public.s01_settings_publication_event_immutable_v1() FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
RESET ROLE;
SET ROLE vanstro_p02_guard_owner;
GRANT EXECUTE ON FUNCTION public.p02_dashboard_authorization_context_v1(text,text) TO vanstro_p09_guard_owner;
RESET ROLE;
SQL
# S02 migration75: apply the s02_* function layer + the forward-extended
# ledger CHECK. The CHECK DDL (ALTER TABLE settings_command_ledger /
# runtime_config_version) and the s02_* SECURITY DEFINER functions run as
# the migrator role (the guard owner lacks schema CREATE in this
# environment); ALTER FUNCTION OWNER lines are applied by the migrator;
# ACL lines are applied explicitly below.
node "$ROOT/scripts/s01-function-layer.mjs" "$ROOT/packages/db/prisma/migrations/20260805120000_s02_general_storefront/migration.sql" | PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 >/dev/null
PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
ALTER TABLE public.settings_command_ledger DROP CONSTRAINT IF EXISTS settings_command_operation_check;
ALTER TABLE public.settings_command_ledger ADD CONSTRAINT settings_command_operation_check CHECK(
  operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft',
               's02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft')
);
-- S02 shape constraint on runtime_config_version (the S01 shape check is
-- extended with the settings.general-storefront object branch).
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS settings_core_shape_check;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT settings_core_shape_check CHECK (
  "configKey"='settings.core.overview_refresh_seconds' OR (
    "configKey"='settings.general-storefront' AND "schemaVersion"='settings.general-storefront.v1' AND
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='object' AND
    ("settingsLifecycleStatus" NOT IN('validated','published') OR
      (public.s02_settings_value_shape_valid("desiredValue") AND
       public.s02_settings_value_business_valid("desiredValue"))) AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','invalid','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  ) OR (
    "configKey" NOT IN('settings.core.overview_refresh_seconds','settings.general-storefront')
  )
);
SET ROLE vanstro_p09_guard_owner;
GRANT EXECUTE ON FUNCTION public.s02_settings_rows_v2(text,text),public.s02_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s02_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s02_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s02_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s02_settings_events_v2(text,text) TO vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.s02_settings_public_projection_v1(text) TO vanstro_runtime;
REVOKE ALL ON FUNCTION public.s02_settings_authorize_v2(text,text,boolean),public.s02_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s02_settings_ledger_v1(text,text,text,text) FROM PUBLIC,vanstro_worker_runtime;
RESET ROLE;
GRANT SELECT ON TABLE public.media_assets,public.site_content_modules,public.dealers,public.dealer_locations TO vanstro_p09_guard_owner;
GRANT SELECT ON TABLE public.runtime_config_version,public.settings_command_ledger,public.s01_settings_publication_event TO vanstro_p09_guard_owner;
GRANT SELECT ON TABLE public.roles TO vanstro_p09_guard_owner;
SQL
# S09 migration76: apply the s09_* function layer + the forward-extended
# CHECK/registry DDL. Same pattern as S02: the function layer runs as the
# migrator role, then the constraint DDL runs as the migrator, then the
# function EXECUTE ACLs run as the p09 guard owner.
node "$ROOT/scripts/s01-function-layer.mjs" "$ROOT/packages/db/prisma/migrations/20260806100000_s09_auth_rbac_settings/migration.sql" | PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 >/dev/null
PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
ALTER TABLE public.settings_command_ledger DROP CONSTRAINT IF EXISTS settings_command_operation_check;
ALTER TABLE public.settings_command_ledger ADD CONSTRAINT settings_command_operation_check CHECK(
  operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft',
               's02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft',
               's09_create_draft','s09_update_draft','s09_validate_draft','s09_publish_draft','s09_create_rollback_draft')
);
-- S09 registry allowlist forward extension (S02 descriptor included: its
-- published rows would violate the migration73 allowlist on a real chain).
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS runtime_config_registry;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_registry CHECK ("configKey" IN ('foundation.runtime.refresh_interval_seconds','foundation.runtime.display_mode','foundation.runtime.safe_origin','settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac'));
-- S09 shape constraint on runtime_config_version (S01/S02 branches kept).
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS settings_core_shape_check;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT settings_core_shape_check CHECK (
  "configKey"='settings.core.overview_refresh_seconds' OR (
    "configKey"='settings.general-storefront' AND "schemaVersion"='settings.general-storefront.v1' AND
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='object' AND
    ("settingsLifecycleStatus" NOT IN('validated','published') OR
      (public.s02_settings_value_shape_valid("desiredValue") AND
       public.s02_settings_value_business_valid("desiredValue"))) AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','invalid','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  ) OR (
    "configKey"='settings.auth-rbac' AND "schemaVersion"='settings.auth-rbac.v1' AND
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='object' AND
    ("settingsLifecycleStatus" NOT IN('validated','published') OR
      (public.s09_settings_value_shape_valid("desiredValue") AND
       public.s09_settings_value_business_valid("desiredValue"))) AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','invalid','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  ) OR (
    "configKey" NOT IN('settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac')
  )
);
SET ROLE vanstro_p09_guard_owner;
GRANT EXECUTE ON FUNCTION public.s09_settings_rows_v2(text,text),public.s09_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s09_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s09_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s09_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s09_settings_events_v2(text,text) TO vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.s09_settings_effective_policy_v1() TO vanstro_runtime;
REVOKE ALL ON FUNCTION public.s09_settings_authorize_v2(text,text,boolean),public.s09_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s09_settings_ledger_v1(text,text,text,text),public.s09_settings_value_shape_valid(jsonb),public.s09_settings_value_business_valid(jsonb) FROM PUBLIC,vanstro_worker_runtime;
RESET ROLE;
GRANT SELECT ON TABLE public.runtime_config_version,public.settings_command_ledger,public.s01_settings_publication_event TO vanstro_p09_guard_owner;
SQL
# S10 migration77: apply the s10_* function layer + the forward-extended
# CHECK/registry DDL. Same pattern as S02/S09: the function layer runs as
# the migrator role, then the constraint DDL runs as the migrator, then the
# function EXECUTE ACLs run as the p09 guard owner.
node "$ROOT/scripts/s01-function-layer.mjs" "$ROOT/packages/db/prisma/migrations/20260807000000_s10_privacy_retention_settings/migration.sql" | PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 >/dev/null
PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
-- The CHECK DDL below evaluates s09/s10 shape functions as the migrator
-- role; S09's ACL step revoked PUBLIC execute on the s09 shape functions, so
-- grant the migrator a temporary EXECUTE (the function owner re-grants) and
-- revoke it in the ACL step at the end of this block.
SET ROLE vanstro_p09_guard_owner;
GRANT EXECUTE ON FUNCTION public.s09_settings_value_shape_valid(jsonb),public.s09_settings_value_business_valid(jsonb),public.s10_settings_value_shape_valid(jsonb),public.s10_settings_value_business_valid(jsonb) TO vanstro_migrator;
RESET ROLE;
ALTER TABLE public.settings_command_ledger DROP CONSTRAINT IF EXISTS settings_command_operation_check;
ALTER TABLE public.settings_command_ledger ADD CONSTRAINT settings_command_operation_check CHECK(
  operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft',
               's02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft',
               's09_create_draft','s09_update_draft','s09_validate_draft','s09_publish_draft','s09_create_rollback_draft',
               's10_create_draft','s10_update_draft','s10_validate_draft','s10_publish_draft','s10_create_rollback_draft')
);
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS runtime_config_registry;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_registry CHECK ("configKey" IN ('foundation.runtime.refresh_interval_seconds','foundation.runtime.display_mode','foundation.runtime.safe_origin','settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac','settings.privacy-retention'));
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS settings_core_shape_check;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT settings_core_shape_check CHECK (
  "configKey"='settings.core.overview_refresh_seconds' OR (
    "configKey"='settings.general-storefront' AND "schemaVersion"='settings.general-storefront.v1' AND
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='object' AND
    ("settingsLifecycleStatus" NOT IN('validated','published') OR
      (public.s02_settings_value_shape_valid("desiredValue") AND
       public.s02_settings_value_business_valid("desiredValue"))) AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','invalid','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  ) OR (
    "configKey"='settings.auth-rbac' AND "schemaVersion"='settings.auth-rbac.v1' AND
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='object' AND
    ("settingsLifecycleStatus" NOT IN('validated','published') OR
      (public.s09_settings_value_shape_valid("desiredValue") AND
       public.s09_settings_value_business_valid("desiredValue"))) AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','invalid','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  ) OR (
    "configKey"='settings.privacy-retention' AND "schemaVersion"='settings.privacy-retention.v1' AND
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='object' AND
    ("settingsLifecycleStatus" NOT IN('validated','published') OR
      (public.s10_settings_value_shape_valid("desiredValue") AND
       public.s10_settings_value_business_valid("desiredValue"))) AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','invalid','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  ) OR (
    "configKey" NOT IN('settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac','settings.privacy-retention')
  )
);
SET ROLE vanstro_p09_guard_owner;
GRANT EXECUTE ON FUNCTION public.s10_settings_rows_v2(text,text),public.s10_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s10_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s10_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s10_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s10_settings_events_v2(text,text) TO vanstro_runtime;
REVOKE ALL ON FUNCTION public.s10_settings_authorize_v2(text,text,boolean),public.s10_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s10_settings_ledger_v1(text,text,text,text),public.s10_settings_value_shape_valid(jsonb),public.s10_settings_value_business_valid(jsonb) FROM PUBLIC,vanstro_worker_runtime,vanstro_migrator;
REVOKE ALL ON FUNCTION public.s09_settings_value_shape_valid(jsonb),public.s09_settings_value_business_valid(jsonb) FROM vanstro_migrator;
RESET ROLE;
GRANT SELECT ON TABLE public.runtime_config_version,public.settings_command_ledger,public.s01_settings_publication_event TO vanstro_p09_guard_owner;
SQL
# S03 migration78: apply isolated settings.commerce lifecycle and forward DDL.
node "$ROOT/scripts/s01-function-layer.mjs" "$ROOT/packages/db/prisma/migrations/20260807100000_s03_commerce_settings/migration.sql" | PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 >/dev/null
PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
SET ROLE vanstro_p09_guard_owner;
GRANT EXECUTE ON FUNCTION public.s03_settings_value_shape_valid(jsonb),public.s03_settings_value_business_valid(jsonb) TO vanstro_migrator;
RESET ROLE;
ALTER TABLE public.settings_command_ledger DROP CONSTRAINT IF EXISTS settings_command_operation_check;
ALTER TABLE public.settings_command_ledger ADD CONSTRAINT settings_command_operation_check CHECK(operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft','s02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft','s09_create_draft','s09_update_draft','s09_validate_draft','s09_publish_draft','s09_create_rollback_draft','s10_create_draft','s10_update_draft','s10_validate_draft','s10_publish_draft','s10_create_rollback_draft','s03_create_draft','s03_update_draft','s03_validate_draft','s03_publish_draft','s03_create_rollback_draft'));
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS runtime_config_registry;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_registry CHECK("configKey" IN('foundation.runtime.refresh_interval_seconds','foundation.runtime.display_mode','foundation.runtime.safe_origin','settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac','settings.privacy-retention','settings.commerce'));
SET ROLE vanstro_p09_guard_owner;
GRANT EXECUTE ON FUNCTION public.s03_settings_rows_v2(text,text),public.s03_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s03_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s03_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s03_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s03_settings_events_v2(text,text) TO vanstro_runtime;
REVOKE ALL ON FUNCTION public.s03_settings_authorize_v2(text,text,boolean),public.s03_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s03_settings_ledger_v1(text,text,text,text),public.s03_settings_value_shape_valid(jsonb),public.s03_settings_value_business_valid(jsonb) FROM PUBLIC,vanstro_worker_runtime,vanstro_migrator;
RESET ROLE;
SQL
# S08 migration79: apply isolated settings.api-service-account lifecycle and
# forward DDL plus the minimal ServiceAccount/Token rotation metadata.
node "$ROOT/scripts/s01-function-layer.mjs" "$ROOT/packages/db/prisma/migrations/20260808000000_s08_api_service_accounts/migration.sql" | PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 >/dev/null
PGPASSWORD="$DATABASE_PASSWORD" psql "$MIGRATOR_URL" -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
SET ROLE vanstro_p09_guard_owner;
GRANT EXECUTE ON FUNCTION public.s08_settings_value_shape_valid(jsonb),public.s08_settings_value_business_valid(jsonb) TO vanstro_migrator;
RESET ROLE;
ALTER TABLE public.settings_command_ledger DROP CONSTRAINT IF EXISTS settings_command_operation_check;
ALTER TABLE public.settings_command_ledger ADD CONSTRAINT settings_command_operation_check CHECK(operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft','s02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft','s09_create_draft','s09_update_draft','s09_validate_draft','s09_publish_draft','s09_create_rollback_draft','s10_create_draft','s10_update_draft','s10_validate_draft','s10_publish_draft','s10_create_rollback_draft','s03_create_draft','s03_update_draft','s03_validate_draft','s03_publish_draft','s03_create_rollback_draft','s08_create_draft','s08_update_draft','s08_validate_draft','s08_publish_draft','s08_create_rollback_draft'));
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS runtime_config_registry;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_registry CHECK("configKey" IN('foundation.runtime.refresh_interval_seconds','foundation.runtime.display_mode','foundation.runtime.safe_origin','settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac','settings.privacy-retention','settings.commerce','settings.api-service-account'));
SET ROLE vanstro_p09_guard_owner;
GRANT EXECUTE ON FUNCTION public.s08_settings_rows_v2(text,text),public.s08_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s08_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s08_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s08_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s08_settings_events_v2(text,text) TO vanstro_runtime;
REVOKE ALL ON FUNCTION public.s08_settings_authorize_v2(text,text,boolean),public.s08_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s08_settings_ledger_v1(text,text,text,text),public.s08_settings_value_shape_valid(jsonb),public.s08_settings_value_business_valid(jsonb) FROM PUBLIC,vanstro_worker_runtime,vanstro_migrator;
RESET ROLE;
SQL
DATABASE_URL="$DATABASE_URL" \
  VANSTRO_RUNTIME_MODE=test \
  ALLOW_DEMO_SEED=true \
  SUPER_ADMIN_EMAIL=admin@vanstro.test \
  SUPER_ADMIN_PASSWORD="$SUPER_PASSWORD" \
  pnpm --dir "$ROOT/packages/db" db:seed >/dev/null

DATABASE_URL="$DATABASE_URL" \
  VANSTRO_TEST_SETUP_DATABASE_URL="$DATABASE_URL" \
  VANSTRO_RUNTIME_MODE=test \
  PAYMENT_CALLBACK_SECRET="$CALLBACK_SECRET" \
  ENABLE_PAYMENT_SIMULATION=true \
  SUPER_ADMIN_EMAIL=admin@vanstro.test \
  SUPER_ADMIN_PASSWORD="$SUPER_PASSWORD" \
  pnpm --dir "$ROOT/apps/api" exec tsx --test --test-concurrency=1 "${TEST_FILES[@]}"

printf 'regular API disposable PostgreSQL 16 gate passed\n'
