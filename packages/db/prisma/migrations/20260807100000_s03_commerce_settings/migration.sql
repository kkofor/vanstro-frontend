-- VanStro S03: Commerce Settings implementation.
-- Unique forward migration 78. Do not edit migrations 1-77.
-- S01/S02/S09/S10 _v2 functions, advisory locks, SQL bodies, signatures and ACLs
-- are preserved verbatim (this migration does not CREATE OR REPLACE any
-- public.s01_*, public.s02_*, public.s09_* or public.s10_* function). S03 adds independent
-- s03_* controlled functions with their own lock domain
-- (settings.commerce), a typed JSONB value
-- (CommerceSettingsValueV1: commercePolicy, taxPolicy, shippingPolicy,
-- inventoryPolicy, orderPolicy), a
-- forward-only extension of the settings_command_ledger operation CHECK and
-- of the settings_core_shape_check, and the runtime_config_registry
-- descriptor allowlist extension. Publish/rollback/validate/preview carry
-- ZERO data side effects: no delete, anonymize, archive, purge, legal-hold
-- mutation, PrivacyRequest mutation or Worker job creation anywhere in this
-- migration or the S03 controlled functions. No PII, secret or deletion
-- target is stored. No new privacy/Audit fact tables; no S11/S12/B09.
BEGIN;

-- =====================================================================
-- 1. Forward-extend the settings_command_ledger operation CHECK so S03
--    uses its own idempotency operation family (descriptor isolation).
--    Existing S01/S02/S09 rows and operations keep their values.
-- =====================================================================
ALTER TABLE public.settings_command_ledger DROP CONSTRAINT settings_command_operation_check;
ALTER TABLE public.settings_command_ledger ADD CONSTRAINT settings_command_operation_check CHECK(
  operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft',
               's02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft',
               's09_create_draft','s09_update_draft','s09_validate_draft','s09_publish_draft','s09_create_rollback_draft',
               's10_create_draft','s10_update_draft','s10_validate_draft','s10_publish_draft','s10_create_rollback_draft',
               's03_create_draft','s03_update_draft','s03_validate_draft','s03_publish_draft','s03_create_rollback_draft')
);

-- =====================================================================
-- 2. Forward-extend the runtime_config_registry descriptor allowlist.
-- =====================================================================
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS runtime_config_registry;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_registry CHECK ("configKey" IN ('foundation.runtime.refresh_interval_seconds','foundation.runtime.display_mode','foundation.runtime.safe_origin','settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac','settings.privacy-retention','settings.commerce'));

-- =====================================================================
-- 3. S03 value validation helpers (pure, STABLE, no side effects).
--    Shape: exact keys, types, integer bounds, enums, array bounds.
--    Business: invariants re-asserted plus hold/high-risk/DSAR rules and
--    the PII/secret field-name denylist.
-- =====================================================================
CREATE FUNCTION public.s03_settings_value_shape_valid(value jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE cp jsonb; tp jsonb; sp jsonb; ip jsonb; op jsonb; transition_key text; targets jsonb;
BEGIN
 IF value IS NULL OR jsonb_typeof(value)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(value))<>5 OR NOT(value?'commercePolicy' AND value?'taxPolicy' AND value?'shippingPolicy' AND value?'inventoryPolicy' AND value?'orderPolicy') THEN RETURN false; END IF;
 cp:=value->'commercePolicy'; tp:=value->'taxPolicy'; sp:=value->'shippingPolicy'; ip:=value->'inventoryPolicy'; op:=value->'orderPolicy';
 IF jsonb_typeof(cp)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(cp))<>3 OR NOT(cp?'minimumOrderAmountCents' AND cp?'guestCheckoutEnabled' AND cp?'checkoutEnabled') THEN RETURN false; END IF;
 IF jsonb_typeof(cp->'minimumOrderAmountCents')<>'number' OR (cp->>'minimumOrderAmountCents') !~ '^(0|[1-9][0-9]*)$' OR (cp->>'minimumOrderAmountCents')::numeric>2147483647 OR jsonb_typeof(cp->'guestCheckoutEnabled')<>'boolean' OR jsonb_typeof(cp->'checkoutEnabled')<>'boolean' THEN RETURN false; END IF;
 IF jsonb_typeof(tp)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(tp))<>3 OR NOT(tp?'enabledProvinceCodes' AND tp?'calculationMode' AND tp?'roundingMode') OR jsonb_typeof(tp->'enabledProvinceCodes')<>'array' OR jsonb_array_length(tp->'enabledProvinceCodes')>13 THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(tp->'enabledProvinceCodes') p WHERE p NOT IN('AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT')) OR (SELECT count(DISTINCT p) FROM jsonb_array_elements_text(tp->'enabledProvinceCodes') p)<>jsonb_array_length(tp->'enabledProvinceCodes') OR tp->>'calculationMode' NOT IN('current-tax-rate-table','disabled') OR tp->>'roundingMode'<>'nearest-cent' THEN RETURN false; END IF;
 IF jsonb_typeof(sp)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(sp))<>5 OR NOT(sp?'pickupEnabled' AND sp?'deliveryEnabled' AND sp?'deliveryFlatFeeCents' AND sp?'serviceZoneMode' AND sp?'fallbackMode') OR jsonb_typeof(sp->'pickupEnabled')<>'boolean' OR jsonb_typeof(sp->'deliveryEnabled')<>'boolean' OR jsonb_typeof(sp->'deliveryFlatFeeCents')<>'number' OR (sp->>'deliveryFlatFeeCents') !~ '^(0|[1-9][0-9]*)$' OR (sp->>'deliveryFlatFeeCents')::numeric>2147483647 OR sp->>'serviceZoneMode' NOT IN('dealer-location-only','postal-prefix') OR sp->>'fallbackMode' NOT IN('reject','pickup-only') THEN RETURN false; END IF;
 IF jsonb_typeof(ip)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(ip))<>5 OR NOT(ip?'reservationEnabled' AND ip?'reservationTtlMinutes' AND ip?'availabilityMode' AND ip?'staleAfterSeconds' AND ip?'staleBehavior') OR jsonb_typeof(ip->'reservationEnabled')<>'boolean' OR (ip->>'reservationTtlMinutes') !~ '^[0-9]+$' OR (ip->>'reservationTtlMinutes')::integer NOT BETWEEN 5 AND 1440 OR ip->>'availabilityMode' NOT IN('manual','erp') OR (ip->>'staleAfterSeconds') !~ '^[0-9]+$' OR (ip->>'staleAfterSeconds')::integer NOT BETWEEN 30 AND 86400 OR ip->>'staleBehavior' NOT IN('degraded-reject','manual-fallback') THEN RETURN false; END IF;
 IF jsonb_typeof(op)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(op))<>3 OR NOT(op?'allowedLifecycleTransitions' AND op?'guestLookupEnabled' AND op?'cancellationMode') OR jsonb_typeof(op->'guestLookupEnabled')<>'boolean' OR op->>'cancellationMode' NOT IN('erp-confirmed-only','disabled') THEN RETURN false; END IF;
 IF jsonb_typeof(op->'allowedLifecycleTransitions')<>'object' OR (SELECT count(*) FROM jsonb_object_keys(op->'allowedLifecycleTransitions'))<>4 OR NOT(op->'allowedLifecycleTransitions'?'paid' AND op->'allowedLifecycleTransitions'?'processing' AND op->'allowedLifecycleTransitions'?'fulfilled' AND op->'allowedLifecycleTransitions'?'cancelled') THEN RETURN false; END IF;
 FOR transition_key,targets IN SELECT * FROM jsonb_each(op->'allowedLifecycleTransitions') LOOP IF jsonb_typeof(targets)<>'array' OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(targets) t WHERE t NOT IN('paid','processing','fulfilled','cancelled') OR t=transition_key) OR (SELECT count(DISTINCT t) FROM jsonb_array_elements_text(targets)t)<>jsonb_array_length(targets) THEN RETURN false; END IF; END LOOP;
 RETURN true;
END $fn$;
ALTER FUNCTION public.s03_settings_value_shape_valid(jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s03_settings_value_business_valid(value jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 IF NOT public.s03_settings_value_shape_valid(value) THEN RETURN false; END IF;
 IF (value->'shippingPolicy'->>'deliveryEnabled')::boolean AND NOT ((value->'shippingPolicy'->>'serviceZoneMode') IN('dealer-location-only','postal-prefix') AND (value->'shippingPolicy'->>'fallbackMode') IN('reject','pickup-only')) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(value->'orderPolicy'->'allowedLifecycleTransitions') e CROSS JOIN LATERAL jsonb_array_elements_text(e.value) t WHERE (e.key='fulfilled' OR e.key='cancelled') OR (e.key='processing' AND t NOT IN('fulfilled','cancelled')) OR (e.key='paid' AND t NOT IN('processing','fulfilled','cancelled'))) THEN RETURN false; END IF;
 IF value::text ~* '(customer|email|phone|address|payment|providerpayload|inventoryquantity|credential|secret|token|erpfullpayload)' THEN RETURN false; END IF;
 RETURN true;
END $fn$;
ALTER FUNCTION public.s03_settings_value_business_valid(jsonb) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 4. S03 shape constraints on runtime_config_version (S01/S02/S09/S10 branches
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
    "configKey" NOT IN('settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac','settings.privacy-retention','settings.commerce')
  )
);

-- =====================================================================
-- 5. S03 controlled lifecycle functions (descriptor-scoped, independent
--    lock domain 'settings.commerce', s03_* operation family).
--    S01/S02/S09/S10 _v2 functions are untouched. NONE of these functions
--    contains a DELETE/UPDATE/INSERT on business data tables.
-- =====================================================================
CREATE FUNCTION public.s03_settings_authorize_v2(session_hash text,actor_id text,write_required boolean) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; read_grant jsonb; write_grant jsonb;
BEGIN
 ctx:=public.p02_dashboard_authorization_context_v1(session_hash,actor_id);
 IF ctx->>'actorId' IS DISTINCT FROM actor_id OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S03_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT value INTO read_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.read' AND (value->>'global')::boolean LIMIT 1;
 SELECT value INTO write_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.write' AND (value->>'global')::boolean LIMIT 1;
 IF read_grant IS NULL OR (write_required AND write_grant IS NULL) THEN RAISE EXCEPTION 'S03_FORBIDDEN' USING ERRCODE='42501'; END IF;
 RETURN ctx;
END $fn$;
ALTER FUNCTION public.s03_settings_authorize_v2(text,text,boolean) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s03_settings_audit_v2(actor_id text,ctx jsonb,resource_id uuid,request_id text,action_value text,result_value text,reason_value text,metadata_value jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE event_id uuid:=gen_random_uuid(); effective_roles jsonb; grants jsonb; scope_kind text; dealer_ids jsonb; location_ids jsonb; context_revision text;
BEGIN
 IF request_id!~'^[A-Za-z0-9._:-]{1,128}$' OR action_value NOT IN('create','update','config_publish','unpublish') OR result_value NOT IN('succeeded','failed') THEN RAISE EXCEPTION 'S03_AUDIT_INVALID'; END IF;
 IF ctx IS NULL OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S03_AUDIT_CONTEXT_UNAVAILABLE'; END IF;
 effective_roles:=COALESCE(ctx->'globalRoleKeys','[]'::jsonb); grants:=COALESCE(ctx->'permissionGrants','[]'::jsonb); scope_kind:='global'; context_revision:=ctx->>'contextRevision';
 INSERT INTO public.audit_events(id,"eventVersion","occurredAt","actorType","actorId","actorDisplayClass","effectiveRoles","permissionGrants","authorizationScopeKind","dealerIds","locationIds","contextRevision","authorizationContractVersion",action,"resourceType","resourceId",result,reason,"requestId",source,metadata,sensitive,"retentionClass","retentionPolicyVersion","expiresAt")
 VALUES(event_id,'audit-event.v1',CURRENT_TIMESTAMP,'admin_user',actor_id,'staff',effective_roles,grants,scope_kind,'[]'::jsonb,'[]'::jsonb,context_revision,'dashboard-authorization.v1',action_value,'runtime_config',resource_id::text,result_value,reason_value,request_id,'dashboard_api',metadata_value,false,'high_risk','audit-retention.v1',CURRENT_TIMESTAMP+INTERVAL '2555 days');
 RETURN event_id;
END $fn$;
ALTER FUNCTION public.s03_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s03_settings_ledger_v1(actor_id text,operation_value text,idempotency_hash text,request_hash text) RETURNS public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE command public.settings_command_ledger%ROWTYPE; result public.runtime_config_version%ROWTYPE;
BEGIN
 SELECT * INTO command FROM public.settings_command_ledger WHERE "actorId"=actor_id AND operation=operation_value AND "idempotencyHash"=idempotency_hash FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF command."requestHash"<>request_hash THEN RAISE EXCEPTION 'S03_IDEMPOTENCY_CONFLICT'; END IF;
 IF command."resultRuntimeConfigId" IS NULL THEN RAISE EXCEPTION 'S03_STATE_CONFLICT'; END IF;
 SELECT * INTO result FROM jsonb_populate_record(NULL::public.runtime_config_version,command."resultSnapshot");
 RETURN result;
END $fn$;
ALTER FUNCTION public.s03_settings_ledger_v1(text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s03_settings_create_draft_v2(session_hash text,actor_id text,expected_published_version integer,desired_value jsonb,change_reason text,idempotency_hash text,request_hash text,request_id text,rollback_source uuid DEFAULT NULL) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; active public.runtime_config_version%ROWTYPE; source public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; created public.runtime_config_version%ROWTYPE; operation_value text; next_revision integer; next_version integer; audit_id uuid;
BEGIN
 ctx:=public.s03_settings_authorize_v2(session_hash,actor_id,true); operation_value:=CASE WHEN rollback_source IS NULL THEN 's03_create_draft' ELSE 's03_create_rollback_draft' END;
 IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S03_VALIDATION'; END IF;
 IF NOT public.s03_settings_value_shape_valid(desired_value) THEN RAISE EXCEPTION 'S03_VALIDATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('settings.commerce',0));
 replay:=public.s03_settings_ledger_v1(actor_id,operation_value,idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"='settings.commerce' AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1;
 IF COALESCE(active."settingsRevision",0)<>expected_published_version THEN RAISE EXCEPTION 'S03_VERSION_CONFLICT'; END IF;
 IF rollback_source IS NOT NULL THEN
   SELECT * INTO source FROM public.runtime_config_version WHERE id=rollback_source AND "configKey"='settings.commerce' AND "authorizationScopeKind"='global' AND "settingsLifecycleStatus" IN('published','superseded') FOR SHARE;
   IF NOT FOUND OR source."effectiveValue" IS NULL THEN RAISE EXCEPTION 'S03_STATE_CONFLICT'; END IF;
   desired_value:=source."effectiveValue";
 END IF;
 SELECT COALESCE(max("settingsRevision"),0)+1,COALESCE(max(version),0)+1 INTO next_revision,next_version FROM public.runtime_config_version WHERE "configKey"='settings.commerce';
 INSERT INTO public.runtime_config_version(id,"configKey","schemaVersion","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","desiredValue","effectiveValue","desiredSource","effectiveSource","validationStatus","activationStatus","settingsChangeReason","settingsRollbackOfPublicationId",version,generation,"createdBy","idempotencyKeyHash","requestHash","authorityVersion","settingsRevision","settingsLifecycleStatus")
 VALUES(gen_random_uuid(),'settings.commerce','settings.commerce.v1','global','{}','{}',ctx->>'contextRevision',encode(digest('settings:global:s03','sha256'),'hex'),encode(digest('settings:safe:s03','sha256'),'hex'),desired_value,active."effectiveValue",CASE WHEN rollback_source IS NULL THEN 'settings_draft' ELSE 'rollback_draft' END,active."effectiveSource",'validation_failed','draft',btrim(change_reason),rollback_source,next_version,COALESCE(active."settingsRevision",0),actor_id,encode(digest(operation_value||':'||idempotency_hash,'sha256'),'hex'),request_hash,1,next_revision,'draft') RETURNING * INTO created;
 audit_id:=public.s03_settings_audit_v2(actor_id,ctx,created.id,request_id,'create','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',created."configKey",'version',created."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,operation_value,idempotency_hash,request_hash,created.id,created."settingsRevision",to_jsonb(created),audit_id);
 RETURN NEXT created;
END $fn$;
ALTER FUNCTION public.s03_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s03_settings_update_draft_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,desired_value jsonb,change_reason text,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid;
BEGIN
 ctx:=public.s03_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.commerce',0));
 IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S03_VALIDATION'; END IF;
 IF NOT public.s03_settings_value_shape_valid(desired_value) THEN RAISE EXCEPTION 'S03_VALIDATION'; END IF;
 replay:=public.s03_settings_ledger_v1(actor_id,'s03_update_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.commerce' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S03_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S03_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S03_STATE_CONFLICT'; END IF;
 UPDATE public.runtime_config_version SET "desiredValue"=desired_value,"settingsChangeReason"=btrim(change_reason),"settingsLifecycleStatus"='draft',"validationStatus"='validation_failed',"activationStatus"='draft',"settingsRevision"="settingsRevision"+1,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s03_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s03_update_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s03_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s03_settings_validate_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; next_state text; validation_status text;
BEGIN
 ctx:=public.s03_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.commerce',0));
 replay:=public.s03_settings_ledger_v1(actor_id,'s03_validate_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.commerce' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S03_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S03_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S03_STATE_CONFLICT'; END IF;
 IF public.s03_settings_value_shape_valid(row."desiredValue") AND public.s03_settings_value_business_valid(row."desiredValue") THEN
   next_state:='validated'; validation_status:='validated';
 ELSE
   next_state:='invalid'; validation_status:='validation_failed';
 END IF;
 UPDATE public.runtime_config_version SET "settingsLifecycleStatus"=next_state,"validationStatus"=validation_status,"settingsRevision"="settingsRevision"+1,"settingsValidatedAt"=CURRENT_TIMESTAMP,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s03_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus',next_state)));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s03_validate_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s03_settings_validate_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s03_settings_publish_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; active public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; supersession_audit_id uuid; next_sequence integer; is_rollback boolean;
BEGIN
 ctx:=public.s03_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.commerce',0));
 replay:=public.s03_settings_ledger_v1(actor_id,'s03_publish_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.commerce' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S03_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S03_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus"<>'validated' THEN RAISE EXCEPTION 'S03_STATE_CONFLICT'; END IF;
 IF NOT public.s03_settings_value_business_valid(row."desiredValue") THEN RAISE EXCEPTION 'S03_STATE_CONFLICT'; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"=row."configKey" AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1 FOR UPDATE;
 IF COALESCE(active."settingsRevision",0)<>row.generation THEN RAISE EXCEPTION 'S03_VERSION_CONFLICT'; END IF;
 is_rollback:=COALESCE(row."settingsRollbackOfPublicationId" IS NOT NULL,false);
 SELECT COALESCE(max("publicationSequence"),0)+1 INTO next_sequence FROM public.s01_settings_publication_event WHERE "descriptorKey"=row."configKey";
 IF active.id IS NOT NULL THEN
   supersession_audit_id:=public.s03_settings_audit_v2(actor_id,ctx,active.id,request_id,'unpublish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',active."configKey",'version',active."settingsRevision",'lifecycleStatus','superseded')));
   INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
   VALUES(gen_random_uuid(),row."configKey",active.id,next_sequence,'superseded',NULL,COALESCE(row."settingsChangeReason",'Superseded by a later publication.'),supersession_audit_id,CURRENT_TIMESTAMP);
   next_sequence:=next_sequence+1;
 END IF;
 audit_id:=public.s03_settings_audit_v2(actor_id,ctx,row.id,request_id,'config_publish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision"+1,'lifecycleStatus','published')));
 UPDATE public.runtime_config_version SET "activationStatus"='active',"settingsLifecycleStatus"='published',"effectiveValue"="desiredValue","effectiveSource"='runtime_override',generation="settingsRevision"+1,"settingsRevision"="settingsRevision"+1,"activatedAt"=CURRENT_TIMESTAMP,"successAuditEventId"=audit_id,"authorityVersion"=2,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=row.id RETURNING * INTO row;
 INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","sourceDraftId","sourceDraftVersion","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
 VALUES(gen_random_uuid(),row."configKey",row.id,next_sequence,CASE WHEN is_rollback THEN 'rollback_published' ELSE 'published' END,row.id,row."settingsRevision",row."settingsRollbackOfPublicationId",COALESCE(row."settingsChangeReason",'Settings publication.'),audit_id,CURRENT_TIMESTAMP);
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s03_publish_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s03_settings_publish_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s03_settings_rows_v2(session_hash text,actor_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s03_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.runtime_config_version WHERE "configKey"='settings.commerce' AND "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' ORDER BY "settingsRevision" DESC,"createdAt" DESC,id DESC;
END $fn$;
ALTER FUNCTION public.s03_settings_rows_v2(text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s03_settings_events_v2(session_hash text,actor_id text) RETURNS SETOF public.s01_settings_publication_event
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s03_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.s01_settings_publication_event WHERE "descriptorKey"='settings.commerce' ORDER BY "publicationSequence";
END $fn$;
ALTER FUNCTION public.s03_settings_events_v2(text,text) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 6. ACL
-- =====================================================================
REVOKE ALL ON FUNCTION public.s03_settings_authorize_v2(text,text,boolean),public.s03_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s03_settings_ledger_v1(text,text,text,text),public.s03_settings_rows_v2(text,text),public.s03_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s03_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s03_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s03_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s03_settings_events_v2(text,text),public.s03_settings_value_shape_valid(jsonb),public.s03_settings_value_business_valid(jsonb) FROM PUBLIC,vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.s03_settings_rows_v2(text,text),public.s03_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s03_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s03_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s03_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s03_settings_events_v2(text,text) TO vanstro_runtime;
GRANT SELECT ON TABLE public.runtime_config_version,public.settings_command_ledger,public.s01_settings_publication_event TO vanstro_p09_guard_owner;

-- =====================================================================
-- 7. Post-assertions
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s03_settings_create_draft_v2') THEN RAISE EXCEPTION 'S03_CREATE_FN_MISSING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s03_settings_publish_v2') THEN RAISE EXCEPTION 'S03_PUBLISH_FN_MISSING'; END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint WHERE conname='settings_command_operation_check' AND convalidated=false) THEN RAISE EXCEPTION 'S03_LEDGER_CHECK_INVALID'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname='runtime_config_registry')) WHERE pg_get_constraintdef LIKE '%settings.commerce%') THEN RAISE EXCEPTION 'S03_REGISTRY_KEY_MISSING'; END IF;
END $$;

COMMIT;
