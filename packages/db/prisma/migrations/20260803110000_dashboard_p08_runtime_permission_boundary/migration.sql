-- P08 security closure: remove runtime direct-table access and expose only fixed operation boundaries.
-- Forward-only. Migrations 1-63 remain immutable.

DO $p08_m64_roles$
DECLARE role_row record;
BEGIN
  IF current_user <> 'vanstro_migrator' OR session_user <> 'vanstro_migrator' THEN
    RAISE EXCEPTION 'migration 64 must run directly as vanstro_migrator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='vanstro_p08_guard_owner') THEN
    RAISE EXCEPTION 'migration 64 requires pre-provisioned vanstro_p08_guard_owner';
  END IF;
  FOR role_row IN SELECT * FROM pg_catalog.pg_roles WHERE rolname IN ('vanstro_migrator','vanstro_runtime','vanstro_p08_guard_owner') LOOP
    IF role_row.rolsuper OR role_row.rolcreaterole OR role_row.rolcreatedb OR role_row.rolreplication OR role_row.rolbypassrls THEN
      RAISE EXCEPTION 'migration 64 unsafe role attributes for %', role_row.rolname;
    END IF;
  END LOOP;
  IF pg_catalog.pg_has_role('vanstro_runtime','vanstro_migrator','MEMBER')
     OR pg_catalog.pg_has_role('vanstro_runtime','vanstro_p08_guard_owner','MEMBER')
     OR pg_catalog.pg_has_role('vanstro_p08_guard_owner','vanstro_runtime','MEMBER') THEN
    RAISE EXCEPTION 'migration 64 unsafe role membership';
  END IF;
  IF NOT pg_catalog.pg_has_role('vanstro_migrator','vanstro_p08_guard_owner','MEMBER') THEN
    RAISE EXCEPTION 'migration 64 requires migrator membership in vanstro_p08_guard_owner';
  END IF;
END
$p08_m64_roles$;

-- Migration63 registered the application types in code but did not extend the immutable DB registry guard.
-- Replace only that exact CHECK so the controlled P08 functions can create their four frozen Job families.
ALTER TABLE public.async_jobs DROP CONSTRAINT async_job_registry_check;
ALTER TABLE public.async_jobs ADD CONSTRAINT async_job_registry_check CHECK (
  "contractVersion"='async-job.v1' AND "schemaVersion"='async-job-schema.v1' AND (
    ("jobType"='foundation.probe' AND "jobTypeVersion"='foundation.probe.v1' AND "payloadSchemaVersion"='foundation-probe-input.v1' AND "resultSchemaVersion"='foundation-probe-result.v1') OR
    ("jobType"='media.process' AND "jobTypeVersion"='media.process.v1' AND "payloadSchemaVersion"='media-process-input.v1' AND "resultSchemaVersion"='media-process-result.v1') OR
    ("jobType"='media.cleanup' AND "jobTypeVersion"='media.cleanup.v1' AND "payloadSchemaVersion"='media-cleanup-input.v1' AND "resultSchemaVersion"='media-cleanup-result.v1') OR
    ("jobType"='dashboard.import.parse' AND "jobTypeVersion"='dashboard.import.parse.v1' AND "payloadSchemaVersion"='dashboard-import-parse-input.v1' AND "resultSchemaVersion"='dashboard-import-parse-result.v1') OR
    ("jobType"='dashboard.import.commit' AND "jobTypeVersion"='dashboard.import.commit.v1' AND "payloadSchemaVersion"='dashboard-import-commit-input.v1' AND "resultSchemaVersion"='dashboard-import-commit-result.v1') OR
    ("jobType"='dashboard.export.generate' AND "jobTypeVersion"='dashboard.export.generate.v1' AND "payloadSchemaVersion"='dashboard-export-generate-input.v1' AND "resultSchemaVersion"='dashboard-export-generate-result.v1') OR
    ("jobType"='dashboard.artifact.expire' AND "jobTypeVersion"='dashboard.artifact.expire.v1' AND "payloadSchemaVersion"='dashboard-artifact-expire-input.v1' AND "resultSchemaVersion"='dashboard-artifact-expire-result.v1')
  )
);

REVOKE ALL ON TABLE public.dashboard_import_batch, public.dashboard_import_row, public.dashboard_export_request, public.foundation_sample FROM PUBLIC, vanstro_runtime;
REVOKE ALL ON FUNCTION public.p08_canonical_text_array(text[]) FROM PUBLIC, vanstro_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, vanstro_runtime, vanstro_p08_guard_owner;
DO $p08_m64_database_create$
BEGIN
  EXECUTE pg_catalog.format('REVOKE CREATE ON DATABASE %I FROM PUBLIC, vanstro_runtime, vanstro_p08_guard_owner', current_database());
END
$p08_m64_database_create$;

-- The guard owner receives only the fixed objects needed by the functions below.
GRANT USAGE, CREATE ON SCHEMA public TO vanstro_p08_guard_owner;
GRANT SELECT ON TABLE public.refresh_sessions, public.users, public.user_roles, public.roles, public.role_permissions, public.permissions,
  public.dealer_memberships, public.dealer_membership_roles, public.dealer_membership_locations, public.dealer_locations,
  public.async_jobs, public.job_artifacts TO vanstro_p08_guard_owner;
GRANT SELECT, INSERT, UPDATE ON TABLE public.dashboard_import_batch, public.dashboard_import_row, public.dashboard_export_request, public.foundation_sample TO vanstro_p08_guard_owner;
SET ROLE vanstro_p08_guard_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE FUNCTION public.p08_authorized_binding(
  session_token_hash text,
  permission_key text,
  expected_actor_id text,
  expected_scope_kind text,
  expected_dealer_ids text[],
  expected_location_ids text[]
)
RETURNS TABLE(actor_id text, scope_kind text, dealer_ids text[], location_ids text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $p08_authorized_binding$
DECLARE
  resolved_actor text;
  has_global boolean;
  resolved_dealers text[];
  resolved_locations text[];
BEGIN
  IF current_user <> 'vanstro_p08_guard_owner'
     OR session_token_hash !~ '^[0-9a-f]{64}$'
     OR permission_key NOT IN (
       'dashboard.import.foundation_sample.read','dashboard.import.foundation_sample.create','dashboard.import.foundation_sample.commit',
       'dashboard.export.foundation_sample.read','dashboard.export.foundation_sample.create','dashboard.export.foundation_sample.download')
     OR expected_actor_id IS NULL OR expected_actor_id = ''
     OR expected_scope_kind NOT IN ('global','dealer','location')
     OR expected_dealer_ids IS NULL OR expected_location_ids IS NULL
     OR array_position(expected_dealer_ids,NULL) IS NOT NULL OR array_position(expected_location_ids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'P08_RESOURCE_UNAVAILABLE';
  END IF;
  SELECT session."userId" INTO resolved_actor
  FROM public.refresh_sessions session
  JOIN public.users actor ON actor."id"=session."userId"
  WHERE session."tokenHash"=session_token_hash AND session."revokedAt" IS NULL
    AND session."expiresAt">CURRENT_TIMESTAMP AND actor."kind"='admin' AND actor."status"='active';
  IF resolved_actor IS DISTINCT FROM expected_actor_id THEN RAISE EXCEPTION 'P08_RESOURCE_UNAVAILABLE'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles assignment
    JOIN public.roles role ON role."id"=assignment."roleId"
    JOIN public.role_permissions grant_row ON grant_row."roleId"=role."id"
    JOIN public.permissions permission ON permission."id"=grant_row."permissionId"
    WHERE assignment."userId"=resolved_actor AND role."key"<>'dealer_admin' AND permission."key"=permission_key
  ) INTO has_global;
  IF has_global THEN resolved_dealers:=ARRAY[]::text[]; resolved_locations:=ARRAY[]::text[];
  ELSE
    SELECT COALESCE(array_agg(DISTINCT membership."dealerId" ORDER BY membership."dealerId"),ARRAY[]::text[]),
           COALESCE(array_agg(DISTINCT location."dealerLocationId" ORDER BY location."dealerLocationId") FILTER (WHERE location."dealerLocationId" IS NOT NULL),ARRAY[]::text[])
    INTO resolved_dealers,resolved_locations
    FROM public.dealer_memberships membership
    JOIN public.dealer_membership_roles membership_role ON membership_role."membershipId"=membership."id"
    JOIN public.roles role ON role."id"=membership_role."roleId" AND role."key"='dealer_admin'
    JOIN public.role_permissions grant_row ON grant_row."roleId"=role."id"
    JOIN public.permissions permission ON permission."id"=grant_row."permissionId" AND permission."key"=permission_key
    LEFT JOIN public.dealer_membership_locations location ON location."membershipId"=membership."id" AND location."dealerId"=membership."dealerId"
    LEFT JOIN public.dealer_locations dealer_location ON dealer_location."id"=location."dealerLocationId" AND dealer_location."dealerId"=location."dealerId" AND dealer_location."status"='active'
    WHERE membership."userId"=resolved_actor AND membership."status"='active' AND membership."revokedAt" IS NULL
      AND membership."validFrom"<=CURRENT_TIMESTAMP AND (membership."expiresAt" IS NULL OR membership."expiresAt">CURRENT_TIMESTAMP);
  END IF;
  IF (has_global AND (expected_scope_kind<>'global' OR expected_dealer_ids<>ARRAY[]::text[] OR expected_location_ids<>ARRAY[]::text[]))
     OR (NOT has_global AND expected_scope_kind='global')
     OR expected_dealer_ids IS DISTINCT FROM resolved_dealers
     OR expected_location_ids IS DISTINCT FROM resolved_locations THEN
    RAISE EXCEPTION 'P08_RESOURCE_UNAVAILABLE';
  END IF;
  RETURN QUERY SELECT resolved_actor, expected_scope_kind, resolved_dealers, resolved_locations;
END
$p08_authorized_binding$;

CREATE FUNCTION public.p08_import_list(
  session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
  scope_kind text, dealer_ids text[], location_ids text[], status_filter text[], row_limit integer
)
RETURNS SETOF public.dashboard_import_batch
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_import_list$
BEGIN
  IF row_limit<1 OR row_limit>100 OR field_visibility_fingerprint !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'P08_REQUEST_INVALID'; END IF;
  PERFORM 1 FROM public.p08_authorized_binding(session_token_hash,'dashboard.import.foundation_sample.read',actor_id,scope_kind,dealer_ids,location_ids);
  RETURN QUERY SELECT batch.* FROM public.dashboard_import_batch batch WHERE batch."createdBy"=actor_id AND batch."contextRevision"=context_revision AND batch."scopeFingerprint"=scope_fingerprint AND batch."fieldVisibilityFingerprint"=field_visibility_fingerprint AND batch."authorizationScopeKind"=scope_kind AND batch."dealerIdsSnapshot"=dealer_ids AND batch."locationIdsSnapshot"=location_ids AND (status_filter IS NULL OR cardinality(status_filter)=0 OR batch."status"=ANY(status_filter)) ORDER BY batch."createdAt" DESC,batch."id" DESC LIMIT row_limit;
END
$p08_import_list$;

CREATE FUNCTION public.p08_import_finalize_context(
 session_token_hash text, import_id uuid, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text, expected_version integer
)
RETURNS SETOF public.dashboard_import_batch
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_import_finalize_context$
DECLARE batch public.dashboard_import_batch%ROWTYPE;
BEGIN
 SELECT * INTO batch FROM public.dashboard_import_batch source_batch WHERE source_batch."id"=import_id FOR UPDATE;
 IF NOT FOUND OR batch."createdBy"<>actor_id OR batch."contextRevision"<>context_revision OR batch."scopeFingerprint"<>scope_fingerprint OR batch."fieldVisibilityFingerprint"<>field_visibility_fingerprint OR batch."version"<>expected_version THEN RAISE EXCEPTION 'P08_RESOURCE_UNAVAILABLE'; END IF;
 PERFORM 1 FROM public.p08_authorized_binding(session_token_hash,'dashboard.import.foundation_sample.create',actor_id,batch."authorizationScopeKind",batch."dealerIdsSnapshot",batch."locationIdsSnapshot");
 RETURN NEXT batch;
END
$p08_import_finalize_context$;

CREATE FUNCTION public.p08_import_detail(
  session_token_hash text, permission_key text, import_id uuid, expected_actor_id text,
  expected_context_revision text, expected_scope_fingerprint text, expected_field_visibility_fingerprint text
)
RETURNS TABLE(id uuid, status text, version integer, object_key text, source_artifact_id uuid,
  row_count integer, valid_row_count integer, invalid_row_count integer, committed_row_count integer,
  failed_commit_row_count integer, preview_expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_import_detail$
DECLARE batch public.dashboard_import_batch%ROWTYPE;
BEGIN
  SELECT * INTO batch FROM public.dashboard_import_batch source_batch WHERE source_batch."id"=import_id;
  IF NOT FOUND OR batch."createdBy"<>expected_actor_id OR batch."contextRevision"<>expected_context_revision
     OR batch."scopeFingerprint"<>expected_scope_fingerprint OR batch."fieldVisibilityFingerprint"<>expected_field_visibility_fingerprint THEN
    RAISE EXCEPTION 'P08_RESOURCE_UNAVAILABLE';
  END IF;
  PERFORM 1 FROM public.p08_authorized_binding(session_token_hash,permission_key,expected_actor_id,batch."authorizationScopeKind",batch."dealerIdsSnapshot",batch."locationIdsSnapshot");
  RETURN QUERY SELECT batch."id",batch."status",batch."version",batch."objectKey",batch."sourceArtifactId",batch."rowCount",batch."validRowCount",batch."invalidRowCount",batch."committedRowCount",batch."failedCommitRowCount",batch."previewExpiresAt";
END
$p08_import_detail$;

CREATE FUNCTION public.p08_create_import(
  session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
  scope_kind text, dealer_ids text[], location_ids text[], import_id uuid, filename text, content_type text,
  declared_bytes bigint, token_hash text, token_expires_at timestamptz, intent_hash text,
  registry_version text, schema_version text, parser_version text, security_policy_version text
)
RETURNS TABLE(id uuid,status text,version integer,replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_create_import$
DECLARE existing public.dashboard_import_batch%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.p08_authorized_binding(session_token_hash,'dashboard.import.foundation_sample.create',actor_id,scope_kind,dealer_ids,location_ids);
  IF import_id IS NULL OR context_revision='' OR scope_fingerprint !~ '^[0-9a-f]{64}$' OR field_visibility_fingerprint !~ '^[0-9a-f]{64}$'
     OR filename='' OR char_length(filename)>128 OR filename~'[\\/\r\n\x00-\x1f]' OR content_type NOT IN ('text/csv','application/csv','text/plain')
     OR declared_bytes<1 OR token_hash !~ '^[0-9a-f]{64}$' OR intent_hash !~ '^[0-9a-f]{64}$' OR token_expires_at<=CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'P08_REQUEST_INVALID';
  END IF;
  SELECT * INTO existing FROM public.dashboard_import_batch
   WHERE "createdBy"=actor_id AND "uploadIntentHash"=intent_hash AND "uploadTokenHash"=token_hash FOR UPDATE;
  IF FOUND THEN RETURN QUERY SELECT existing."id",existing."status",existing."version",true; RETURN; END IF;
  INSERT INTO public.dashboard_import_batch("id","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","objectKey","status","uploadIntentFilename","uploadIntentContentType","uploadIntentDeclaredByteSize","uploadTokenHash","uploadTokenExpiresAt","uploadIntentHash","createdBy","registryVersion","schemaVersion","parserVersion","securityPolicyVersion")
  VALUES(import_id,scope_kind,dealer_ids,location_ids,context_revision,scope_fingerprint,field_visibility_fingerprint,'foundation.sample','awaiting_upload',filename,content_type,declared_bytes,token_hash,token_expires_at,intent_hash,actor_id,registry_version,schema_version,parser_version,security_policy_version);
  RETURN QUERY SELECT import_id,'awaiting_upload'::text,0,false;
END
$p08_create_import$;

CREATE FUNCTION public.p08_transition_import(
 session_token_hash text, permission_key text, import_id uuid, actor_id text, context_revision text,
 scope_fingerprint text, field_visibility_fingerprint text, expected_version integer,
 operation text, target_status text, source_artifact_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid,status text,version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_transition_import$
DECLARE batch public.dashboard_import_batch%ROWTYPE; allowed boolean:=false;
BEGIN
 SELECT * INTO batch FROM public.dashboard_import_batch source_batch WHERE source_batch."id"=import_id FOR UPDATE;
 IF NOT FOUND OR batch."createdBy"<>actor_id OR batch."contextRevision"<>context_revision OR batch."scopeFingerprint"<>scope_fingerprint OR batch."fieldVisibilityFingerprint"<>field_visibility_fingerprint OR batch."version"<>expected_version THEN RAISE EXCEPTION 'P08_RESOURCE_UNAVAILABLE'; END IF;
 PERFORM 1 FROM public.p08_authorized_binding(session_token_hash,permission_key,actor_id,batch."authorizationScopeKind",batch."dealerIdsSnapshot",batch."locationIdsSnapshot");
 allowed := (operation='finalize_upload' AND permission_key='dashboard.import.foundation_sample.create' AND batch."status"='awaiting_upload' AND target_status='uploaded' AND source_artifact_id IS NOT NULL)
   OR (operation='queue_commit' AND permission_key='dashboard.import.foundation_sample.commit' AND batch."status"='preview_ready' AND target_status='commit_queued' AND batch."previewBindingHash" IS NOT NULL AND batch."previewExpiresAt">CURRENT_TIMESTAMP)
   OR (operation='cancel' AND permission_key='dashboard.import.foundation_sample.create' AND batch."status" IN ('uploaded','commit_queued') AND target_status='cancelled');
 IF NOT allowed THEN RAISE EXCEPTION 'P08_STATE_CONFLICT'; END IF;
 UPDATE public.dashboard_import_batch target_batch SET "status"=target_status,"sourceArtifactId"=COALESCE(source_artifact_id,"sourceArtifactId"),"uploadTokenConsumedAt"=CASE WHEN operation='finalize_upload' THEN CURRENT_TIMESTAMP ELSE "uploadTokenConsumedAt" END,"commitRequestedAt"=CASE WHEN operation='queue_commit' THEN CURRENT_TIMESTAMP ELSE "commitRequestedAt" END,"completedAt"=CASE WHEN operation='cancel' THEN CURRENT_TIMESTAMP ELSE "completedAt" END,"version"=target_batch."version"+1 WHERE target_batch."id"=import_id RETURNING target_batch.* INTO batch;
 RETURN QUERY SELECT batch."id",batch."status",batch."version";
END
$p08_transition_import$;

CREATE FUNCTION public.p08_import_rows(
 session_token_hash text, import_id uuid, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
 after_row integer DEFAULT 1, row_limit integer DEFAULT 50
)
RETURNS TABLE(row_number integer,normalized_payload jsonb,validation_status text,validation_errors jsonb,commit_status text,target_record_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_import_rows$
DECLARE batch public.dashboard_import_batch%ROWTYPE;
BEGIN
 IF row_limit<1 OR row_limit>100 OR after_row<1 THEN RAISE EXCEPTION 'P08_REQUEST_INVALID'; END IF;
 SELECT * INTO batch FROM public.dashboard_import_batch source_batch WHERE source_batch."id"=import_id;
 IF NOT FOUND OR batch."createdBy"<>actor_id OR batch."contextRevision"<>context_revision OR batch."scopeFingerprint"<>scope_fingerprint OR batch."fieldVisibilityFingerprint"<>field_visibility_fingerprint THEN RAISE EXCEPTION 'P08_RESOURCE_UNAVAILABLE'; END IF;
 PERFORM 1 FROM public.p08_authorized_binding(session_token_hash,'dashboard.import.foundation_sample.read',actor_id,batch."authorizationScopeKind",batch."dealerIdsSnapshot",batch."locationIdsSnapshot");
 RETURN QUERY SELECT row."rowNumber",row."normalizedPayload",row."validationStatus",row."validationErrors",row."commitStatus",row."targetRecordId" FROM public.dashboard_import_row row WHERE row."batchId"=import_id AND row."rowNumber">after_row ORDER BY row."rowNumber",row."id" LIMIT row_limit;
END
$p08_import_rows$;

CREATE FUNCTION public.p08_create_export(
 session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
 scope_kind text, dealer_ids text[], location_ids text[], export_id uuid, query_snapshot jsonb, job_id uuid
)
RETURNS TABLE(id uuid,status text,version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_create_export$
BEGIN
 PERFORM 1 FROM public.p08_authorized_binding(session_token_hash,'dashboard.export.foundation_sample.create',actor_id,scope_kind,dealer_ids,location_ids);
 IF export_id IS NULL OR job_id IS NULL OR context_revision='' OR scope_fingerprint !~ '^[0-9a-f]{64}$' OR field_visibility_fingerprint !~ '^[0-9a-f]{64}$' OR pg_catalog.jsonb_typeof(query_snapshot)<>'object'
    OR NOT EXISTS(SELECT 1 FROM public.async_jobs job WHERE job."id"=job_id AND job."jobType"='dashboard.export.generate' AND job."status"='queued' AND job."createdByActorId"=actor_id AND job."contextRevision"=context_revision) THEN RAISE EXCEPTION 'P08_REQUEST_INVALID'; END IF;
 INSERT INTO public.dashboard_export_request("id","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","objectKey","status","querySnapshot","formulaVersion","requestedFormat","jobId","createdBy") VALUES(export_id,scope_kind,dealer_ids,location_ids,context_revision,scope_fingerprint,field_visibility_fingerprint,'foundation.sample','queued',query_snapshot,'foundation.sample.export.v1','csv',job_id,actor_id);
 RETURN QUERY SELECT export_id,'queued'::text,0;
END
$p08_create_export$;

CREATE FUNCTION public.p08_export_list(
  session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
  scope_kind text, dealer_ids text[], location_ids text[], status_filter text[], row_limit integer
)
RETURNS SETOF public.dashboard_export_request
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_export_list$
BEGIN
  IF row_limit<1 OR row_limit>100 OR field_visibility_fingerprint !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'P08_REQUEST_INVALID'; END IF;
  PERFORM 1 FROM public.p08_authorized_binding(session_token_hash,'dashboard.export.foundation_sample.read',actor_id,scope_kind,dealer_ids,location_ids);
  RETURN QUERY SELECT request.* FROM public.dashboard_export_request request WHERE request."createdBy"=actor_id AND request."contextRevision"=context_revision AND request."scopeFingerprint"=scope_fingerprint AND request."fieldVisibilityFingerprint"=field_visibility_fingerprint AND request."authorizationScopeKind"=scope_kind AND request."dealerIdsSnapshot"=dealer_ids AND request."locationIdsSnapshot"=location_ids AND (status_filter IS NULL OR cardinality(status_filter)=0 OR request."status"=ANY(status_filter)) ORDER BY request."createdAt" DESC,request."id" DESC LIMIT row_limit;
END
$p08_export_list$;

CREATE FUNCTION public.p08_export_detail(
 session_token_hash text, permission_key text, export_id uuid, actor_id text, context_revision text,
 scope_fingerprint text, field_visibility_fingerprint text
)
RETURNS TABLE(id uuid,status text,version integer,job_id uuid,artifact_id uuid,row_count integer,completed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_export_detail$
DECLARE request public.dashboard_export_request%ROWTYPE;
BEGIN
 SELECT * INTO request FROM public.dashboard_export_request source_request WHERE source_request."id"=export_id;
 IF NOT FOUND OR request."createdBy"<>actor_id OR request."contextRevision"<>context_revision OR request."scopeFingerprint"<>scope_fingerprint OR request."fieldVisibilityFingerprint"<>field_visibility_fingerprint THEN RAISE EXCEPTION 'P08_RESOURCE_UNAVAILABLE'; END IF;
 PERFORM 1 FROM public.p08_authorized_binding(session_token_hash,permission_key,actor_id,request."authorizationScopeKind",request."dealerIdsSnapshot",request."locationIdsSnapshot");
 RETURN QUERY SELECT request."id",request."status",request."version",request."jobId",request."artifactId",request."rowCount",request."completedAt";
END
$p08_export_detail$;

CREATE FUNCTION public.p08_transition_export(
 session_token_hash text, permission_key text, export_id uuid, actor_id text, context_revision text,
 scope_fingerprint text, field_visibility_fingerprint text, expected_version integer, operation text, target_status text
)
RETURNS TABLE(id uuid,status text,version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_transition_export$
DECLARE request public.dashboard_export_request%ROWTYPE;
BEGIN
 SELECT * INTO request FROM public.dashboard_export_request source_request WHERE source_request."id"=export_id FOR UPDATE;
 IF NOT FOUND OR request."createdBy"<>actor_id OR request."contextRevision"<>context_revision OR request."scopeFingerprint"<>scope_fingerprint OR request."fieldVisibilityFingerprint"<>field_visibility_fingerprint OR request."version"<>expected_version THEN RAISE EXCEPTION 'P08_RESOURCE_UNAVAILABLE'; END IF;
 PERFORM 1 FROM public.p08_authorized_binding(session_token_hash,permission_key,actor_id,request."authorizationScopeKind",request."dealerIdsSnapshot",request."locationIdsSnapshot");
 IF operation<>'cancel' OR permission_key<>'dashboard.export.foundation_sample.create' OR request."status"<>'queued' OR target_status<>'cancelled' THEN RAISE EXCEPTION 'P08_STATE_CONFLICT'; END IF;
 UPDATE public.dashboard_export_request target_request SET "status"='cancelled',"completedAt"=CURRENT_TIMESTAMP,"version"=target_request."version"+1 WHERE target_request."id"=export_id RETURNING target_request.* INTO request;
 RETURN QUERY SELECT request."id",request."status",request."version";
END
$p08_transition_export$;

CREATE FUNCTION public.p08_commit_sample(
 job_id uuid, lease_owner text, lease_revision integer, import_id uuid, expected_batch_version integer,
 row_number integer, expected_target_version integer, external_key text, label text, sample_state text,
 quantity integer, effective_date date, note text
)
RETURNS TABLE(target_id uuid,target_version bigint,replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_commit_sample$
DECLARE job public.async_jobs%ROWTYPE; batch public.dashboard_import_batch%ROWTYPE; row public.dashboard_import_row%ROWTYPE; target public.foundation_sample%ROWTYPE; operation_key text;
BEGIN
 SELECT * INTO job FROM public.async_jobs source_job WHERE source_job."id"=job_id FOR UPDATE;
 IF NOT FOUND OR job."jobType"<>'dashboard.import.commit' OR job."status"<>'running' OR job."leaseOwner"<>lease_owner OR job."leaseRevision"<>lease_revision OR job."leaseExpiresAt"<=CURRENT_TIMESTAMP OR job."payload"->>'importId'<>import_id::text THEN RAISE EXCEPTION 'P08_JOB_FENCED'; END IF;
 SELECT * INTO batch FROM public.dashboard_import_batch source_batch WHERE source_batch."id"=import_id FOR UPDATE;
 SELECT * INTO row FROM public.dashboard_import_row source_row WHERE source_row."batchId"=import_id AND source_row."rowNumber"=row_number FOR UPDATE;
 IF NOT FOUND OR batch."version"<>expected_batch_version OR batch."status"<>'committing' OR batch."objectKey"<>'foundation.sample' OR row."validationStatus"<>'valid' OR row."commitStatus" NOT IN ('not_attempted','committed') THEN RAISE EXCEPTION 'P08_STATE_CONFLICT'; END IF;
 IF row."commitStatus"='committed' THEN SELECT * INTO target FROM public.foundation_sample source_target WHERE source_target."id"=row."targetRecordId"::uuid; RETURN QUERY SELECT target."id",target.xmin::text::bigint,true; RETURN; END IF;
 SELECT * INTO target FROM public.foundation_sample WHERE "authorizationScopeKind"=batch."authorizationScopeKind" AND "dealerIdsSnapshot"=batch."dealerIdsSnapshot" AND "locationIdsSnapshot"=batch."locationIdsSnapshot" AND "scopeFingerprint"=batch."scopeFingerprint" AND "fieldVisibilityFingerprint"=batch."fieldVisibilityFingerprint" AND "externalKey"=external_key FOR UPDATE;
 IF FOUND THEN
   IF target.xmin::text::bigint<>expected_target_version THEN RAISE EXCEPTION 'P08_VERSION_CONFLICT'; END IF;
   UPDATE public.foundation_sample target_sample SET "label"=label,"state"=sample_state,"quantity"=quantity,"effectiveDate"=effective_date,"note"=note,"updatedAt"=CURRENT_TIMESTAMP WHERE target_sample."id"=target."id" RETURNING target_sample.* INTO target;
 ELSE
   IF expected_target_version<>0 THEN RAISE EXCEPTION 'P08_VERSION_CONFLICT'; END IF;
   INSERT INTO public.foundation_sample("externalKey","label","state","quantity","effectiveDate","note","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","scopeFingerprint","fieldVisibilityFingerprint") VALUES(external_key,label,sample_state,quantity,effective_date,note,batch."authorizationScopeKind",batch."dealerIdsSnapshot",batch."locationIdsSnapshot",batch."scopeFingerprint",batch."fieldVisibilityFingerprint") RETURNING * INTO target;
 END IF;
 UPDATE public.dashboard_import_row target_row SET "commitStatus"='committed',"targetRecordId"=target."id"::text,"updatedAt"=CURRENT_TIMESTAMP WHERE target_row."id"=row."id";
 RETURN QUERY SELECT target."id",target.xmin::text::bigint,false;
END
$p08_commit_sample$;

CREATE FUNCTION public.p08_export_samples(
 job_id uuid, lease_owner text, lease_revision integer, export_id uuid, expected_version integer, row_limit integer
)
RETURNS TABLE(id uuid,external_key text,label text,state text,quantity integer,effective_date date,note text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_export_samples$
DECLARE job public.async_jobs%ROWTYPE; request public.dashboard_export_request%ROWTYPE;
BEGIN
 IF row_limit<1 OR row_limit>10000 THEN RAISE EXCEPTION 'P08_REQUEST_INVALID'; END IF;
 SELECT * INTO job FROM public.async_jobs source_job WHERE source_job."id"=job_id;
 SELECT * INTO request FROM public.dashboard_export_request source_request WHERE source_request."id"=export_id;
 IF job."jobType"<>'dashboard.export.generate' OR job."status"<>'running' OR job."leaseOwner"<>lease_owner OR job."leaseRevision"<>lease_revision OR job."leaseExpiresAt"<=CURRENT_TIMESTAMP OR request."jobId"<>job_id OR request."version"<>expected_version OR request."status"<>'running' THEN RAISE EXCEPTION 'P08_JOB_FENCED'; END IF;
 RETURN QUERY SELECT sample."id",sample."externalKey",sample."label",sample."state",sample."quantity",sample."effectiveDate",sample."note" FROM public.foundation_sample sample WHERE sample."authorizationScopeKind"=request."authorizationScopeKind" AND sample."dealerIdsSnapshot"=request."dealerIdsSnapshot" AND sample."locationIdsSnapshot"=request."locationIdsSnapshot" AND sample."scopeFingerprint"=request."scopeFingerprint" AND sample."fieldVisibilityFingerprint"=request."fieldVisibilityFingerprint" ORDER BY sample."externalKey",sample."id" LIMIT row_limit;
END
$p08_export_samples$;

CREATE FUNCTION public.p08_purge_row_payloads(job_id uuid,lease_owner text,lease_revision integer,import_id uuid,expected_version integer)
RETURNS TABLE(purged_rows bigint,batch_version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p08_purge_row_payloads$
DECLARE job public.async_jobs%ROWTYPE; batch public.dashboard_import_batch%ROWTYPE; count_rows bigint;
BEGIN
 SELECT * INTO job FROM public.async_jobs source_job WHERE source_job."id"=job_id FOR UPDATE;
 SELECT * INTO batch FROM public.dashboard_import_batch source_batch WHERE source_batch."id"=import_id FOR UPDATE;
 IF job."jobType"<>'dashboard.artifact.expire' OR job."status"<>'running' OR job."leaseOwner"<>lease_owner OR job."leaseRevision"<>lease_revision OR job."leaseExpiresAt"<=CURRENT_TIMESTAMP OR batch."version"<>expected_version OR batch."payloadPurgeDueAt">CURRENT_TIMESTAMP THEN RAISE EXCEPTION 'P08_JOB_FENCED'; END IF;
 UPDATE public.dashboard_import_row target_row SET "rawPayload"=NULL,"normalizedPayload"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE target_row."batchId"=import_id AND (target_row."rawPayload" IS NOT NULL OR target_row."normalizedPayload" IS NOT NULL); GET DIAGNOSTICS count_rows=ROW_COUNT;
 UPDATE public.dashboard_import_batch purge_batch SET "payloadsPurgedAt"=COALESCE(purge_batch."payloadsPurgedAt",CURRENT_TIMESTAMP),"payloadPurgeAttemptCount"=purge_batch."payloadPurgeAttemptCount"+1,"payloadPurgeLastAttemptAt"=CURRENT_TIMESTAMP,"payloadPurgeLastErrorCode"=NULL,"version"=purge_batch."version"+1 WHERE purge_batch."id"=import_id RETURNING purge_batch."version" INTO batch."version";
 RETURN QUERY SELECT count_rows,batch."version";
END
$p08_purge_row_payloads$;

-- No function or table remains owned by the runtime role.
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM vanstro_p08_guard_owner;

DO $p08_m64_function_owner$
DECLARE fn record;
BEGIN
 FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'p08_%' AND p.proname<>'p08_canonical_text_array' LOOP
   EXECUTE pg_catalog.format('ALTER FUNCTION %s OWNER TO vanstro_p08_guard_owner',fn.signature);
   EXECUTE pg_catalog.format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC',fn.signature);
   EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION %s FROM vanstro_migrator, vanstro_runtime',fn.signature);
   IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc helper WHERE helper.oid=fn.signature::oid AND helper.proname='p08_authorized_binding') THEN
     EXECUTE pg_catalog.format('GRANT EXECUTE ON FUNCTION %s TO vanstro_runtime',fn.signature);
   END IF;
 END LOOP;
END
$p08_m64_function_owner$;

-- The internal authorization helper and canonical-array helper are not callable by runtime.
GRANT EXECUTE ON FUNCTION public.p08_canonical_text_array(text[]) TO vanstro_p08_guard_owner;
SET ROLE vanstro_p08_guard_owner;
REVOKE ALL ON FUNCTION public.p08_authorized_binding(text,text,text,text,text[],text[]) FROM PUBLIC, vanstro_runtime, vanstro_migrator;
GRANT EXECUTE ON FUNCTION public.p08_authorized_binding(text,text,text,text,text[],text[]) TO vanstro_p08_guard_owner;
REVOKE ALL ON FUNCTION public.p08_canonical_text_array(text[]) FROM PUBLIC, vanstro_runtime;
GRANT EXECUTE ON FUNCTION public.p08_canonical_text_array(text[]) TO vanstro_p08_guard_owner;
REVOKE EXECUTE ON FUNCTION public.p08_authorized_binding(text,text,text,text,text[],text[]), public.p08_import_list(text,text,text,text,text,text,text[],text[],text[],integer), public.p08_import_finalize_context(text,uuid,text,text,text,text,integer), public.p08_import_detail(text,text,uuid,text,text,text,text), public.p08_create_import(text,text,text,text,text,text,text[],text[],uuid,text,text,bigint,text,timestamptz,text,text,text,text,text), public.p08_transition_import(text,text,uuid,text,text,text,text,integer,text,text,uuid), public.p08_import_rows(text,uuid,text,text,text,text,integer,integer), public.p08_create_export(text,text,text,text,text,text,text[],text[],uuid,jsonb,uuid), public.p08_export_list(text,text,text,text,text,text,text[],text[],text[],integer), public.p08_export_detail(text,text,uuid,text,text,text,text), public.p08_transition_export(text,text,uuid,text,text,text,text,integer,text,text), public.p08_commit_sample(uuid,text,integer,uuid,integer,integer,integer,text,text,text,integer,date,text), public.p08_export_samples(uuid,text,integer,uuid,integer,integer), public.p08_purge_row_payloads(uuid,text,integer,uuid,integer) FROM PUBLIC;
RESET ROLE;

DO $p08_m64_post$
DECLARE rel text; verb text; fn record;
BEGIN
 FOREACH rel IN ARRAY ARRAY['dashboard_import_batch','dashboard_import_row','dashboard_export_request','foundation_sample'] LOOP
  FOREACH verb IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
   IF pg_catalog.has_table_privilege('vanstro_runtime','public.'||rel,verb) OR pg_catalog.has_table_privilege('public','public.'||rel,verb) THEN RAISE EXCEPTION 'migration64 direct table privilege remains: % %',rel,verb; END IF;
  END LOOP;
 END LOOP;
 IF pg_catalog.has_schema_privilege('vanstro_runtime','public','CREATE') OR pg_catalog.has_schema_privilege('vanstro_p08_guard_owner','public','CREATE')
    OR pg_catalog.has_database_privilege('vanstro_runtime',current_database(),'CREATE') OR pg_catalog.has_database_privilege('vanstro_p08_guard_owner',current_database(),'CREATE') THEN RAISE EXCEPTION 'migration64 CREATE privilege remains'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' AND c.relname IN ('dashboard_import_batch','dashboard_import_row','dashboard_export_request','foundation_sample') AND r.rolname='vanstro_runtime') THEN RAISE EXCEPTION 'runtime owns P08 table'; END IF;
 NULL;
 IF pg_catalog.has_function_privilege('vanstro_runtime','public.p08_authorized_binding(text,text,text,text,text[],text[])','EXECUTE') THEN RAISE EXCEPTION 'migration64 helper execute boundary mismatch'; END IF;
END
$p08_m64_post$;
