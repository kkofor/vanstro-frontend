-- P07 v1.13 migration 62: forward-only Audit metadata correction for source-operation binding.
-- Migrations 56-61 are immutable. No schema, status, FK, or processing authority is added.

DO $migration62_role_assertions$
DECLARE
  role_row record;
BEGIN
  IF current_user <> 'vanstro_migrator' OR session_user <> 'vanstro_migrator' THEN
    RAISE EXCEPTION 'migration 62 must run directly as vanstro_migrator';
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
      RAISE EXCEPTION 'migration 62 role topology mismatch for %', role_row.name;
    END IF;
  END LOOP;
  IF pg_catalog.pg_has_role('vanstro_runtime', 'vanstro_migrator', 'MEMBER')
     OR pg_catalog.pg_has_role('vanstro_runtime', 'vanstro_media_guard_owner', 'MEMBER')
     OR pg_catalog.pg_has_role('vanstro_migrator', 'vanstro_runtime', 'MEMBER')
     OR pg_catalog.pg_has_role('vanstro_media_guard_owner', 'vanstro_runtime', 'MEMBER')
     OR NOT pg_catalog.pg_has_role('vanstro_migrator', 'vanstro_media_guard_owner', 'MEMBER') THEN
    RAISE EXCEPTION 'migration 62 role membership topology mismatch';
  END IF;
  IF pg_catalog.has_database_privilege('vanstro_runtime', current_database(), 'CREATE')
     OR pg_catalog.has_schema_privilege('vanstro_runtime', 'public', 'CREATE')
     OR pg_catalog.has_schema_privilege(0, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'migration 62 runtime/PUBLIC create privileges must be revoked';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class relation
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
    JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = relation.relowner
    WHERE namespace.nspname = 'public'
      AND (relation.relname LIKE 'media\_%' ESCAPE '\' OR relation.relname = 'async_jobs')
      AND owner_role.rolname = 'vanstro_runtime'
  ) THEN
    RAISE EXCEPTION 'migration 62 runtime must not own Media objects';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc procedure
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
    JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = procedure.proowner
    WHERE namespace.nspname = 'public'
      AND procedure.oid = 'public.guard_media_storage_operation_update()'::pg_catalog.regprocedure
      AND owner_role.rolname = 'vanstro_media_guard_owner' AND procedure.prosecdef
  ) THEN
    RAISE EXCEPTION 'migration 62 requires the migration 59 guard boundary';
  END IF;
END
$migration62_role_assertions$;

REVOKE UPDATE ON TABLE public.async_jobs, public.media_storage_operations FROM vanstro_media_guard_owner;
GRANT UPDATE ("version") ON TABLE public.async_jobs TO vanstro_media_guard_owner;
GRANT UPDATE ("jobId", "version", "updatedAt") ON TABLE public.media_storage_operations TO vanstro_media_guard_owner;
GRANT USAGE, CREATE ON SCHEMA public TO vanstro_media_guard_owner;
SET ROLE vanstro_media_guard_owner;

CREATE OR REPLACE FUNCTION public.guard_media_storage_operation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $guard_media_storage_operation_update$
DECLARE
  changed text[] := public.media_changed_columns(to_jsonb(OLD), to_jsonb(NEW));
  business_changed text[] := array_remove(array_remove(changed, 'version'), 'updatedAt');
  allowed text[];
  marker_nonce uuid;
  marker_audit_event_id uuid;
  marker_request_id text;
BEGIN
  IF current_user <> 'vanstro_media_guard_owner' THEN
    RAISE EXCEPTION 'media storage operation guard owner boundary violated';
  END IF;
  IF NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'media storage operation version must increment exactly once';
  END IF;
  IF business_changed = ARRAY[]::text[] THEN
    RAISE EXCEPTION 'media storage operation no-op/version-only update is forbidden';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['state','cleanupStatus','cleanupReason','byteCount','checksum','expiresAt','jobId','version','updatedAt'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['state','cleanupStatus','cleanupReason','byteCount','checksum','expiresAt','jobId','version','updatedAt']) THEN
    RAISE EXCEPTION 'media storage operation immutable identity/provider/object-key/relation field changed';
  END IF;

  IF OLD."jobId" IS NULL AND NEW."jobId" IS NOT NULL THEN
    BEGIN
      marker_nonce := pg_catalog.current_setting('vanstro.media_binding_nonce', true)::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'direct media source operation Job binding is forbidden';
    END;
    SELECT phase."auditEventId" INTO marker_audit_event_id
    FROM public.media_guard_binding_phases phase
    WHERE phase."backendPid" = pg_catalog.pg_backend_pid()
      AND phase."transactionId" = pg_catalog.txid_current()
      AND phase."operationId" = OLD."id" AND phase."jobId" = NEW."jobId"
      AND phase."nonce" = marker_nonce;
    IF marker_audit_event_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM public.audit_events event
         WHERE event."id" = marker_audit_event_id
           AND event.xmin::text::bigint = pg_catalog.txid_current()
           AND event."resourceType" = 'media_storage_operation'
           AND event."resourceId" = OLD."id"::text
           AND event."action" = 'update' AND event."result" = 'succeeded'
           AND event."authorizationScopeKind" = OLD."authorizationScopeKind"
           AND event."dealerIds" = OLD."dealerIds" AND event."locationIds" = OLD."locationIds"
           AND event."metadata"->'entries'->>'objectRole' = 'upload_staging'
           AND event."metadata"->'entries'->>'fromState' = 'written_unbound'
           AND event."metadata"->'entries'->>'toState' = 'written_bound'
       )
       OR OLD."state" <> 'written' OR NEW."state" <> 'written'
       OR OLD."objectRole" <> 'upload_staging' OR OLD."uploadIntentId" IS NULL
       OR OLD."cleanupStatus" <> 'none' OR NEW."cleanupStatus" <> 'none'
       OR OLD."jobRetryGeneration" IS NOT NULL OR OLD."jobAttempt" IS NOT NULL OR OLD."leaseRevision" IS NOT NULL
       OR NOT EXISTS (
         SELECT 1 FROM public.async_jobs job
         WHERE job."id" = NEW."jobId"
           AND job."jobType" = 'media.process' AND job."jobTypeVersion" = 'media.process.v1'
           AND job."status" = 'queued' AND job."retryGeneration" = 0
           AND job."attempt" = 0 AND job."generationAttempt" = 0
           AND job."authorizationScopeKind" = OLD."authorizationScopeKind"
           AND job."dealerIds" = OLD."dealerIds" AND job."locationIds" = OLD."locationIds"
           AND job."payload"->>'assetId' = OLD."assetId"::text
           AND job."payload"->>'selectedUploadOperationId' = OLD."id"::text
           AND job."payload"->>'sourceChecksum' = OLD."sourceChecksum"
           AND job."payload"->>'processingConfigHash' = OLD."processingConfigHash"
           AND (job."payload"->>'expectedAssetVersion')::integer = OLD."expectedAssetVersion" + 1
           AND job."bindingRevision" = 0
           AND job."executionBinding"->>'schemaVersion' = 'media-process-binding.v1'
           AND (job."executionBinding"->>'bindingRevision')::integer = 0
           AND (job."executionBinding"->>'retryGeneration')::integer = 0
           AND (job."executionBinding"->>'expectedAssetVersion')::integer = OLD."expectedAssetVersion" + 1
           AND job."executionBinding"->>'variantSetState' = 'unresolved'
           AND EXISTS (
             SELECT 1 FROM public.media_assets asset
             WHERE asset."id" = OLD."assetId" AND asset."status" = 'processing'
               AND asset."version" = OLD."expectedAssetVersion" + 1
               AND asset."authorizationScopeKind" = OLD."authorizationScopeKind"
               AND asset."dealerIds" = OLD."dealerIds" AND asset."locationIds" = OLD."locationIds"
           )
           AND 1 = (
             SELECT pg_catalog.count(*) FROM public.media_variants variant
             WHERE variant."assetId" = OLD."assetId" AND variant."role" = 'original'
               AND variant."status" = 'processing' AND variant."storageOperationId" = OLD."id"
               AND variant."sourceAssetVersion" = OLD."expectedAssetVersion" + 1
           )
       ) THEN
      RAISE EXCEPTION 'invalid media source operation Job binding';
    END IF;
    allowed := ARRAY['jobId'];
  ELSIF OLD."jobId" IS NOT NULL AND NEW."jobId" IS DISTINCT FROM OLD."jobId" THEN
    RAISE EXCEPTION 'media source operation Job binding is immutable';
  ELSIF OLD."state"='prepared' AND NEW."state"='writing' THEN allowed := ARRAY['state'];
  ELSIF OLD."state"='writing' AND NEW."state"='written' AND NEW."byteCount" IS NOT NULL AND NEW."checksum" IS NOT NULL THEN allowed := ARRAY['state','byteCount','checksum'];
  ELSIF OLD."state"='written' AND NEW."state"='selected' THEN allowed := ARRAY['state'];
  ELSIF OLD."state" IN ('prepared','writing','written') AND NEW."state"='cleanup_required' AND NEW."cleanupStatus"='required' THEN allowed := ARRAY['state','cleanupStatus','cleanupReason','expiresAt'];
  ELSIF OLD."state"='selected' AND NEW."state"='superseded'
        AND NOT EXISTS (SELECT 1 FROM public.media_variants variant WHERE variant."storageOperationId"=OLD."id") THEN allowed := ARRAY['state'];
  ELSIF OLD."state"='selected' AND NEW."state"='retiring'
        AND NOT EXISTS (SELECT 1 FROM public.media_variants variant WHERE variant."storageOperationId"=OLD."id") THEN allowed := ARRAY['state','cleanupReason','expiresAt'];
  ELSIF OLD."state" IN ('superseded','retiring') AND NEW."state"='cleanup_required' AND NEW."cleanupStatus"='required' THEN allowed := ARRAY['state','cleanupStatus','cleanupReason','expiresAt'];
  ELSIF OLD."state"='cleanup_required' AND NEW."state"='delete_evidence_required' AND NEW."cleanupStatus"='evidence_required' THEN allowed := ARRAY['state','cleanupStatus','cleanupReason'];
  ELSIF OLD."state" IN ('cleanup_required','delete_evidence_required') AND NEW."state"='cleaned' AND NEW."cleanupStatus"='complete'
        AND NOT EXISTS (SELECT 1 FROM public.media_variants variant WHERE variant."storageOperationId"=OLD."id") THEN allowed := ARRAY['state','cleanupStatus','cleanupReason'];
  ELSE
    RAISE EXCEPTION 'illegal media storage operation state transition';
  END IF;
  IF NOT business_changed <@ allowed
     OR (allowed = ARRAY['jobId'] AND business_changed <> ARRAY['jobId'])
     OR (allowed <> ARRAY['jobId'] AND NOT ('state' = ANY(business_changed))) THEN
    RAISE EXCEPTION 'invalid or mixed media storage operation transition family';
  END IF;
  RETURN NEW;
END
$guard_media_storage_operation_update$;

CREATE OR REPLACE FUNCTION public.media_bind_source_operation_job(
  operation_id uuid,
  job_id uuid,
  expected_operation_version integer,
  expected_job_version integer,
  audit_event_id uuid
)
RETURNS TABLE("bound" boolean, "operationVersion" integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $media_bind_source_operation_job$
DECLARE
  operation_row public.media_storage_operations%ROWTYPE;
  job_row public.async_jobs%ROWTYPE;
  phase_nonce uuid := pg_catalog.gen_random_uuid();
BEGIN
  IF operation_id IS NULL OR job_id IS NULL OR audit_event_id IS NULL
     OR expected_operation_version IS NULL OR expected_operation_version < 0
     OR expected_job_version IS NULL OR expected_job_version < 0 THEN
    RAISE EXCEPTION 'media source operation binding arguments invalid';
  END IF;
  SELECT * INTO operation_row FROM public.media_storage_operations
  WHERE "id" = operation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'media source operation binding conflict'; END IF;
  SELECT * INTO job_row FROM public.async_jobs WHERE "id"=job_id FOR UPDATE;
  IF NOT FOUND OR job_row."version" <> expected_job_version THEN
    RAISE EXCEPTION 'media source operation Job version conflict';
  END IF;
  IF operation_row."jobId" = job_id THEN
    IF operation_row."state" <> 'written' OR operation_row."objectRole" <> 'upload_staging'
       OR operation_row."cleanupStatus" <> 'none'
       OR operation_row."version" <> expected_operation_version + 1
       OR job_row."status" <> 'queued' OR job_row."retryGeneration" <> 0
       OR job_row."attempt" <> 0 OR job_row."generationAttempt" <> 0 THEN
      RAISE EXCEPTION 'media source operation binding replay conflict';
    END IF;
    RETURN QUERY SELECT false, operation_row."version";
    RETURN;
  ELSIF operation_row."jobId" IS NOT NULL OR operation_row."version" <> expected_operation_version THEN
    RAISE EXCEPTION 'media source operation binding conflict';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.media_upload_intents intent
    WHERE intent."id"=operation_row."uploadIntentId" AND intent."assetId"=operation_row."assetId"
      AND intent."operationId"=operation_row."id" AND intent."status"='claimed'
      AND intent."leaseExpiresAt">CURRENT_TIMESTAMP
  ) THEN
    RAISE EXCEPTION 'media source operation upload intent conflict';
  END IF;
  INSERT INTO public.media_guard_binding_phases
    ("backendPid","transactionId","operationId","jobId","auditEventId","nonce")
  VALUES (pg_catalog.pg_backend_pid(),pg_catalog.txid_current(),operation_id,job_id,audit_event_id,phase_nonce);
  PERFORM pg_catalog.set_config('vanstro.media_binding_nonce',phase_nonce::text,true);
  UPDATE public.media_storage_operations SET "jobId"=job_id,"version"="version"+1,"updatedAt"=CURRENT_TIMESTAMP
  WHERE "id"=operation_id AND "version"=expected_operation_version AND "jobId" IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'media source operation binding conflict'; END IF;
  DELETE FROM public.media_guard_binding_phases
  WHERE "backendPid"=pg_catalog.pg_backend_pid() AND "transactionId"=pg_catalog.txid_current()
    AND "operationId"=operation_id AND "nonce"=phase_nonce;
  PERFORM pg_catalog.set_config('vanstro.media_binding_nonce','',true);
  RETURN QUERY SELECT true, expected_operation_version+1;
END
$media_bind_source_operation_job$;

REVOKE ALL ON FUNCTION public.guard_media_storage_operation_update() FROM PUBLIC, vanstro_runtime;
REVOKE ALL ON FUNCTION public.media_bind_source_operation_job(uuid,uuid,integer,integer,uuid) FROM PUBLIC, vanstro_migrator, vanstro_runtime;
ALTER FUNCTION public.media_bind_source_operation_job(uuid,uuid,integer,integer,uuid) OWNER TO vanstro_media_guard_owner;
GRANT EXECUTE ON FUNCTION public.media_bind_source_operation_job(uuid,uuid,integer,integer,uuid) TO vanstro_runtime;
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM vanstro_media_guard_owner;

-- Strict runtime may append retry commands, but replay/readiness reads cross the
-- guard-owner boundary through bounded, non-sensitive projections only.
GRANT USAGE, CREATE ON SCHEMA public TO vanstro_media_guard_owner;
SET ROLE vanstro_media_guard_owner;

CREATE FUNCTION public.media_retry_required_kids()
RETURNS TABLE(kid text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $media_retry_required_kids$
DECLARE
  required_count integer;
BEGIN
  IF current_user <> 'vanstro_media_guard_owner' THEN
    RAISE EXCEPTION 'media retry read owner boundary violated';
  END IF;
  SELECT pg_catalog.count(*) INTO required_count
  FROM (
    SELECT command."commandKeyKid" AS kid
    FROM public.media_retry_commands command
    WHERE command."expiresAt" > CURRENT_TIMESTAMP
    UNION
    SELECT retirement."kid"
    FROM public.media_hmac_kid_retirements retirement
    WHERE retirement."removeAfter" > CURRENT_TIMESTAMP
  ) required;
  IF required_count > 64 THEN
    RAISE EXCEPTION 'media retry required kid bound exceeded';
  END IF;
  RETURN QUERY
  SELECT required.kid
  FROM (
    SELECT command."commandKeyKid" AS kid
    FROM public.media_retry_commands command
    WHERE command."expiresAt" > CURRENT_TIMESTAMP
    UNION
    SELECT retirement."kid"
    FROM public.media_hmac_kid_retirements retirement
    WHERE retirement."removeAfter" > CURRENT_TIMESTAMP
  ) required
  ORDER BY required.kid;
END
$media_retry_required_kids$;

CREATE FUNCTION public.media_find_retry_command(
  asset_id uuid,
  job_id uuid,
  actor_id text,
  context_revision text,
  scope_kind text,
  dealer_ids jsonb,
  location_ids jsonb,
  command_hashes text[]
)
RETURNS TABLE(
  "id" uuid,
  "intentHash" text,
  "responseProjection" jsonb,
  "expiresAt" timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $media_find_retry_command$
BEGIN
  IF current_user <> 'vanstro_media_guard_owner' THEN
    RAISE EXCEPTION 'media retry read owner boundary violated';
  END IF;
  IF asset_id IS NULL OR job_id IS NULL OR actor_id IS NULL OR actor_id = ''
     OR context_revision IS NULL OR context_revision = ''
     OR scope_kind NOT IN ('global','dealer','location')
     OR pg_catalog.jsonb_typeof(dealer_ids) <> 'array'
     OR pg_catalog.jsonb_typeof(location_ids) <> 'array'
     OR (scope_kind = 'global' AND (dealer_ids <> '[]'::jsonb OR location_ids <> '[]'::jsonb))
     OR (scope_kind = 'dealer' AND (pg_catalog.jsonb_array_length(dealer_ids) = 0 OR location_ids <> '[]'::jsonb))
     OR (scope_kind = 'location' AND (pg_catalog.jsonb_array_length(dealer_ids) = 0 OR pg_catalog.jsonb_array_length(location_ids) = 0))
     OR command_hashes IS NULL OR pg_catalog.cardinality(command_hashes) < 1
     OR pg_catalog.cardinality(command_hashes) > 16
     OR EXISTS (SELECT 1 FROM pg_catalog.unnest(command_hashes) hash WHERE hash !~ '^[A-Za-z0-9_-]{43}$') THEN
    RAISE EXCEPTION 'media retry command lookup arguments invalid';
  END IF;
  RETURN QUERY
  SELECT command."id", command."intentHash", command."responseProjection", command."expiresAt"
  FROM public.media_retry_commands command
  WHERE command."contractVersion" = 'media-retry-command.v1'
    AND command."assetId" = asset_id AND command."jobId" = job_id
    AND command."actorId" = actor_id AND command."contextRevision" = context_revision
    AND command."authorizationScopeKind" = scope_kind
    AND command."dealerIds" = dealer_ids AND command."locationIds" = location_ids
    AND command."commandKeyHash" = ANY(command_hashes)
  ORDER BY command."createdAt" DESC, command."id" DESC
  LIMIT 1;
END
$media_find_retry_command$;

REVOKE ALL ON FUNCTION public.media_retry_required_kids() FROM PUBLIC, vanstro_migrator, vanstro_runtime;
REVOKE ALL ON FUNCTION public.media_find_retry_command(uuid,uuid,text,text,text,jsonb,jsonb,text[]) FROM PUBLIC, vanstro_migrator, vanstro_runtime;
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM vanstro_media_guard_owner;
ALTER FUNCTION public.media_retry_required_kids() OWNER TO vanstro_media_guard_owner;
ALTER FUNCTION public.media_find_retry_command(uuid,uuid,text,text,text,jsonb,jsonb,text[]) OWNER TO vanstro_media_guard_owner;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.media_retry_commands FROM vanstro_runtime;
GRANT INSERT ON TABLE public.media_retry_commands TO vanstro_runtime;
SET ROLE vanstro_media_guard_owner;
GRANT EXECUTE ON FUNCTION public.media_retry_required_kids() TO vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.media_find_retry_command(uuid,uuid,text,text,text,jsonb,jsonb,text[]) TO vanstro_runtime;
RESET ROLE;

DO $migration62_post_assertions$
BEGIN
  IF pg_catalog.has_function_privilege('public', 'public.guard_media_storage_operation_update()', 'EXECUTE')
     OR pg_catalog.has_function_privilege('vanstro_runtime', 'public.guard_media_storage_operation_update()', 'EXECUTE')
     OR pg_catalog.has_schema_privilege('vanstro_media_guard_owner', 'public', 'CREATE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.media_guard_binding_phases', 'SELECT')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.media_retry_commands', 'SELECT')
     OR NOT pg_catalog.has_table_privilege('vanstro_runtime', 'public.media_retry_commands', 'INSERT')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.media_retry_commands', 'UPDATE')
     OR pg_catalog.has_table_privilege('vanstro_runtime', 'public.media_retry_commands', 'DELETE')
     OR EXISTS (
       SELECT 1 FROM pg_catalog.pg_class relation
       JOIN pg_catalog.pg_namespace namespace ON namespace.oid=relation.relnamespace
       JOIN pg_catalog.pg_roles owner_role ON owner_role.oid=relation.relowner
       WHERE namespace.nspname='public' AND relation.relname='media_retry_commands'
         AND owner_role.rolname='vanstro_runtime'
     )
     OR NOT pg_catalog.has_function_privilege('vanstro_runtime', 'public.media_retry_required_kids()', 'EXECUTE')
     OR pg_catalog.has_function_privilege('public', 'public.media_retry_required_kids()', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('vanstro_runtime', 'public.media_find_retry_command(uuid,uuid,text,text,text,jsonb,jsonb,text[])', 'EXECUTE')
     OR pg_catalog.has_function_privilege('public', 'public.media_find_retry_command(uuid,uuid,text,text,text,jsonb,jsonb,text[])', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('vanstro_runtime', 'public.media_bind_source_operation_job(uuid,uuid,integer,integer,uuid)', 'EXECUTE')
     OR pg_catalog.has_function_privilege('public', 'public.media_bind_source_operation_job(uuid,uuid,integer,integer,uuid)', 'EXECUTE')
     OR NOT pg_catalog.has_table_privilege('vanstro_media_guard_owner', 'public.async_jobs', 'SELECT')
     OR NOT pg_catalog.has_column_privilege('vanstro_media_guard_owner', 'public.async_jobs', 'version', 'UPDATE')
     OR NOT pg_catalog.has_column_privilege('vanstro_media_guard_owner', 'public.media_storage_operations', 'jobId', 'UPDATE')
     OR NOT pg_catalog.has_column_privilege('vanstro_media_guard_owner', 'public.media_storage_operations', 'version', 'UPDATE')
     OR NOT pg_catalog.has_column_privilege('vanstro_media_guard_owner', 'public.media_storage_operations', 'updatedAt', 'UPDATE')
     OR pg_catalog.has_column_privilege('vanstro_media_guard_owner', 'public.media_storage_operations', 'state', 'UPDATE')
     OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_proc procedure
       JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = procedure.proowner
       WHERE procedure.oid = 'public.guard_media_storage_operation_update()'::pg_catalog.regprocedure
         AND owner_role.rolname = 'vanstro_media_guard_owner' AND procedure.prosecdef
         AND procedure.proconfig @> ARRAY['search_path=pg_catalog, public']::text[]
     ) OR EXISTS (
       SELECT 1 FROM pg_catalog.pg_proc procedure
       JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = procedure.proowner
       WHERE procedure.oid IN (
         'public.media_retry_required_kids()'::pg_catalog.regprocedure,
         'public.media_find_retry_command(uuid,uuid,text,text,text,jsonb,jsonb,text[])'::pg_catalog.regprocedure
       ) AND (owner_role.rolname <> 'vanstro_media_guard_owner' OR NOT procedure.prosecdef
              OR NOT procedure.proconfig @> ARRAY['search_path=pg_catalog, public']::text[])
     ) OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_trigger trigger
       WHERE trigger.tgrelid = 'public.media_storage_operations'::pg_catalog.regclass
         AND trigger.tgname = 'media_storage_operation_update_guard' AND NOT trigger.tgisinternal
     ) OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_constraint constraint_row
       WHERE constraint_row.conrelid = 'public.media_storage_operations'::pg_catalog.regclass
         AND constraint_row.conname = 'media_storage_operations_jobId_fkey'
         AND constraint_row.contype = 'f' AND NOT constraint_row.condeferrable
     ) THEN
    RAISE EXCEPTION 'migration 62 guard ownership/grants/FK mismatch';
  END IF;
END
$migration62_post_assertions$;
