CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE vanstro_media_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE UNIQUE INDEX IF NOT EXISTS audit_events_dedup_unique ON audit_events("eventVersion",source,"idempotencyKeyHash") WHERE "idempotencyKeyHash" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS async_jobs_jobType_idempotencyKeyHash_key ON async_jobs("jobType","idempotencyKeyHash") WHERE "idempotencyKeyHash" IS NOT NULL;
CREATE OR REPLACE FUNCTION public.auth_admin_revoke_user_sessions_v1(session_token_hash text,expected_actor_id text,target_user_id text) RETURNS bigint LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$ DECLARE context jsonb;n bigint;BEGIN context:=public.p02_dashboard_authorization_context_v1(session_token_hash,expected_actor_id);IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(context->'permissionGrants') g WHERE g->>'permissionKey'='sessions.revoke' AND (g->>'global')::boolean) THEN RAISE EXCEPTION 'AUTH_SESSION_REVOKE_DENIED' USING ERRCODE='42501';END IF;UPDATE public.refresh_sessions SET "revokedAt"=CURRENT_TIMESTAMP WHERE "userId"=target_user_id AND "revokedAt" IS NULL;GET DIAGNOSTICS n=ROW_COUNT;RETURN n;END $fn$;
CREATE FUNCTION public.p09_worker_observation_v3()
RETURNS TABLE(active_count bigint,draining_count bigint,shutdown_count bigint,stale_count bigint,total_capacity bigint,latest_succeeded_at timestamptz,latest_failed_at timestamptz,latest_error_code text,observed_at timestamptz)
LANGUAGE sql STABLE AS $$ SELECT 0::bigint,0::bigint,0::bigint,0::bigint,0::bigint,NULL::timestamptz,NULL::timestamptz,NULL::text,CURRENT_TIMESTAMP $$;
CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT vanstro_media_guard_owner TO vanstro_migrator;
CREATE ROLE vanstro_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_worker_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p02_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p04_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p09_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner;
GRANT SELECT ON refresh_sessions,users,user_roles,roles,role_permissions,permissions,dealer_memberships,dealer_membership_roles,dealer_membership_locations,dealers,dealer_locations TO vanstro_p02_guard_owner;
GRANT SELECT,INSERT ON audit_events TO vanstro_p04_guard_owner;
GRANT USAGE,CREATE ON SCHEMA public TO vanstro_p09_guard_owner;
GRANT SELECT,INSERT,UPDATE ON runtime_config_version,feature_flag_version TO vanstro_p09_guard_owner;
GRANT INSERT ON audit_events TO vanstro_p09_guard_owner;
GRANT SELECT ON privacy_consent_events TO vanstro_p10_guard_owner;
GRANT vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner TO vanstro_migrator;
