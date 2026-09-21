-- VanStro S02: General/Brand/Storefront/Localization settings implementation.
-- Unique forward migration 75. Do not edit migrations 1-74.
-- S01 _v2 functions, advisory locks, SQL bodies, signatures and ACLs are
-- preserved verbatim (this migration does not CREATE OR REPLACE any
-- public.s01_* function). S02 adds independent s02_* controlled functions
-- with their own lock domain (settings.general-storefront), a typed JSONB
-- value (GeneralStorefrontSettingsValueV1), descriptor-scoped publication
-- sequence via the existing s01_settings_publication_event object, and a
-- forward-only extension of the settings_command_ledger operation CHECK.
-- No new descriptor column, no change to S01 operation values, no migration
-- of existing unique keys, no copy of CMS/Media/Dealer facts, no secret
-- storage, no provider objects. Read-only SELECT grants on the reference
-- tables (media_assets/site_content_modules/dealers/dealer_locations) are
-- added to vanstro_p09_guard_owner so the SECURITY DEFINER business-validity
-- and public-projection functions can resolve reference existence; no
-- INSERT/UPDATE/DELETE, no new permission keys.
BEGIN;

-- =====================================================================
-- 1. Forward-extend the settings_command_ledger operation CHECK so S02
--    uses its own idempotency operation family (descriptor isolation).
--    Existing S01 rows and operations keep their values; the CHECK is
--    widened only by adding S02 operations.
-- =====================================================================
ALTER TABLE public.settings_command_ledger DROP CONSTRAINT settings_command_operation_check;
ALTER TABLE public.settings_command_ledger ADD CONSTRAINT settings_command_operation_check CHECK(
  operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft',
               's02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft')
);

-- =====================================================================
-- 2. S02 value validation helpers (pure, STABLE, no side effects).
--    Shape check: structural correctness (types, enum literals, bounds).
--    Business check: reference existence/pairing/locale relations.
--    Created before the shape constraint that references them.
-- =====================================================================
CREATE FUNCTION public.s02_settings_timezone_valid(tz text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $fn$
BEGIN
  RETURN tz IN('America/St_Johns','America/Halifax','America/Moncton','America/Glace_Bay','America/Goose_Bay','America/Blanc-Sablon','America/Toronto','America/Iqaluit','America/Winnipeg','America/Rankin_Inlet','America/Regina','America/Swift_Current','America/Edmonton','America/Cambridge_Bay','America/Inuvik','America/Dawson_Creek','America/Fort_Nelson','America/Creston','America/Vancouver','America/Whitehorse','America/Dawson');
END $fn$;
ALTER FUNCTION public.s02_settings_timezone_valid(text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s02_settings_value_shape_valid(value jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE
  gi jsonb; br jsonb; sf jsonb; lz jsonb; dd jsonb;
BEGIN
  IF value IS NULL OR jsonb_typeof(value)<>'object' THEN RETURN false; END IF;
  IF NOT (value ? 'generalIdentity' AND value ? 'brand' AND value ? 'storefront' AND value ? 'localization' AND value ? 'defaultDealerLocation') THEN RETURN false; END IF;
  gi:=value->'generalIdentity'; br:=value->'brand'; sf:=value->'storefront'; lz:=value->'localization'; dd:=value->'defaultDealerLocation';
  IF jsonb_typeof(gi)<>'object' OR jsonb_typeof(br)<>'object' OR jsonb_typeof(sf)<>'object' OR jsonb_typeof(lz)<>'object' OR jsonb_typeof(dd)<>'object' THEN RETURN false; END IF;
  -- generalIdentity
  IF jsonb_typeof(gi->'siteDisplayName')<>'string' OR char_length(btrim(gi->>'siteDisplayName'))<1 OR char_length(btrim(gi->>'siteDisplayName'))>120 THEN RETURN false; END IF;
  IF jsonb_typeof(gi->'legalName')<>'string' OR char_length(btrim(gi->>'legalName'))<1 OR char_length(btrim(gi->>'legalName'))>200 THEN RETURN false; END IF;
  IF jsonb_typeof(gi->'canonicalUrl')<>'string' OR char_length(gi->>'canonicalUrl')>2048 OR gi->>'canonicalUrl' !~ '^https{0,1}://' THEN RETURN false; END IF;
  IF jsonb_typeof(gi->'contactEmail')<>'string' OR gi->>'contactEmail' !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RETURN false; END IF;
  IF jsonb_typeof(gi->'contactPhone')<>'string' OR gi->>'contactPhone' !~ '^[+0-9()[:space:]-]{7,25}$' THEN RETURN false; END IF;
  IF jsonb_typeof(gi->'contactAddress')<>'object' OR jsonb_typeof(gi->'contactAddress'->'line1')<>'string' OR jsonb_typeof(gi->'contactAddress'->'city')<>'string' OR jsonb_typeof(gi->'contactAddress'->'province')<>'string' OR jsonb_typeof(gi->'contactAddress'->'postalCode')<>'string' OR jsonb_typeof(gi->'contactAddress'->'country')<>'string' THEN RETURN false; END IF;
  IF char_length(gi->'contactAddress'->>'postalCode')>10 THEN RETURN false; END IF;
  IF jsonb_typeof(gi->'defaultTimezone')<>'string' OR NOT public.s02_settings_timezone_valid(gi->>'defaultTimezone') THEN RETURN false; END IF;
  -- brand (color/font removed from editable schema; only safe fields)
  IF jsonb_typeof(br->'brandName')<>'string' OR char_length(btrim(br->>'brandName'))<1 OR char_length(btrim(br->>'brandName'))>120 THEN RETURN false; END IF;
  IF jsonb_typeof(br->'brandDescription')<>'string' OR char_length(br->>'brandDescription')>500 THEN RETURN false; END IF;
  IF jsonb_typeof(br->'logoMediaRef') NOT IN('string','null') THEN RETURN false; END IF;
  IF jsonb_typeof(br->'faviconMediaRef') NOT IN('string','null') THEN RETURN false; END IF;
  -- storefront
  IF jsonb_typeof(sf->'defaultProductSort')<>'string' OR sf->>'defaultProductSort' NOT IN('newest','price_asc','price_desc','featured') THEN RETURN false; END IF;
  IF jsonb_typeof(sf->'outOfStockDisplay')<>'string' OR sf->>'outOfStockDisplay' NOT IN('hide','show','hide_with_contact') THEN RETURN false; END IF;
  IF jsonb_typeof(sf->'dealerSelectionEnabled')<>'boolean' OR jsonb_typeof(sf->'cartCheckoutEnabled')<>'boolean' OR jsonb_typeof(sf->'enFrRoutesEnabled')<>'boolean' THEN RETURN false; END IF;
  IF jsonb_typeof(sf->'homeContentRef') NOT IN('string','null') THEN RETURN false; END IF;
  IF jsonb_typeof(sf->'navigationRef') NOT IN('string','null') THEN RETURN false; END IF;
  IF jsonb_typeof(sf->'footerRef') NOT IN('string','null') THEN RETURN false; END IF;
  IF jsonb_typeof(sf->'storefrontConfigRef') NOT IN('string','null') THEN RETURN false; END IF;
  IF jsonb_typeof(sf->'announcementRule')<>'object' THEN RETURN false; END IF;
  IF jsonb_typeof(sf->'announcementRule'->'enabled')<>'boolean' OR jsonb_typeof(sf->'announcementRule'->'message')<>'string' OR char_length(sf->'announcementRule'->>'message')>300 THEN RETURN false; END IF;
  IF sf->'announcementRule'->'locale' IS NOT NULL AND sf->'announcementRule'->>'locale' NOT IN('en-CA','fr-CA') THEN RETURN false; END IF;
  -- localization
  IF jsonb_typeof(lz->'defaultLocale')<>'string' OR lz->>'defaultLocale' NOT IN('en-CA','fr-CA') THEN RETURN false; END IF;
  IF jsonb_typeof(lz->'supportedLocales')<>'array' OR jsonb_array_length(lz->'supportedLocales') NOT BETWEEN 1 AND 2 THEN RETURN false; END IF;
  IF NOT (lz->'supportedLocales' @> '["en-CA"]'::jsonb OR lz->'supportedLocales' @> '["fr-CA"]'::jsonb) OR lz->'supportedLocales' @> '["zh-CN"]'::jsonb THEN RETURN false; END IF;
  IF lz->>'dashboardLocale'<>'zh-CN' OR lz->>'currency'<>'CAD' THEN RETURN false; END IF;
  IF jsonb_typeof(lz->'timezone')<>'string' OR NOT public.s02_settings_timezone_valid(lz->>'timezone') THEN RETURN false; END IF;
  IF lz->>'dateFormat' NOT IN('yyyy-mm-dd','dd-mm-yyyy','mm-dd-yyyy') OR lz->>'phoneFormat' NOT IN('national','international') OR lz->>'addressFormat'<>'canada_default' THEN RETURN false; END IF;
  IF lz->>'weightUnits' NOT IN('kg','lb') OR lz->>'dimensionUnits' NOT IN('cm','in') OR lz->>'translationFallback'<>'en_ca' THEN RETURN false; END IF;
  IF jsonb_typeof(lz->'provinceServiceMapping')<>'array' OR jsonb_array_length(lz->'provinceServiceMapping')>13 THEN RETURN false; END IF;
  -- defaultDealerLocation
  IF jsonb_typeof(dd->'defaultDealerRef') NOT IN('string','null') THEN RETURN false; END IF;
  IF jsonb_typeof(dd->'defaultLocationRef') NOT IN('string','null') THEN RETURN false; END IF;
  -- Dealer/location pairing is a business rule (blocker on validate), not a
  -- structural rule; a dealer ref without a location ref saves as a draft.
  RETURN true;
END $fn$;
ALTER FUNCTION public.s02_settings_value_shape_valid(jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s02_settings_value_business_valid(value jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE gi jsonb; br jsonb; sf jsonb; lz jsonb; dd jsonb; default_locale text; ref uuid;
BEGIN
 IF NOT public.s02_settings_value_shape_valid(value) THEN RETURN false; END IF;
 gi:=value->'generalIdentity'; br:=value->'brand'; sf:=value->'storefront'; lz:=value->'localization'; dd:=value->'defaultDealerLocation';
 default_locale:=lz->>'defaultLocale';
 IF NOT (lz->'supportedLocales' @> to_jsonb(default_locale)::jsonb) THEN RETURN false; END IF;
 IF br->'logoMediaRef' IS NOT NULL AND jsonb_typeof(br->'logoMediaRef')='string' THEN ref:=(br->>'logoMediaRef')::uuid; IF NOT EXISTS(SELECT 1 FROM public.media_assets WHERE id=ref) THEN RETURN false; END IF; END IF;
 IF br->'faviconMediaRef' IS NOT NULL AND jsonb_typeof(br->'faviconMediaRef')='string' THEN ref:=(br->>'faviconMediaRef')::uuid; IF NOT EXISTS(SELECT 1 FROM public.media_assets WHERE id=ref) THEN RETURN false; END IF; END IF;
 IF sf->'homeContentRef' IS NOT NULL AND jsonb_typeof(sf->'homeContentRef')='string' THEN IF NOT EXISTS(SELECT 1 FROM public.site_content_modules WHERE id=(sf->>'homeContentRef')::text) THEN RETURN false; END IF; END IF;
 IF sf->'navigationRef' IS NOT NULL AND jsonb_typeof(sf->'navigationRef')='string' THEN IF NOT EXISTS(SELECT 1 FROM public.site_content_modules WHERE id=(sf->>'navigationRef')::text) THEN RETURN false; END IF; END IF;
 IF sf->'footerRef' IS NOT NULL AND jsonb_typeof(sf->'footerRef')='string' THEN IF NOT EXISTS(SELECT 1 FROM public.site_content_modules WHERE id=(sf->>'footerRef')::text) THEN RETURN false; END IF; END IF;
 IF dd->'defaultDealerRef' IS NOT NULL AND jsonb_typeof(dd->'defaultDealerRef')='string' THEN
   IF NOT EXISTS(SELECT 1 FROM public.dealers WHERE id=(dd->>'defaultDealerRef')::text) THEN RETURN false; END IF;
   -- Dealer/location pairing is a business blocker (matches the API
   -- businessIssues rule): a dealer ref without a location ref must not
   -- validate.
   IF dd->'defaultLocationRef' IS NULL OR jsonb_typeof(dd->'defaultLocationRef')<>'string' THEN RETURN false; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.dealer_locations WHERE id=(dd->>'defaultLocationRef')::text AND "dealerId"=(dd->>'defaultDealerRef')::text) THEN RETURN false; END IF;
 ELSE
   -- No dealer ref: a location ref alone is also a pairing violation.
   IF dd->'defaultLocationRef' IS NOT NULL AND jsonb_typeof(dd->'defaultLocationRef')='string' THEN RETURN false; END IF;
 END IF;
 RETURN true;
END $fn$;
ALTER FUNCTION public.s02_settings_value_business_valid(jsonb) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 3. S02 shape constraints on runtime_config_version.
--    The S02 descriptor (settings.general-storefront) must be global with
--    object JSONB value; S01 shape remains exactly as migration74 left it.
-- =====================================================================
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS settings_core_shape_check;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT settings_core_shape_check CHECK (
  -- S01 branch: exactly the migration74 shape (global scope, number value,
  -- 15..300 when validated/published, revision>0, status enum, reason 8..500).
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
    -- S02 branch: global object value; validated/published rows must pass the
    -- S02 shape and business validity.
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
-- =====================================================================
-- 4. S02 controlled lifecycle functions (descriptor-scoped, independent
--    lock domain 'settings.general-storefront', s02_* operation family).
--    S01 _v2 functions are untouched.
-- =====================================================================
CREATE FUNCTION public.s02_settings_authorize_v2(session_hash text,actor_id text,write_required boolean) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; read_grant jsonb; write_grant jsonb;
BEGIN
 ctx:=public.p02_dashboard_authorization_context_v1(session_hash,actor_id);
 IF ctx->>'actorId' IS DISTINCT FROM actor_id OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S02_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT value INTO read_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.read' AND (value->>'global')::boolean LIMIT 1;
 SELECT value INTO write_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.write' AND (value->>'global')::boolean LIMIT 1;
 IF read_grant IS NULL OR (write_required AND write_grant IS NULL) THEN RAISE EXCEPTION 'S02_FORBIDDEN' USING ERRCODE='42501'; END IF;
 RETURN ctx;
END $fn$;
ALTER FUNCTION public.s02_settings_authorize_v2(text,text,boolean) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s02_settings_audit_v2(actor_id text,ctx jsonb,resource_id uuid,request_id text,action_value text,result_value text,reason_value text,metadata_value jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE event_id uuid:=gen_random_uuid(); effective_roles jsonb; grants jsonb; scope_kind text; dealer_ids jsonb; location_ids jsonb; context_revision text;
BEGIN
 IF request_id!~'^[A-Za-z0-9._:-]{1,128}$' OR action_value NOT IN('create','update','config_publish','unpublish') OR result_value NOT IN('succeeded','failed') THEN RAISE EXCEPTION 'S02_AUDIT_INVALID'; END IF;
 IF ctx IS NULL OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S02_AUDIT_CONTEXT_UNAVAILABLE'; END IF;
 effective_roles:=COALESCE(ctx->'globalRoleKeys','[]'::jsonb); grants:=COALESCE(ctx->'permissionGrants','[]'::jsonb); scope_kind:='global'; context_revision:=ctx->>'contextRevision';
 INSERT INTO public.audit_events(id,"eventVersion","occurredAt","actorType","actorId","actorDisplayClass","effectiveRoles","permissionGrants","authorizationScopeKind","dealerIds","locationIds","contextRevision","authorizationContractVersion",action,"resourceType","resourceId",result,reason,"requestId",source,metadata,sensitive,"retentionClass","retentionPolicyVersion","expiresAt")
 VALUES(event_id,'audit-event.v1',CURRENT_TIMESTAMP,'admin_user',actor_id,'staff',effective_roles,grants,scope_kind,'[]'::jsonb,'[]'::jsonb,context_revision,'dashboard-authorization.v1',action_value,'runtime_config',resource_id::text,result_value,reason_value,request_id,'dashboard_api',metadata_value,false,'high_risk','audit-retention.v1',CURRENT_TIMESTAMP+INTERVAL '2555 days');
 RETURN event_id;
END $fn$;
ALTER FUNCTION public.s02_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s02_settings_ledger_v1(actor_id text,operation_value text,idempotency_hash text,request_hash text) RETURNS public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE command public.settings_command_ledger%ROWTYPE; result public.runtime_config_version%ROWTYPE;
BEGIN
 SELECT * INTO command FROM public.settings_command_ledger WHERE "actorId"=actor_id AND operation=operation_value AND "idempotencyHash"=idempotency_hash FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF command."requestHash"<>request_hash THEN RAISE EXCEPTION 'S02_IDEMPOTENCY_CONFLICT'; END IF;
 IF command."resultRuntimeConfigId" IS NULL THEN RAISE EXCEPTION 'S02_STATE_CONFLICT'; END IF;
 SELECT * INTO result FROM jsonb_populate_record(NULL::public.runtime_config_version,command."resultSnapshot");
 RETURN result;
END $fn$;
ALTER FUNCTION public.s02_settings_ledger_v1(text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s02_settings_create_draft_v2(session_hash text,actor_id text,expected_published_version integer,desired_value jsonb,change_reason text,idempotency_hash text,request_hash text,request_id text,rollback_source uuid DEFAULT NULL) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; active public.runtime_config_version%ROWTYPE; source public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; created public.runtime_config_version%ROWTYPE; operation_value text; next_revision integer; next_version integer; audit_id uuid;
BEGIN
 ctx:=public.s02_settings_authorize_v2(session_hash,actor_id,true); operation_value:=CASE WHEN rollback_source IS NULL THEN 's02_create_draft' ELSE 's02_create_rollback_draft' END;
 IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S02_VALIDATION'; END IF;
 IF NOT public.s02_settings_value_shape_valid(desired_value) THEN RAISE EXCEPTION 'S02_VALIDATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('settings.general-storefront',0));
 replay:=public.s02_settings_ledger_v1(actor_id,operation_value,idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"='settings.general-storefront' AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1;
 IF COALESCE(active."settingsRevision",0)<>expected_published_version THEN RAISE EXCEPTION 'S02_VERSION_CONFLICT'; END IF;
 IF rollback_source IS NOT NULL THEN
   SELECT * INTO source FROM public.runtime_config_version WHERE id=rollback_source AND "configKey"='settings.general-storefront' AND "authorizationScopeKind"='global' AND "settingsLifecycleStatus" IN('published','superseded') FOR SHARE;
   IF NOT FOUND OR source."effectiveValue" IS NULL THEN RAISE EXCEPTION 'S02_STATE_CONFLICT'; END IF;
   desired_value:=source."effectiveValue";
 END IF;
 SELECT COALESCE(max("settingsRevision"),0)+1,COALESCE(max(version),0)+1 INTO next_revision,next_version FROM public.runtime_config_version WHERE "configKey"='settings.general-storefront';
 INSERT INTO public.runtime_config_version(id,"configKey","schemaVersion","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","desiredValue","effectiveValue","desiredSource","effectiveSource","validationStatus","activationStatus","settingsChangeReason","settingsRollbackOfPublicationId",version,generation,"createdBy","idempotencyKeyHash","requestHash","authorityVersion","settingsRevision","settingsLifecycleStatus")
 VALUES(gen_random_uuid(),'settings.general-storefront','settings.general-storefront.v1','global','{}','{}',ctx->>'contextRevision',encode(digest('settings:global:s02','sha256'),'hex'),encode(digest('settings:safe:s02','sha256'),'hex'),desired_value,active."effectiveValue",CASE WHEN rollback_source IS NULL THEN 'settings_draft' ELSE 'rollback_draft' END,active."effectiveSource",'validation_failed','draft',btrim(change_reason),rollback_source,next_version,COALESCE(active."settingsRevision",0),actor_id,encode(digest(operation_value||':'||idempotency_hash,'sha256'),'hex'),request_hash,1,next_revision,'draft') RETURNING * INTO created;
 audit_id:=public.s02_settings_audit_v2(actor_id,ctx,created.id,request_id,'create','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',created."configKey",'version',created."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,operation_value,idempotency_hash,request_hash,created.id,created."settingsRevision",to_jsonb(created),audit_id);
 RETURN NEXT created;
END $fn$;
ALTER FUNCTION public.s02_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s02_settings_update_draft_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,desired_value jsonb,change_reason text,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid;
BEGIN
 ctx:=public.s02_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.general-storefront',0));
 IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S02_VALIDATION'; END IF;
 IF NOT public.s02_settings_value_shape_valid(desired_value) THEN RAISE EXCEPTION 'S02_VALIDATION'; END IF;
 replay:=public.s02_settings_ledger_v1(actor_id,'s02_update_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.general-storefront' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S02_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S02_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S02_STATE_CONFLICT'; END IF;
 UPDATE public.runtime_config_version SET "desiredValue"=desired_value,"settingsChangeReason"=btrim(change_reason),"settingsLifecycleStatus"='draft',"validationStatus"='validation_failed',"activationStatus"='draft',"settingsRevision"="settingsRevision"+1,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s02_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s02_update_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s02_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s02_settings_validate_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; next_state text; validation_status text;
BEGIN
 ctx:=public.s02_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.general-storefront',0));
 replay:=public.s02_settings_ledger_v1(actor_id,'s02_validate_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.general-storefront' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S02_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S02_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S02_STATE_CONFLICT'; END IF;
 IF public.s02_settings_value_shape_valid(row."desiredValue") AND public.s02_settings_value_business_valid(row."desiredValue") THEN
   next_state:='validated'; validation_status:='validated';
 ELSE
   next_state:='invalid'; validation_status:='validation_failed';
 END IF;
 UPDATE public.runtime_config_version SET "settingsLifecycleStatus"=next_state,"validationStatus"=validation_status,"settingsRevision"="settingsRevision"+1,"settingsValidatedAt"=CURRENT_TIMESTAMP,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s02_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus',next_state)));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s02_validate_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s02_settings_validate_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s02_settings_publish_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; active public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; supersession_audit_id uuid; next_sequence integer; is_rollback boolean;
BEGIN
 ctx:=public.s02_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.general-storefront',0));
 replay:=public.s02_settings_ledger_v1(actor_id,'s02_publish_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.general-storefront' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S02_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S02_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus"<>'validated' THEN RAISE EXCEPTION 'S02_STATE_CONFLICT'; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"=row."configKey" AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1 FOR UPDATE;
 IF COALESCE(active."settingsRevision",0)<>row.generation THEN RAISE EXCEPTION 'S02_VERSION_CONFLICT'; END IF;
 is_rollback:=COALESCE(row."settingsRollbackOfPublicationId" IS NOT NULL,false);
 SELECT COALESCE(max("publicationSequence"),0)+1 INTO next_sequence FROM public.s01_settings_publication_event WHERE "descriptorKey"=row."configKey";
 IF active.id IS NOT NULL THEN
   supersession_audit_id:=public.s02_settings_audit_v2(actor_id,ctx,active.id,request_id,'unpublish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',active."configKey",'version',active."settingsRevision",'lifecycleStatus','superseded')));
   INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
   VALUES(gen_random_uuid(),row."configKey",active.id,next_sequence,'superseded',NULL,COALESCE(row."settingsChangeReason",'Superseded by a later publication.'),supersession_audit_id,CURRENT_TIMESTAMP);
   next_sequence:=next_sequence+1;
 END IF;
 audit_id:=public.s02_settings_audit_v2(actor_id,ctx,row.id,request_id,'config_publish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision"+1,'lifecycleStatus','published')));
 UPDATE public.runtime_config_version SET "activationStatus"='active',"settingsLifecycleStatus"='published',"effectiveValue"="desiredValue","effectiveSource"='runtime_override',generation="settingsRevision"+1,"settingsRevision"="settingsRevision"+1,"activatedAt"=CURRENT_TIMESTAMP,"successAuditEventId"=audit_id,"authorityVersion"=2,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=row.id RETURNING * INTO row;
 INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","sourceDraftId","sourceDraftVersion","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
 VALUES(gen_random_uuid(),row."configKey",row.id,next_sequence,CASE WHEN is_rollback THEN 'rollback_published' ELSE 'published' END,row.id,row."settingsRevision",row."settingsRollbackOfPublicationId",COALESCE(row."settingsChangeReason",'Settings publication.'),audit_id,CURRENT_TIMESTAMP);
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s02_publish_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s02_settings_publish_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s02_settings_rows_v2(session_hash text,actor_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s02_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.runtime_config_version WHERE "configKey"='settings.general-storefront' AND "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' ORDER BY "settingsRevision" DESC,"createdAt" DESC,id DESC;
END $fn$;
ALTER FUNCTION public.s02_settings_rows_v2(text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s02_settings_events_v2(session_hash text,actor_id text) RETURNS SETOF public.s01_settings_publication_event
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s02_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.s01_settings_publication_event WHERE "descriptorKey"='settings.general-storefront' ORDER BY "publicationSequence";
END $fn$;
ALTER FUNCTION public.s02_settings_events_v2(text,text) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 5. Public storefront projection (read-only, no Dashboard actor).
--    Returns public-safe effective config + publishedGeneration.
-- =====================================================================
CREATE FUNCTION public.s02_settings_public_projection_v1(locale_value text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE row public.runtime_config_version%ROWTYPE; value jsonb; gi jsonb; br jsonb; sf jsonb; lz jsonb; dd jsonb; result jsonb; media_logo jsonb; dealer jsonb; location jsonb; gen integer;
BEGIN
 IF locale_value NOT IN('en-CA','fr-CA') THEN RAISE EXCEPTION 'S02_VALIDATION'; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE "configKey"='settings.general-storefront' AND "settingsLifecycleStatus"='published' AND "authorizationScopeKind"='global' ORDER BY "settingsRevision" DESC LIMIT 1;
 IF NOT FOUND THEN
   RETURN jsonb_build_object('projectionState','compiled_default','publishedGeneration',0,'locale',locale_value,'effective',jsonb_build_object(
     'siteDisplayName','VanStro Global Supply','brandName','VanStro',
     'announcementRule',jsonb_build_object('enabled',false,'message','','locale',NULL,'startsAt',NULL,'endsAt',NULL),
     'contact',jsonb_build_object('email','','phone',''),
     'logoMedia',NULL,'defaultDealer',NULL,'defaultLocation',NULL
   ));
 END IF;
 SELECT COALESCE(max("publicationSequence"),0) INTO gen FROM public.s01_settings_publication_event WHERE "descriptorKey"='settings.general-storefront';
 value:=row."effectiveValue"; gi:=value->'generalIdentity'; br:=value->'brand'; sf:=value->'storefront'; lz:=value->'localization'; dd:=value->'defaultDealerLocation';
 IF br->'logoMediaRef' IS NOT NULL AND jsonb_typeof(br->'logoMediaRef')='string' THEN
   SELECT jsonb_build_object('id',ma.id,'contentType',ma."declaredContentType") INTO media_logo FROM public.media_assets ma WHERE ma.id=(br->>'logoMediaRef')::uuid;
 END IF;
 IF dd->'defaultDealerRef' IS NOT NULL AND jsonb_typeof(dd->'defaultDealerRef')='string' THEN
   SELECT jsonb_build_object('id',d.id,'name',d.name) INTO dealer FROM public.dealers d WHERE d.id=(dd->>'defaultDealerRef')::text;
   IF dd->'defaultLocationRef' IS NOT NULL AND jsonb_typeof(dd->'defaultLocationRef')='string' THEN
     SELECT jsonb_build_object('id',l.id,'city',l.city,'province',l.province) INTO location FROM public.dealer_locations l WHERE l.id=(dd->>'defaultLocationRef')::text AND l."dealerId"=(dd->>'defaultDealerRef')::text;
   END IF;
 END IF;
 result:=jsonb_build_object(
   'projectionState','published','publishedGeneration',gen,'locale',locale_value,
   'effective',jsonb_build_object(
     'siteDisplayName',gi->>'siteDisplayName','brandName',br->>'brandName',
     'announcementRule',jsonb_build_object(
       'enabled',COALESCE((sf->'announcementRule'->>'enabled')::boolean,false),
       'message',COALESCE(sf->'announcementRule'->>'message',''),
       'locale',sf->'announcementRule'->'locale',
       'startsAt',sf->'announcementRule'->'startsAt',
       'endsAt',sf->'announcementRule'->'endsAt'
     ),
     'contact',jsonb_build_object('email',COALESCE(gi->>'contactEmail',''),'phone',COALESCE(gi->>'contactPhone','')),
     'logoMedia',media_logo,
     'defaultDealer',dealer,'defaultLocation',location
   )
 );
 RETURN result;
END $fn$;
ALTER FUNCTION public.s02_settings_public_projection_v1(text) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 6. ACL: S02 functions granted to runtime roles; public projection
--    readable without Dashboard actor (security definer owner grants).
-- =====================================================================
REVOKE ALL ON FUNCTION public.s02_settings_authorize_v2(text,text,boolean),public.s02_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s02_settings_ledger_v1(text,text,text,text),public.s02_settings_rows_v2(text,text),public.s02_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s02_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s02_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s02_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s02_settings_events_v2(text,text),public.s02_settings_value_shape_valid(jsonb),public.s02_settings_value_business_valid(jsonb),public.s02_settings_timezone_valid(text) FROM PUBLIC,vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.s02_settings_authorize_v2(text,text,boolean),public.s02_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s02_settings_ledger_v1(text,text,text,text),public.s02_settings_rows_v2(text,text),public.s02_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s02_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s02_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s02_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s02_settings_events_v2(text,text) TO vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.s02_settings_public_projection_v1(text) TO vanstro_runtime;
GRANT SELECT ON TABLE public.media_assets,public.site_content_modules,public.dealers,public.dealer_locations TO vanstro_p09_guard_owner;
GRANT SELECT ON TABLE public.runtime_config_version,public.settings_command_ledger,public.s01_settings_publication_event TO vanstro_p09_guard_owner;

-- =====================================================================
-- 7. Post-assertions
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s02_settings_create_draft_v2') THEN RAISE EXCEPTION 'S02_CREATE_FN_MISSING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s02_settings_publish_v2') THEN RAISE EXCEPTION 'S02_PUBLISH_FN_MISSING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s02_settings_public_projection_v1') THEN RAISE EXCEPTION 'S02_PUBLIC_PROJECTION_MISSING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s01_settings_publish_v2') THEN RAISE EXCEPTION 'S01_PUBLISH_FN_MISSING'; END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint WHERE conname='settings_command_operation_check' AND convalidated=false) THEN RAISE EXCEPTION 'S02_LEDGER_CHECK_INVALID'; END IF;
END $$;

COMMIT;
