-- P07 v1.12 migration 60: bounded retry-command and HMAC-kid retirement.
-- Migrations 56-59 are immutable. Role provisioning is an out-of-migration admin action.

DO $migration60_role_assertions$
DECLARE
  role_row record;
  runtime_owned_object_count bigint;
BEGIN
  IF current_user <> 'vanstro_migrator' OR session_user <> 'vanstro_migrator' THEN
    RAISE EXCEPTION 'migration 60 must run directly as vanstro_migrator';
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
      RAISE EXCEPTION 'migration 60 role topology mismatch for %', role_row.name;
    END IF;
  END LOOP;

  IF pg_catalog.pg_has_role('vanstro_runtime', 'vanstro_migrator', 'MEMBER')
     OR pg_catalog.pg_has_role('vanstro_runtime', 'vanstro_media_guard_owner', 'MEMBER')
     OR pg_catalog.pg_has_role('vanstro_migrator', 'vanstro_runtime', 'MEMBER')
     OR pg_catalog.pg_has_role('vanstro_media_guard_owner', 'vanstro_runtime', 'MEMBER')
     OR NOT pg_catalog.pg_has_role('vanstro_migrator', 'vanstro_media_guard_owner', 'MEMBER') THEN
    RAISE EXCEPTION 'migration 60 role membership topology mismatch';
  END IF;

  IF pg_catalog.has_database_privilege('vanstro_runtime', current_database(), 'CREATE')
     OR pg_catalog.has_schema_privilege('vanstro_runtime', 'public', 'CREATE')
     OR pg_catalog.has_schema_privilege(0, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'migration 60 runtime/PUBLIC create privileges must be revoked';
  END IF;

  SELECT pg_catalog.count(*) INTO runtime_owned_object_count
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = relation.relowner
  WHERE namespace.nspname = 'public'
    AND (relation.relname LIKE 'media\_%' ESCAPE '\' OR relation.relname = 'async_jobs')
    AND owner_role.rolname = 'vanstro_runtime';
  IF runtime_owned_object_count <> 0 THEN
    RAISE EXCEPTION 'migration 60 runtime must not own Media objects';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc procedure
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
    JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = procedure.proowner
    WHERE namespace.nspname = 'public'
      AND procedure.oid = 'public.guard_media_evidence_delete()'::pg_catalog.regprocedure
      AND owner_role.rolname = 'vanstro_media_guard_owner'
      AND procedure.prosecdef
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class relation
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
    JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = relation.relowner
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'media_guard_delete_phases'
      AND owner_role.rolname = 'vanstro_migrator'
  ) THEN
    RAISE EXCEPTION 'migration 60 requires the migration 59 guard boundary';
  END IF;
END
$migration60_role_assertions$;

-- PostgreSQL requires the future function owner to have schema CREATE while ownership is assigned.
GRANT USAGE, CREATE ON SCHEMA public TO vanstro_media_guard_owner;
SET ROLE vanstro_media_guard_owner;

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
    WHEN 'media_hmac_kid_retirements' THEN
      IF (to_jsonb(OLD)->>'removeAfter')::timestamptz + interval '30 days' > CURRENT_TIMESTAMP
         OR EXISTS (
           SELECT 1 FROM public.media_retry_commands command
           WHERE command."commandKeyKid" = to_jsonb(OLD)->>'kid'
         ) THEN
        RAISE EXCEPTION 'media HMAC kid retirement prerequisites not proven';
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

RESET ROLE;
-- Required only while the migrator binds owner-controlled trigger functions to migrator-owned tables.
SET ROLE vanstro_media_guard_owner;
GRANT EXECUTE ON FUNCTION public.guard_media_evidence_delete() TO vanstro_migrator;
RESET ROLE;
CREATE FUNCTION public.guard_media_retry_kid_registry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $guard_media_retry_kid_registry$
BEGIN
  IF current_user <> 'vanstro_media_guard_owner' THEN
    RAISE EXCEPTION 'media retry kid registry owner boundary violated';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('vanstro:media-retry-kid:v1:' || NEW."commandKeyKid", 0)
  );
  RETURN NEW;
END
$guard_media_retry_kid_registry$;

CREATE FUNCTION public.guard_media_hmac_kid_retirement_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $guard_media_hmac_kid_retirement_write$
BEGIN
  IF current_user <> 'vanstro_media_guard_owner' THEN
    RAISE EXCEPTION 'media HMAC kid retirement owner boundary violated';
  END IF;
  IF OLD."kid" IS DISTINCT FROM NEW."kid"
     OR OLD."createdAt" IS DISTINCT FROM NEW."createdAt"
     OR NEW."lastCommandExpiresAt" < OLD."lastCommandExpiresAt"
     OR NEW."removeAfter" < OLD."removeAfter"
     OR NEW."removeAfter" <> NEW."lastCommandExpiresAt" + interval '1 day'
     OR NEW."revision" <> OLD."revision" + 1
     OR NEW."updatedAt" < OLD."updatedAt" THEN
    RAISE EXCEPTION 'invalid media HMAC kid retirement update';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('vanstro:media-retry-kid:v1:' || NEW."kid", 0)
  );
  RETURN NEW;
END
$guard_media_hmac_kid_retirement_write$;

DROP TRIGGER IF EXISTS media_retry_command_kid_registry_guard ON public.media_retry_commands;
CREATE TRIGGER media_retry_command_kid_registry_guard
BEFORE INSERT ON public.media_retry_commands
FOR EACH ROW EXECUTE FUNCTION public.guard_media_retry_kid_registry();

DROP TRIGGER IF EXISTS media_hmac_kid_retirement_write_guard ON public.media_hmac_kid_retirements;
CREATE TRIGGER media_hmac_kid_retirement_write_guard
BEFORE UPDATE ON public.media_hmac_kid_retirements
FOR EACH ROW EXECUTE FUNCTION public.guard_media_hmac_kid_retirement_write();

DROP TRIGGER IF EXISTS media_hmac_kid_retirement_delete_guard ON public.media_hmac_kid_retirements;
CREATE TRIGGER media_hmac_kid_retirement_delete_guard
BEFORE DELETE ON public.media_hmac_kid_retirements
FOR EACH ROW EXECUTE FUNCTION public.guard_media_evidence_delete();

CREATE FUNCTION public.media_cleanup_retry_retention(batch_limit integer, expected_now timestamptz)
RETURNS TABLE ("commandsDeleted" bigint, "retirementsDeleted" bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $media_cleanup_retry_retention$
DECLARE
  phase_nonce uuid := pg_catalog.gen_random_uuid();
  command_count bigint := 0;
  retirement_count bigint := 0;
  candidate record;
  locked_kid text;
BEGIN
  IF batch_limit IS NULL OR batch_limit < 1 OR batch_limit > 100 OR expected_now IS NULL
     OR pg_catalog.abs(pg_catalog.date_part('epoch', expected_now - CURRENT_TIMESTAMP)) > 5 THEN
    RAISE EXCEPTION 'invalid media retry retention request';
  END IF;

  -- Keep cleanup bounded even when another retention/insertion transaction owns a required lock.
  PERFORM pg_catalog.set_config('lock_timeout', '1500ms', true);
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('vanstro:media-retry-retention:v1', 0)
  );

  INSERT INTO public.media_guard_delete_phases ("backendPid", "transactionId", "phase", "nonce")
  VALUES (pg_catalog.pg_backend_pid(), pg_catalog.txid_current(), 'retention', phase_nonce);
  PERFORM pg_catalog.set_config('vanstro.media_delete_phase', 'retention', true);
  PERFORM pg_catalog.set_config('vanstro.media_delete_nonce', phase_nonce::text, true);

  WITH eligible AS (
    SELECT command."id"
    FROM public.media_retry_commands command
    WHERE command."expiresAt" <= CURRENT_TIMESTAMP
    ORDER BY command."expiresAt", command."id"
    FOR UPDATE SKIP LOCKED
    LIMIT batch_limit
  ), deleted AS (
    DELETE FROM public.media_retry_commands command
    USING eligible
    WHERE command."id" = eligible."id"
    RETURNING 1
  )
  SELECT pg_catalog.count(*) INTO command_count FROM deleted;

  FOR candidate IN
    SELECT retirement."kid"
    FROM public.media_hmac_kid_retirements retirement
    WHERE retirement."removeAfter" + interval '30 days' <= CURRENT_TIMESTAMP
      AND NOT EXISTS (
        SELECT 1 FROM public.media_retry_commands command
        WHERE command."commandKeyKid" = retirement."kid"
      )
    ORDER BY retirement."removeAfter", retirement."kid"
    LIMIT batch_limit
  LOOP
    IF NOT pg_catalog.pg_try_advisory_xact_lock(
      pg_catalog.hashtextextended('vanstro:media-retry-kid:v1:' || candidate."kid", 0)
    ) THEN
      CONTINUE;
    END IF;

    SELECT retirement."kid" INTO locked_kid
    FROM public.media_hmac_kid_retirements retirement
    WHERE retirement."kid" = candidate."kid"
      AND retirement."removeAfter" + interval '30 days' <= CURRENT_TIMESTAMP
      AND NOT EXISTS (
        SELECT 1 FROM public.media_retry_commands command
        WHERE command."commandKeyKid" = retirement."kid"
      )
    FOR UPDATE SKIP LOCKED;

    IF locked_kid IS NOT NULL THEN
      DELETE FROM public.media_hmac_kid_retirements retirement
      WHERE retirement."kid" = locked_kid;
      retirement_count := retirement_count + 1;
      locked_kid := NULL;
    END IF;
  END LOOP;

  DELETE FROM public.media_guard_delete_phases
  WHERE "backendPid" = pg_catalog.pg_backend_pid()
    AND "transactionId" = pg_catalog.txid_current()
    AND "phase" = 'retention' AND "nonce" = phase_nonce;
  PERFORM pg_catalog.set_config('vanstro.media_delete_phase', '', true);
  PERFORM pg_catalog.set_config('vanstro.media_delete_nonce', '', true);

  RETURN QUERY SELECT command_count, retirement_count;
END
$media_cleanup_retry_retention$;

REVOKE ALL ON FUNCTION public.guard_media_retry_kid_registry() FROM PUBLIC, vanstro_runtime, vanstro_migrator;
REVOKE ALL ON FUNCTION public.guard_media_hmac_kid_retirement_write() FROM PUBLIC, vanstro_runtime, vanstro_migrator;
REVOKE ALL ON FUNCTION public.media_cleanup_retry_retention(integer, timestamptz) FROM PUBLIC, vanstro_runtime, vanstro_migrator;
SET ROLE vanstro_media_guard_owner;
REVOKE ALL ON FUNCTION public.guard_media_evidence_delete() FROM PUBLIC, vanstro_runtime, vanstro_migrator;
REVOKE ALL ON FUNCTION public.media_internal_retention_delete(text, uuid) FROM PUBLIC, vanstro_runtime;
RESET ROLE;

ALTER FUNCTION public.guard_media_retry_kid_registry() OWNER TO vanstro_media_guard_owner;
ALTER FUNCTION public.guard_media_hmac_kid_retirement_write() OWNER TO vanstro_media_guard_owner;
ALTER FUNCTION public.media_cleanup_retry_retention(integer, timestamptz) OWNER TO vanstro_media_guard_owner;
REVOKE CREATE ON SCHEMA public FROM vanstro_media_guard_owner;

REVOKE UPDATE, DELETE ON TABLE public.media_retry_commands
FROM PUBLIC, vanstro_runtime, vanstro_migrator;
REVOKE DELETE ON TABLE public.media_hmac_kid_retirements
FROM PUBLIC, vanstro_runtime, vanstro_migrator;
-- UPDATE is required by PostgreSQL for SELECT ... FOR UPDATE; owner-only trigger/function boundaries prevent arbitrary writes.
GRANT SELECT, UPDATE, DELETE ON TABLE public.media_retry_commands, public.media_hmac_kid_retirements
TO vanstro_media_guard_owner;

SET ROLE vanstro_media_guard_owner;
GRANT EXECUTE ON FUNCTION public.media_cleanup_retry_retention(integer, timestamptz) TO vanstro_runtime;
RESET ROLE;

DO $migration60_post_assertions$
DECLARE
  object_name text;
  runtime_owned_object_count bigint;
BEGIN
  IF pg_catalog.has_function_privilege('public', 'public.media_cleanup_retry_retention(integer,timestamptz)', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('vanstro_runtime', 'public.media_cleanup_retry_retention(integer,timestamptz)', 'EXECUTE')
     OR pg_catalog.has_function_privilege('vanstro_migrator', 'public.media_cleanup_retry_retention(integer,timestamptz)', 'EXECUTE')
     OR pg_catalog.has_function_privilege('vanstro_runtime', 'public.media_internal_retention_delete(text,uuid)', 'EXECUTE')
     OR pg_catalog.has_function_privilege('vanstro_runtime', 'public.guard_media_retry_kid_registry()', 'EXECUTE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.media_retry_commands', 'UPDATE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.media_retry_commands', 'DELETE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.media_hmac_kid_retirements', 'DELETE')
     OR pg_catalog.has_table_privilege('vanstro_migrator', 'public.media_retry_commands', 'DELETE')
     OR pg_catalog.has_table_privilege('vanstro_migrator', 'public.media_hmac_kid_retirements', 'DELETE')
     OR pg_catalog.has_schema_privilege('vanstro_media_guard_owner', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'migration 60 function/table grants do not match the frozen boundary';
  END IF;

  SELECT pg_catalog.count(*) INTO runtime_owned_object_count
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = relation.relowner
  WHERE namespace.nspname = 'public'
    AND (relation.relname LIKE 'media\_%' ESCAPE '\' OR relation.relname = 'async_jobs')
    AND owner_role.rolname = 'vanstro_runtime';
  IF runtime_owned_object_count <> 0 THEN
    RAISE EXCEPTION 'migration 60 runtime must not own Media objects';
  END IF;

  FOR object_name IN SELECT unnest(ARRAY[
    'guard_media_evidence_delete', 'guard_media_retry_kid_registry',
    'guard_media_hmac_kid_retirement_write', 'media_internal_retention_delete', 'media_cleanup_retry_retention'
  ]) LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc procedure
      JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
      JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = procedure.proowner
      WHERE namespace.nspname = 'public'
        AND procedure.proname = object_name
        AND owner_role.rolname = 'vanstro_media_guard_owner'
        AND procedure.prosecdef
        AND procedure.proconfig @> ARRAY['search_path=pg_catalog, public']::text[]
    ) THEN
      RAISE EXCEPTION 'migration 60 owner/security/search_path mismatch for %', object_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger trigger
    WHERE trigger.tgrelid = 'public.media_retry_commands'::pg_catalog.regclass
      AND trigger.tgname = 'media_retry_command_kid_registry_guard' AND NOT trigger.tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger trigger
    WHERE trigger.tgrelid = 'public.media_hmac_kid_retirements'::pg_catalog.regclass
      AND trigger.tgname = 'media_hmac_kid_retirement_delete_guard' AND NOT trigger.tgisinternal
  ) THEN
    RAISE EXCEPTION 'migration 60 required triggers are absent';
  END IF;
END
$migration60_post_assertions$;
