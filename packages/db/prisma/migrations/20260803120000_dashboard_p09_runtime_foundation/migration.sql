-- P09 Runtime Config / Feature Flags persistence and controlled permission boundary.
-- Forward-only. Migrations 1-64 remain immutable.

DO $p09_roles$
DECLARE role_row record;
BEGIN
  IF current_user <> 'vanstro_migrator' OR session_user <> 'vanstro_migrator' THEN
    RAISE EXCEPTION 'migration 65 must run directly as vanstro_migrator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='vanstro_p09_guard_owner') THEN
    RAISE EXCEPTION 'migration 65 requires pre-provisioned vanstro_p09_guard_owner';
  END IF;
  FOR role_row IN SELECT * FROM pg_catalog.pg_roles WHERE rolname IN ('vanstro_migrator','vanstro_runtime','vanstro_p09_guard_owner') LOOP
    IF role_row.rolsuper OR role_row.rolcreaterole OR role_row.rolcreatedb OR role_row.rolreplication OR role_row.rolbypassrls THEN
      RAISE EXCEPTION 'migration 65 unsafe role attributes for %', role_row.rolname;
    END IF;
  END LOOP;
  IF pg_catalog.pg_has_role('vanstro_runtime','vanstro_migrator','MEMBER')
     OR pg_catalog.pg_has_role('vanstro_runtime','vanstro_p09_guard_owner','MEMBER')
     OR pg_catalog.pg_has_role('vanstro_p09_guard_owner','vanstro_runtime','MEMBER') THEN
    RAISE EXCEPTION 'migration 65 unsafe role membership';
  END IF;
  IF NOT pg_catalog.pg_has_role('vanstro_migrator','vanstro_p09_guard_owner','MEMBER') THEN
    RAISE EXCEPTION 'migration 65 requires migrator membership in vanstro_p09_guard_owner';
  END IF;
END
$p09_roles$;

CREATE TABLE public.runtime_config_version (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "configKey" text NOT NULL,
  "schemaVersion" text NOT NULL,
  "authorizationScopeKind" text NOT NULL,
  "dealerIdsSnapshot" text[] NOT NULL,
  "locationIdsSnapshot" text[] NOT NULL,
  "contextRevision" text NOT NULL,
  "scopeFingerprint" text NOT NULL,
  "fieldVisibilityFingerprint" text NOT NULL,
  "desiredValue" jsonb NOT NULL,
  "effectiveValue" jsonb,
  "desiredSource" text NOT NULL DEFAULT 'runtime_override',
  "effectiveSource" text,
  "validationStatus" text NOT NULL,
  "activationStatus" text NOT NULL,
  "failureReasonCode" text,
  "version" integer NOT NULL,
  "generation" bigint NOT NULL DEFAULT 0,
  "createdBy" text NOT NULL,
  "idempotencyKeyHash" text NOT NULL,
  "requestHash" text NOT NULL,
  "rollbackFromVersion" integer,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" timestamptz(3),
  CONSTRAINT runtime_config_registry CHECK ("configKey" IN ('foundation.runtime.refresh_interval_seconds','foundation.runtime.display_mode','foundation.runtime.safe_origin')),
  CONSTRAINT runtime_config_schema CHECK ("schemaVersion"='runtime-config-schema.v1'),
  CONSTRAINT runtime_config_scope CHECK ("authorizationScopeKind" IN ('global','dealer','location')),
  CONSTRAINT runtime_config_arrays CHECK (array_position("dealerIdsSnapshot",NULL) IS NULL AND array_position("locationIdsSnapshot",NULL) IS NULL),
  CONSTRAINT runtime_config_fingerprints CHECK ("scopeFingerprint"~'^[0-9a-f]{64}$' AND "fieldVisibilityFingerprint"~'^[0-9a-f]{64}$'),
  CONSTRAINT runtime_config_validation CHECK ("validationStatus" IN ('validated','validation_failed')),
  CONSTRAINT runtime_config_activation CHECK ("activationStatus" IN ('draft','active','activation_failed')),
  CONSTRAINT runtime_config_version_positive CHECK ("version">=1 AND "generation">=0),
  CONSTRAINT runtime_config_hashes CHECK ("idempotencyKeyHash"~'^[0-9a-f]{64}$' AND "requestHash"~'^[0-9a-f]{64}$'),
  CONSTRAINT runtime_config_state CHECK (("activationStatus"='active' AND "effectiveValue" IS NOT NULL AND "effectiveSource"='runtime_override' AND "activatedAt" IS NOT NULL AND "failureReasonCode" IS NULL) OR ("activationStatus"<>'active')),
  UNIQUE ("configKey","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","version"),
  UNIQUE ("createdBy","configKey","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","idempotencyKeyHash")
);
CREATE INDEX runtime_config_lookup ON public.runtime_config_version ("configKey","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","version" DESC);

CREATE TABLE public.feature_flag_version (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "flagKey" text NOT NULL,
  "schemaVersion" text NOT NULL,
  "authorizationScopeKind" text NOT NULL,
  "dealerIdsSnapshot" text[] NOT NULL,
  "locationIdsSnapshot" text[] NOT NULL,
  "contextRevision" text NOT NULL,
  "scopeFingerprint" text NOT NULL,
  "fieldVisibilityFingerprint" text NOT NULL,
  "desiredState" text NOT NULL,
  "effectiveState" text,
  "validationStatus" text NOT NULL,
  "activationStatus" text NOT NULL,
  "failureReasonCode" text,
  "version" integer NOT NULL,
  "generation" bigint NOT NULL DEFAULT 0,
  "createdBy" text NOT NULL,
  "idempotencyKeyHash" text NOT NULL,
  "requestHash" text NOT NULL,
  "rollbackFromVersion" integer,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" timestamptz(3),
  CONSTRAINT feature_flag_registry CHECK ("flagKey"='foundation.runtime.sample_flag'),
  CONSTRAINT feature_flag_schema CHECK ("schemaVersion"='feature-flag-schema.v1'),
  CONSTRAINT feature_flag_scope CHECK ("authorizationScopeKind" IN ('global','dealer','location')),
  CONSTRAINT feature_flag_arrays CHECK (array_position("dealerIdsSnapshot",NULL) IS NULL AND array_position("locationIdsSnapshot",NULL) IS NULL),
  CONSTRAINT feature_flag_fingerprints CHECK ("scopeFingerprint"~'^[0-9a-f]{64}$' AND "fieldVisibilityFingerprint"~'^[0-9a-f]{64}$'),
  CONSTRAINT feature_flag_states CHECK ("desiredState" IN ('disabled','internal','read_only','limited','enabled','killed') AND ("effectiveState" IS NULL OR "effectiveState" IN ('disabled','internal','read_only','limited','enabled','killed'))),
  CONSTRAINT feature_flag_validation CHECK ("validationStatus"='validated'),
  CONSTRAINT feature_flag_activation CHECK ("activationStatus" IN ('draft','active','activation_failed')),
  CONSTRAINT feature_flag_version_positive CHECK ("version">=1 AND "generation">=0),
  CONSTRAINT feature_flag_hashes CHECK ("idempotencyKeyHash"~'^[0-9a-f]{64}$' AND "requestHash"~'^[0-9a-f]{64}$'),
  CONSTRAINT feature_flag_active CHECK (("activationStatus"='active' AND "effectiveState" IS NOT NULL AND "activatedAt" IS NOT NULL AND "failureReasonCode" IS NULL) OR ("activationStatus"<>'active')),
  UNIQUE ("flagKey","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","version"),
  UNIQUE ("createdBy","flagKey","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","idempotencyKeyHash")
);
CREATE INDEX feature_flag_lookup ON public.feature_flag_version ("flagKey","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","version" DESC);

REVOKE ALL ON TABLE public.runtime_config_version, public.feature_flag_version FROM PUBLIC, vanstro_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, vanstro_runtime, vanstro_p09_guard_owner;
DO $p09_database_create$
BEGIN
  EXECUTE pg_catalog.format('REVOKE CREATE ON DATABASE %I FROM PUBLIC, vanstro_runtime, vanstro_p09_guard_owner', current_database());
END
$p09_database_create$;

GRANT USAGE, CREATE ON SCHEMA public TO vanstro_p09_guard_owner;
GRANT SELECT ON TABLE public.refresh_sessions, public.users, public.user_roles, public.roles, public.role_permissions, public.permissions,
  public.dealer_memberships, public.dealer_membership_roles, public.dealer_membership_locations, public.dealer_locations TO vanstro_p09_guard_owner;
GRANT SELECT, INSERT, UPDATE ON TABLE public.runtime_config_version, public.feature_flag_version TO vanstro_p09_guard_owner;
GRANT INSERT ON TABLE public.audit_events TO vanstro_p09_guard_owner;
SET ROLE vanstro_p09_guard_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE FUNCTION public.p09_authorized_binding(
  session_token_hash text, permission_key text, expected_actor_id text,
  expected_scope_kind text, expected_dealer_ids text[], expected_location_ids text[]
)
RETURNS TABLE(actor_id text, scope_kind text, dealer_ids text[], location_ids text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p09_authorized_binding$
DECLARE resolved_actor text; has_global boolean; resolved_dealers text[]; resolved_locations text[];
BEGIN
  IF current_user<>'vanstro_p09_guard_owner' OR session_token_hash!~'^[0-9a-f]{64}$'
     OR permission_key NOT IN ('config.read','config.manage','config.activate','flags.read','flags.manage','flags.kill_switch','readiness.read_summary','readiness.read_detail')
     OR expected_actor_id IS NULL OR expected_actor_id='' OR expected_scope_kind NOT IN ('global','dealer','location')
     OR expected_dealer_ids IS NULL OR expected_location_ids IS NULL OR array_position(expected_dealer_ids,NULL) IS NOT NULL OR array_position(expected_location_ids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'P09_RESOURCE_UNAVAILABLE';
  END IF;
  SELECT session."userId" INTO resolved_actor FROM public.refresh_sessions session
  JOIN public.users actor ON actor."id"=session."userId"
  WHERE session."tokenHash"=session_token_hash AND session."revokedAt" IS NULL AND session."expiresAt">CURRENT_TIMESTAMP
    AND actor."kind"='admin' AND actor."status"='active';
  IF resolved_actor IS DISTINCT FROM expected_actor_id THEN RAISE EXCEPTION 'P09_RESOURCE_UNAVAILABLE'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles assignment JOIN public.roles role ON role."id"=assignment."roleId"
    JOIN public.role_permissions grant_row ON grant_row."roleId"=role."id" JOIN public.permissions permission ON permission."id"=grant_row."permissionId"
    WHERE assignment."userId"=resolved_actor AND role."key"<>'dealer_admin' AND permission."key"=permission_key) INTO has_global;
  IF has_global THEN resolved_dealers:=ARRAY[]::text[]; resolved_locations:=ARRAY[]::text[];
  ELSE
    SELECT COALESCE(array_agg(DISTINCT membership."dealerId" ORDER BY membership."dealerId"),ARRAY[]::text[]),
      COALESCE(array_agg(DISTINCT location."dealerLocationId" ORDER BY location."dealerLocationId") FILTER (WHERE location."dealerLocationId" IS NOT NULL),ARRAY[]::text[])
    INTO resolved_dealers,resolved_locations FROM public.dealer_memberships membership
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
    OR (NOT has_global AND expected_scope_kind='global') OR expected_dealer_ids IS DISTINCT FROM resolved_dealers
    OR expected_location_ids IS DISTINCT FROM resolved_locations THEN RAISE EXCEPTION 'P09_RESOURCE_UNAVAILABLE'; END IF;
  RETURN QUERY SELECT resolved_actor,expected_scope_kind,resolved_dealers,resolved_locations;
END
$p09_authorized_binding$;

CREATE FUNCTION public.p09_validate_config(config_key text, desired_value jsonb, scope_kind text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public
AS $p09_validate_config$
DECLARE origin text;
BEGIN
  IF config_key='foundation.runtime.refresh_interval_seconds' THEN
    RETURN pg_catalog.jsonb_typeof(desired_value)='number' AND desired_value::text~'^[0-9]+$' AND (desired_value::text)::integer BETWEEN 5 AND 300;
  ELSIF config_key='foundation.runtime.display_mode' THEN
    RETURN pg_catalog.jsonb_typeof(desired_value)='string' AND desired_value#>>'{}' IN ('standard','compact');
  ELSIF config_key='foundation.runtime.safe_origin' THEN
    origin:=desired_value#>>'{}';
    RETURN scope_kind='global' AND pg_catalog.jsonb_typeof(desired_value)='string' AND origin~'^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$' AND char_length(origin)<=253;
  END IF;
  RETURN false;
END
$p09_validate_config$;

CREATE FUNCTION public.p09_write_audit(actor_id text, permission_key text, scope_kind text, dealer_ids text[], location_ids text[], context_revision text,
  action_resource text, resource_id text, result_value text, reason_value text, request_id text, metadata_value jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p09_write_audit$
BEGIN
  IF current_user<>'vanstro_p09_guard_owner' OR action_resource NOT IN ('runtime_config','feature_flag') OR result_value NOT IN ('succeeded','failed')
    OR request_id!~'^[A-Za-z0-9._:-]{1,128}$' THEN RAISE EXCEPTION 'P09_AUDIT_INVALID'; END IF;
  INSERT INTO public.audit_events("eventVersion","occurredAt","actorType","actorId","actorDisplayClass","effectiveRoles","permissionGrants","authorizationScopeKind","dealerIds","locationIds","contextRevision","authorizationContractVersion","action","resourceType","resourceId","result","reason","requestId","source","metadata","sensitive","retentionClass","retentionPolicyVersion","expiresAt")
  VALUES('audit-event.v1',CURRENT_TIMESTAMP,'admin_user',actor_id,'staff','[]'::jsonb,pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('permissionKey',permission_key,'scope',pg_catalog.jsonb_build_object('kind',scope_kind,'dealerIds',dealer_ids,'locationIds',location_ids))),scope_kind,pg_catalog.to_jsonb(dealer_ids),pg_catalog.to_jsonb(location_ids),context_revision,'dashboard-authorization.v1','config_publish',action_resource,resource_id,result_value,reason_value,request_id,'dashboard_api',metadata_value,false,'high_risk','audit-retention.v1',CURRENT_TIMESTAMP+INTERVAL '2555 days');
END
$p09_write_audit$;

CREATE FUNCTION public.p09_config_list(session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
  scope_kind text, dealer_ids text[], location_ids text[])
RETURNS SETOF public.runtime_config_version LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p09_config_list$
BEGIN
  PERFORM 1 FROM public.p09_authorized_binding(session_token_hash,'config.read',actor_id,scope_kind,dealer_ids,location_ids);
  RETURN QUERY SELECT DISTINCT ON (v."configKey") v.* FROM public.runtime_config_version v
    WHERE v."authorizationScopeKind"=scope_kind AND v."dealerIdsSnapshot"=dealer_ids AND v."locationIdsSnapshot"=location_ids
      AND v."contextRevision"=context_revision AND v."scopeFingerprint"=scope_fingerprint AND v."fieldVisibilityFingerprint"=field_visibility_fingerprint
    ORDER BY v."configKey",v."version" DESC;
END
$p09_config_list$;

CREATE FUNCTION public.p09_config_propose(session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
  scope_kind text, dealer_ids text[], location_ids text[], config_key text, schema_version text, desired_value jsonb, expected_version integer,
  idempotency_hash text, request_hash text, request_id text)
RETURNS SETOF public.runtime_config_version LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p09_config_propose$
DECLARE latest public.runtime_config_version%ROWTYPE; replay public.runtime_config_version%ROWTYPE; next_version integer;
BEGIN
  PERFORM 1 FROM public.p09_authorized_binding(session_token_hash,'config.manage',actor_id,scope_kind,dealer_ids,location_ids);
  IF current_database()!~*'(test|smoke|disposable)' OR schema_version<>'runtime-config-schema.v1' OR NOT public.p09_validate_config(config_key,desired_value,scope_kind)
    OR idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'P09_REQUEST_INVALID'; END IF;
  SELECT * INTO replay FROM public.runtime_config_version v WHERE v."createdBy"=actor_id AND v."configKey"=config_key AND v."authorizationScopeKind"=scope_kind
    AND v."dealerIdsSnapshot"=dealer_ids AND v."locationIdsSnapshot"=location_ids AND v."idempotencyKeyHash"=idempotency_hash;
  IF FOUND THEN IF replay."requestHash"<>request_hash THEN RAISE EXCEPTION 'P09_IDEMPOTENCY_CONFLICT'; END IF; RETURN NEXT replay; RETURN; END IF;
  SELECT * INTO latest FROM public.runtime_config_version v WHERE v."configKey"=config_key AND v."authorizationScopeKind"=scope_kind
    AND v."dealerIdsSnapshot"=dealer_ids AND v."locationIdsSnapshot"=location_ids ORDER BY v."version" DESC LIMIT 1 FOR UPDATE;
  IF COALESCE(latest."version",0)<>expected_version THEN RAISE EXCEPTION 'P09_VERSION_CONFLICT'; END IF;
  next_version:=expected_version+1;
  INSERT INTO public.runtime_config_version("configKey","schemaVersion","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","desiredValue","effectiveValue","desiredSource","effectiveSource","validationStatus","activationStatus","version","generation","createdBy","idempotencyKeyHash","requestHash")
  VALUES(config_key,schema_version,scope_kind,dealer_ids,location_ids,context_revision,scope_fingerprint,field_visibility_fingerprint,desired_value,latest."effectiveValue",'runtime_override',latest."effectiveSource",'validated','draft',next_version,COALESCE(latest."generation",0),actor_id,idempotency_hash,request_hash) RETURNING * INTO latest;
  PERFORM public.p09_write_audit(actor_id,'config.manage',scope_kind,dealer_ids,location_ids,context_revision,'runtime_config',config_key,'succeeded','completed',request_id,pg_catalog.jsonb_build_object('schemaVersion','audit-metadata.v1','entries',pg_catalog.jsonb_build_object('version',next_version,'activationStatus','draft')));
  RETURN NEXT latest;
END
$p09_config_propose$;

CREATE FUNCTION public.p09_config_activate(session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
  scope_kind text, dealer_ids text[], location_ids text[], config_key text, expected_version integer, idempotency_hash text, request_hash text,
  request_id text, simulate_failure boolean DEFAULT false)
RETURNS SETOF public.runtime_config_version LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p09_config_activate$
DECLARE latest public.runtime_config_version%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.p09_authorized_binding(session_token_hash,'config.activate',actor_id,scope_kind,dealer_ids,location_ids);
  IF current_database()!~*'(test|smoke|disposable)' OR idempotency_hash!~'^[0-9a-f]{64}$' OR request_hash!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'P09_REQUEST_INVALID'; END IF;
  SELECT * INTO latest FROM public.runtime_config_version v WHERE v."configKey"=config_key AND v."authorizationScopeKind"=scope_kind
    AND v."dealerIdsSnapshot"=dealer_ids AND v."locationIdsSnapshot"=location_ids ORDER BY v."version" DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR latest."version"<>expected_version OR latest."contextRevision"<>context_revision OR latest."scopeFingerprint"<>scope_fingerprint OR latest."fieldVisibilityFingerprint"<>field_visibility_fingerprint OR latest."activationStatus" NOT IN ('draft','activation_failed') THEN RAISE EXCEPTION 'P09_VERSION_CONFLICT'; END IF;
  IF simulate_failure THEN
    UPDATE public.runtime_config_version SET "activationStatus"='activation_failed',"failureReasonCode"='synthetic_activation_failure' WHERE "id"=latest."id" RETURNING * INTO latest;
    PERFORM public.p09_write_audit(actor_id,'config.activate',scope_kind,dealer_ids,location_ids,context_revision,'runtime_config',config_key,'failed','dependency_unavailable',request_id,pg_catalog.jsonb_build_object('schemaVersion','audit-metadata.v1','entries',pg_catalog.jsonb_build_object('version',expected_version,'activationStatus','activation_failed')));
  ELSE
    UPDATE public.runtime_config_version SET "activationStatus"='active',"effectiveValue"="desiredValue","effectiveSource"='runtime_override',"generation"="generation"+1,"failureReasonCode"=NULL,"activatedAt"=CURRENT_TIMESTAMP WHERE "id"=latest."id" RETURNING * INTO latest;
    PERFORM public.p09_write_audit(actor_id,'config.activate',scope_kind,dealer_ids,location_ids,context_revision,'runtime_config',config_key,'succeeded','completed',request_id,pg_catalog.jsonb_build_object('schemaVersion','audit-metadata.v1','entries',pg_catalog.jsonb_build_object('version',expected_version,'activationStatus','active')));
  END IF;
  RETURN NEXT latest;
END
$p09_config_activate$;

CREATE FUNCTION public.p09_config_rollback(session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
  scope_kind text, dealer_ids text[], location_ids text[], config_key text, expected_version integer, rollback_version integer,
  idempotency_hash text, request_hash text, request_id text)
RETURNS SETOF public.runtime_config_version LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p09_config_rollback$
DECLARE latest public.runtime_config_version%ROWTYPE; source public.runtime_config_version%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.p09_authorized_binding(session_token_hash,'config.manage',actor_id,scope_kind,dealer_ids,location_ids);
  PERFORM 1 FROM public.p09_authorized_binding(session_token_hash,'config.activate',actor_id,scope_kind,dealer_ids,location_ids);
  IF current_database()!~*'(test|smoke|disposable)' THEN RAISE EXCEPTION 'P09_REQUEST_INVALID'; END IF;
  SELECT * INTO latest FROM public.runtime_config_version v WHERE v."configKey"=config_key AND v."authorizationScopeKind"=scope_kind AND v."dealerIdsSnapshot"=dealer_ids AND v."locationIdsSnapshot"=location_ids ORDER BY v."version" DESC LIMIT 1 FOR UPDATE;
  SELECT * INTO source FROM public.runtime_config_version v WHERE v."configKey"=config_key AND v."authorizationScopeKind"=scope_kind AND v."dealerIdsSnapshot"=dealer_ids AND v."locationIdsSnapshot"=location_ids AND v."version"=rollback_version AND v."activationStatus"='active';
  IF NOT FOUND OR latest."version"<>expected_version OR source."effectiveValue" IS NULL THEN RAISE EXCEPTION 'P09_VERSION_CONFLICT'; END IF;
  INSERT INTO public.runtime_config_version("configKey","schemaVersion","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","desiredValue","effectiveValue","desiredSource","effectiveSource","validationStatus","activationStatus","version","generation","createdBy","idempotencyKeyHash","requestHash","rollbackFromVersion","activatedAt")
  VALUES(config_key,'runtime-config-schema.v1',scope_kind,dealer_ids,location_ids,context_revision,scope_fingerprint,field_visibility_fingerprint,source."effectiveValue",source."effectiveValue",'runtime_override','runtime_override','validated','active',expected_version+1,latest."generation"+1,actor_id,idempotency_hash,request_hash,rollback_version,CURRENT_TIMESTAMP) RETURNING * INTO latest;
  PERFORM public.p09_write_audit(actor_id,'config.activate',scope_kind,dealer_ids,location_ids,context_revision,'runtime_config',config_key,'succeeded','completed',request_id,pg_catalog.jsonb_build_object('schemaVersion','audit-metadata.v1','entries',pg_catalog.jsonb_build_object('version',expected_version+1,'rollbackFromVersion',rollback_version)));
  RETURN NEXT latest;
END
$p09_config_rollback$;

CREATE FUNCTION public.p09_flag_list(session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
  scope_kind text, dealer_ids text[], location_ids text[])
RETURNS SETOF public.feature_flag_version LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p09_flag_list$
BEGIN
  PERFORM 1 FROM public.p09_authorized_binding(session_token_hash,'flags.read',actor_id,scope_kind,dealer_ids,location_ids);
  RETURN QUERY SELECT DISTINCT ON (v."flagKey") v.* FROM public.feature_flag_version v WHERE v."authorizationScopeKind"=scope_kind
    AND v."dealerIdsSnapshot"=dealer_ids AND v."locationIdsSnapshot"=location_ids AND v."contextRevision"=context_revision
    AND v."scopeFingerprint"=scope_fingerprint AND v."fieldVisibilityFingerprint"=field_visibility_fingerprint ORDER BY v."flagKey",v."version" DESC;
END
$p09_flag_list$;

CREATE FUNCTION public.p09_flag_propose(session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
  scope_kind text, dealer_ids text[], location_ids text[], flag_key text, desired_state text, expected_version integer,
  idempotency_hash text, request_hash text, request_id text)
RETURNS SETOF public.feature_flag_version LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p09_flag_propose$
DECLARE latest public.feature_flag_version%ROWTYPE; replay public.feature_flag_version%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.p09_authorized_binding(session_token_hash,'flags.manage',actor_id,scope_kind,dealer_ids,location_ids);
  IF current_database()!~*'(test|smoke|disposable)' OR flag_key<>'foundation.runtime.sample_flag' OR desired_state NOT IN ('disabled','internal','read_only','limited','enabled') THEN RAISE EXCEPTION 'P09_REQUEST_INVALID'; END IF;
  SELECT * INTO replay FROM public.feature_flag_version v WHERE v."createdBy"=actor_id AND v."flagKey"=flag_key AND v."authorizationScopeKind"=scope_kind AND v."dealerIdsSnapshot"=dealer_ids AND v."locationIdsSnapshot"=location_ids AND v."idempotencyKeyHash"=idempotency_hash;
  IF FOUND THEN IF replay."requestHash"<>request_hash THEN RAISE EXCEPTION 'P09_IDEMPOTENCY_CONFLICT'; END IF; RETURN NEXT replay; RETURN; END IF;
  SELECT * INTO latest FROM public.feature_flag_version v WHERE v."flagKey"=flag_key AND v."authorizationScopeKind"=scope_kind AND v."dealerIdsSnapshot"=dealer_ids AND v."locationIdsSnapshot"=location_ids ORDER BY v."version" DESC LIMIT 1 FOR UPDATE;
  IF COALESCE(latest."version",0)<>expected_version THEN RAISE EXCEPTION 'P09_VERSION_CONFLICT'; END IF;
  INSERT INTO public.feature_flag_version("flagKey","schemaVersion","authorizationScopeKind","dealerIdsSnapshot","locationIdsSnapshot","contextRevision","scopeFingerprint","fieldVisibilityFingerprint","desiredState","effectiveState","validationStatus","activationStatus","version","generation","createdBy","idempotencyKeyHash","requestHash")
  VALUES(flag_key,'feature-flag-schema.v1',scope_kind,dealer_ids,location_ids,context_revision,scope_fingerprint,field_visibility_fingerprint,desired_state,latest."effectiveState",'validated','draft',expected_version+1,COALESCE(latest."generation",0),actor_id,idempotency_hash,request_hash) RETURNING * INTO latest;
  PERFORM public.p09_write_audit(actor_id,'flags.manage',scope_kind,dealer_ids,location_ids,context_revision,'feature_flag',flag_key,'succeeded','completed',request_id,pg_catalog.jsonb_build_object('schemaVersion','audit-metadata.v1','entries',pg_catalog.jsonb_build_object('version',expected_version+1,'desiredState',desired_state)));
  RETURN NEXT latest;
END
$p09_flag_propose$;

CREATE FUNCTION public.p09_flag_activate(session_token_hash text, actor_id text, context_revision text, scope_fingerprint text, field_visibility_fingerprint text,
  scope_kind text, dealer_ids text[], location_ids text[], flag_key text, expected_version integer, kill_switch boolean, confirmation text,
  request_id text)
RETURNS SETOF public.feature_flag_version LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $p09_flag_activate$
DECLARE latest public.feature_flag_version%ROWTYPE; permission_key text;
BEGIN
  permission_key:=CASE WHEN kill_switch THEN 'flags.kill_switch' ELSE 'flags.manage' END;
  PERFORM 1 FROM public.p09_authorized_binding(session_token_hash,permission_key,actor_id,scope_kind,dealer_ids,location_ids);
  IF current_database()!~*'(test|smoke|disposable)' OR flag_key<>'foundation.runtime.sample_flag' OR (kill_switch AND confirmation<>'KILL') THEN RAISE EXCEPTION 'P09_REQUEST_INVALID'; END IF;
  SELECT * INTO latest FROM public.feature_flag_version v WHERE v."flagKey"=flag_key AND v."authorizationScopeKind"=scope_kind AND v."dealerIdsSnapshot"=dealer_ids AND v."locationIdsSnapshot"=location_ids ORDER BY v."version" DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR latest."version"<>expected_version OR latest."contextRevision"<>context_revision OR latest."scopeFingerprint"<>scope_fingerprint OR latest."fieldVisibilityFingerprint"<>field_visibility_fingerprint OR latest."activationStatus"<>'draft' THEN RAISE EXCEPTION 'P09_VERSION_CONFLICT'; END IF;
  UPDATE public.feature_flag_version SET "desiredState"=CASE WHEN kill_switch THEN 'killed' ELSE "desiredState" END,"effectiveState"=CASE WHEN kill_switch THEN 'killed' ELSE "desiredState" END,"activationStatus"='active',"generation"="generation"+1,"activatedAt"=CURRENT_TIMESTAMP WHERE "id"=latest."id" RETURNING * INTO latest;
  PERFORM public.p09_write_audit(actor_id,permission_key,scope_kind,dealer_ids,location_ids,context_revision,'feature_flag',flag_key,'succeeded','completed',request_id,pg_catalog.jsonb_build_object('schemaVersion','audit-metadata.v1','entries',pg_catalog.jsonb_build_object('version',expected_version,'effectiveState',latest."effectiveState")));
  RETURN NEXT latest;
END
$p09_flag_activate$;

REVOKE CREATE ON SCHEMA public FROM vanstro_p09_guard_owner;
REVOKE ALL ON FUNCTION public.p09_authorized_binding(text,text,text,text,text[],text[]), public.p09_validate_config(text,jsonb,text),
 public.p09_write_audit(text,text,text,text[],text[],text,text,text,text,text,text,jsonb) FROM PUBLIC, vanstro_runtime;
REVOKE ALL ON FUNCTION public.p09_config_list(text,text,text,text,text,text,text[],text[]),
 public.p09_config_propose(text,text,text,text,text,text,text[],text[],text,text,jsonb,integer,text,text,text),
 public.p09_config_activate(text,text,text,text,text,text,text[],text[],text,integer,text,text,text,boolean),
 public.p09_config_rollback(text,text,text,text,text,text,text[],text[],text,integer,integer,text,text,text),
 public.p09_flag_list(text,text,text,text,text,text,text[],text[]),
 public.p09_flag_propose(text,text,text,text,text,text,text[],text[],text,text,integer,text,text,text),
 public.p09_flag_activate(text,text,text,text,text,text,text[],text[],text,integer,boolean,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.p09_config_list(text,text,text,text,text,text,text[],text[]),
 public.p09_config_propose(text,text,text,text,text,text,text[],text[],text,text,jsonb,integer,text,text,text),
 public.p09_config_activate(text,text,text,text,text,text,text[],text[],text,integer,text,text,text,boolean),
 public.p09_config_rollback(text,text,text,text,text,text,text[],text[],text,integer,integer,text,text,text),
 public.p09_flag_list(text,text,text,text,text,text,text[],text[]),
 public.p09_flag_propose(text,text,text,text,text,text,text[],text[],text,text,integer,text,text,text),
 public.p09_flag_activate(text,text,text,text,text,text,text[],text[],text,integer,boolean,text,text) TO vanstro_runtime;
RESET ROLE;

DO $p09_assert$
BEGIN
  IF has_table_privilege('vanstro_runtime','public.runtime_config_version','SELECT') OR has_table_privilege('vanstro_runtime','public.runtime_config_version','INSERT')
    OR has_table_privilege('vanstro_runtime','public.runtime_config_version','UPDATE') OR has_table_privilege('vanstro_runtime','public.runtime_config_version','DELETE')
    OR has_table_privilege('vanstro_runtime','public.feature_flag_version','SELECT') OR has_table_privilege('vanstro_runtime','public.feature_flag_version','INSERT')
    OR has_table_privilege('vanstro_runtime','public.feature_flag_version','UPDATE') OR has_table_privilege('vanstro_runtime','public.feature_flag_version','DELETE') THEN
    RAISE EXCEPTION 'migration65 direct table boundary failed';
  END IF;
END
$p09_assert$;
