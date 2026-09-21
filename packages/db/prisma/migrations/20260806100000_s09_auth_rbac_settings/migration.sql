-- VanStro S09: Auth/Sessions/RBAC settings implementation.
-- Unique forward migration 76. Do not edit migrations 1-75.
-- S01/S02 _v2 functions, advisory locks, SQL bodies, signatures and ACLs are
-- preserved verbatim (this migration does not CREATE OR REPLACE any
-- public.s01_* or public.s02_* function). S09 adds independent s09_* controlled
-- functions with their own lock domain (settings.auth-rbac), a typed JSONB
-- value (AuthRbacSettingsValueV1), descriptor-scoped publication sequence via
-- the existing s01_settings_publication_event object, a forward-only extension
-- of the settings_command_ledger operation CHECK, a forward-only extension of
-- the settings_core_shape_check, and a read-only effective-policy resolver for
-- future login/refresh consumers. The runtime_config_registry descriptor
-- allowlist is extended with both settings.general-storefront (S02 publish
-- rows would otherwise violate this CHECK on a real migrate-deploy chain) and
-- settings.auth-rbac. No new descriptor column, no change to S01/S02 operation
-- values, no migration of existing unique keys, no copy of User/Role/Permission
-- or session facts, no secret storage, no new permission keys.
BEGIN;

-- =====================================================================
-- 1. Forward-extend the settings_command_ledger operation CHECK so S09
--    uses its own idempotency operation family (descriptor isolation).
--    Existing S01/S02 rows and operations keep their values; the CHECK is
--    widened only by adding S09 operations.
-- =====================================================================
ALTER TABLE public.settings_command_ledger DROP CONSTRAINT settings_command_operation_check;
ALTER TABLE public.settings_command_ledger ADD CONSTRAINT settings_command_operation_check CHECK(
  operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft',
               's02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft',
               's09_create_draft','s09_update_draft','s09_validate_draft','s09_publish_draft','s09_create_rollback_draft')
);

-- =====================================================================
-- 2. Forward-extend the runtime_config_registry descriptor allowlist.
--    Migration73 rebuilt this CHECK with only the four P09/S01 keys; S02
--    published settings.general-storefront rows would violate it on a real
--    migrate-deploy chain, and S09 publishes settings.auth-rbac. Both legal
--    Settings descriptors are added so the constraint matches runtime use.
-- =====================================================================
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS runtime_config_registry;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_registry CHECK ("configKey" IN ('foundation.runtime.refresh_interval_seconds','foundation.runtime.display_mode','foundation.runtime.safe_origin','settings.core.overview_refresh_seconds','settings.general-storefront','settings.auth-rbac'));

-- =====================================================================
-- 3. S09 value validation helpers (pure, STABLE, no side effects).
--    Shape check: exact top-level keys, types and integer bounds.
--    Business check: same bounds re-asserted (single-source TTL authority)
--    plus explicit rejection of any secret/token/cookie/hash field names.
-- =====================================================================
CREATE FUNCTION public.s09_settings_value_shape_valid(value jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE pp jsonb; sp jsonb;
BEGIN
  IF value IS NULL OR jsonb_typeof(value)<>'object' THEN RETURN false; END IF;
  IF NOT (value ? 'passwordPolicy' AND value ? 'sessionPolicy') THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(value))<>2 THEN RETURN false; END IF;
  pp:=value->'passwordPolicy'; sp:=value->'sessionPolicy';
  IF jsonb_typeof(pp)<>'object' OR jsonb_typeof(sp)<>'object' THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(pp))<>2 THEN RETURN false; END IF;
  IF NOT (pp ? 'minimumLength' AND pp ? 'resetTokenTtlMinutes') THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(sp))<>1 THEN RETURN false; END IF;
  IF NOT (sp ? 'sessionLifetimeMinutes') THEN RETURN false; END IF;
  IF jsonb_typeof(pp->'minimumLength')<>'number' OR (pp->>'minimumLength')::integer IS NULL
     OR (pp->>'minimumLength')::integer<12 OR (pp->>'minimumLength')::integer>128 THEN RETURN false; END IF;
  IF jsonb_typeof(pp->'resetTokenTtlMinutes')<>'number' OR (pp->>'resetTokenTtlMinutes')::integer IS NULL
     OR (pp->>'resetTokenTtlMinutes')::integer<5 OR (pp->>'resetTokenTtlMinutes')::integer>31 THEN RETURN false; END IF;
  IF jsonb_typeof(sp->'sessionLifetimeMinutes')<>'number' OR (sp->>'sessionLifetimeMinutes')::integer IS NULL
     OR (sp->>'sessionLifetimeMinutes')::integer<15 OR (sp->>'sessionLifetimeMinutes')::integer>11520 THEN RETURN false; END IF;
  RETURN true;
END $fn$;
ALTER FUNCTION public.s09_settings_value_shape_valid(jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s09_settings_value_business_valid(value jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
  IF NOT public.s09_settings_value_shape_valid(value) THEN RETURN false; END IF;
  -- Single-source TTL authority: bounds are re-asserted by shape_valid; this
  -- layer rejects any field name that could carry secret material (defense in
  -- depth; Settings must never echo cookie secrets, hashes or tokens). The
  -- TTL suffix is exempt so resetTokenTtlMinutes (a duration, not a secret)
  -- remains legal.
  IF value::text ~* '(cookie|secret|hash|salt|credential|authorization|token(?!ttl))' THEN RETURN false; END IF;
  RETURN true;
END $fn$;
ALTER FUNCTION public.s09_settings_value_business_valid(jsonb) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 4. S09 shape constraints on runtime_config_version.
--    The S09 descriptor (settings.auth-rbac) must be global with object
--    JSONB value; S01 and S02 branches remain exactly as migration74/75
--    left them.
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
    -- S09 branch: global object value; validated/published rows must pass the
    -- S09 shape and business validity.
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
-- =====================================================================
-- 5. S09 controlled lifecycle functions (descriptor-scoped, independent
--    lock domain 'settings.auth-rbac', s09_* operation family).
--    S01/S02 _v2 functions are untouched.
-- =====================================================================
CREATE FUNCTION public.s09_settings_authorize_v2(session_hash text,actor_id text,write_required boolean) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; read_grant jsonb; write_grant jsonb;
BEGIN
 ctx:=public.p02_dashboard_authorization_context_v1(session_hash,actor_id);
 IF ctx->>'actorId' IS DISTINCT FROM actor_id OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S09_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT value INTO read_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.read' AND (value->>'global')::boolean LIMIT 1;
 SELECT value INTO write_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.write' AND (value->>'global')::boolean LIMIT 1;
 IF read_grant IS NULL OR (write_required AND write_grant IS NULL) THEN RAISE EXCEPTION 'S09_FORBIDDEN' USING ERRCODE='42501'; END IF;
 RETURN ctx;
END $fn$;
ALTER FUNCTION public.s09_settings_authorize_v2(text,text,boolean) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s09_settings_audit_v2(actor_id text,ctx jsonb,resource_id uuid,request_id text,action_value text,result_value text,reason_value text,metadata_value jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE event_id uuid:=gen_random_uuid(); effective_roles jsonb; grants jsonb; scope_kind text; dealer_ids jsonb; location_ids jsonb; context_revision text;
BEGIN
 IF request_id!~'^[A-Za-z0-9._:-]{1,128}$' OR action_value NOT IN('create','update','config_publish','unpublish') OR result_value NOT IN('succeeded','failed') THEN RAISE EXCEPTION 'S09_AUDIT_INVALID'; END IF;
 IF ctx IS NULL OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S09_AUDIT_CONTEXT_UNAVAILABLE'; END IF;
 effective_roles:=COALESCE(ctx->'globalRoleKeys','[]'::jsonb); grants:=COALESCE(ctx->'permissionGrants','[]'::jsonb); scope_kind:='global'; context_revision:=ctx->>'contextRevision';
 INSERT INTO public.audit_events(id,"eventVersion","occurredAt","actorType","actorId","actorDisplayClass","effectiveRoles","permissionGrants","authorizationScopeKind","dealerIds","locationIds","contextRevision","authorizationContractVersion",action,"resourceType","resourceId",result,reason,"requestId",source,metadata,sensitive,"retentionClass","retentionPolicyVersion","expiresAt")
 VALUES(event_id,'audit-event.v1',CURRENT_TIMESTAMP,'admin_user',actor_id,'staff',effective_roles,grants,scope_kind,'[]'::jsonb,'[]'::jsonb,context_revision,'dashboard-authorization.v1',action_value,'runtime_config',resource_id::text,result_value,reason_value,request_id,'dashboard_api',metadata_value,false,'high_risk','audit-retention.v1',CURRENT_TIMESTAMP+INTERVAL '2555 days');
 RETURN event_id;
END $fn$;
ALTER FUNCTION public.s09_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s09_settings_ledger_v1(actor_id text,operation_value text,idempotency_hash text,request_hash text) RETURNS public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE command public.settings_command_ledger%ROWTYPE; result public.runtime_config_version%ROWTYPE;
BEGIN
 SELECT * INTO command FROM public.settings_command_ledger WHERE "actorId"=actor_id AND operation=operation_value AND "idempotencyHash"=idempotency_hash FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF command."requestHash"<>request_hash THEN RAISE EXCEPTION 'S09_IDEMPOTENCY_CONFLICT'; END IF;
 IF command."resultRuntimeConfigId" IS NULL THEN RAISE EXCEPTION 'S09_STATE_CONFLICT'; END IF;
 SELECT * INTO result FROM jsonb_populate_record(NULL::public.runtime_config_version,command."resultSnapshot");
 RETURN result;
END $fn$;
ALTER FUNCTION public.s09_settings_ledger_v1(text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s09_settings_create_draft_v2(session_hash text,actor_id text,expected_published_version integer,desired_value jsonb,change_reason text,idempotency_hash text,request_hash text,request_id text,rollback_source uuid DEFAULT NULL) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; active public.runtime_config_version%ROWTYPE; source public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; created public.runtime_config_version%ROWTYPE; operation_value text; next_revision integer; next_version integer; audit_id uuid;
BEGIN
 ctx:=public.s09_settings_authorize_v2(session_hash,actor_id,true); operation_value:=CASE WHEN rollback_source IS NULL THEN 's09_create_draft' ELSE 's09_create_rollback_draft' END;
 IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S09_VALIDATION'; END IF;
 IF NOT public.s09_settings_value_shape_valid(desired_value) THEN RAISE EXCEPTION 'S09_VALIDATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('settings.auth-rbac',0));
 replay:=public.s09_settings_ledger_v1(actor_id,operation_value,idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"='settings.auth-rbac' AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1;
 IF COALESCE(active."settingsRevision",0)<>expected_published_version THEN RAISE EXCEPTION 'S09_VERSION_CONFLICT'; END IF;
 IF rollback_source IS NOT NULL THEN
   SELECT * INTO source FROM public.runtime_config_version WHERE id=rollback_source AND "configKey"='settings.auth-rbac' AND "authorizationScopeKind"='global' AND "settingsLifecycleStatus" IN('published','superseded') FOR SHARE;
   IF NOT FOUND OR source."effectiveValue" IS NULL THEN RAISE EXCEPTION 'S09_STATE_CONFLICT'; END IF;
   desired_value:=source."effectiveValue";
 END IF;
 SELECT COALESCE(max("settingsRevision"),0)+1,COALESCE(max(version),0)+1 INTO next_revision,next_version FROM public.runtime_config_version WHERE "configKey"='settings.auth-rbac';
 INSERT INTO public.runtime_config_version(id,"configKey","schemaVersion","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","desiredValue","effectiveValue","desiredSource","effectiveSource","validationStatus","activationStatus","settingsChangeReason","settingsRollbackOfPublicationId",version,generation,"createdBy","idempotencyKeyHash","requestHash","authorityVersion","settingsRevision","settingsLifecycleStatus")
 VALUES(gen_random_uuid(),'settings.auth-rbac','settings.auth-rbac.v1','global','{}','{}',ctx->>'contextRevision',encode(digest('settings:global:s09','sha256'),'hex'),encode(digest('settings:safe:s09','sha256'),'hex'),desired_value,active."effectiveValue",CASE WHEN rollback_source IS NULL THEN 'settings_draft' ELSE 'rollback_draft' END,active."effectiveSource",'validation_failed','draft',btrim(change_reason),rollback_source,next_version,COALESCE(active."settingsRevision",0),actor_id,encode(digest(operation_value||':'||idempotency_hash,'sha256'),'hex'),request_hash,1,next_revision,'draft') RETURNING * INTO created;
 audit_id:=public.s09_settings_audit_v2(actor_id,ctx,created.id,request_id,'create','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',created."configKey",'version',created."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,operation_value,idempotency_hash,request_hash,created.id,created."settingsRevision",to_jsonb(created),audit_id);
 RETURN NEXT created;
END $fn$;
ALTER FUNCTION public.s09_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s09_settings_update_draft_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,desired_value jsonb,change_reason text,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid;
BEGIN
 ctx:=public.s09_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.auth-rbac',0));
 IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S09_VALIDATION'; END IF;
 IF NOT public.s09_settings_value_shape_valid(desired_value) THEN RAISE EXCEPTION 'S09_VALIDATION'; END IF;
 replay:=public.s09_settings_ledger_v1(actor_id,'s09_update_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.auth-rbac' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S09_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S09_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S09_STATE_CONFLICT'; END IF;
 UPDATE public.runtime_config_version SET "desiredValue"=desired_value,"settingsChangeReason"=btrim(change_reason),"settingsLifecycleStatus"='draft',"validationStatus"='validation_failed',"activationStatus"='draft',"settingsRevision"="settingsRevision"+1,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s09_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s09_update_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s09_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s09_settings_validate_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; next_state text; validation_status text;
BEGIN
 ctx:=public.s09_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.auth-rbac',0));
 replay:=public.s09_settings_ledger_v1(actor_id,'s09_validate_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.auth-rbac' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S09_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S09_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S09_STATE_CONFLICT'; END IF;
 IF public.s09_settings_value_shape_valid(row."desiredValue") AND public.s09_settings_value_business_valid(row."desiredValue") THEN
   next_state:='validated'; validation_status:='validated';
 ELSE
   next_state:='invalid'; validation_status:='validation_failed';
 END IF;
 UPDATE public.runtime_config_version SET "settingsLifecycleStatus"=next_state,"validationStatus"=validation_status,"settingsRevision"="settingsRevision"+1,"settingsValidatedAt"=CURRENT_TIMESTAMP,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s09_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus',next_state)));
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s09_validate_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s09_settings_validate_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s09_settings_publish_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; active public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; supersession_audit_id uuid; next_sequence integer; is_rollback boolean;
BEGIN
 ctx:=public.s09_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.auth-rbac',0));
 replay:=public.s09_settings_ledger_v1(actor_id,'s09_publish_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.auth-rbac' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'S09_NOT_FOUND' USING ERRCODE='22023'; END IF;
 IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S09_VERSION_CONFLICT'; END IF;
 IF row."settingsLifecycleStatus"<>'validated' THEN RAISE EXCEPTION 'S09_STATE_CONFLICT'; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"=row."configKey" AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1 FOR UPDATE;
 IF COALESCE(active."settingsRevision",0)<>row.generation THEN RAISE EXCEPTION 'S09_VERSION_CONFLICT'; END IF;
 is_rollback:=COALESCE(row."settingsRollbackOfPublicationId" IS NOT NULL,false);
 SELECT COALESCE(max("publicationSequence"),0)+1 INTO next_sequence FROM public.s01_settings_publication_event WHERE "descriptorKey"=row."configKey";
 IF active.id IS NOT NULL THEN
   supersession_audit_id:=public.s09_settings_audit_v2(actor_id,ctx,active.id,request_id,'unpublish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',active."configKey",'version',active."settingsRevision",'lifecycleStatus','superseded')));
   INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
   VALUES(gen_random_uuid(),row."configKey",active.id,next_sequence,'superseded',NULL,COALESCE(row."settingsChangeReason",'Superseded by a later publication.'),supersession_audit_id,CURRENT_TIMESTAMP);
   next_sequence:=next_sequence+1;
 END IF;
 audit_id:=public.s09_settings_audit_v2(actor_id,ctx,row.id,request_id,'config_publish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision"+1,'lifecycleStatus','published')));
 UPDATE public.runtime_config_version SET "activationStatus"='active',"settingsLifecycleStatus"='published',"effectiveValue"="desiredValue","effectiveSource"='runtime_override',generation="settingsRevision"+1,"settingsRevision"="settingsRevision"+1,"activatedAt"=CURRENT_TIMESTAMP,"successAuditEventId"=audit_id,"authorityVersion"=2,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=row.id RETURNING * INTO row;
 INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","sourceDraftId","sourceDraftVersion","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
 VALUES(gen_random_uuid(),row."configKey",row.id,next_sequence,CASE WHEN is_rollback THEN 'rollback_published' ELSE 'published' END,row.id,row."settingsRevision",row."settingsRollbackOfPublicationId",COALESCE(row."settingsChangeReason",'Settings publication.'),audit_id,CURRENT_TIMESTAMP);
 INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'s09_publish_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s09_settings_publish_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s09_settings_rows_v2(session_hash text,actor_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s09_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.runtime_config_version WHERE "configKey"='settings.auth-rbac' AND "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' ORDER BY "settingsRevision" DESC,"createdAt" DESC,id DESC;
END $fn$;
ALTER FUNCTION public.s09_settings_rows_v2(text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s09_settings_events_v2(session_hash text,actor_id text) RETURNS SETOF public.s01_settings_publication_event
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s09_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.s01_settings_publication_event WHERE "descriptorKey"='settings.auth-rbac' ORDER BY "publicationSequence";
END $fn$;
ALTER FUNCTION public.s09_settings_events_v2(text,text) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 6. Effective auth policy resolver (read-only, no Dashboard actor).
--    Returns the published AuthRbac policy plus its publication sequence,
--    or compiled defaults (publishedGeneration 0) when no valid publication
--    exists. Future login/refresh/registration/reset consumers resolve this
--    once per operation; existing sessions are never retroactively changed.
-- =====================================================================
CREATE FUNCTION public.s09_settings_effective_policy_v1() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE row public.runtime_config_version%ROWTYPE; value jsonb; gen integer;
BEGIN
 SELECT * INTO row FROM public.runtime_config_version WHERE "configKey"='settings.auth-rbac' AND "settingsLifecycleStatus"='published' AND "authorizationScopeKind"='global' ORDER BY "settingsRevision" DESC LIMIT 1;
 IF NOT FOUND THEN
   RETURN jsonb_build_object('projectionState','compiled_default','publishedGeneration',0,
     'passwordPolicy',jsonb_build_object('minimumLength',12,'resetTokenTtlMinutes',30),
     'sessionPolicy',jsonb_build_object('sessionLifetimeMinutes',10080));
 END IF;
 SELECT COALESCE(max("publicationSequence"),0) INTO gen FROM public.s01_settings_publication_event WHERE "descriptorKey"='settings.auth-rbac';
 value:=row."effectiveValue";
 RETURN jsonb_build_object('projectionState','published','publishedGeneration',gen,
   'passwordPolicy',jsonb_build_object('minimumLength',(value->'passwordPolicy'->>'minimumLength')::integer,'resetTokenTtlMinutes',(value->'passwordPolicy'->>'resetTokenTtlMinutes')::integer),
   'sessionPolicy',jsonb_build_object('sessionLifetimeMinutes',(value->'sessionPolicy'->>'sessionLifetimeMinutes')::integer));
END $fn$;
ALTER FUNCTION public.s09_settings_effective_policy_v1() OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 7. ACL: S09 functions granted to runtime roles; the effective policy
--    resolver is readable by the runtime role without a Dashboard actor.
-- =====================================================================
REVOKE ALL ON FUNCTION public.s09_settings_authorize_v2(text,text,boolean),public.s09_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s09_settings_ledger_v1(text,text,text,text),public.s09_settings_rows_v2(text,text),public.s09_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s09_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s09_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s09_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s09_settings_events_v2(text,text),public.s09_settings_value_shape_valid(jsonb),public.s09_settings_value_business_valid(jsonb) FROM PUBLIC,vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.s09_settings_authorize_v2(text,text,boolean),public.s09_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s09_settings_ledger_v1(text,text,text,text),public.s09_settings_rows_v2(text,text),public.s09_settings_create_draft_v2(text,text,integer,jsonb,text,text,text,text,uuid),public.s09_settings_update_draft_v2(text,text,uuid,integer,jsonb,text,text,text,text),public.s09_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s09_settings_publish_v2(text,text,uuid,integer,text,text,text),public.s09_settings_events_v2(text,text) TO vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.s09_settings_effective_policy_v1() TO vanstro_runtime;
GRANT SELECT ON TABLE public.runtime_config_version,public.settings_command_ledger,public.s01_settings_publication_event TO vanstro_p09_guard_owner;

-- =====================================================================
-- 8. Post-assertions
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s09_settings_create_draft_v2') THEN RAISE EXCEPTION 'S09_CREATE_FN_MISSING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s09_settings_publish_v2') THEN RAISE EXCEPTION 'S09_PUBLISH_FN_MISSING'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s09_settings_effective_policy_v1') THEN RAISE EXCEPTION 'S09_EFFECTIVE_POLICY_MISSING'; END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint WHERE conname='settings_command_operation_check' AND convalidated=false) THEN RAISE EXCEPTION 'S09_LEDGER_CHECK_INVALID'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname='runtime_config_registry')) WHERE pg_get_constraintdef LIKE '%settings.auth-rbac%') THEN RAISE EXCEPTION 'S09_REGISTRY_KEY_MISSING'; END IF;
END $$;

COMMIT;
