-- VanStro S01B: Settings contract conformance closure.
-- Unique forward migration 74. Do not edit migrations 1-73.
-- This migration is additive and forward-only: it creates the append-only
-- publication event object, separates draft CAS from the descriptor-scoped
-- global publication sequence, makes the invalid/blocker lifecycle and
-- typed PATCH recovery real, separates VERSION_CONFLICT from
-- SETTINGS_STATE_CONFLICT, hardens version/UUID input boundaries at the
-- function level, records real P02 authority snapshots in S01 Audit, and
-- tightens the S01 helper ACL surface (explicit PUBLIC EXECUTE revocation).
BEGIN;

-- =====================================================================
-- 1. Append-only publication event object (Errata 1, 2, 6, 8)
--    History and supersession are appended events. A publication fact is
--    never mutated by a later publication; the original publish Audit id
--    remains traceable forever. The descriptor-scoped publication sequence
--    is the single stable history order (no time/UUID fallback).
-- =====================================================================
CREATE TABLE public.s01_settings_publication_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "descriptorKey" text NOT NULL,
  "runtimeConfigId" uuid NOT NULL REFERENCES public.runtime_config_version(id) ON DELETE RESTRICT,
  "publicationSequence" integer NOT NULL,
  "eventType" text NOT NULL,
  "sourceDraftId" uuid,
  "sourceDraftVersion" integer,
  "rollbackSourcePublicationId" uuid,
  "changeReason" text,
  "auditEventId" uuid NOT NULL REFERENCES public.audit_events(id) ON DELETE RESTRICT,
  "occurredAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT s01_publication_event_descriptor_check CHECK ("descriptorKey"='settings.core.overview_refresh_seconds'),
  CONSTRAINT s01_publication_event_type_check CHECK ("eventType" IN('published','superseded','rollback_published','activation_failed')),
  CONSTRAINT s01_publication_event_sequence_check CHECK ("publicationSequence">0),
  CONSTRAINT s01_publication_event_rollback_check CHECK (
    ("eventType" IN('published','rollback_published') AND "sourceDraftId" IS NOT NULL AND "sourceDraftVersion" IS NOT NULL) OR
    ("eventType" IN('superseded','activation_failed'))
  ),
  CONSTRAINT s01_publication_event_audit_check CHECK ("auditEventId"<>'00000000-0000-0000-0000-000000000000'::uuid),
  UNIQUE("descriptorKey","publicationSequence")
);

CREATE INDEX s01_publication_event_order_idx ON public.s01_settings_publication_event("descriptorKey","publicationSequence");

CREATE FUNCTION public.s01_settings_publication_event_immutable_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
  RAISE EXCEPTION 'S01_PUBLICATION_EVENT_IMMUTABLE';
END $fn$;
ALTER FUNCTION public.s01_settings_publication_event_immutable_v1() OWNER TO vanstro_p09_guard_owner;
CREATE TRIGGER s01_settings_publication_event_immutable
  BEFORE UPDATE OR DELETE ON public.s01_settings_publication_event
  FOR EACH ROW EXECUTE FUNCTION public.s01_settings_publication_event_immutable_v1();

-- =====================================================================
-- 2. Draft resource CAS vs descriptor-scoped global publication sequence
--    (Errata 2)
--    - settingsRevision remains the draft-local strictly increasing CAS.
--    - version (integer, runtime_config_version.version) becomes the
--      descriptor-scoped globally monotonic publication sequence.
--    - A per-descriptor unique constraint backs the global sequence.
-- =====================================================================
CREATE UNIQUE INDEX s01_settings_publication_sequence_uniq
  ON public.runtime_config_version("configKey",version)
  WHERE "configKey"='settings.core.overview_refresh_seconds';

-- =====================================================================
-- 3. Invalid lifecycle constraint adjustment (Errata 3, M2)
--    Structurally correct business-invalid values (e.g. integer 10) are
--    allowed in draft/invalid rows; only validated/published rows are
--    constrained to 15..300. Drafts now persist the invalid state.
-- =====================================================================
ALTER TABLE public.runtime_config_version DROP CONSTRAINT IF EXISTS settings_core_shape_check;
ALTER TABLE public.runtime_config_version ADD CONSTRAINT settings_core_shape_check CHECK (
  "configKey"<>'settings.core.overview_refresh_seconds' OR (
    "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' AND
    jsonb_typeof("desiredValue")='number' AND
    ("settingsLifecycleStatus" NOT IN('validated','published') OR
      (("desiredValue" #>> '{}')::integer BETWEEN 15 AND 300)) AND
    "settingsRevision" IS NOT NULL AND "settingsRevision">0 AND
    "settingsLifecycleStatus" IN('draft','invalid','validated','activation_failed','published','superseded') AND
    "settingsChangeReason" IS NOT NULL AND char_length(btrim("settingsChangeReason")) BETWEEN 8 AND 500
  )
);

-- =====================================================================
-- 4. Audit with real P02 authority snapshot (Errata 8, H3)
--    effectiveRoles and permissionGrants are derived from the P02 context
--    obtained in the same transaction; caller-supplied roles/grants are
--    never accepted.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.s01_settings_audit_v2(actor_id text,ctx jsonb,resource_id uuid,request_id text,action_value text,result_value text,reason_value text,metadata_value jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE
  event_id uuid:=gen_random_uuid();
  effective_roles jsonb;
  grants jsonb;
  scope_kind text;
  dealer_ids jsonb;
  location_ids jsonb;
  context_revision text;
BEGIN
  IF request_id!~'^[A-Za-z0-9._:-]{1,128}$' OR action_value NOT IN('create','update','config_publish','unpublish') OR result_value NOT IN('succeeded','failed') THEN RAISE EXCEPTION 'S01_AUDIT_INVALID'; END IF;
  IF ctx IS NULL OR ctx->>'contextRevision'='unavailable' THEN RAISE EXCEPTION 'S01_AUDIT_CONTEXT_UNAVAILABLE'; END IF;
  effective_roles:=COALESCE(ctx->'globalRoleKeys','[]'::jsonb);
  grants:=COALESCE(ctx->'permissionGrants','[]'::jsonb);
  scope_kind:='global';
  dealer_ids:=COALESCE((
    SELECT jsonb_agg(DISTINCT dealer_id ORDER BY dealer_id)
    FROM jsonb_array_elements(grants) g, jsonb_array_elements_text(COALESCE(g->'dealerIds','[]'::jsonb)) dealer_id
  ),'[]'::jsonb);
  location_ids:=COALESCE((
    SELECT jsonb_agg(DISTINCT location_id ORDER BY location_id)
    FROM jsonb_array_elements(grants) g, jsonb_array_elements_text(COALESCE(g->'locationIds','[]'::jsonb)) location_id
  ),'[]'::jsonb);
  context_revision:=ctx->>'contextRevision';
  INSERT INTO public.audit_events(id,"eventVersion","occurredAt","actorType","actorId","actorDisplayClass","effectiveRoles","permissionGrants","authorizationScopeKind","dealerIds","locationIds","contextRevision","authorizationContractVersion",action,"resourceType","resourceId",result,reason,"requestId",source,metadata,sensitive,"retentionClass","retentionPolicyVersion","expiresAt")
  VALUES(event_id,'audit-event.v1',CURRENT_TIMESTAMP,'admin_user',actor_id,'staff',effective_roles,grants,scope_kind,dealer_ids,location_ids,context_revision,'dashboard-authorization.v1',action_value,'runtime_config',resource_id::text,result_value,reason_value,request_id,'dashboard_api',metadata_value,false,'high_risk','audit-retention.v1',CURRENT_TIMESTAMP+INTERVAL '2555 days');
  RETURN event_id;
END $fn$;
ALTER FUNCTION public.s01_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 5. Validate: real invalid + blocker lifecycle (Errata 3, M2)
--    Structurally correct business-invalid values produce
--    status=invalid with a persisted blocker; publish is refused.
--    Correct values produce validated.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.s01_settings_validate_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE
  ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE;
  audit_id uuid; next_state text; desired int; validation_status text;
BEGIN
  ctx:=public.s01_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.core.overview_refresh_seconds',0));
  replay:=public.s01_settings_ledger_v1(actor_id,'validate_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
  SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.core.overview_refresh_seconds' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'S01_NOT_FOUND' USING ERRCODE='22023'; END IF;
  IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S01_VERSION_CONFLICT'; END IF;
  IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S01_STATE_CONFLICT'; END IF;
  desired:=(row."desiredValue" #>> '{}')::integer;
  IF desired BETWEEN 15 AND 300 THEN
    next_state:='validated'; validation_status:='validated';
  ELSE
    next_state:='invalid'; validation_status:='validation_failed';
  END IF;
  UPDATE public.runtime_config_version SET "settingsLifecycleStatus"=next_state,"validationStatus"=validation_status,"settingsRevision"="settingsRevision"+1,"settingsValidatedAt"=CURRENT_TIMESTAMP,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
  audit_id:=public.s01_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus',next_state)));
  INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'validate_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
  RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s01_settings_validate_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 6. Publish: state/version separation + append-only supersession
--    (Errata 1, 4, 8)
--    - missing draft -> S01_NOT_FOUND
--    - revision mismatch -> S01_VERSION_CONFLICT
--    - lifecycle not validated -> S01_STATE_CONFLICT (not version conflict)
--    - superseding publication A appends a 'superseded' event; A's row is
--      untouched, so History returns A's original publish fact and Audit id.
--    - the new publication appends its own 'published' event with the next
--      descriptor-scoped global sequence.
--    - Audit, ledger and event write in the same transaction.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.s01_settings_publish_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE
  ctx jsonb; row public.runtime_config_version%ROWTYPE; active public.runtime_config_version%ROWTYPE;
  replay public.runtime_config_version%ROWTYPE; audit_id uuid; supersession_audit_id uuid;
  next_sequence integer; is_rollback boolean;
BEGIN
  ctx:=public.s01_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.core.overview_refresh_seconds',0));
  replay:=public.s01_settings_ledger_v1(actor_id,'publish_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
  SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.core.overview_refresh_seconds' AND "settingsRevision" IS NOT NULL AND "settingsLifecycleStatus" IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'S01_NOT_FOUND' USING ERRCODE='22023'; END IF;
  IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S01_VERSION_CONFLICT'; END IF;
  IF row."settingsLifecycleStatus"<>'validated' THEN RAISE EXCEPTION 'S01_STATE_CONFLICT'; END IF;
  SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"=row."configKey" AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1 FOR UPDATE;
  IF COALESCE(active."settingsRevision",0)<>row.generation THEN RAISE EXCEPTION 'S01_VERSION_CONFLICT'; END IF;
  is_rollback:=COALESCE(row."settingsRollbackOfPublicationId" IS NOT NULL,false);
  SELECT COALESCE(max("publicationSequence"),0)+1 INTO next_sequence FROM public.s01_settings_publication_event WHERE "descriptorKey"=row."configKey";
  IF active.id IS NOT NULL THEN
    supersession_audit_id:=public.s01_settings_audit_v2(actor_id,ctx,active.id,request_id,'unpublish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',active."configKey",'version',active."settingsRevision",'lifecycleStatus','superseded')));
    INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
    VALUES(gen_random_uuid(),row."configKey",active.id,next_sequence,'superseded',NULL,COALESCE(row."settingsChangeReason",'Superseded by a later publication.'),supersession_audit_id,CURRENT_TIMESTAMP);
    next_sequence:=next_sequence+1;
  END IF;
  audit_id:=public.s01_settings_audit_v2(actor_id,ctx,row.id,request_id,'config_publish','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision"+1,'lifecycleStatus','published')));
  UPDATE public.runtime_config_version SET "activationStatus"='active',"settingsLifecycleStatus"='published',"effectiveValue"="desiredValue","effectiveSource"='runtime_override',generation="settingsRevision"+1,"settingsRevision"="settingsRevision"+1,"activatedAt"=CURRENT_TIMESTAMP,"successAuditEventId"=audit_id,"authorityVersion"=2,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=row.id RETURNING * INTO row;
  INSERT INTO public.s01_settings_publication_event(id,"descriptorKey","runtimeConfigId","publicationSequence","eventType","sourceDraftId","sourceDraftVersion","rollbackSourcePublicationId","changeReason","auditEventId","occurredAt")
  VALUES(gen_random_uuid(),row."configKey",row.id,next_sequence,CASE WHEN is_rollback THEN 'rollback_published' ELSE 'published' END,row.id,row."settingsRevision",row."settingsRollbackOfPublicationId",COALESCE(row."settingsChangeReason",'Settings publication.'),audit_id,CURRENT_TIMESTAMP);
  INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'publish_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
  RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s01_settings_publish_v2(text,text,uuid,integer,text,text,text) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 7. Create draft: boundary and rollback hardening (Errata 5, M5)
--    - expectedPublishedVersion/desired_value validated as safe integers.
--    - draft_id / rollback_source uuid handled at the API boundary; the
--      function raises S01_NOT_FOUND for malformed/missing rows.
--    - business-invalid values (outside 15..300) are allowed in drafts;
--      they become invalid on validate, never on create.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.s01_settings_create_draft_v2(session_hash text,actor_id text,expected_published_version integer,desired_value integer,change_reason text,idempotency_hash text,request_hash text,request_id text,rollback_source uuid DEFAULT NULL) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE
  ctx jsonb; active public.runtime_config_version%ROWTYPE; source public.runtime_config_version%ROWTYPE;
  replay public.runtime_config_version%ROWTYPE; created public.runtime_config_version%ROWTYPE;
  operation_value text; next_revision integer; next_version integer; audit_id uuid;
BEGIN
  ctx:=public.s01_settings_authorize_v2(session_hash,actor_id,true); operation_value:=CASE WHEN rollback_source IS NULL THEN 'create_draft' ELSE 'create_rollback_draft' END;
  IF idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'S01_VALIDATION'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('settings.core.overview_refresh_seconds',0));
  replay:=public.s01_settings_ledger_v1(actor_id,operation_value,idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
  SELECT * INTO active FROM public.runtime_config_version WHERE "configKey"='settings.core.overview_refresh_seconds' AND "settingsLifecycleStatus"='published' ORDER BY "settingsRevision" DESC LIMIT 1;
  IF COALESCE(active."settingsRevision",0)<>expected_published_version THEN RAISE EXCEPTION 'S01_VERSION_CONFLICT'; END IF;
  IF rollback_source IS NOT NULL THEN
    SELECT * INTO source FROM public.runtime_config_version WHERE id=rollback_source AND "configKey"='settings.core.overview_refresh_seconds' AND "authorizationScopeKind"='global' AND "settingsLifecycleStatus" IN('published','superseded') FOR SHARE;
    IF NOT FOUND OR source."effectiveValue" IS NULL THEN RAISE EXCEPTION 'S01_STATE_CONFLICT'; END IF;
    desired_value:=(source."effectiveValue" #>> '{}')::integer;
  END IF;
  SELECT COALESCE(max("settingsRevision"),0)+1,COALESCE(max(version),0)+1 INTO next_revision,next_version FROM public.runtime_config_version WHERE "configKey"='settings.core.overview_refresh_seconds';
  INSERT INTO public.runtime_config_version(id,"configKey","schemaVersion","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","desiredValue","effectiveValue","desiredSource","effectiveSource","validationStatus","activationStatus","settingsChangeReason","settingsRollbackOfPublicationId",version,generation,"createdBy","idempotencyKeyHash","requestHash","authorityVersion","settingsRevision","settingsLifecycleStatus")
  VALUES(gen_random_uuid(),'settings.core.overview_refresh_seconds','runtime-config-schema.v1','global','{}','{}',ctx->>'contextRevision',encode(digest('settings:global','sha256'),'hex'),encode(digest('settings:safe','sha256'),'hex'),to_jsonb(desired_value),active."effectiveValue",CASE WHEN rollback_source IS NULL THEN 'settings_draft' ELSE 'rollback_draft' END,active."effectiveSource",'validation_failed','draft',btrim(change_reason),rollback_source,next_version,COALESCE(active."settingsRevision",0),actor_id,encode(digest(operation_value||':'||idempotency_hash,'sha256'),'hex'),request_hash,1,next_revision,'draft') RETURNING * INTO created;
  audit_id:=public.s01_settings_audit_v2(actor_id,ctx,created.id,request_id,'create','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',created."configKey",'version',created."settingsRevision",'lifecycleStatus','draft')));
  INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,operation_value,idempotency_hash,request_hash,created.id,created."settingsRevision",to_jsonb(created),audit_id);
  RETURN NEXT created;
END $fn$;
ALTER FUNCTION public.s01_settings_create_draft_v2(text,text,integer,integer,text,text,text,text,uuid) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 8. Update draft: version/state/not-found separation (Errata 4, 5)
--    Business-invalid values may be saved via typed PATCH; the invalid
--    state is not cleared prematurely (revalidation decides).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.s01_settings_update_draft_v2(session_hash text,actor_id text,draft_id uuid,expected_revision integer,desired_value integer,change_reason text,idempotency_hash text,request_hash text,request_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE ctx jsonb; row public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; audit_id uuid; next_status text;
BEGIN
  ctx:=public.s01_settings_authorize_v2(session_hash,actor_id,true); PERFORM pg_advisory_xact_lock(hashtextextended('settings.core.overview_refresh_seconds',0));
  replay:=public.s01_settings_ledger_v1(actor_id,'update_draft',idempotency_hash,request_hash); IF replay.id IS NOT NULL THEN RETURN NEXT replay; RETURN; END IF;
  SELECT * INTO row FROM public.runtime_config_version WHERE id=draft_id AND "configKey"='settings.core.overview_refresh_seconds' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'S01_NOT_FOUND' USING ERRCODE='22023'; END IF;
  IF row."settingsRevision"<>expected_revision THEN RAISE EXCEPTION 'S01_VERSION_CONFLICT'; END IF;
  IF row."settingsLifecycleStatus" NOT IN('draft','invalid','activation_failed') THEN RAISE EXCEPTION 'S01_STATE_CONFLICT'; END IF;
  next_status:='draft';
  UPDATE public.runtime_config_version SET "desiredValue"=to_jsonb(desired_value),"settingsChangeReason"=btrim(change_reason),"settingsLifecycleStatus"=next_status,"validationStatus"='validation_failed',"activationStatus"='draft',"settingsRevision"="settingsRevision"+1,"settingsUpdatedAt"=CURRENT_TIMESTAMP WHERE id=draft_id RETURNING * INTO row;
  audit_id:=public.s01_settings_audit_v2(actor_id,ctx,row.id,request_id,'update','succeeded','completed',jsonb_build_object('schemaVersion','audit-metadata.v1','entries',jsonb_build_object('descriptorKey',row."configKey",'version',row."settingsRevision",'lifecycleStatus',next_status)));
  INSERT INTO public.settings_command_ledger(id,"actorId",operation,"idempotencyHash","requestHash","resultRuntimeConfigId","resultRevision","resultSnapshot","successAuditEventId") VALUES(gen_random_uuid(),actor_id,'update_draft',idempotency_hash,request_hash,row.id,row."settingsRevision",to_jsonb(row),audit_id);
  RETURN NEXT row;
END $fn$;
ALTER FUNCTION public.s01_settings_update_draft_v2(text,text,uuid,integer,integer,text,text,text,text) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 9. Read helpers (Errata 1, 2)
--    - rows: unchanged ordering by draft CAS desc.
--    - events: the append-only history stream in publication sequence
--      order, joined with the audit event id and the publication row.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.s01_settings_rows_v2(session_hash text,actor_id text) RETURNS SETOF public.runtime_config_version
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
  PERFORM public.s01_settings_authorize_v2(session_hash,actor_id,false);
  RETURN QUERY SELECT * FROM public.runtime_config_version WHERE "configKey"='settings.core.overview_refresh_seconds' AND "authorizationScopeKind"='global' AND "dealerIdsSnapshot"='{}' AND "locationIdsSnapshot"='{}' ORDER BY "settingsRevision" DESC,"createdAt" DESC,id DESC;
END $fn$;
ALTER FUNCTION public.s01_settings_rows_v2(text,text) OWNER TO vanstro_p09_guard_owner;

CREATE FUNCTION public.s01_settings_events_v2(session_hash text,actor_id text) RETURNS SETOF public.s01_settings_publication_event
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
  PERFORM public.s01_settings_authorize_v2(session_hash,actor_id,false);
  RETURN QUERY SELECT * FROM public.s01_settings_publication_event WHERE "descriptorKey"='settings.core.overview_refresh_seconds' ORDER BY "publicationSequence";
END $fn$;
ALTER FUNCTION public.s01_settings_events_v2(text,text) OWNER TO vanstro_p09_guard_owner;

-- =====================================================================
-- 10. ACL tightening (Section 5 of the coordinator prompt)
--     Explicit PUBLIC EXECUTE revocation for the S01 helper surface.
--     Only S01 objects; no full-library ACL audit.
-- =====================================================================
REVOKE ALL ON FUNCTION public.s01_settings_ledger_immutable_v1() FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
REVOKE ALL ON FUNCTION public.s01_settings_publication_event_immutable_v1() FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
REVOKE ALL ON FUNCTION public.s01_settings_events_v2(text,text) FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
REVOKE ALL ON TABLE public.s01_settings_publication_event FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
GRANT SELECT,INSERT ON TABLE public.s01_settings_publication_event TO vanstro_p09_guard_owner;
-- runtime may only read the history stream; mutations happen through the
-- controlled functions.
GRANT EXECUTE ON FUNCTION public.s01_settings_events_v2(text,text) TO vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.s01_settings_authorize_v2(text,text,boolean),public.s01_settings_audit_v2(text,jsonb,uuid,text,text,text,text,jsonb),public.s01_settings_ledger_v1(text,text,text,text) TO vanstro_p09_guard_owner;

-- =====================================================================
-- 11. Post-assertions
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='s01_settings_publication_event'
  ) THEN RAISE EXCEPTION 'S01B_EVENT_TABLE_MISSING'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='s01_settings_publication_event_immutable'
  ) THEN RAISE EXCEPTION 'S01B_EVENT_IMMUTABLE_TRIGGER_MISSING'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='s01_settings_events_v2'
  ) THEN RAISE EXCEPTION 'S01B_EVENTS_FN_MISSING'; END IF;
END $$;

COMMIT;
