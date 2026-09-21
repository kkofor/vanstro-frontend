#!/usr/bin/env bash
set -euo pipefail
if [[ "$(node -p 'process.versions.node.split(`.`)[0]')" != "22" ]]; then printf 'v1 migration72 harness requires Node 22\n' >&2; exit 1; fi
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
IMAGE=${VANSTRO_TEST_POSTGRES_IMAGE:-postgres:16-bookworm}
CONTAINER="vanstro-v1-m72-${$}"
PASSWORD=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
MIGRATOR_PASSWORD=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')
cleanup(){ docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$PASSWORD" -p 127.0.0.1::5432 "$IMAGE" >/dev/null
for _ in $(seq 1 60); do docker exec -e PGPASSWORD="$PASSWORD" "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
PORT=$(docker port "$CONTAINER" 5432/tcp | sed 's/.*://')
docker exec -i -e PGPASSWORD="$PASSWORD" -e MIGRATOR_PASSWORD="$MIGRATOR_PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres <<SQL >/dev/null
CREATE ROLE vanstro_media_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p08_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p09_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_dsar_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p04_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p02_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '$MIGRATOR_PASSWORD';
CREATE ROLE vanstro_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_worker_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT vanstro_media_guard_owner,vanstro_p08_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner,vanstro_p10_dsar_guard_owner,vanstro_p04_guard_owner,vanstro_p02_guard_owner TO vanstro_migrator;
CREATE DATABASE vanstro_v1_m72_test OWNER vanstro_migrator;
SQL
URL="postgresql://vanstro_migrator:${MIGRATOR_PASSWORD}@127.0.0.1:${PORT}/vanstro_v1_m72_test"
ADMIN_URL="postgresql://postgres:${PASSWORD}@127.0.0.1:${PORT}/vanstro_v1_m72_test"
# Prisma materializes the current model; committed migration69-71 compatibility objects are then supplied explicitly.
DATABASE_URL="$ADMIN_URL" pnpm --dir "$ROOT/packages/db" exec prisma db push --schema prisma/schema.prisma --skip-generate >/dev/null
docker exec -i -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d vanstro_v1_m72_test <<'SQL' >/dev/null
ALTER SCHEMA public OWNER TO vanstro_migrator;
GRANT USAGE,CREATE ON SCHEMA public TO vanstro_migrator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO vanstro_migrator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO vanstro_migrator;
GRANT USAGE ON SCHEMA public TO vanstro_runtime,vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p10_guard_owner;
GRANT SELECT ON refresh_sessions,users,user_roles,roles,role_permissions,permissions,dealer_memberships,dealer_membership_roles,dealer_membership_locations,dealers,dealer_locations TO vanstro_p02_guard_owner;
GRANT SELECT,UPDATE ON password_reset_tokens,password_credentials,refresh_sessions,users,dealer_memberships TO vanstro_p02_guard_owner;
GRANT INSERT ON users,customer_profiles,password_credentials,password_reset_tokens,refresh_sessions TO vanstro_p02_guard_owner;
GRANT SELECT,INSERT ON audit_events TO vanstro_p04_guard_owner;
GRANT SELECT ON privacy_consent_events TO vanstro_p10_guard_owner;
SQL
DATABASE_URL="$ADMIN_URL" VANSTRO_RUNTIME_MODE=test ALLOW_DEMO_SEED=true SUPER_ADMIN_EMAIL=admin@vanstro.test SUPER_ADMIN_PASSWORD="T-${PASSWORD}" pnpm --dir "$ROOT/packages/db" db:seed >/dev/null
docker exec -i -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d vanstro_v1_m72_test < "$ROOT/packages/db/prisma/migrations/20260804130000_f1_v15_runtime_acl_closure/migration.sql" >/dev/null
# Prove the normal runtime can invoke every required family without granting table access here.
docker exec -i -e PGPASSWORD="$PASSWORD" "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d vanstro_v1_m72_test -Atq <<'SQL' | grep -qx ok
SELECT CASE WHEN
 has_function_privilege('vanstro_runtime','public.auth_session_projection_v1(text)','EXECUTE')
 AND has_function_privilege('vanstro_runtime','public.p02_dashboard_authorization_context_v1(text,text)','EXECUTE')
 AND has_function_privilege('vanstro_runtime','public.p04_append_audit_event_v1(text,text,jsonb)','EXECUTE')
 AND has_function_privilege('vanstro_runtime','public.p05_api_retry_v1(text,text,uuid,integer)','EXECUTE')
 AND has_function_privilege('vanstro_runtime','public.p06_api_mutate_item_v1(text,text,uuid,integer,text,text,text,text[])','EXECUTE')
 AND has_function_privilege('vanstro_runtime','public.p07_api_retry_media_job_v1(text,text,uuid,uuid,integer,integer,jsonb,integer,text)','EXECUTE')
 AND has_function_privilege('vanstro_runtime','public.p10_has_anonymous_analytics_consent_v1(text)','EXECUTE')
 THEN 'ok' ELSE 'bad' END;
SQL
printf 'v1 functional migration72 PostgreSQL16 gate passed\n'
