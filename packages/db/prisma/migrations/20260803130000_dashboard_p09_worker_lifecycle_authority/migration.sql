-- P09/P05 Worker lifecycle authority. Forward-only; migrations 1-65 remain immutable.
ALTER TABLE public.worker_heartbeats
  ADD COLUMN "lifecycleState" text,
  ADD COLUMN "claimEnabled" boolean,
  ADD COLUMN "declaredCapacity" integer,
  ADD COLUMN "effectiveCapacity" integer,
  ADD COLUMN "supportedJobTypes" text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN "registryVersion" text,
  ADD COLUMN "registryFingerprint" text,
  ADD COLUMN "generation" bigint,
  ADD COLUMN "lifecycleVersion" integer,
  ADD COLUMN "startedObservedAt" timestamptz(3),
  ADD COLUMN "heartbeatObservedAt" timestamptz(3),
  ADD COLUMN "drainingStartedAt" timestamptz(3),
  ADD COLUMN "shutdownObservedAt" timestamptz(3),
  ADD CONSTRAINT worker_heartbeat_lifecycle_state_check CHECK ("lifecycleState" IS NULL OR "lifecycleState" IN ('active','draining','shutdown')),
  ADD CONSTRAINT worker_heartbeat_capacity_check CHECK (("declaredCapacity" IS NULL AND "effectiveCapacity" IS NULL) OR ("declaredCapacity" BETWEEN 0 AND 1024 AND "effectiveCapacity" BETWEEN 0 AND "declaredCapacity")),
  ADD CONSTRAINT worker_heartbeat_generation_check CHECK (("generation" IS NULL AND "lifecycleVersion" IS NULL) OR ("generation">0 AND "lifecycleVersion">=0)),
  ADD CONSTRAINT worker_heartbeat_registry_check CHECK (("registryVersion" IS NULL AND "registryFingerprint" IS NULL) OR ("registryVersion"='async-job-registry.v1' AND "registryFingerprint"~'^[0-9a-f]{64}$')),
  ADD CONSTRAINT worker_heartbeat_authority_complete_check CHECK (
    ("lifecycleState" IS NULL AND "claimEnabled" IS NULL AND "declaredCapacity" IS NULL AND "effectiveCapacity" IS NULL AND "generation" IS NULL AND "lifecycleVersion" IS NULL AND "registryVersion" IS NULL AND "registryFingerprint" IS NULL AND "startedObservedAt" IS NULL AND "heartbeatObservedAt" IS NULL AND "drainingStartedAt" IS NULL AND "shutdownObservedAt" IS NULL)
    OR
    ("lifecycleState" IS NOT NULL AND "claimEnabled" IS NOT NULL AND "declaredCapacity" IS NOT NULL AND "effectiveCapacity" IS NOT NULL AND "generation" IS NOT NULL AND "lifecycleVersion" IS NOT NULL AND "registryVersion" IS NOT NULL AND "registryFingerprint" IS NOT NULL AND "startedObservedAt" IS NOT NULL AND "heartbeatObservedAt" IS NOT NULL)
  ),
  ADD CONSTRAINT worker_heartbeat_lifecycle_consistency_check CHECK (
    "lifecycleState" IS NULL OR
    ("lifecycleState"='active' AND "claimEnabled" AND "effectiveCapacity">=0 AND "drainingStartedAt" IS NULL AND "shutdownObservedAt" IS NULL) OR
    ("lifecycleState"='draining' AND NOT "claimEnabled" AND "effectiveCapacity"=0 AND "drainingStartedAt" IS NOT NULL AND "shutdownObservedAt" IS NULL) OR
    ("lifecycleState"='shutdown' AND NOT "claimEnabled" AND "effectiveCapacity"=0 AND "drainingStartedAt" IS NOT NULL AND "shutdownObservedAt" IS NOT NULL)
  ),
  ADD CONSTRAINT worker_heartbeat_job_types_check CHECK (array_position("supportedJobTypes",NULL) IS NULL AND cardinality("supportedJobTypes")<=32),
  ADD CONSTRAINT worker_heartbeat_timestamps_check CHECK ("heartbeatObservedAt" IS NULL OR ("heartbeatObservedAt">="startedObservedAt" AND ("drainingStartedAt" IS NULL OR "drainingStartedAt">="startedObservedAt") AND ("shutdownObservedAt" IS NULL OR "shutdownObservedAt">="drainingStartedAt")));

-- Existing and rolling old-writer rows remain NULL authority and contribute no capacity until a new Worker registers.
CREATE INDEX worker_heartbeats_lifecycle_freshness_idx ON public.worker_heartbeats ("lifecycleState","heartbeatObservedAt" DESC) WHERE "lifecycleState" IS NOT NULL;

REVOKE ALL ON TABLE public.worker_heartbeats FROM PUBLIC, vanstro_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE public.worker_heartbeats TO vanstro_p09_guard_owner;
SET ROLE vanstro_p09_guard_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE FUNCTION public.p09_worker_startup(instance_id text, registry_version text, registry_fingerprint text, supported_job_types text[], declared_capacity integer, observed_at timestamptz)
RETURNS TABLE(instance_id_out text,generation_out bigint,lifecycle_version_out integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $fn$
DECLARE current_row public.worker_heartbeats%ROWTYPE; next_generation bigint;
BEGIN
 IF current_user<>'vanstro_p09_guard_owner' OR instance_id!~'^[A-Za-z0-9._:-]{8,128}$' OR registry_version<>'async-job-registry.v1' OR registry_fingerprint!~'^[0-9a-f]{64}$'
   OR supported_job_types IS NULL OR cardinality(supported_job_types)<1 OR cardinality(supported_job_types)>32 OR array_position(supported_job_types,NULL) IS NOT NULL
   OR EXISTS(SELECT 1 FROM unnest(supported_job_types) j WHERE j NOT IN ('foundation.probe','media.process','media.cleanup','dashboard.import.parse','dashboard.import.commit','dashboard.export.generate','dashboard.artifact.expire'))
   OR declared_capacity<0 OR declared_capacity>1024 OR observed_at IS NULL OR observed_at>CURRENT_TIMESTAMP+interval '5 seconds' OR observed_at<CURRENT_TIMESTAMP-interval '5 minutes' THEN RAISE EXCEPTION 'P09_WORKER_AUTHORITY_INVALID'; END IF;
 SELECT * INTO current_row FROM public.worker_heartbeats WHERE key=instance_id FOR UPDATE;
 next_generation:=COALESCE(current_row."generation",0)+1;
 INSERT INTO public.worker_heartbeats(key,"instanceId","lastStartedAt","lifecycleState","claimEnabled","declaredCapacity","effectiveCapacity","supportedJobTypes","registryVersion","registryFingerprint","generation","lifecycleVersion","startedObservedAt","heartbeatObservedAt","drainingStartedAt","shutdownObservedAt","updatedAt")
 VALUES(instance_id,instance_id,observed_at,'active',true,declared_capacity,declared_capacity,(SELECT array_agg(DISTINCT x ORDER BY x) FROM unnest(supported_job_types)x),registry_version,registry_fingerprint,next_generation,0,observed_at,observed_at,NULL,NULL,CURRENT_TIMESTAMP)
 ON CONFLICT(key) DO UPDATE SET "instanceId"=EXCLUDED."instanceId","lastStartedAt"=EXCLUDED."lastStartedAt","lifecycleState"='active',"claimEnabled"=true,"declaredCapacity"=EXCLUDED."declaredCapacity","effectiveCapacity"=EXCLUDED."effectiveCapacity","supportedJobTypes"=EXCLUDED."supportedJobTypes","registryVersion"=EXCLUDED."registryVersion","registryFingerprint"=EXCLUDED."registryFingerprint","generation"=next_generation,"lifecycleVersion"=0,"startedObservedAt"=EXCLUDED."startedObservedAt","heartbeatObservedAt"=EXCLUDED."heartbeatObservedAt","drainingStartedAt"=NULL,"shutdownObservedAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP;
 RETURN QUERY SELECT instance_id,next_generation,0;
END $fn$;

CREATE FUNCTION public.p09_worker_heartbeat(instance_id text, expected_generation bigint, expected_version integer, effective_capacity integer, observed_at timestamptz)
RETURNS TABLE(generation_out bigint,lifecycle_version_out integer,lifecycle_state_out text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $fn$
DECLARE row public.worker_heartbeats%ROWTYPE;
BEGIN
 SELECT * INTO row FROM public.worker_heartbeats WHERE key=instance_id FOR UPDATE;
 IF NOT FOUND OR row."instanceId"<>instance_id OR row."generation"<>expected_generation OR row."lifecycleVersion"<>expected_version OR row."lifecycleState"<>'active'
   OR effective_capacity<0 OR effective_capacity>row."declaredCapacity" OR observed_at<row."heartbeatObservedAt" OR observed_at>CURRENT_TIMESTAMP+interval '5 seconds' THEN RAISE EXCEPTION 'P09_WORKER_AUTHORITY_STALE'; END IF;
 UPDATE public.worker_heartbeats SET "effectiveCapacity"=effective_capacity,"heartbeatObservedAt"=observed_at,"lifecycleVersion"="lifecycleVersion"+1,"lastSucceededAt"=observed_at,"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE key=instance_id RETURNING * INTO row;
 RETURN QUERY SELECT row."generation",row."lifecycleVersion",row."lifecycleState";
END $fn$;

CREATE FUNCTION public.p09_worker_transition(instance_id text, expected_generation bigint, expected_version integer, target_state text, observed_at timestamptz)
RETURNS TABLE(generation_out bigint,lifecycle_version_out integer,lifecycle_state_out text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $fn$
DECLARE row public.worker_heartbeats%ROWTYPE;
BEGIN
 SELECT * INTO row FROM public.worker_heartbeats WHERE key=instance_id FOR UPDATE;
 IF NOT FOUND OR row."instanceId"<>instance_id OR row."generation"<>expected_generation OR row."lifecycleVersion"<>expected_version OR observed_at<row."heartbeatObservedAt" OR observed_at>CURRENT_TIMESTAMP+interval '5 seconds'
   OR NOT ((row."lifecycleState"='active' AND target_state='draining') OR (row."lifecycleState"='draining' AND target_state='shutdown')) THEN RAISE EXCEPTION 'P09_WORKER_TRANSITION_INVALID'; END IF;
 UPDATE public.worker_heartbeats SET "lifecycleState"=target_state,"claimEnabled"=false,"effectiveCapacity"=0,"heartbeatObservedAt"=observed_at,"drainingStartedAt"=CASE WHEN target_state='draining' THEN observed_at ELSE "drainingStartedAt" END,"shutdownObservedAt"=CASE WHEN target_state='shutdown' THEN observed_at ELSE NULL END,"lifecycleVersion"="lifecycleVersion"+1,"updatedAt"=CURRENT_TIMESTAMP WHERE key=instance_id RETURNING * INTO row;
 RETURN QUERY SELECT row."generation",row."lifecycleVersion",row."lifecycleState";
END $fn$;

REVOKE CREATE ON SCHEMA public FROM vanstro_p09_guard_owner;
REVOKE ALL ON FUNCTION public.p09_worker_startup(text,text,text,text[],integer,timestamptz),public.p09_worker_heartbeat(text,bigint,integer,integer,timestamptz),public.p09_worker_transition(text,bigint,integer,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.p09_worker_startup(text,text,text,text[],integer,timestamptz),public.p09_worker_heartbeat(text,bigint,integer,integer,timestamptz),public.p09_worker_transition(text,bigint,integer,text,timestamptz) TO vanstro_runtime;
RESET ROLE;
