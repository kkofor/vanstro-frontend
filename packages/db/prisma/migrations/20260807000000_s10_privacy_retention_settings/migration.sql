-- VanStro S10: Privacy/Retention/Audit Settings implementation.
-- Unique forward migration 77. Do not edit migrations 1-76.
-- S01/S02/S09 _v2 functions, advisory locks, SQL bodies, signatures and ACLs
-- are preserved verbatim (this migration does not CREATE OR REPLACE any
-- public.s01_*, public.s02_* or public.s09_* function). S10 adds independent
-- s10_* controlled functions with their own lock domain
-- (settings.privacy-retention), a typed JSONB value
-- (PrivacyRetentionSettingsValueV1: consentPolicy, retentionPolicy,
-- legalHoldPolicy, dsarPolicy, piiDisplayPolicy, lowRiskExecution), a
-- forward-only extension of the settings_command_ledger operation CHECK and
-- of the settings_core_shape_check, and the runtime_config_registry
-- descriptor allowlist extension. Publish/rollback/validate/preview carry
-- ZERO data side effects: no delete, anonymize, archive, purge, legal-hold
-- mutation, PrivacyRequest mutation or Worker job creation anywhere in this
-- migration or the S10 controlled functions. No PII, secret or deletion
-- target is stored. No new privacy/Audit fact tables; no S11/S12/B09.
BEGIN;

-- =====================================================================
-- 1. Forward-extend the settings_command_ledger operation CHECK so S10
--    uses its own idempotency operation family (descriptor isolation).
--    Existing S01/S02/S09 rows and operations keep their values.
-- =====================================================================
ALTER TABLE public.settings_command_ledger DROP CONSTRAINT settings_command_operation_check;
ALTER TABLE public.settings_command_ledger ADD CONSTRAINT settings_command_operation_check CHECK(
  operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft',
               's02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft',
               's09_create_draft','s09_update_draft','s09_validate_draft','s09_publish_draft','s09_create_rollback_draft',
               's10_create_draft','s10_update_draft','s10_validate_draft','s10_publish_draft','s10_create_rollback_draft')
);

-- =====================================================================
-- 2. Forward-extend the runtime_config_registry descriptor allowlist.
-- =====================================================================
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS runtime_config_registry;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_registry CHECK ("configKey" IN ('foundation.runtime.refresh_interval_seconds','foundation.runtime.display_mode','foundation.runtime.safe_origin','settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac','settings.privacy-retention'));

-- =====================================================================
-- 3. S10 value validation helpers (pure, STABLE, no side effects).
--    Shape: exact keys, types, integer bounds, enums, array bounds.
--    Business: invariants re-asserted plus hold/high-risk/DSAR rules and
--    the PII/secret field-name denylist.
-- =====================================================================
CREATE FUNCTION public.s10_settings_value_shape_valid(value jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE cp jsonb; rp jsonb; lh jsonb; ds jsonb; pp jsonb; lr jsonb; fam jsonb; entry jsonb;
BEGIN
  IF value IS NULL OR jsonb_typeof(value)<>'object' THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(value))<>6 THEN RETURN false; END IF;
  IF NOT (value ? 'consentPolicy' AND value ? 'retentionPolicy' AND value ? 'legalHoldPolicy' AND value ? 'dsarPolicy' AND value ? 'piiDisplayPolicy' AND value ? 'lowRiskExecution') THEN RETURN false; END IF;
  cp:=value->'consentPolicy'; rp:=value->'retentionPolicy'; lh:=value->'legalHoldPolicy'; ds:=value->'dsarPolicy'; pp:=value->'piiDisplayPolicy'; lr:=value->'lowRiskExecution';
  IF jsonb_typeof(cp)<>'object' OR jsonb_typeof(rp)<>'object' OR jsonb_typeof(lh)<>'object' OR jsonb_typeof(ds)<>'object' OR jsonb_typeof(pp)<>'object' OR jsonb_typeof(lr)<>'object' THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(cp))<>4 OR NOT (cp ? 'anonymousConsentEnabled' AND cp ? 'authenticatedConsentEnabled' AND cp ? 'consentCategories' AND cp ? 'retentionMonths') THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(rp))<>1 OR NOT (rp ? 'retentionByObjectFamily') THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(lh))<>2 OR NOT (lh ? 'legalHoldEnabled' AND lh ? 'legalHoldRefs') THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(ds))<>1 OR NOT (ds ? 'accessExportDeleteRules') THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(pp))<>1 OR NOT (pp ? 'piiDisplayRules') THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(lr))<>2 OR NOT (lr ? 'allowlist' AND lr ? 'impactPreviewEnabled') THEN RETURN false; END IF;
  IF jsonb_typeof(cp->'anonymousConsentEnabled')<>'boolean' OR jsonb_typeof(cp->'authenticatedConsentEnabled')<>'boolean' OR jsonb_typeof(cp->'retentionMonths')<>'number' OR (cp->>'retentionMonths')::integer IS NULL OR (cp->>'retentionMonths')::integer<6 OR (cp->>'retentionMonths')::integer>120 THEN RETURN false; END IF;
  IF jsonb_typeof(cp->'consentCategories')<>'array' OR jsonb_array_length(cp->'consentCategories')<1 OR jsonb_array_length(cp->'consentCategories')>3 THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(cp->'consentCategories') c WHERE jsonb_typeof(c)<>'string' OR c->>'0' IS NOT NULL OR c#>>'{}' NOT IN ('functional','analytics','targeting')) THEN RETURN false; END IF;
  IF (SELECT count(DISTINCT c#>>'{}') FROM jsonb_array_elements(cp->'consentCategories') c)<(SELECT count(*) FROM jsonb_array_elements(cp->'consentCategories') c) THEN RETURN false; END IF;
  IF jsonb_typeof(lr->'allowlist')<>'array' OR jsonb_array_length(lr->'allowlist')>2 OR jsonb_typeof(lr->'impactPreviewEnabled')<>'boolean' THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(lr->'allowlist') a WHERE jsonb_typeof(a)<>'string' OR a#>>'{}' NOT IN ('consent_events','async_jobs')) THEN RETURN false; END IF;
  IF (SELECT count(DISTINCT a#>>'{}') FROM jsonb_array_elements(lr->'allowlist') a)<(SELECT count(*) FROM jsonb_array_elements(lr->'allowlist') a) THEN RETURN false; END IF;
  IF jsonb_typeof(lh->'legalHoldRefs')<>'array' OR jsonb_array_length(lh->'legalHoldRefs')>64 THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(lh->'legalHoldRefs') r WHERE jsonb_typeof(r)<>'string' OR r#>>'{}' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN RETURN false; END IF;
  IF jsonb_typeof(rp->'retentionByObjectFamily')<>'array' OR jsonb_array_length(rp->'retentionByObjectFamily')>7 THEN RETURN false; END IF;
  FOR fam IN SELECT * FROM jsonb_array_elements(rp->'retentionByObjectFamily') LOOP
    entry:=fam;
    IF jsonb_typeof(entry)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(entry))<>3 THEN RETURN false; END IF;
    IF NOT (entry ? 'objectFamily' AND entry ? 'retentionDays' AND entry ? 'autoCleanupEnabled') THEN RETURN false; END IF;
    IF jsonb_typeof(entry->'objectFamily')<>'string' OR entry->>'objectFamily' NOT IN ('consent_events','audit_events','async_jobs','media_assets','orders','payments','privacy_requests') THEN RETURN false; END IF;
    IF jsonb_typeof(entry->'retentionDays')<>'number' OR (entry->>'retentionDays')::integer IS NULL OR (entry->>'retentionDays')::integer<30 OR (entry->>'retentionDays')::integer>7300 THEN RETURN false; END IF;
    IF jsonb_typeof(entry->'autoCleanupEnabled')<>'boolean' THEN RETURN false; END IF;
  END LOOP;
  IF (SELECT count(DISTINCT e->>'objectFamily') FROM jsonb_array_elements(rp->'retentionByObjectFamily') e)<(SELECT count(*) FROM jsonb_array_elements(rp->'retentionByObjectFamily') e) THEN RETURN false; END IF;
  IF jsonb_typeof(ds->'accessExportDeleteRules')<>'array' OR jsonb_array_length(ds->'accessExportDeleteRules')>15 THEN RETURN false; END IF;
  FOR fam IN SELECT * FROM jsonb_array_elements(ds->'accessExportDeleteRules') LOOP
    entry:=fam;
    IF jsonb_typeof(entry)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(entry))<>4 THEN RETURN false; END IF;
    IF NOT (entry ? 'scope' AND entry ? 'method' AND entry ? 'enabled' AND entry ? 'requireAdminApproval') THEN RETURN false; END IF;
    IF jsonb_typeof(entry->'scope')<>'string' OR entry->>'scope' NOT IN ('all_personal_data','orders','payments','media','communications') THEN RETURN false; END IF;
    IF jsonb_typeof(entry->'method')<>'string' OR entry->>'method' NOT IN ('access','export','delete') THEN RETURN false; END IF;
    IF jsonb_typeof(entry->'enabled')<>'boolean' OR jsonb_typeof(entry->'requireAdminApproval')<>'boolean' THEN RETURN false; END IF;
  END LOOP;
  IF jsonb_typeof(pp->'piiDisplayRules')<>'array' OR jsonb_array_length(pp->'piiDisplayRules')>20 THEN RETURN false; END IF;
  FOR fam IN SELECT * FROM jsonb_array_elements(pp->'piiDisplayRules') LOOP
    entry:=fam;
    IF jsonb_typeof(entry)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(entry))<>3 THEN RETURN false; END IF;
    IF NOT (entry ? 'field' AND entry ? 'displayMode' AND entry ? 'allowedRoles') THEN RETURN false; END IF;
    IF jsonb_typeof(entry->'field')<>'string' OR length(entry->>'field')<1 OR length(entry->>'field')>80 OR entry->>'field' !~ '^[A-Za-z][A-Za-z0-9_.-]*$' THEN RETURN false; END IF;
    IF jsonb_typeof(entry->'displayMode')<>'string' OR entry->>'displayMode' NOT IN ('plain','masked','hidden') THEN RETURN false; END IF;
    IF jsonb_typeof(entry->'allowedRoles')<>'array' OR jsonb_array_length(entry->'allowedRoles')<1 OR jsonb_array_length(entry->'allowedRoles')>8 THEN RETURN false; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(entry->'allowedRoles') r WHERE jsonb_typeof(r)<>'string' OR r#>>'{}'='') THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $fn$;
ALTER FUNCTION public.s10_settings_value_shape_valid(jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s10_settings_value_business_valid(value jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE cp jsonb; rp jsonb; lh jsonb; ds jsonb; pp jsonb; lr jsonb; entry jsonb; any_cleanup boolean; high_risk text[];
BEGIN
  IF NOT public.s10_settings_value_shape_valid(value) THEN RETURN false; END IF;
  cp:=value->'consentPolicy'; rp:=value->'retentionPolicy'; lh:=value->'legalHoldPolicy'; ds:=value->'dsarPolicy'; pp:=value->'piiDisplayPolicy'; lr:=value->'lowRiskExecution';
  -- High-risk object families may never enable auto-cleanup.
  high_risk:=ARRAY['audit_events','media_assets','orders','payments','privacy_requests'];
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(rp->'retentionByObjectFamily') e WHERE (e->>'autoCleanupEnabled')::boolean AND e->>'objectFamily'=ANY(high_risk)) THEN RETURN false; END IF;
  -- Legal hold conflicts: any auto-cleanup while a legal hold is enabled is a blocker.
  IF (lh->>'legalHoldEnabled')::boolean THEN
    IF jsonb_array_length(lh->'legalHoldRefs')=0 THEN RETURN false; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(rp->'retentionByObjectFamily') e WHERE (e->>'autoCleanupEnabled')::boolean) THEN RETURN false; END IF;
  END IF;
  -- DSAR delete rules always require admin approval.
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(ds->'accessExportDeleteRules') e WHERE e->>'method'='delete' AND NOT (e->>'requireAdminApproval')::boolean) THEN RETURN false; END IF;
  -- piiDisplayRules.allowedRoles must reference known system role keys.
  IF EXISTS(
    SELECT 1 FROM jsonb_array_elements(pp->'piiDisplayRules') r
    CROSS JOIN LATERAL jsonb_array_elements_text(r->'allowedRoles') role_key
    WHERE NOT EXISTS (SELECT 1 FROM public.roles rk WHERE rk.key = role_key)
  ) THEN RETURN false; END IF;
  -- PII/secret field-name denylist (defense in depth; Settings never echo
  -- cookie secrets, hashes, tokens, consent payloads or deletion targets).
  IF value::text ~* '(cookie|secret|hash|salt|credential|authorization|token(?!ttl)|passwordhash|consentpayload|deletiontarget|deletion_target)' THEN RETURN false; END IF;
  RETURN true;
END $fn$;
ALTER FUNCTION public.s10_settings_value_business_valid(jsonb) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 4. S10 shape constraints on runtime_config_version (S01/S02/S09 branches
--    remain verbatim).
-- =====================================================================
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS settings_core_shape_check;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT settings_core_shape_check CHECK (
  (
    "configKey"='settings.core.overview_refresh_seconds' AND
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='number' AND
    ("settingsLifecycleStatus" NOT IN('validated','published') OR
      (("desiredValue" #>> '{}')::integer BETWEEN 15 AND 300)) AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','invalid','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  ) OR (
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

-- =====================================================================
-- 5. S10 controlled lifecycle functions (descriptor-scoped, independent
--    lock domain 'settings.privacy-retention', s10_* operation family).
--    S01/S02/S09 _v2 functions are untouched. NONE of these functions
--    contains a DELETE/UPDATE/INSERT on business data tables.
-- =====================================================================
CREATE FUNCTION public.s10_settings_authorize_v2(session_hash text,actor_id text,write_required boolean) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; read_grant jsonb; write_grant jsonb;
BEGIN
 ctx:=public.p02_dashboard_authorization_context_v1(session_hash,actor_id);
 IF ctx->>'actorId' IS DISTINCT FROM actor_id OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S10_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT value INTO read_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.read' AND (value->>'global')::boolean LIMIT 1;
 SELECT value INTO write_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.write' AND (value->>'global')::boolean LIMIT 1;
 IF read_grant IS NULL OR (write_required AND write_grant IS NULL) THEN RAISE EXCEPTION 'S10_FORBIDDEN' USING ERRCODE='42501'; END IF;
 RETURN ctx;
END $fn$;
ALTER FUNCTION public.s10_settings_authorize_v2(text,text,boolean) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s10_settings_audit_v2(actor_id text,ctx jsonb,resource_id uuid,request_id text,action_value text,result_value text,reason_value text,metadata_value jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE event_id uuid:=gen_random_uuid(); effective_roles jsonb; grants jsonb; scope_kind text; dealer_ids jsonb; location_ids jsonb; context_revision text;
BEGIN
 IF request_id!~'^[A-Za-z0-9._:-]{1,128}$' OR action_value NOT IN('create','update','config_publish','unpublish') OR result_value NOT IN('succeeded','failed') THEN RAISE EXCEPTION 'S10_AUDIT_INVALID'; END IF;
 IF ctx IS NULL OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S10_AUDIT_CONTEXT_UNAVAILABLE'; END IF;
 effective_roles:=COALESCE(ctx->'globalRoleKeys','[]'::jsonb); grants:=COALESCE(ctx->'permissionGrants','[]'::jsonb); scope_kind:='global'; context_revision:=ctx->>'contextRevision';
 INSERT INTO public.audit_events(id,"eventVersion","occurredAt","actorType","actorId","actorDisplayClass","effectiveRoles","permissionGrants","authorizationScopeKind","dealerIds","locationIds","contextRevision","authorizationContractVersion",action,"resourceType","resourceId",result,reason,"requestId",source,metadata,sensitive,"retentionClass","retentionPolicyVersion","expiresAt")
 VALUES(event_id,'audit-event.v1',CURRENT_TIMESTAMP,'admin_user',actor_id,'staff',effective_roles,grants,scope_kind,'[]'::jsonb,'[]'::jsonb,context_revision,'dashboard-authorization.v1',action_value,'runtime_config',resource_id::text,result_value,reason_value,request_id,'dashboard_api',metadata_value,false,'high_risk','audit-retention.v1',CURRENT_TIMESTAMP+INTERVAL '2555 days');
 RETURN event_id;
END $fn$;
ALTER FUNCTION public.s10_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s10_settings_ledger_v1(actor_id text,operation_value text,idempotency_hash text,request_hash text) RETURNS public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE command public.settings_command_ledger%ROWTYPE; result public.runtime_config_version%ROWTYPE;
BEGIN
 SELECT * INTO command FROM public.settings_command_ledger WHERE "actorId"=actor_id AND operation=operation_value AND "idempotencyHash"=idempotency_hash FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF command."requestHash"<>request_hash THEN RAISE EXCEPTION 'S10_IDEMPOTENCY_CONFLICT'; END IF;
 IF command."resultRuntimeConfigId" IS NULL THEN RAISE EXCEPTION 'S10_STATE_CONFLICT'; END IF;
 SELECT * INTO result FROM jsonb_populate_record(NULL::public.runtime_config_version,command."resultSnapshot");
 RETURN result;
END $fn$;
ALTER FUNCTION public.s10_settings_ledger_v1(text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s10_settings_create_draft_v2(session_hash text,actor_id text,expected_published_version integer,desired_value jsonb,change_reason text,idempotency_hash text,request_hash text,request_id text,rollback_source uuid DEFAULT NULL) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; active public.runtime_config_version%ROWTYPE; source public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; created public.runtime_config_version%ROWTYPE; operation_value text; next_revision integer; next_version integer; audit_id uuid;
BEGIN
 ctx:=public.s10_settings_authorize_v2(session_hash,actor_id,true); operation_value:=CASE WHEN rollback_source IS NULL THEN 's10_create_draft' ELSE 's10_create_rollback_draft' END;
 IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S10_VALIDATION'; END IF;
 IF NOT public.s10_settings_value_shape_valid(desired_value) THEN RAISE EXCEPTION 'S10_VALIDATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('settings.privacy-retention',0));
 replay:=public.s10_settings_ledger_v1(actor_id,operation_value,idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"='settings.privacy-retention' AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1;
 IF COALESCE(active."settingsRevision",0)<>expected_published_version THEN RAISE EXCEPTION 'S10_VERSION_CONFLICT'; END IF;
 IF rollback_source IS NOT NULL THEN
   SELECT * INTO source FROM public.runtime_config_version WHERE id=rollback_source AND "configKey"='settings.privacy-retention' AND "authorizationScopeKind"='global' AND "settingsLifecycleStatus" IN('published','superseded') FOR SHARE;
   IF NOT FOUND OR source."effectiveValue" IS NULL THEN RAISE EXCEPTION 'S10_STATE_CONFLICT'; END IF;
   desired_value:=source."effectiveValue";
 END IF;
 SELECT COALESCE(max("settingsRevision"),0)+1,COALESCE(max(version),0)+1 INTO next_revision,next_version FROM public.runtime_config_version WHERE "configKey"='settings.privacy-retention';
 INSERT INTO public.runtime_config_version(id,"configKey","schemaVersion","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","desiredValue","effectiveValue","desiredSource","effectiveSource","validationStatus","activationStatus","settingsChangeReason","settingsRollbackOfPublicationId",version,generation,"createdBy","idempotencyKeyHash","requestHash","authorityVersion","settingsRevision","settingsLifecycleStatus")
 VALUES(gen_random_uuid(),'settings.privacy-retention','settings.privacy-retention.v1','global','{}','{}',ctx->>'contextRevision',encode(digest('settings:global:s10','sha256'),'hex'),encode(digest('settings:safe:s10','sha256'),'hex'),desired_value,active."effectiveValue",CASE WHEN rollback_source IS NULL THEN 'settings_draft' ELSE 'rollback_draft' END,active."effectiveSource",'validation_failed','draft',btrim(change_reason),rollback_source,next_version,COALESCE(active."settingsRevision",0),actor_id,encode(digest(operation_value||':'||idempotency_hash,'sha256'),'hex'),request_hash,1,next_revision,'draft') RETURNING * INTO created;
 audit_id:=public.s10_settings_audit_v2(actor_id,ctx,created.id,request_id,'create','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',created."configKey",'version',created."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,operation_value,idempotency_hash,request_hash,created.id,created."settingsRevision",to_jsonb(created),audit_id);
 RETURN NEXT created;
END $fn$;
ALTER FUNCTION public.s10_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s10_settings_update_draft_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,desired_value jsonb,change_reason text,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid;
BEGIN
 ctx:=public.s10_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.privacy-retention',0));
 IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S10_VALIDATION'; END IF;
 IF NOT public.s10_settings_value_shape_valid(desired_value) THEN RAISE EXCEPTION 'S10_VALIDATION'; END IF;
 replay:=public.s10_settings_ledger_v1(actor_id,'s10_update_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.privacy-retention' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S10_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S10_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S10_STATE_CONFLICT'; END IF;
 UPDATE public.runtime_config_version SET "desiredValue"=desired_value,"settingsChangeReason"=btrim(change_reason),"settingsLifecycleStatus"='draft',"validationStatus"='validation_failed',"activationStatus"='draft',"settingsRevision"="settingsRevision"+1,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s10_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s10_update_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s10_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s10_settings_validate_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; next_state text; validation_status text;
BEGIN
 ctx:=public.s10_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.privacy-retention',0));
 replay:=public.s10_settings_ledger_v1(actor_id,'s10_validate_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.privacy-retention' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S10_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S10_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S10_STATE_CONFLICT'; END IF;
 IF public.s10_settings_value_shape_valid(row."desiredValue") AND public.s10_settings_value_business_valid(row."desiredValue") THEN
   next_state:='validated'; validation_status:='validated';
 ELSE
   next_state:='invalid'; validation_status:='validation_failed';
 END IF;
 UPDATE public.runtime_config_version SET "settingsLifecycleStatus"=next_state,"validationStatus"=validation_status,"settingsRevision"="settingsRevision"+1,"settingsValidatedAt"=CURRENT_TIMESTAMP,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s10_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus',next_state)));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s10_validate_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s10_settings_validate_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s10_settings_publish_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; active public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; supersession_audit_id uuid; next_sequence integer; is_rollback boolean;
BEGIN
 ctx:=public.s10_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.privacy-retention',0));
 replay:=public.s10_settings_ledger_v1(actor_id,'s10_publish_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.privacy-retention' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S10_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S10_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus"<>'validated' THEN RAISE EXCEPTION 'S10_STATE_CONFLICT'; END IF;
 IF NOT public.s10_settings_value_business_valid(row."desiredValue") THEN RAISE EXCEPTION 'S10_STATE_CONFLICT'; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"=row."configKey" AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1 FOR UPDATE;
 IF COALESCE(active."settingsRevision",0)<>row.generation THEN RAISE EXCEPTION 'S10_VERSION_CONFLICT'; END IF;
 is_rollback:=COALESCE(row."settingsRollbackOfPublicationId" IS NOT NULL,false);
 SELECT COALESCE(max("publicationSequence"),0)+1 INTO next_sequence FROM public.s01_settings_publication_event WHERE "descriptorKey"=row."configKey";
 IF active.id IS NOT NULL THEN
   supersession_audit_id:=public.s10_settings_audit_v2(actor_id,ctx,active.id,request_id,'unpublish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',active."configKey",'version',active."settingsRevision",'lifecycleStatus','superseded')));
   INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
   VALUES(gen_random_uuid(),row."configKey",active.id,next_sequence,'superseded',NULL,COALESCE(row."settingsChangeReason",'Superseded by a later publication.'),supersession_audit_id,CURRENT_TIMESTAMP);
   next_sequence:=next_sequence+1;
 END IF;
 audit_id:=public.s10_settings_audit_v2(actor_id,ctx,row.id,request_id,'config_publish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision"+1,'lifecycleStatus','published')));
 UPDATE public.runtime_config_version SET "activationStatus"='active',"settingsLifecycleStatus"='published',"effectiveValue"="desiredValue","effectiveSource"='runtime_override',generation="settingsRevision"+1,"settingsRevision"="settingsRevision"+1,"activatedAt"=CURRENT_TIMESTAMP,"successAuditEventId"=audit_id,"authorityVersion"=2,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=row.id RETURNING * INTO row;
 INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","sourceDraftId","sourceDraftVersion","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
 VALUES(gen_random_uuid(),row."configKey",row.id,next_sequence,CASE WHEN is_rollback THEN 'rollback_published' ELSE 'published' END,row.id,row."settingsRevision",row."settingsRollbackOfPublicationId",COALESCE(row."settingsChangeReason",'Settings publication.'),audit_id,CURRENT_TIMESTAMP);
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s10_publish_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s10_settings_publish_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s10_settings_rows_v2(session_hash text,actor_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s10_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.runtime_config_version WHERE "configKey"='settings.privacy-retention' AND "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' ORDER BY "settingsRevision" DESC,"createdAt" DESC,id DESC;
END $fn$;
ALTER FUNCTION public.s10_settings_rows_v2(text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s10_settings_events_v2(session_hash text,actor_id text) RETURNS SETOF public.s01_settings_publication_event
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s10_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.s01_settings_publication_event WHERE "descriptorKey"='settings.privacy-retention' ORDER BY "publicationSequence";
END $fn$;
ALTER FUNCTION public.s10_settings_events_v2(text,text) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 6. ACL
-- =====================================================================
REVOKE ALL ON FUNCTION public.s10_settings_authorize_v2(text,text,boolean),public.s10_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s10_settings_ledger_v1(text,text,text,text),public.s10_settings_rows_v2(text,text),public.s10_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s10_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s10_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s10_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s10_settings_events_v2(text,text),public.s10_settings_value_shape_valid(jsonb),public.s10_settings_value_business_valid(jsonb) FROM PUBLIC,vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.s10_settings_rows_v2(text,text),public.s10_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s10_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s10_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s10_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s10_settings_events_v2(text,text) TO vanstro_runtime;
GRANT SELECT ON TABLE public.runtime_config_version,public.settings_command_ledger,public.s01_settings_publication_event TO vanstro_p09_guard_owner;
-- The SECURITY DEFINER business validator resolves piiDisplayRules.allowedRoles
-- against the system role keys.
GRANT SELECT ON TABLE public.roles TO vanstro_p09_guard_owner;

-- =====================================================================
-- 7. Post-assertions
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s10_settings_create_draft_v2') THEN RAISE EXCEPTION 'S10_CREATE_FN_MISSING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s10_settings_publish_v2') THEN RAISE EXCEPTION 'S10_PUBLISH_FN_MISSING'; END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint WHERE conname='settings_command_operation_check' AND convalidated=false) THEN RAISE EXCEPTION 'S10_LEDGER_CHECK_INVALID'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname='runtime_config_registry')) WHERE pg_get_constraintdef LIKE '%settings.privacy-retention%') THEN RAISE EXCEPTION 'S10_REGISTRY_KEY_MISSING'; END IF;
END $$;

COMMIT;
