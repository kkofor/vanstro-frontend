BEGIN;

ALTER TABLE public.audit_events
  DROP CONSTRAINT audit_events_resource_type_check;
ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_resource_type_check CHECK ("resourceType" IN (
    'user','role','permission','dealer','dealer_location','membership','product','category',
    'inventory','price','promotion','order','shipment','checkout_session','payment_session',
    'refund','customer','content','review','lead','support','email','erp_job','runtime_config',
    'feature_flag','audit_event','async_job','job_artifact','work_queue_item','in_app_notification',
    'work_queue_source_state','media_asset','media_variant','media_usage','media_upload_intent',
    'media_storage_operation','analytics_event','analytics_release','privacy_consent'
  ));

CREATE OR REPLACE FUNCTION public.p09_worker_observation_v3()
RETURNS TABLE(
  active_count bigint,
  draining_count bigint,
  shutdown_count bigint,
  stale_count bigint,
  total_capacity bigint,
  latest_succeeded_at timestamptz,
  latest_failed_at timestamptz,
  latest_error_code text,
  observed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $worker_observation$
DECLARE
  readiness record;
  active bigint;
  draining bigint;
  shutdown bigint;
  stale bigint;
  capacity bigint;
  succeeded_at timestamptz;
  failed_at timestamptz;
  error_code text;
BEGIN
  SELECT * INTO readiness
  FROM public.p09_observe_readiness_internal_v2();

  SELECT
    count(*) FILTER (
      WHERE heartbeat."heartbeatObservedAt" > readiness.observed_at - interval '2 minutes'
        AND heartbeat."registryVersion" = 'async-job-registry.v1'
        AND heartbeat."registryFingerprint" = 'b895534656015eaaf3e7a76ed76a9fb9ba4ee73dbb46457ac6dadadd19650f6a'
        AND heartbeat."supportedJobTypes" = ARRAY['dashboard.artifact.expire','dashboard.export.generate','dashboard.import.commit','dashboard.import.parse','foundation.probe','media.cleanup','media.process']
        AND heartbeat."lifecycleState" = 'active'
        AND heartbeat."claimEnabled"
    ),
    count(*) FILTER (
      WHERE heartbeat."heartbeatObservedAt" > readiness.observed_at - interval '2 minutes'
        AND heartbeat."registryVersion" = 'async-job-registry.v1'
        AND heartbeat."registryFingerprint" = 'b895534656015eaaf3e7a76ed76a9fb9ba4ee73dbb46457ac6dadadd19650f6a'
        AND heartbeat."supportedJobTypes" = ARRAY['dashboard.artifact.expire','dashboard.export.generate','dashboard.import.commit','dashboard.import.parse','foundation.probe','media.cleanup','media.process']
        AND heartbeat."lifecycleState" = 'draining'
    ),
    count(*) FILTER (
      WHERE heartbeat."heartbeatObservedAt" > readiness.observed_at - interval '2 minutes'
        AND heartbeat."registryVersion" = 'async-job-registry.v1'
        AND heartbeat."registryFingerprint" = 'b895534656015eaaf3e7a76ed76a9fb9ba4ee73dbb46457ac6dadadd19650f6a'
        AND heartbeat."supportedJobTypes" = ARRAY['dashboard.artifact.expire','dashboard.export.generate','dashboard.import.commit','dashboard.import.parse','foundation.probe','media.cleanup','media.process']
        AND heartbeat."lifecycleState" = 'shutdown'
    ),
    count(*) FILTER (
      WHERE heartbeat."heartbeatObservedAt" <= readiness.observed_at - interval '2 minutes'
        AND heartbeat."registryVersion" = 'async-job-registry.v1'
        AND heartbeat."registryFingerprint" = 'b895534656015eaaf3e7a76ed76a9fb9ba4ee73dbb46457ac6dadadd19650f6a'
        AND heartbeat."supportedJobTypes" = ARRAY['dashboard.artifact.expire','dashboard.export.generate','dashboard.import.commit','dashboard.import.parse','foundation.probe','media.cleanup','media.process']
        AND heartbeat."lifecycleState" <> 'shutdown'
    ),
    COALESCE(sum(heartbeat."effectiveCapacity") FILTER (
      WHERE heartbeat."heartbeatObservedAt" > readiness.observed_at - interval '2 minutes'
        AND heartbeat."registryVersion" = 'async-job-registry.v1'
        AND heartbeat."registryFingerprint" = 'b895534656015eaaf3e7a76ed76a9fb9ba4ee73dbb46457ac6dadadd19650f6a'
        AND heartbeat."supportedJobTypes" = ARRAY['dashboard.artifact.expire','dashboard.export.generate','dashboard.import.commit','dashboard.import.parse','foundation.probe','media.cleanup','media.process']
        AND heartbeat."lifecycleState" = 'active'
        AND heartbeat."claimEnabled"
    ), 0),
    max(heartbeat."lastSucceededAt") FILTER (
      WHERE heartbeat."heartbeatObservedAt" > readiness.observed_at - interval '2 minutes'
        AND heartbeat."registryVersion" = 'async-job-registry.v1'
        AND heartbeat."registryFingerprint" = 'b895534656015eaaf3e7a76ed76a9fb9ba4ee73dbb46457ac6dadadd19650f6a'
        AND heartbeat."supportedJobTypes" = ARRAY['dashboard.artifact.expire','dashboard.export.generate','dashboard.import.commit','dashboard.import.parse','foundation.probe','media.cleanup','media.process']
    ),
    max(heartbeat."lastFailedAt") FILTER (
      WHERE heartbeat."heartbeatObservedAt" > readiness.observed_at - interval '2 minutes'
        AND heartbeat."registryVersion" = 'async-job-registry.v1'
        AND heartbeat."registryFingerprint" = 'b895534656015eaaf3e7a76ed76a9fb9ba4ee73dbb46457ac6dadadd19650f6a'
        AND heartbeat."supportedJobTypes" = ARRAY['dashboard.artifact.expire','dashboard.export.generate','dashboard.import.commit','dashboard.import.parse','foundation.probe','media.cleanup','media.process']
    ),
    CASE WHEN bool_or(heartbeat."lastError" IS NOT NULL) FILTER (
      WHERE heartbeat."heartbeatObservedAt" > readiness.observed_at - interval '2 minutes'
        AND heartbeat."registryVersion" = 'async-job-registry.v1'
        AND heartbeat."registryFingerprint" = 'b895534656015eaaf3e7a76ed76a9fb9ba4ee73dbb46457ac6dadadd19650f6a'
        AND heartbeat."supportedJobTypes" = ARRAY['dashboard.artifact.expire','dashboard.export.generate','dashboard.import.commit','dashboard.import.parse','foundation.probe','media.cleanup','media.process']
    ) THEN 'worker_error' END
  INTO active, draining, shutdown, stale, capacity, succeeded_at, failed_at, error_code
  FROM public.worker_heartbeats AS heartbeat
  WHERE heartbeat."lifecycleState" IS NOT NULL;

  RETURN QUERY SELECT
    active,
    draining,
    shutdown,
    stale,
    capacity,
    succeeded_at,
    failed_at,
    error_code,
    readiness.observed_at;
END;
$worker_observation$;

GRANT SELECT ON TABLE public.worker_heartbeats TO vanstro_p09_guard_owner;
ALTER FUNCTION public.p09_worker_observation_v3() OWNER TO vanstro_p09_guard_owner;
SET ROLE vanstro_p09_guard_owner;
REVOKE ALL ON FUNCTION public.p09_worker_observation_v3() FROM PUBLIC, vanstro_runtime, vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.p09_worker_observation_v3() TO vanstro_runtime;
RESET ROLE;

DO $postassert$
BEGIN
  IF pg_get_userbyid((SELECT proowner FROM pg_proc WHERE oid = 'public.p09_worker_observation_v3()'::regprocedure)) <> 'vanstro_p09_guard_owner'
     OR EXISTS (
       SELECT 1 FROM pg_proc
       WHERE oid = 'public.p09_worker_observation_v3()'::regprocedure
         AND (NOT prosecdef OR proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[])
     ) THEN
    RAISE EXCEPTION 'P09_WORKER_OBSERVER_HARDENING_POSTASSERT';
  END IF;

  IF EXISTS (
       SELECT 1
       FROM pg_proc AS p
       CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS privilege
       WHERE p.oid = 'public.p09_worker_observation_v3()'::regprocedure
         AND privilege.grantee = 0
         AND privilege.privilege_type = 'EXECUTE'
     )
     OR NOT has_function_privilege('vanstro_runtime','public.p09_worker_observation_v3()','EXECUTE')
     OR has_function_privilege('vanstro_worker_runtime','public.p09_worker_observation_v3()','EXECUTE')
     OR NOT has_table_privilege('vanstro_p09_guard_owner','public.worker_heartbeats','SELECT')
     OR has_table_privilege('vanstro_runtime','public.worker_heartbeats','SELECT')
     OR has_table_privilege('vanstro_runtime','public.worker_heartbeats','INSERT')
     OR has_table_privilege('vanstro_runtime','public.worker_heartbeats','UPDATE')
     OR has_table_privilege('vanstro_runtime','public.worker_heartbeats','DELETE') THEN
    RAISE EXCEPTION 'P09_WORKER_OBSERVER_ACL_POSTASSERT';
  END IF;

  IF (SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'p09_worker_observation_v3') <> 1 THEN
    RAISE EXCEPTION 'P09_WORKER_OBSERVER_OVERLOAD_POSTASSERT';
  END IF;
END;
$postassert$;

COMMIT;
