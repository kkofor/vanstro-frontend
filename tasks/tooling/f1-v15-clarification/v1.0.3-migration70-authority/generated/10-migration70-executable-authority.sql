BEGIN;

-- GENERATED — DO NOT EDIT
-- model SHA-256: 7d68c0a10c22fa5f758bb3d144132efce81123b035c417339211dd8eeb97beb8
-- status: FROZEN

SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT public.f1_consume_no_old_instances_v2(current_setting('vanstro.rollout_id'),current_setting('vanstro.environment'),current_setting('vanstro.manifest_digest'));
DO $$BEGIN IF EXISTS(SELECT 1 FROM public.runtime_config_version WHERE "authorityVersion">=2 AND "successAuditEventId" IS NULL) THEN RAISE EXCEPTION 'CONFIG_AUDIT_PRECHECK';END IF;END$$;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_version_authority2_audit_required CHECK ("authorityVersion"<2 OR "successAuditEventId" IS NOT NULL) NOT VALID;
ALTER TABLE public.runtime_config_version VALIDATE CONSTRAINT runtime_config_version_authority2_audit_required;
ALTER TABLE public.feature_flag_version ADD CONSTRAINT feature_flag_version_authority2_audit_required CHECK ("authorityVersion"<2 OR "successAuditEventId" IS NOT NULL) NOT VALID;
ALTER TABLE public.feature_flag_version VALIDATE CONSTRAINT feature_flag_version_authority2_audit_required;
ALTER TABLE public.analytics_foundation_event ADD CONSTRAINT analytics_foundation_event_authority2_audit_required CHECK ("authorityVersion"<2 OR "successAuditEventId" IS NOT NULL) NOT VALID;
ALTER TABLE public.analytics_foundation_event VALIDATE CONSTRAINT analytics_foundation_event_authority2_audit_required;
DO $$BEGIN IF EXISTS(SELECT 1 FROM public.f1_deployment_instance_attestation WHERE "rolloutId"=current_setting('vanstro.rollout_id')) OR NOT EXISTS(SELECT 1 FROM public.f1_deployment_attestation_consumption WHERE "rolloutId"=current_setting('vanstro.rollout_id')) THEN RAISE EXCEPTION 'ATTESTATION_CONSUME_POSTASSERT';END IF;END$$;

DO $source_latest$
BEGIN
  IF (SELECT count(*) FROM public.f1_source_migration_manifest) <> 68 THEN
    RAISE EXCEPTION 'F1_PHASE_B_SOURCE_LATEST_POSTASSERT';
  END IF;
END;
$source_latest$;

-- F1 v1.5 Phase B forward-only controlled read boundaries.  The two list
-- resources are explicit closed resolver tuples; no caller-supplied scope or
-- object identifier is trusted by these list functions.
SET LOCAL ROLE vanstro_p02_guard_owner;
ALTER TABLE public.f1_p02_resolver_registry
  DROP CONSTRAINT f1_p02_resolver_registry_closed_check;
RESET ROLE;

SET LOCAL ROLE vanstro_p02_guard_owner;
ALTER TABLE public.f1_p02_resolver_registry
  ADD CONSTRAINT f1_p02_resolver_registry_closed_check CHECK (
    ("resourceType", "resolverId", "tableName", "idSemantics", "operationKey", "permissionKey") IN (
      ('p08_import','resolver.p08_import','dashboard_import_batch','uuid','read','dashboard.import.foundation_sample.read'),
      ('p08_export','resolver.p08_export','dashboard_export_request','uuid','read','dashboard.export.foundation_sample.read'),
      ('p09_config','resolver.p09_config','runtime_config_version','row_uuid','read','config.read'),
      ('p09_flag','resolver.p09_flag','feature_flag_version','row_uuid','read','flags.read'),
      ('p09_config_list','resolver.p09_config_list','runtime_config_version','literal:latest-authorized','read','config.read'),
      ('p09_flag_list','resolver.p09_flag_list','feature_flag_version','literal:latest-authorized','read','flags.read'),
      ('p09_readiness_summary','resolver.p09_readiness_summary','worker_heartbeats','literal:worker-fleet','read','readiness.read_summary'),
      ('p09_readiness_detail','resolver.p09_readiness_detail','worker_heartbeats','literal:worker-fleet','read','readiness.read_detail'),
      ('p10_analytics_ingestion','resolver.p10_analytics_ingestion','foundation_sample','uuid','ingest','analytics.ingest'),
      ('p10_release_family','resolver.p10_release_family','analytics_foundation_release','six-field-family','read','analytics.release.read')
    )
  );
RESET ROLE;

INSERT INTO public.f1_p02_resolver_registry
  ("resourceType", "resolverId", "tableName", "idSemantics", "operationKey", "permissionKey")
VALUES
  ('p09_config_list','resolver.p09_config_list','runtime_config_version','literal:latest-authorized','read','config.read'),
  ('p09_flag_list','resolver.p09_flag_list','feature_flag_version','literal:latest-authorized','read','flags.read');

CREATE OR REPLACE FUNCTION public.p09_config_list_v3(
  session_token_hash text,
  expected_context_revision text,
  expected_scope_kind text,
  expected_dealer_ids text[],
  expected_location_ids text[]
) RETURNS TABLE(
  "configKey" text,
  "schemaVersion" text,
  "activeVersion" integer,
  "safeValue" jsonb,
  "updatedAt" timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $phase_b$
BEGIN
  IF expected_context_revision IS NULL THEN
    RAISE EXCEPTION 'P09_CONFIG_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (
      r."configKey", r."authorizationScopeKind",
      r."dealerIdsSnapshot", r."locationIdsSnapshot"
    ) r.*
    FROM public.runtime_config_version AS r
    WHERE r."contextRevision" = expected_context_revision
      AND r."activationStatus" = 'active'
      AND r."authorizationScopeKind" = expected_scope_kind
      AND r."dealerIdsSnapshot" = expected_dealer_ids
      AND r."locationIdsSnapshot" = expected_location_ids
    ORDER BY
      r."configKey" COLLATE "C" ASC,
      r."authorizationScopeKind" COLLATE "C" ASC,
      r."dealerIdsSnapshot" ASC,
      r."locationIdsSnapshot" ASC,
      r.generation DESC,
      r.version DESC,
      r."createdAt" DESC,
      r.id DESC
  ), authorized AS (
    SELECT l.*
    FROM latest AS l
    CROSS JOIN LATERAL public.p02_resolve_persisted_authority_v3(
      session_token_hash,
      'p09_config',
      l.id::text,
      'read',
      'config.read',
      expected_context_revision,
      l.generation
    ) AS a
    WHERE a.outcome = 'authorized'
  )
  SELECT
    a."configKey",
    a."schemaVersion",
    a.version,
    a."effectiveValue",
    COALESCE(a."activatedAt", a."createdAt")
  FROM authorized AS a
  ORDER BY
    a."configKey" COLLATE "C" ASC,
    a."authorizationScopeKind" COLLATE "C" ASC,
    a."dealerIdsSnapshot" ASC,
    a."locationIdsSnapshot" ASC,
    a.id ASC;
END;
$phase_b$;

CREATE OR REPLACE FUNCTION public.p09_flag_list_v3(
  session_token_hash text,
  expected_context_revision text,
  expected_scope_kind text,
  expected_dealer_ids text[],
  expected_location_ids text[]
) RETURNS TABLE(
  "flagKey" text,
  "schemaVersion" text,
  "activeState" text,
  "version" integer,
  "updatedAt" timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $phase_b$
BEGIN
  IF expected_context_revision IS NULL THEN
    RAISE EXCEPTION 'P09_FLAG_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (
      r."flagKey", r."authorizationScopeKind",
      r."dealerIdsSnapshot", r."locationIdsSnapshot"
    ) r.*
    FROM public.feature_flag_version AS r
    WHERE r."contextRevision" = expected_context_revision
      AND r."activationStatus" = 'active'
      AND r."authorizationScopeKind" = expected_scope_kind
      AND r."dealerIdsSnapshot" = expected_dealer_ids
      AND r."locationIdsSnapshot" = expected_location_ids
    ORDER BY
      r."flagKey" COLLATE "C" ASC,
      r."authorizationScopeKind" COLLATE "C" ASC,
      r."dealerIdsSnapshot" ASC,
      r."locationIdsSnapshot" ASC,
      r.generation DESC,
      r.version DESC,
      r."createdAt" DESC,
      r.id DESC
  ), authorized AS (
    SELECT l.*
    FROM latest AS l
    CROSS JOIN LATERAL public.p02_resolve_persisted_authority_v3(
      session_token_hash,
      'p09_flag',
      l.id::text,
      'read',
      'flags.read',
      expected_context_revision,
      l.generation
    ) AS a
    WHERE a.outcome = 'authorized'
  )
  SELECT
    a."flagKey",
    a."schemaVersion",
    a."effectiveState",
    a.version,
    COALESCE(a."activatedAt", a."createdAt")
  FROM authorized AS a
  ORDER BY
    a."flagKey" COLLATE "C" ASC,
    a."authorizationScopeKind" COLLATE "C" ASC,
    a."dealerIdsSnapshot" ASC,
    a."locationIdsSnapshot" ASC,
    a.id ASC;
END;
$phase_b$;

CREATE OR REPLACE FUNCTION public.p10_list_release_day_v3(
  session_token_hash text,
  release_day date,
  expected_context_revision text
) RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $phase_b$
DECLARE
  release_row public.analytics_foundation_release%ROWTYPE;
  authority record;
BEGIN
  IF release_day IS NULL OR expected_context_revision IS NULL THEN
    RAISE EXCEPTION 'P10_RELEASE_DENIED' USING ERRCODE = '42501';
  END IF;

  FOR release_row IN
    SELECT r.*
    FROM public.analytics_foundation_release AS r
    WHERE r."releaseDay" = release_day
      AND r."authorizationScopeKind" = 'global'
      AND r."fieldVisibilityProfile" = 'safe'
      AND r."authorityVersion" = 2
    ORDER BY
      r."metricDefinitionVersion" COLLATE "C" ASC,
      r."identityEpoch" COLLATE "C" ASC,
      r."suppressionPolicyVersion" COLLATE "C" ASC,
      r."fieldVisibilityProfile" COLLATE "C" ASC,
      r.id ASC
  LOOP
    SELECT * INTO authority
    FROM public.p02_resolve_persisted_authority_v3(
      session_token_hash,
      'p10_release_family',
      release_row."scopeFingerprint" || '|' || release_row."releaseDay"::text || '|' ||
        release_row."metricDefinitionVersion" || '|' || release_row."identityEpoch" || '|' ||
        release_row."suppressionPolicyVersion" || '|' || release_row."fieldVisibilityProfile",
      'read',
      'analytics.release.read',
      expected_context_revision,
      0::bigint
    );

    IF authority.outcome = 'authorized' THEN
      RETURN NEXT jsonb_build_object(
        'releaseId', release_row.id,
        'releaseDay', release_row."releaseDay",
        'metricDefinitionVersion', release_row."metricDefinitionVersion",
        'identityEpoch', release_row."identityEpoch",
        'suppressionPolicyVersion', release_row."suppressionPolicyVersion",
        'fieldVisibilityProfile', release_row."fieldVisibilityProfile",
        'status', release_row.status,
        'completeness', release_row.completeness,
        'cells', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'cellKey', c."cellKey",
              'state', c.state,
              'valueKind', c."valueKind",
              'publishedValue', CASE WHEN c.state = 'published' THEN c."publishedValue" ELSE NULL END
            )
            ORDER BY CASE c."cellKey"
              WHEN 'complement' THEN 1
              WHEN 'denominator' THEN 2
              WHEN 'engage' THEN 3
              WHEN 'numerator' THEN 4
              WHEN 'rate' THEN 5
              WHEN 'view' THEN 6
              ELSE 7
            END, c."cellKey" COLLATE "C" ASC
          )
          FROM public.analytics_foundation_release_cell AS c
          WHERE c."releaseId" = release_row.id
        ), '[]'::jsonb)
      );
    END IF;
  END LOOP;
END;
$phase_b$;

GRANT EXECUTE ON FUNCTION public.p09_config_list_v3(text,text,text,text[],text[]) TO vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.p09_flag_list_v3(text,text,text,text[],text[]) TO vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.p10_list_release_day_v3(text,date,text) TO vanstro_runtime;

DO $postassert$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.f1_deployment_instance_attestation
    WHERE "rolloutId" = current_setting('vanstro.rollout_id')
  ) OR NOT EXISTS (
    SELECT 1 FROM public.f1_deployment_attestation_consumption
    WHERE "rolloutId" = current_setting('vanstro.rollout_id')
  ) THEN
    RAISE EXCEPTION 'F1_PHASE_B_ATTESTATION_POSTASSERT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.f1_p02_resolver_registry
    WHERE ("resourceType", "resolverId", "tableName", "idSemantics", "operationKey", "permissionKey") =
      ('p09_config_list','resolver.p09_config_list','runtime_config_version','literal:latest-authorized','read','config.read')
  ) OR NOT EXISTS (
    SELECT 1 FROM public.f1_p02_resolver_registry
    WHERE ("resourceType", "resolverId", "tableName", "idSemantics", "operationKey", "permissionKey") =
      ('p09_flag_list','resolver.p09_flag_list','feature_flag_version','literal:latest-authorized','read','flags.read')
  ) THEN
    RAISE EXCEPTION 'F1_PHASE_B_RESOLVER_POSTASSERT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid IN (
      'public.p09_config_list_v3(text,text,text,text[],text[])'::regprocedure,
      'public.p09_flag_list_v3(text,text,text,text[],text[])'::regprocedure,
      'public.p10_list_release_day_v3(text,date,text)'::regprocedure
    )
      AND (NOT prosecdef OR proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[])
  ) THEN
    RAISE EXCEPTION 'F1_PHASE_B_FUNCTION_HARDENING_POSTASSERT';
  END IF;

  IF NOT has_function_privilege('vanstro_runtime','public.p09_config_list_v3(text,text,text,text[],text[])','EXECUTE')
     OR NOT has_function_privilege('vanstro_runtime','public.p09_flag_list_v3(text,text,text,text[],text[])','EXECUTE')
     OR NOT has_function_privilege('vanstro_runtime','public.p10_list_release_day_v3(text,date,text)','EXECUTE') THEN
    RAISE EXCEPTION 'F1_PHASE_B_ACL_POSTASSERT';
  END IF;
END;
$postassert$;

COMMIT;
