BEGIN;
ALTER TABLE public.runtime_config_version ADD COLUMN "settingsChangeReason" text, ADD COLUMN "settingsRollbackOfPublicationId" uuid, ADD COLUMN "settingsValidateIdempotencyHash" text, ADD COLUMN "settingsValidateRequestHash" text, ADD COLUMN "settingsPublishIdempotencyHash" text, ADD COLUMN "settingsPublishRequestHash" text;
ALTER TABLE public.runtime_config_version DROP CONSTRAINT runtime_config_registry;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_registry CHECK ("configKey" IN ('foundation.runtime.refresh_interval_seconds','foundation.runtime.display_mode','foundation.runtime.safe_origin','settings.core.overview_refresh_seconds'));

-- S01 unreleased review closure folded into migration73 final bytes.
ALTER TABLE public.runtime_config_version
  ADD COLUMN "settingsRevision" integer,
  ADD COLUMN "settingsLifecycleStatus" text,
  ADD COLUMN "settingsValidatedAt" timestamptz,
  ADD COLUMN "settingsUpdatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP;

-- migration70 requires authorityVersion >= 2 rows to carry their successful Audit id.
-- No S01 command was deployable before this closure; fail closed if that invariant is not true.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.runtime_config_version WHERE "configKey"='settings.core.overview_refresh_seconds' AND "authorityVersion">=2 AND "successAuditEventId" IS NULL) THEN
    RAISE EXCEPTION 'S01_AUTHORITY2_AUDIT_PRECHECK';
  END IF;
END $$;

CREATE TABLE public.settings_command_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId" text NOT NULL,
  operation text NOT NULL,
  "idempotencyHash" text NOT NULL,
  "requestHash" text NOT NULL,
  "resultRuntimeConfigId" uuid NOT NULL REFERENCES public.runtime_config_version(id) ON DELETE RESTRICT,
  "resultRevision" integer NOT NULL,
  "resultSnapshot" jsonb NOT NULL,
  "successAuditEventId" uuid NOT NULL UNIQUE REFERENCES public.audit_events(id) ON DELETE RESTRICT,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT settings_command_operation_check CHECK(operation IN('create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft')),
  CONSTRAINT settings_command_hash_check CHECK("idempotencyHash"~'^[0-9a-f]{64}$' AND "requestHash"~'^[0-9a-f]{64}$'),
  CONSTRAINT settings_command_revision_check CHECK("resultRevision">0),
  UNIQUE("actorId",operation,"idempotencyHash")
);

CREATE FUNCTION public.s01_settings_ledger_immutable_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$ BEGIN RAISE EXCEPTION 'S01_LEDGER_IMMUTABLE'; END $fn$;
ALTER FUNCTION public.s01_settings_ledger_immutable_v1() OWNER TO vanstro_p09_guard_owner;
CREATE TRIGGER s01_settings_ledger_immutable BEFORE UPDATE OR DELETE ON public.settings_command_ledger FOR EACH ROW EXECUTE FUNCTION public.s01_settings_ledger_immutable_v1();

ALTER TABLE public.runtime_config_version DROP CONSTRAINT runtime_config_schema;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_schema CHECK (
  ("configKey"='settings.core.overview_refresh_seconds' AND "schemaVersion"='runtime-config-schema.v1') OR
  ("configKey"<>'settings.core.overview_refresh_seconds' AND "schemaVersion"='runtime-config-schema.v1')
);
ALTER TABLE public.runtime_config_version DROP CONSTRAINT runtime_config_validation;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_validation CHECK ("validationStatus" IN ('validated','validation_failed'));
ALTER TABLE public.runtime_config_version DROP CONSTRAINT runtime_config_activation;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_activation CHECK ("activationStatus" IN ('draft','active','activation_failed','superseded'));
ALTER TABLE public.runtime_config_version DROP CONSTRAINT runtime_config_state;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT runtime_config_state CHECK (
  ("activationStatus" IN('active','superseded') AND "effectiveValue" IS NOT NULL AND "effectiveSource"='runtime_override' AND "activatedAt" IS NOT NULL AND "failureReasonCode" IS NULL) OR
  ("activationStatus" NOT IN('active','superseded'))
);
ALTER TABLE public.runtime_config_version ADD CONSTRAINT settings_core_shape_check CHECK (
  "configKey"<>'settings.core.overview_refresh_seconds' OR (
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='number' AND ("desiredValue" #>> '{}')::integer BETWEEN 15 AND 300 AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  )
);


CREATE FUNCTION public.s01_settings_authorize_v2(session_hash text,actor_id text,write_required boolean) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; read_grant jsonb; write_grant jsonb;
BEGIN
 ctx:=public.p02_dashboard_authorization_context_v1(session_hash,actor_id);
 IF ctx->>'actorId' IS DISTINCT FROM actor_id OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S01_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT value INTO read_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.read' AND (value->>'global')::boolean LIMIT 1;
 SELECT value INTO write_grant FROM jsonb_array_elements(ctx->'permissionGrants') WHERE value->>'permissionKey'='settings.write' AND (value->>'global')::boolean LIMIT 1;
 IF read_grant IS NULL OR (write_required AND write_grant IS NULL) THEN RAISE EXCEPTION 'S01_FORBIDDEN' USING ERRCODE='42501'; END IF;
 RETURN ctx;
END $fn$;
ALTER FUNCTION public.s01_settings_authorize_v2(text,text,boolean) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s01_settings_rows_v2(session_hash text,actor_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
 PERFORM public.s01_settings_authorize_v2(session_hash,actor_id,false);
 RETURN QUERY SELECT * FROM public.runtime_config_version WHERE "configKey"='settings.core.overview_refresh_seconds' AND "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' ORDER BY "settingsRevision" DESC,"createdAt" DESC,id DESC;
END $fn$;
ALTER FUNCTION public.s01_settings_rows_v2(text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s01_settings_ledger_v1(actor_id text,operation_value text,idempotency_hash text,request_hash text) RETURNS public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE command public.settings_command_ledger%ROWTYPE; result public.runtime_config_version%ROWTYPE;
BEGIN
 SELECT * INTO command FROM public.settings_command_ledger WHERE "actorId"=actor_id AND operation=operation_value AND "idempotencyHash"=idempotency_hash FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF command."requestHash"<>request_hash THEN RAISE EXCEPTION 'S01_IDEMPOTENCY_CONFLICT'; END IF;
 IF command."resultRuntimeConfigId" IS NULL THEN RAISE EXCEPTION 'S01_STATE_CONFLICT'; END IF;
 SELECT * INTO result FROM jsonb_populate_record(NULL::public.runtime_config_version,command."resultSnapshot");
 RETURN result;
END $fn$;
ALTER FUNCTION public.s01_settings_ledger_v1(text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s01_settings_audit_v2(actor_id text,context_revision text,resource_id uuid,request_id text,action_value text,result_value text,reason_value text,metadata_value jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE event_id uuid:=gen_random_uuid();
BEGIN
 IF request_id!~'^[A-Za-z0-9._:-]{1,128}$' OR action_value NOT IN('create','update','config_publish','unpublish') OR result_value NOT IN('succeeded','failed') THEN RAISE EXCEPTION 'S01_AUDIT_INVALID'; END IF;
 INSERT INTO public.audit_events(id,"eventVersion","occurredAt","actorType","actorId","actorDisplayClass","effectiveRoles","permissionGrants","authorizationScopeKind","dealerIds","locationIds","contextRevision","authorizationContractVersion",action,"resourceType","resourceId",result,reason,"requestId",source,metadata,sensitive,"retentionClass","retentionPolicyVersion","expiresAt")
 VALUES(event_id,'audit-event.v1',CURRENT_TIMESTAMP,'admin_user',actor_id,'staff','[]'::jsonb,jsonb_build_array(jsonb_build_object('permissionKey','settings.write','scope',jsonb_build_object('kind','global'))),'global','[]'::jsonb,'[]'::jsonb,context_revision,'dashboard-authorization.v1',action_value,'runtime_config',resource_id::text,result_value,reason_value,request_id,'dashboard_api',metadata_value,false,'high_risk','audit-retention.v1',CURRENT_TIMESTAMP+INTERVAL '2555 days');
 RETURN event_id;
END $fn$;
ALTER FUNCTION public.s01_settings_audit_v2(text,text,uuid,text,text,text,text,jsonb) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s01_settings_create_draft_v2(session_hash text,actor_id text,expected_published_version integer,desired_value integer,change_reason text,idempotency_hash text,request_hash text,request_id text,rollback_source uuid DEFAULT NULL) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; active public.runtime_config_version%ROWTYPE; source public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; created public.runtime_config_version%ROWTYPE; operation_value text; next_revision integer; next_version integer; audit_id uuid;
BEGIN
 ctx:=public.s01_settings_authorize_v2(session_hash,actor_id,true); operation_value:=CASE WHEN rollback_source IS NULL THEN 'create_draft' ELSE 'create_rollback_draft' END;
 IF desired_value<15 OR desired_value>300 OR char_length(btrim(change_reason)) NOT BETWEEN 8 AND 500 OR idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S01_VALIDATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('settings.core.overview_refresh_seconds',0));
 replay:=public.s01_settings_ledger_v1(actor_id,operation_value,idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"='settings.core.overview_refresh_seconds' AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1;
 IF COALESCE(active."settingsRevision",0)<>expected_published_version THEN RAISE EXCEPTION 'S01_VERSION_CONFLICT'; END IF;
 IF rollback_source IS NOT NULL THEN SELECT * INTO source FROM public.runtime_config_version WHERE id=rollback_source AND "configKey"='settings.core.overview_refresh_seconds' AND "authorizationScopeKind"='global' AND "settingsLifecycleStatus" IN('published','superseded') FOR SHARE; IF NOT FOUND OR source."effectiveValue" IS NULL THEN RAISE EXCEPTION 'S01_STATE_CONFLICT'; END IF; desired_value:=(source."effectiveValue" #>> '{}')::integer; END IF;
 SELECT COALESCE(max("settingsRevision"),0)+1,COALESCE(max(version),0)+1 INTO next_revision,next_version FROM public.runtime_config_version WHERE "configKey"='settings.core.overview_refresh_seconds';
 INSERT INTO public.runtime_config_version("configKey","schemaVersion","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","desiredValue","effectiveValue","desiredSource","effectiveSource","validationStatus","activationStatus","settingsChangeReason","settingsRollbackOfPublicationId",version,generation,"createdBy","idempotencyKeyHash","requestHash","authorityVersion","settingsRevision","settingsLifecycleStatus")
 VALUES('settings.core.overview_refresh_seconds','runtime-config-schema.v1','global','{}','{}',ctx->>'contextRevision',encode(digest('settings:global','sha256'),'hex'),encode(digest('settings:safe','sha256'),'hex'),to_jsonb(desired_value),active."effectiveValue",CASE WHEN rollback_source IS NULL THEN 'settings_draft' ELSE 'rollback_draft' END,active."effectiveSource",'validated','draft',btrim(change_reason),rollback_source,next_version,COALESCE(active."settingsRevision",0),actor_id,encode(digest(operation_value||':'||idempotency_hash,'sha256'),'hex'),request_hash,1,next_revision,'draft') RETURNING * INTO created;
 audit_id:=public.s01_settings_audit_v2(actor_id,ctx->>'contextRevision',created.id,request_id,'create','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',created."configKey",'version',created."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger("actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(actor_id,operation_value,idempotency_hash,request_hash,created.id,created."settingsRevision",to_jsonb(created),audit_id);
 RETURN NEXT created;
END $fn$;
ALTER FUNCTION public.s01_settings_create_draft_v2(text,text,integer,integer,text,text,text,text,uuid) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s01_settings_update_draft_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,desired_value integer,change_reason text,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid;
BEGIN
 ctx:=public.s01_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.core.overview_refresh_seconds',0));
 replay:=public.s01_settings_ledger_v1(actor_id,'update_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.core.overview_refresh_seconds' FOR UPDATE;
 IF NOT FOUND OR row."settingsRevision"<>expected_revision OR row."settingsLifecycleStatus" NOT IN('draft','activation_failed') THEN RAISE EXCEPTION 'S01_VERSION_CONFLICT'; END IF;
 UPDATE public.runtime_config_version SET "desiredValue"=to_jsonb(desired_value),"settingsChangeReason"=btrim(change_reason),"settingsLifecycleStatus"='draft',"activationStatus"='draft',"settingsRevision"="settingsRevision"+1,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s01_settings_audit_v2(actor_id,ctx->>'contextRevision',row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus','draft')));
 INSERT INTO public.settings_command_ledger("actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(actor_id,'update_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s01_settings_update_draft_v2(text,text,uuid,integer,integer,text,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s01_settings_validate_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid;
BEGIN
 ctx:=public.s01_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.core.overview_refresh_seconds',0));
 replay:=public.s01_settings_ledger_v1(actor_id,'validate_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.core.overview_refresh_seconds' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND OR row."settingsRevision"<>expected_revision OR row."settingsLifecycleStatus" NOT IN('draft','activation_failed') THEN RAISE EXCEPTION 'S01_VERSION_CONFLICT'; END IF;
 UPDATE public.runtime_config_version SET "settingsLifecycleStatus"='validated',"settingsRevision"="settingsRevision"+1,"settingsValidatedAt"=CURRENT_TIMESTAMP,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
 audit_id:=public.s01_settings_audit_v2(actor_id,ctx->>'contextRevision',row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus','validated')));
 INSERT INTO public.settings_command_ledger("actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(actor_id,'validate_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s01_settings_validate_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s01_settings_publish_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; active public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; supersession_audit_id uuid;
BEGIN
 ctx:=public.s01_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.core.overview_refresh_seconds',0));
 replay:=public.s01_settings_ledger_v1(actor_id,'publish_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
 SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.core.overview_refresh_seconds' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
 IF NOT FOUND OR row."settingsRevision"<>expected_revision OR row."settingsLifecycleStatus"<>'validated' THEN RAISE EXCEPTION 'S01_VERSION_CONFLICT'; END IF;
 SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"=row."configKey" AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1 FOR UPDATE;
 IF COALESCE(active."settingsRevision",0)<>row.generation THEN RAISE EXCEPTION 'S01_VERSION_CONFLICT'; END IF;
 IF active.id IS NOT NULL THEN supersession_audit_id:=public.s01_settings_audit_v2(actor_id,ctx->>'contextRevision',active.id,request_id,'unpublish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',active."configKey",'version',active."settingsRevision",'lifecycleStatus','superseded'))); UPDATE public.runtime_config_version SET "activationStatus"='superseded',"settingsLifecycleStatus"='superseded',"successAuditEventId"=supersession_audit_id,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=active.id; END IF;
 audit_id:=public.s01_settings_audit_v2(actor_id,ctx->>'contextRevision',row.id,request_id,'config_publish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision"+1,'lifecycleStatus','published')));
 UPDATE public.runtime_config_version SET "activationStatus"='active',"settingsLifecycleStatus"='published',"effectiveValue"="desiredValue","effectiveSource"='runtime_override',generation="settingsRevision"+1,"settingsRevision"="settingsRevision"+1,"activatedAt"=CURRENT_TIMESTAMP,"successAuditEventId"=audit_id,"authorityVersion"=2,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=row.id RETURNING * INTO row;
 INSERT INTO public.settings_command_ledger("actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(actor_id,'publish_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
 RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s01_settings_publish_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

SET ROLE vanstro_p02_guard_owner;
GRANT EXECUTE ON FUNCTION public.p02_dashboard_authorization_context_v1(text,text) TO vanstro_p09_guard_owner;
RESET ROLE;
GRANT SELECT,INSERT,UPDATE ON public.settings_command_ledger TO vanstro_p09_guard_owner;
REVOKE ALL ON TABLE public.settings_command_ledger FROM PUBLIC,vanstro_runtime;
REVOKE ALL ON FUNCTION public.s01_settings_authorize_v2(text,text,boolean),public.s01_settings_audit_v2(text,text,uuid,text,text,text,text,jsonb),public.s01_settings_ledger_v1(text,text,text,text),public.s01_settings_rows_v2(text,text),public.s01_settings_create_draft_v2(text,text,integer,integer,text,text,text,text,uuid),public.s01_settings_update_draft_v2(text,text,uuid,integer,integer,text,text,text,text),public.s01_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s01_settings_publish_v2(text,text,uuid,integer,text,text,text) FROM PUBLIC,vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.s01_settings_rows_v2(text,text),public.s01_settings_create_draft_v2(text,text,integer,integer,text,text,text,text,uuid),public.s01_settings_update_draft_v2(text,text,uuid,integer,integer,text,text,text,text),public.s01_settings_validate_v2(text,text,uuid,integer,text,text,text),public.s01_settings_publish_v2(text,text,uuid,integer,text,text,text) TO vanstro_runtime;

COMMIT;