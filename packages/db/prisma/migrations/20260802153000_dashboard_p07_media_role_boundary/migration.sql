-- P07 v1.11 migration 59: database-role and guarded-delete boundary.
-- Migrations 56-58 are immutable. Role provisioning is an out-of-migration admin action.

DO $migration59_role_assertions$
DECLARE
  role_row record;
  media_object_count bigint;
BEGIN
  IF current_user <> 'vanstro_migrator' OR session_user <> 'vanstro_migrator' THEN
    RAISE EXCEPTION 'migration 59 must run directly as vanstro_migrator';
  END IF;

  FOR role_row IN
    SELECT expected.name, expected.can_login, expected.inherit,
           roles.rolname, roles.rolcanlogin, roles.rolinherit,
           roles.rolsuper, roles.rolcreaterole, roles.rolcreatedb, roles.rolreplication, roles.rolbypassrls
    FROM (VALUES
      ('vanstro_migrator'::text, true, false),
      ('vanstro_media_guard_owner'::text, false, false),
      ('vanstro_runtime'::text, true, false)
    ) AS expected(name, can_login, inherit)
    LEFT JOIN pg_catalog.pg_roles roles ON roles.rolname = expected.name
  LOOP
    IF role_row.rolname IS NULL
       OR role_row.rolcanlogin IS DISTINCT FROM role_row.can_login
       OR role_row.rolinherit IS DISTINCT FROM role_row.inherit
       OR role_row.rolsuper OR role_row.rolcreaterole OR role_row.rolcreatedb
       OR role_row.rolreplication OR role_row.rolbypassrls THEN
      RAISE EXCEPTION 'migration 59 role topology mismatch for %', role_row.name;
    END IF;
  END LOOP;

  IF pg_catalog.pg_has_role('vanstro_runtime', 'vanstro_migrator', 'MEMBER')
     OR pg_catalog.pg_has_role('vanstro_runtime', 'vanstro_media_guard_owner', 'MEMBER')
     OR pg_catalog.pg_has_role('vanstro_migrator', 'vanstro_runtime', 'MEMBER')
     OR pg_catalog.pg_has_role('vanstro_media_guard_owner', 'vanstro_runtime', 'MEMBER') THEN
    RAISE EXCEPTION 'migration 59 runtime must have no role-membership path';
  END IF;
  IF NOT pg_catalog.pg_has_role('vanstro_migrator', 'vanstro_media_guard_owner', 'MEMBER') THEN
    RAISE EXCEPTION 'migration 59 migrator must be able to assign guard ownership';
  END IF;

  IF pg_catalog.has_database_privilege('vanstro_runtime', current_database(), 'CREATE')
     OR pg_catalog.has_schema_privilege('vanstro_runtime', 'public', 'CREATE')
     OR pg_catalog.has_schema_privilege(0, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'migration 59 runtime/PUBLIC create privileges must be revoked';
  END IF;

  SELECT count(*) INTO media_object_count
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = c.relowner
  WHERE n.nspname = 'public'
    AND (c.relname LIKE 'media\_%' ESCAPE '\' OR c.relname = 'async_jobs')
    AND owner_role.rolname = 'vanstro_runtime';
  IF media_object_count <> 0 THEN
    RAISE EXCEPTION 'migration 59 runtime must not own Media objects';
  END IF;
END
$migration59_role_assertions$;

DO $revoke_database_create$
BEGIN
  EXECUTE pg_catalog.format('REVOKE CREATE ON DATABASE %I FROM PUBLIC, vanstro_runtime', current_database());
END
$revoke_database_create$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, vanstro_runtime;
-- Temporary only: PostgreSQL requires the future owner to have schema CREATE while
-- ownership is assigned. It is revoked immediately after the ownership transfer.
GRANT USAGE, CREATE ON SCHEMA public TO vanstro_media_guard_owner;

-- The migrator owns this private phase ledger. Runtime has no privilege on it. A random,
-- transaction-scoped marker is established only inside the non-public SECURITY DEFINER
-- delete entry points and is consumed by the delete trigger in the same transaction.
CREATE TABLE "media_guard_delete_phases" (
  "backendPid" integer NOT NULL,
  "transactionId" bigint NOT NULL,
  "phase" text NOT NULL,
  "nonce" uuid NOT NULL,
  CONSTRAINT "media_guard_delete_phases_pkey" PRIMARY KEY ("backendPid", "transactionId", "phase", "nonce"),
  CONSTRAINT "media_guard_delete_phases_phase_check" CHECK ("phase" IN ('detach', 'retention'))
);
REVOKE ALL ON TABLE public.media_guard_delete_phases FROM PUBLIC, vanstro_runtime;
GRANT SELECT, INSERT, DELETE ON TABLE public.media_guard_delete_phases TO vanstro_media_guard_owner;

CREATE OR REPLACE FUNCTION public.guard_media_evidence_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $guard_media_evidence_delete$
DECLARE
  marker_nonce uuid;
  marker_phase text;
BEGIN
  IF current_user <> 'vanstro_media_guard_owner' THEN
    RAISE EXCEPTION 'media delete guard owner boundary violated';
  END IF;

  BEGIN
    marker_nonce := pg_catalog.current_setting('vanstro.media_delete_nonce', true)::uuid;
    marker_phase := pg_catalog.current_setting('vanstro.media_delete_phase', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'direct media evidence delete is forbidden';
  END;

  IF marker_phase NOT IN ('detach', 'retention') OR marker_nonce IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.media_guard_delete_phases phase
       WHERE phase."backendPid" = pg_catalog.pg_backend_pid()
         AND phase."transactionId" = pg_catalog.txid_current()
         AND phase."phase" = marker_phase
         AND phase."nonce" = marker_nonce
     ) THEN
    RAISE EXCEPTION 'direct media evidence delete is forbidden';
  END IF;

  IF TG_TABLE_NAME = 'media_usages' AND marker_phase = 'detach' THEN
    RETURN OLD;
  ELSIF marker_phase <> 'retention' THEN
    RAISE EXCEPTION 'media detach phase cannot delete this evidence type';
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'media_storage_operations' THEN
      IF to_jsonb(OLD)->>'state' <> 'cleaned' OR to_jsonb(OLD)->>'cleanupStatus' <> 'complete'
         OR EXISTS (SELECT 1 FROM public.media_variants variant WHERE variant."storageOperationId" = OLD."id") THEN
        RAISE EXCEPTION 'media storage operation cleanup prerequisites not proven';
      END IF;
    WHEN 'media_retry_commands' THEN
      IF (to_jsonb(OLD)->>'expiresAt')::timestamptz > CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'media retry command retention has not elapsed';
      END IF;
    WHEN 'media_upload_intents' THEN
      IF to_jsonb(OLD)->>'status' NOT IN ('consumed', 'failed', 'expired') OR to_jsonb(OLD)->>'cleanupState' <> 'complete' THEN
        RAISE EXCEPTION 'media upload intent cleanup prerequisites not proven';
      END IF;
    WHEN 'media_assets' THEN
      IF to_jsonb(OLD)->>'tombstonedAt' IS NULL OR (to_jsonb(OLD)->>'legalHold')::boolean
         OR EXISTS (SELECT 1 FROM public.media_usages usage WHERE usage."assetId" = OLD."id")
         OR EXISTS (SELECT 1 FROM public.media_variants variant WHERE variant."assetId" = OLD."id")
         OR EXISTS (SELECT 1 FROM public.media_storage_operations operation WHERE operation."assetId" = OLD."id"
           AND (operation."state" <> 'cleaned' OR operation."cleanupStatus" <> 'complete')) THEN
        RAISE EXCEPTION 'media asset retention prerequisites not proven';
      END IF;
    WHEN 'media_variants' THEN
      IF EXISTS (SELECT 1 FROM public.media_storage_operations operation
        WHERE operation."variantId" = OLD."id" OR operation."id" = (to_jsonb(OLD)->>'storageOperationId')::uuid) THEN
        RAISE EXCEPTION 'media variant retention prerequisites not proven';
      END IF;
    ELSE NULL;
  END CASE;
  RETURN OLD;
END
$guard_media_evidence_delete$;

CREATE OR REPLACE FUNCTION public.media_detach_usage(asset_id uuid, usage_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $media_detach_usage$
DECLARE
  phase_nonce uuid := pg_catalog.gen_random_uuid();
  deleted bigint;
BEGIN
  IF asset_id IS NULL OR usage_id IS NULL THEN
    RAISE EXCEPTION 'media detach identifiers must be non-null';
  END IF;

  INSERT INTO public.media_guard_delete_phases ("backendPid", "transactionId", "phase", "nonce")
  VALUES (pg_catalog.pg_backend_pid(), pg_catalog.txid_current(), 'detach', phase_nonce);
  PERFORM pg_catalog.set_config('vanstro.media_delete_phase', 'detach', true);
  PERFORM pg_catalog.set_config('vanstro.media_delete_nonce', phase_nonce::text, true);

  DELETE FROM public.media_usages
  WHERE "id" = usage_id AND "assetId" = asset_id;
  GET DIAGNOSTICS deleted = ROW_COUNT;

  DELETE FROM public.media_guard_delete_phases
  WHERE "backendPid" = pg_catalog.pg_backend_pid()
    AND "transactionId" = pg_catalog.txid_current()
    AND "phase" = 'detach' AND "nonce" = phase_nonce;
  PERFORM pg_catalog.set_config('vanstro.media_delete_phase', '', true);
  PERFORM pg_catalog.set_config('vanstro.media_delete_nonce', '', true);
  RETURN deleted;
END
$media_detach_usage$;

CREATE OR REPLACE FUNCTION public.media_internal_retention_delete(table_name text, row_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $media_internal_retention_delete$
DECLARE
  phase_nonce uuid := pg_catalog.gen_random_uuid();
  deleted bigint;
BEGIN
  IF row_id IS NULL OR table_name IS NULL THEN
    RAISE EXCEPTION 'media retention identifiers must be non-null';
  END IF;

  INSERT INTO public.media_guard_delete_phases ("backendPid", "transactionId", "phase", "nonce")
  VALUES (pg_catalog.pg_backend_pid(), pg_catalog.txid_current(), 'retention', phase_nonce);
  PERFORM pg_catalog.set_config('vanstro.media_delete_phase', 'retention', true);
  PERFORM pg_catalog.set_config('vanstro.media_delete_nonce', phase_nonce::text, true);

  CASE table_name
    WHEN 'media_assets' THEN DELETE FROM public.media_assets WHERE "id" = row_id;
    WHEN 'media_variants' THEN DELETE FROM public.media_variants WHERE "id" = row_id;
    WHEN 'media_usages' THEN DELETE FROM public.media_usages WHERE "id" = row_id;
    WHEN 'media_upload_intents' THEN DELETE FROM public.media_upload_intents WHERE "id" = row_id;
    WHEN 'media_storage_operations' THEN DELETE FROM public.media_storage_operations WHERE "id" = row_id;
    WHEN 'media_retry_commands' THEN DELETE FROM public.media_retry_commands WHERE "id" = row_id;
    ELSE RAISE EXCEPTION 'unsupported media retention table';
  END CASE;
  GET DIAGNOSTICS deleted = ROW_COUNT;

  DELETE FROM public.media_guard_delete_phases
  WHERE "backendPid" = pg_catalog.pg_backend_pid()
    AND "transactionId" = pg_catalog.txid_current()
    AND "phase" = 'retention' AND "nonce" = phase_nonce;
  PERFORM pg_catalog.set_config('vanstro.media_delete_phase', '', true);
  PERFORM pg_catalog.set_config('vanstro.media_delete_nonce', '', true);
  RETURN deleted;
END
$media_internal_retention_delete$;

REVOKE ALL ON FUNCTION public.guard_media_evidence_delete() FROM PUBLIC, vanstro_runtime;
REVOKE ALL ON FUNCTION public.media_internal_retention_delete(text, uuid) FROM PUBLIC, vanstro_runtime;
REVOKE ALL ON FUNCTION public.media_detach_usage(uuid, uuid) FROM PUBLIC, vanstro_runtime;
REVOKE ALL ON FUNCTION public.media_changed_columns(jsonb, jsonb) FROM PUBLIC, vanstro_runtime;
REVOKE ALL ON FUNCTION public.guard_media_asset_update() FROM PUBLIC, vanstro_runtime;
REVOKE ALL ON FUNCTION public.guard_media_variant_update() FROM PUBLIC, vanstro_runtime;
REVOKE ALL ON FUNCTION public.guard_media_storage_operation_update() FROM PUBLIC, vanstro_runtime;
REVOKE ALL ON FUNCTION public.guard_media_usage_write() FROM PUBLIC, vanstro_runtime;
ALTER FUNCTION public.guard_media_asset_update() SECURITY DEFINER SET search_path = pg_catalog, public;
ALTER FUNCTION public.guard_media_variant_update() SECURITY DEFINER SET search_path = pg_catalog, public;
ALTER FUNCTION public.guard_media_storage_operation_update() SECURITY DEFINER SET search_path = pg_catalog, public;
ALTER FUNCTION public.guard_media_usage_write() SECURITY DEFINER SET search_path = pg_catalog, public;

ALTER FUNCTION public.guard_media_evidence_delete() OWNER TO vanstro_media_guard_owner;
ALTER FUNCTION public.media_detach_usage(uuid, uuid) OWNER TO vanstro_media_guard_owner;
ALTER FUNCTION public.media_internal_retention_delete(text, uuid) OWNER TO vanstro_media_guard_owner;
ALTER FUNCTION public.media_changed_columns(jsonb, jsonb) OWNER TO vanstro_media_guard_owner;
ALTER FUNCTION public.guard_media_asset_update() OWNER TO vanstro_media_guard_owner;
ALTER FUNCTION public.guard_media_variant_update() OWNER TO vanstro_media_guard_owner;
ALTER FUNCTION public.guard_media_storage_operation_update() OWNER TO vanstro_media_guard_owner;
ALTER FUNCTION public.guard_media_usage_write() OWNER TO vanstro_media_guard_owner;
REVOKE CREATE ON SCHEMA public FROM vanstro_media_guard_owner;

REVOKE DELETE ON TABLE
  public.media_assets,
  public.media_variants,
  public.media_usages,
  public.media_upload_intents,
  public.media_storage_operations,
  public.media_retry_commands
FROM PUBLIC, vanstro_runtime;

GRANT SELECT ON TABLE
  public.media_assets,
  public.media_variants,
  public.media_usages,
  public.media_upload_intents,
  public.media_storage_operations,
  public.media_retry_commands
TO vanstro_media_guard_owner;
GRANT UPDATE ON TABLE public.media_assets TO vanstro_media_guard_owner;
GRANT DELETE ON TABLE
  public.media_assets,
  public.media_variants,
  public.media_usages,
  public.media_upload_intents,
  public.media_storage_operations,
  public.media_retry_commands
TO vanstro_media_guard_owner;

SET ROLE vanstro_media_guard_owner;
GRANT EXECUTE ON FUNCTION public.media_detach_usage(uuid, uuid) TO vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.media_internal_retention_delete(text, uuid) TO vanstro_migrator;
RESET ROLE;

DO $migration59_post_assertions$
DECLARE
  function_name text;
BEGIN
  IF pg_catalog.has_function_privilege('public', 'public.media_detach_usage(uuid,uuid)', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('vanstro_runtime', 'public.media_detach_usage(uuid,uuid)', 'EXECUTE')
     OR pg_catalog.has_function_privilege('vanstro_runtime', 'public.media_internal_retention_delete(text,uuid)', 'EXECUTE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.media_usages', 'DELETE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.media_guard_delete_phases', 'SELECT')
     OR NOT pg_catalog.has_table_privilege('vanstro_media_guard_owner', 'public.media_assets', 'SELECT') THEN
    RAISE EXCEPTION 'migration 59 function/table grants do not match the frozen boundary';
  END IF;

  FOR function_name IN SELECT unnest(ARRAY[
    'guard_media_evidence_delete', 'media_detach_usage', 'media_internal_retention_delete',
    'media_changed_columns', 'guard_media_asset_update', 'guard_media_variant_update',
    'guard_media_storage_operation_update', 'guard_media_usage_write'
  ]) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc procedure
      JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
      JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = procedure.proowner
      WHERE namespace.nspname = 'public' AND procedure.proname = function_name
        AND owner_role.rolname = 'vanstro_media_guard_owner'
        AND procedure.prosecdef = (function_name IN ('guard_media_evidence_delete', 'media_detach_usage', 'media_internal_retention_delete', 'guard_media_asset_update', 'guard_media_variant_update', 'guard_media_storage_operation_update', 'guard_media_usage_write'))
    ) THEN
      RAISE EXCEPTION 'migration 59 owner/security mismatch for %', function_name;
    END IF;
  END LOOP;
END
$migration59_post_assertions$;
