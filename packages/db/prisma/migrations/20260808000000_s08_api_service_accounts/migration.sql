-- VanStro S08: API / Service Accounts Settings implementation.
-- Unique forward migration 79. Do not edit migrations 1-78.
-- S01/S02/S03/S09/S10 _v2 functions, advisory locks, SQL bodies, signatures and
-- ACLs are preserved verbatim (this migration does not CREATE OR REPLACE any
-- public.s01_*, public.s02_*, public.s03_*, public.s09_* or public.s10_*
-- function). S08 adds independent s08_* controlled functions with their own
-- lock domain (settings.api-service-account), a typed JSONB value
-- (ApiServiceAccountSettingsValueV1: tokenLifecyclePolicy, machineScopePolicy,
-- rateLimitPolicy, auditInvocationPolicy), a forward-only extension of the
-- settings_command_ledger operation CHECK and of the settings_core_shape_check,
-- and the runtime_config_registry descriptor allowlist extension.
-- Publish/rollback/validate/preview carry ZERO data side effects: no token
-- create/rotate/revoke, no Service Account/Role/Permission mutation, no ERP or
-- external request, no invocation-log mutation anywhere in this migration or
-- the S08 controlled functions. No plaintext token, tokenHash, Authorization
-- header, Cookie or secret is stored. The only non-Settings DDL below is the
-- minimal ServiceAccount/Token lifecycle metadata (environment on the account,
-- rotate predecessor/replacement relation and per-request idempotency state on
-- tokens) that current facts cannot express; fact tables are not rebuilt.
BEGIN;

-- =====================================================================
-- 1. Forward-extend the settings_command_ledger operation CHECK so S08
--    uses its own idempotency operation family (descriptor isolation).
--    Existing S01/S02/S03/S09/S10 rows and operations keep their values.
-- =====================================================================
ALTER TABLE public.settings_command_ledger DROP CONSTRAINT settings_command_operation_check;
ALTER TABLE public.settings_command_ledger ADD CONSTRAINT settings_command_operation_check CHECK(
  operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft',
               's02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft',
               's09_create_draft','s09_update_draft','s09_validate_draft','s09_publish_draft','s09_create_rollback_draft',
               's10_create_draft','s10_update_draft','s10_validate_draft','s10_publish_draft','s10_create_rollback_draft',
               's03_create_draft','s03_update_draft','s03_validate_draft','s03_publish_draft','s03_create_rollback_draft',
               's08_create_draft','s08_update_draft','s08_validate_draft','s08_publish_draft','s08_create_rollback_draft')
);

-- =====================================================================
-- 2. Forward-extend the runtime_config_registry descriptor allowlist.
-- =====================================================================
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS runtime_config_registry;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_registry CHECK ("configKey" IN ('foundation.runtime.refresh_interval_seconds','foundation.runtime.display_mode','foundation.runtime.safe_origin','settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac','settings.privacy-retention','settings.commerce','settings.api-service-account'));

-- =====================================================================
-- 3. S08 value validation helpers (pure, STABLE, no side effects).
--    Shape: exact keys, types, integer bounds, enums, unique arrays, and
--    the secret/token field-name denylist is enforced by business_valid.
--    Business: invariants re-asserted plus default-TTL <= maximum-TTL and
--    the token/secret/PII value denylist.
-- =====================================================================
CREATE FUNCTION public.s08_settings_value_shape_valid(value jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE tlp jsonb; msp jsonb; rlp jsonb; aip jsonb;
BEGIN
 IF value IS NULL OR jsonb_typeof(value)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(value))<>4 OR NOT(value?'tokenLifecyclePolicy' AND value?'machineScopePolicy' AND value?'rateLimitPolicy' AND value?'auditInvocationPolicy') THEN RETURN false; END IF;
 tlp:=value->'tokenLifecyclePolicy'; msp:=value->'machineScopePolicy'; rlp:=value->'rateLimitPolicy'; aip:=value->'auditInvocationPolicy';
 IF jsonb_typeof(tlp)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(tlp))<>5 OR NOT(tlp?'defaultTtlDays' AND tlp?'maximumTtlDays' AND tlp?'rotationOverlapMinutes' AND tlp?'maximumActiveTokensPerAccount' AND tlp?'requireExpiry') THEN RETURN false; END IF;
 IF jsonb_typeof(tlp->'defaultTtlDays')<>'number' OR (tlp->>'defaultTtlDays') !~ '^[0-9]+$' OR (tlp->>'defaultTtlDays')::integer NOT BETWEEN 1 AND 365 OR jsonb_typeof(tlp->'maximumTtlDays')<>'number' OR (tlp->>'maximumTtlDays') !~ '^[0-9]+$' OR (tlp->>'maximumTtlDays')::integer NOT BETWEEN 1 AND 365 OR jsonb_typeof(tlp->'rotationOverlapMinutes')<>'number' OR (tlp->>'rotationOverlapMinutes') !~ '^[0-9]+$' OR (tlp->>'rotationOverlapMinutes')::integer NOT BETWEEN 0 AND 1440 OR jsonb_typeof(tlp->'maximumActiveTokensPerAccount')<>'number' OR (tlp->>'maximumActiveTokensPerAccount') !~ '^[0-9]+$' OR (tlp->>'maximumActiveTokensPerAccount')::integer NOT BETWEEN 0 AND 100 OR jsonb_typeof(tlp->'requireExpiry')<>'boolean' THEN RETURN false; END IF;
 IF jsonb_typeof(msp)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(msp))<>5 OR NOT(msp?'allowedRoleKeys' AND msp?'allowedPermissionFamilies' AND msp?'environment' AND msp?'dealerLocationScopeMode' AND msp?'denySensitivePermissionsByDefault') THEN RETURN false; END IF;
 IF jsonb_typeof(msp->'allowedRoleKeys')<>'array' OR EXISTS(SELECT 1 FROM jsonb_array_elements(msp->'allowedRoleKeys') e WHERE jsonb_typeof(e)<>'string') OR (SELECT count(DISTINCT e) FROM jsonb_array_elements_text(msp->'allowedRoleKeys') e)<>jsonb_array_length(msp->'allowedRoleKeys') THEN RETURN false; END IF;
 IF jsonb_typeof(msp->'allowedPermissionFamilies')<>'array' OR EXISTS(SELECT 1 FROM jsonb_array_elements(msp->'allowedPermissionFamilies') e WHERE jsonb_typeof(e)<>'string') OR (SELECT count(DISTINCT e) FROM jsonb_array_elements_text(msp->'allowedPermissionFamilies') e)<>jsonb_array_length(msp->'allowedPermissionFamilies') THEN RETURN false; END IF;
 IF msp->>'environment' NOT IN('production','staging','development','test') OR msp->>'dealerLocationScopeMode' NOT IN('global','dealer','location') OR jsonb_typeof(msp->'denySensitivePermissionsByDefault')<>'boolean' THEN RETURN false; END IF;
 IF jsonb_typeof(rlp)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(rlp))<>4 OR NOT(rlp?'requestsPerMinute' AND rlp?'burst' AND rlp?'mode' AND rlp?'retryAfterSemantics') THEN RETURN false; END IF;
 IF jsonb_typeof(rlp->'requestsPerMinute')<>'number' OR (rlp->>'requestsPerMinute') !~ '^[0-9]+$' OR (rlp->>'requestsPerMinute')::integer NOT BETWEEN 1 AND 100000 OR jsonb_typeof(rlp->'burst')<>'number' OR (rlp->>'burst') !~ '^[0-9]+$' OR (rlp->>'burst')::integer NOT BETWEEN 0 AND 10000 OR rlp->>'mode' NOT IN('per-token','per-account') OR rlp->>'retryAfterSemantics'<>'seconds' THEN RETURN false; END IF;
 IF jsonb_typeof(aip)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(aip))<>4 OR NOT(aip?'invocationRetentionDays' AND aip?'metadataRedactionMode' AND aip?'lastUsedTrackingEnabled' AND aip?'failedAuthenticationAuditEnabled') THEN RETURN false; END IF;
 IF jsonb_typeof(aip->'invocationRetentionDays')<>'number' OR (aip->>'invocationRetentionDays') !~ '^[0-9]+$' OR (aip->>'invocationRetentionDays')::integer NOT BETWEEN 1 AND 7300 OR aip->>'metadataRedactionMode' NOT IN('strict','standard') OR jsonb_typeof(aip->'lastUsedTrackingEnabled')<>'boolean' OR jsonb_typeof(aip->'failedAuthenticationAuditEnabled')<>'boolean' THEN RETURN false; END IF;
 RETURN true;
END $fn$;
ALTER FUNCTION public.s08_settings_value_shape_valid(jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s08_settings_value_business_valid(value jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 IF NOT public.s08_settings_value_shape_valid(value) THEN RETURN false; END IF;
 -- default TTL must not exceed the configured maximum TTL (maximumTtlDays <= 365 is a shape bound).
 IF (value->'tokenLifecyclePolicy'->>'defaultTtlDays')::integer > (value->'tokenLifecyclePolicy'->>'maximumTtlDays')::integer THEN RETURN false; END IF;
 -- Fail closed on any plaintext credential/PII pattern. "token\s*[:=]" catches a
 -- literal "token":/="token" = JSON key while field names such as
 -- tokenLifecyclePolicy / maximumActiveTokensPerAccount do not match. tokenHash,
 -- Authorization, Cookie, credential, secret, password and PII values are
 -- rejected anywhere in the payload.
 IF value::text ~* '(vsa_[a-z0-9_-]{20,}|token\s*[:=]|tokenhash|authorization|cookie|credential|password|secret|pii|email|phone|address|payment)' THEN RETURN false; END IF;
 RETURN true;
END $fn$;
ALTER FUNCTION public.s08_settings_value_business_valid(jsonb) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 4. S08 shape constraints on runtime_config_version (S01/S02/S03/S09/S10
--    branches remain verbatim).
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
    "configKey"='settings.commerce' AND "schemaVersion"='settings.commerce.v1' AND
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='object' AND
    ("settingsLifecycleStatus" NOT IN('validated','published') OR
      (public.s03_settings_value_shape_valid("desiredValue") AND
       public.s03_settings_value_business_valid("desiredValue"))) AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','invalid','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  ) OR (
    "configKey"='settings.api-service-account' AND "schemaVersion"='settings.api-service-account.v1' AND
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='object' AND
    ("settingsLifecycleStatus" NOT IN('validated','published') OR
      (public.s08_settings_value_shape_valid("desiredValue") AND
       public.s08_settings_value_business_valid("desiredValue"))) AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','invalid','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  ) OR (
    "configKey" NOT IN('settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac','settings.privacy-retention','settings.commerce','settings.api-service-account')
  )
);

-- =====================================================================
-- 5. S08 controlled lifecycle functions (descriptor-scoped, independent
--    lock domain 'settings.api-service-account', s08_* operation family).
--    S01/S02/S03/S09/S10 _v2 functions are untouched. NONE of these functions
--    contains a DELETE/UPDATE/INSERT on business data tables.
-- =====================================================================
CREATE FUNCTION public.s08_settings_authorize_v2(session_hash text,actor_id text,write_required boolean) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; read_grant jsonb; write_grant jsonb;
BEGIN
 ctx:=public.p02_dashboard_authorization_context_v1(session_hash,actor_id);
 IF ctx->>'actorId' IS DISTINCT FROM actor_id OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S08_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT value INTO read_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.read' AND (value->>'global')::boolean LIMIT 1;
 SELECT value INTO write_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.write' AND (value->>'global')::boolean LIMIT 1;
 IF read_grant IS NULL OR (write_required AND write_grant IS NULL) THEN RAISE EXCEPTION 'S08_FORBIDDEN' USING ERRCODE='42501'; END IF;
 RETURN ctx;
END $fn$;
ALTER FUNCTION public.s08_settings_authorize_v2(text,text,boolean) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s08_settings_audit_v2(actor_id text,ctx jsonb,resource_id uuid,request_id text,action_value text,result_value text,reason_value text,metadata_value jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE event_id uuid:=gen_random_uuid(); effective_roles jsonb; grants jsonb; scope_kind text; dealer_ids jsonb; location_ids jsonb; context_revision text;
BEGIN
 IF request_id!~'^[A-Za-z0-9._:-]{1,128}$' OR action_value NOT IN('create','update','config_publish','unpublish') OR result_value NOT IN('succeeded','failed') THEN RAISE EXCEPTION 'S08_AUDIT_INVALID'; END IF;
 IF ctx IS NULL OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S08_AUDIT_CONTEXT_UNAVAILABLE'; END IF;
 effective_roles:=COALESCE(ctx->'globalRoleKeys','[]'::jsonb); grants:=COALESCE(ctx->'permissionGrants','[]'::jsonb); scope_kind:='global'; context_revision:=ctx->>'contextRevision';
 INSERT INTO public.audit_events(id,"eventVersion","occurredAt","actorType","actorId","actorDisplayClass","effectiveRoles","permissionGrants","authorizationScopeKind","dealerIds","locationIds","contextRevision","authorizationContractVersion",action,"resourceType","resourceId",result,reason,"requestId",source,metadata,sensitive,"retentionClass","retentionPolicyVersion","expiresAt")
 VALUES(event_id,'audit-event.v1',CURRENT_TIMESTAMP,'admin_user',actor_id,'staff',effective_roles,grants,scope_kind,'[]'::jsonb,'[]'::jsonb,context_revision,'dashboard-authorization.v1',action_value,'runtime_config',resource_id::text,result_value,reason_value,request_id,'dashboard_api',metadata_value,false,'high_risk','audit-retention.v1',CURRENT_TIMESTAMP+INTERVAL '2555 days');
 RETURN event_id;
END $fn$;
ALTER FUNCTION public.s08_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s08_settings_ledger_v1(actor_id text,operation_value text,idempotency_hash text,request_hash text) RETURNS public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE command public.settings_command_ledger%ROWTYPE; result public.runtime_config_version%ROWTYPE;
BEGIN
 SELECT * INTO command FROM public.settings_command_ledger WHERE "actorId"=actor_id AND operation=operation_value AND "idempotencyHash"=idempotency_hash FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF command."requestHash"<>request_hash THEN RAISE EXCEPTION 'S08_IDEMPOTENCY_CONFLICT'; END IF;
 IF command."resultRuntimeConfigId" IS NULL THEN RAISE EXCEPTION 'S08_STATE_CONFLICT'; END IF;
 SELECT * INTO result FROM jsonb_populate_record(NULL::public.runtime_config_version,command."resultSnapshot");
 RETURN result;
END $fn$;
ALTER FUNCTION public.s08_settings_ledger_v1(text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s08_settings_create_draft_v2(session_hash text,actor_id text,expected_published_version integer,desired_value jsonb,change_reason text,idempotency_hash text,request_hash text,request_id text,rollback_source uuid DEFAULT NULL) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; active public.runtime_config_version%ROWTYPE; source public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; created public.runtime_config_version%ROWTYPE; operation_value text; next_revision integer; next_version integer; audit_id uuid;
BEGIN
 ctx:=public.s08_settings_authorize_v2(session_hash,actor_id,true); operation_value:=CASE WHEN rollback_source IS NULL THEN 's08_create_draft' ELSE 's08_create_rollback_draft' END;
 IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S08_VALIDATION'; END IF;
 IF NOT public.s08_settings_value_shape_valid(desired_value) THEN RAISE EXCEPTION 'S08_VALIDATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('settings.api-service-account',0));
 replay:=public.s08_settings_ledger_v1(actor_id,operation_value,idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"='settings.api-service-account' AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1;
 IF COALESCE(active."settingsRevision",0)<>expected_published_version THEN RAISE EXCEPTION 'S08_VERSION_CONFLICT'; END IF;
 IF rollback_source IS NOT NULL THEN
   SELECT * INTO source FROM public.runtime_config_version WHERE id=rollback_source AND "configKey"='settings.api-service-account' AND "authorizationScopeKind"='global' AND "settingsLifecycleStatus" IN('published','superseded') FOR SHARE;
   IF NOT FOUND OR source."effectiveValue" IS NULL THEN RAISE EXCEPTION 'S08_STATE_CONFLICT'; END IF;
   desired_value:=source."effectiveValue";
 END IF;
 SELECT COALESCE(max("settingsRevision"),0)+1,COALESCE(max(version),0)+1 INTO next_revision,next_version FROM public.runtime_config_version WHERE "configKey"='settings.api-service-account';
 INSERT INTO public.runtime_config_version(id,"configKey","schemaVersion","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","desiredValue","effectiveValue","desiredSource","effectiveSource","validationStatus","activationStatus","settingsChangeReason","settingsRollbackOfPublicationId",version,generation,"createdBy","idempotencyKeyHash","requestHash","authorityVersion","settingsRevision","settingsLifecycleStatus")
 VALUES(gen_random_uuid(),'settings.api-service-account','settings.api-service-account.v1','global','{}','{}',ctx->>'contextRevision',encode(digest('settings:global:s08','sha256'),'hex'),encode(digest('settings:safe:s08','sha256'),'hex'),desired_value,active."effectiveValue",CASE WHEN rollback_source IS NULL THEN 'settings_draft' ELSE 'rollback_draft' END,active."effectiveSource",'validation_failed','draft',btrim(change_reason),rollback_source,next_version,COALESCE(active."settingsRevision",0),actor_id,encode(digest(operation_value||':'||idempotency_hash,'sha256'),'hex'),request_hash,1,next_revision,'draft') RETURNING * INTO created;
 audit_id:=public.s08_settings_audit_v2(actor_id,ctx,created.id,request_id,'create','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',created."configKey",'version',created."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,operation_value,idempotency_hash,request_hash,created.id,created."settingsRevision",to_jsonb(created),audit_id);
 RETURN NEXT created;
END $fn$;
ALTER FUNCTION public.s08_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s08_settings_update_draft_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,desired_value jsonb,change_reason text,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid;
BEGIN
 ctx:=public.s08_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.api-service-account',0));
 IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S08_VALIDATION'; END IF;
 IF NOT public.s08_settings_value_shape_valid(desired_value) THEN RAISE EXCEPTION 'S08_VALIDATION'; END IF;
 replay:=public.s08_settings_ledger_v1(actor_id,'s08_update_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.api-service-account' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S08_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S08_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S08_STATE_CONFLICT'; END IF;
 UPDATE public.runtime_config_version SET "desiredValue"=desired_value,"settingsChangeReason"=btrim(change_reason),"settingsLifecycleStatus"='draft',"validationStatus"='validation_failed',"activationStatus"='draft',"settingsRevision"="settingsRevision"+1,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s08_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s08_update_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s08_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s08_settings_validate_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; next_state text; validation_status text;
BEGIN
 ctx:=public.s08_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.api-service-account',0));
 replay:=public.s08_settings_ledger_v1(actor_id,'s08_validate_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.api-service-account' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S08_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S08_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S08_STATE_CONFLICT'; END IF;
 IF public.s08_settings_value_shape_valid(row."desiredValue") AND public.s08_settings_value_business_valid(row."desiredValue") THEN
   next_state:='validated'; validation_status:='validated';
 ELSE
   next_state:='invalid'; validation_status:='validation_failed';
 END IF;
 UPDATE public.runtime_config_version SET "settingsLifecycleStatus"=next_state,"validationStatus"=validation_status,"settingsRevision"="settingsRevision"+1,"settingsValidatedAt"=CURRENT_TIMESTAMP,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s08_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus',next_state)));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s08_validate_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s08_settings_validate_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s08_settings_publish_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; active public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; supersession_audit_id uuid; next_sequence integer; is_rollback boolean;
BEGIN
 ctx:=public.s08_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.api-service-account',0));
 replay:=public.s08_settings_ledger_v1(actor_id,'s08_publish_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.api-service-account' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S08_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S08_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus"<>'validated' THEN RAISE EXCEPTION 'S08_STATE_CONFLICT'; END IF;
 IF NOT public.s08_settings_value_business_valid(row."desiredValue") THEN RAISE EXCEPTION 'S08_STATE_CONFLICT'; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"=row."configKey" AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1 FOR UPDATE;
 IF COALESCE(active."settingsRevision",0)<>row.generation THEN RAISE EXCEPTION 'S08_VERSION_CONFLICT'; END IF;
 is_rollback:=COALESCE(row."settingsRollbackOfPublicationId" IS NOT NULL,false);
 SELECT COALESCE(max("publicationSequence"),0)+1 INTO next_sequence FROM public.s01_settings_publication_event WHERE "descriptorKey"=row."configKey";
 IF active.id IS NOT NULL THEN
   supersession_audit_id:=public.s08_settings_audit_v2(actor_id,ctx,active.id,request_id,'unpublish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',active."configKey",'version',active."settingsRevision",'lifecycleStatus','superseded')));
   INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
   VALUES(gen_random_uuid(),row."configKey",active.id,next_sequence,'superseded',NULL,COALESCE(row."settingsChangeReason",'Superseded by a later publication.'),supersession_audit_id,CURRENT_TIMESTAMP);
   next_sequence:=next_sequence+1;
 END IF;
 audit_id:=public.s08_settings_audit_v2(actor_id,ctx,row.id,request_id,'config_publish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision"+1,'lifecycleStatus','published')));
 UPDATE public.runtime_config_version SET "activationStatus"='active',"settingsLifecycleStatus"='published',"effectiveValue"="desiredValue","effectiveSource"='runtime_override',generation="settingsRevision"+1,"settingsRevision"="settingsRevision"+1,"activatedAt"=CURRENT_TIMESTAMP,"successAuditEventId"=audit_id,"authorityVersion"=2,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=row.id RETURNING * INTO row;
 INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","sourceDraftId","sourceDraftVersion","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
 VALUES(gen_random_uuid(),row."configKey",row.id,next_sequence,CASE WHEN is_rollback THEN 'rollback_published' ELSE 'published' END,row.id,row."settingsRevision",row."settingsRollbackOfPublicationId",COALESCE(row."settingsChangeReason",'Settings publication.'),audit_id,CURRENT_TIMESTAMP);
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s08_publish_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s08_settings_publish_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s08_settings_rows_v2(session_hash text,actor_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s08_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.runtime_config_version WHERE "configKey"='settings.api-service-account' AND "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' ORDER BY "settingsRevision" DESC,"createdAt" DESC,id DESC;
END $fn$;
ALTER FUNCTION public.s08_settings_rows_v2(text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s08_settings_events_v2(session_hash text,actor_id text) RETURNS SETOF public.s01_settings_publication_event
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s08_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.s01_settings_publication_event WHERE "descriptorKey"='settings.api-service-account' ORDER BY "publicationSequence";
END $fn$;
ALTER FUNCTION public.s08_settings_events_v2(text,text) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 6. Minimal ServiceAccount/Token lifecycle metadata (allowed by the S08
--    contract: only where current facts cannot express the setting).
--    service_accounts.environment supports machineScopePolicy.environment
--    enforcement at the request boundary; the token columns back the rotate
--    overlap + idempotent replay flow. Fact tables are not rebuilt; no
--    plaintext token material is stored. "replacedByTokenId" references the
--    TEXT primary key of service_account_tokens (matching the Prisma
--    String @id columns).
-- =====================================================================
ALTER TABLE public.service_accounts ADD COLUMN IF NOT EXISTS "environment" text NOT NULL DEFAULT 'production';
ALTER TABLE public.service_accounts ADD CONSTRAINT service_accounts_environment_check CHECK ("environment" IN('production','staging','development','test'));
CREATE INDEX IF NOT EXISTS service_accounts_environment_idx ON public.service_accounts("environment");

ALTER TABLE public.service_account_tokens ADD COLUMN IF NOT EXISTS "replacedByTokenId" text;
ALTER TABLE public.service_account_tokens ADD COLUMN IF NOT EXISTS "rotateIdempotencyKey" text;
ALTER TABLE public.service_account_tokens ADD COLUMN IF NOT EXISTS "rotateRequestHash" text;
ALTER TABLE public.service_account_tokens ADD COLUMN IF NOT EXISTS "overlapUntil" timestamptz;
ALTER TABLE public.service_account_tokens ADD CONSTRAINT service_account_tokens_replaced_by_fk FOREIGN KEY ("replacedByTokenId") REFERENCES public.service_account_tokens("id") ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS service_account_tokens_replaced_by_uidx ON public.service_account_tokens("replacedByTokenId") WHERE "replacedByTokenId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS service_account_tokens_replaced_by_idx ON public.service_account_tokens("serviceAccountId","replacedByTokenId") WHERE "replacedByTokenId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS service_account_tokens_rotate_idempotency_idx ON public.service_account_tokens("rotateIdempotencyKey") WHERE "rotateIdempotencyKey" IS NOT NULL;
CREATE INDEX IF NOT EXISTS service_account_tokens_overlap_idx ON public.service_account_tokens("overlapUntil") WHERE "overlapUntil" IS NOT NULL;

-- =====================================================================
-- 7. ACL
-- =====================================================================
REVOKE ALL ON FUNCTION public.s08_settings_authorize_v2(text,text,boolean),public.s08_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s08_settings_ledger_v1(text,text,text,text),public.s08_settings_rows_v2(text,text),public.s08_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s08_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s08_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s08_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s08_settings_events_v2(text,text),public.s08_settings_value_shape_valid(jsonb),public.s08_settings_value_business_valid(jsonb) FROM PUBLIC,vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.s08_settings_rows_v2(text,text),public.s08_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s08_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s08_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s08_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s08_settings_events_v2(text,text) TO vanstro_runtime;
GRANT SELECT ON TABLE public.runtime_config_version,public.settings_command_ledger,public.s01_settings_publication_event TO vanstro_p09_guard_owner;

-- =====================================================================
-- 8. Post-assertions
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s08_settings_create_draft_v2') THEN RAISE EXCEPTION 'S08_CREATE_FN_MISSING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s08_settings_publish_v2') THEN RAISE EXCEPTION 'S08_PUBLISH_FN_MISSING'; END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint WHERE conname='settings_command_operation_check' AND convalidated=false) THEN RAISE EXCEPTION 'S08_LEDGER_CHECK_INVALID'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname='runtime_config_registry')) WHERE pg_get_constraintdef LIKE '%settings.api-service-account%') THEN RAISE EXCEPTION 'S08_REGISTRY_KEY_MISSING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='service_accounts' AND column_name='environment') THEN RAISE EXCEPTION 'S08_ENVIRONMENT_COLUMN_MISSING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='service_account_tokens' AND column_name='replacedByTokenId') THEN RAISE EXCEPTION 'S08_ROTATE_COLUMNS_MISSING'; END IF;
END $$;

COMMIT;
