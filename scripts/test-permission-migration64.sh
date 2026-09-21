#!/usr/bin/env bash
set -euo pipefail
[[ "$(node -p 'process.versions.node.split(`.`)[0]')" == 22 ]] || { echo 'migration64 requires Node22' >&2; exit 1; }
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd); IMAGE='postgres:16-bookworm'; C="vanstro-p08-m64-$$"; T=$(mktemp -d "${TMPDIR:-/tmp}/vanstro-p08-m64.XXXXXX")
A=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))'); M=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))'); R=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')
cleanup(){ docker rm -f "$C" >/dev/null 2>&1||true; rm -rf "$T"; }; trap cleanup EXIT
docker run -d --name "$C" -e POSTGRES_PASSWORD="$A" -p 127.0.0.1::5432 "$IMAGE" >/dev/null
for _ in $(seq 1 60); do docker exec -e PGPASSWORD="$A" "$C" pg_isready -U postgres -d postgres >/dev/null 2>&1&&break; sleep 1; done
PORT=$(docker port "$C" 5432/tcp|sed 's/.*://'); pa(){ docker exec -i -e PGPASSWORD="$A" "$C" psql -X -v ON_ERROR_STOP=1 -U postgres "$@"; }
pa -d postgres <<SQL >/dev/null
CREATE ROLE vanstro_media_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p08_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '$M';
CREATE ROLE vanstro_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '$R';
GRANT vanstro_media_guard_owner,vanstro_p08_guard_owner TO vanstro_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
snap(){ local n=$1 count=$2; local d="$T/$n"; mkdir -p "$d/migrations"; cp "$ROOT/packages/db/prisma/schema.prisma" "$d/schema.prisma"; cp "$ROOT/packages/db/prisma/migrations/migration_lock.toml" "$d/migrations/"; find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d | LC_ALL=C sort | sed -n "1,${count}p" | while IFS= read -r migration; do cp -R "$migration" "$d/migrations/"; done; echo "$d/schema.prisma"; }
S55=$(snap s55 55); S62=$(snap s62 62); S63=$(snap s63 63)
prep(){ pa -d postgres -c "CREATE DATABASE \"$1\" OWNER vanstro_migrator" >/dev/null; }
dep(){ DATABASE_URL="postgresql://vanstro_migrator:$M@127.0.0.1:$PORT/$1" pnpm --dir "$ROOT/packages/db" exec prisma migrate deploy --schema "$2" >/dev/null; }
for d in fresh from55 from62 from63; do prep "m64_$d"; done
dep m64_fresh "$ROOT/packages/db/prisma/schema.prisma"; dep m64_from55 "$S55"; dep m64_from55 "$ROOT/packages/db/prisma/schema.prisma"; dep m64_from62 "$S62"; dep m64_from62 "$ROOT/packages/db/prisma/schema.prisma"; dep m64_from63 "$S63"
# Failure baseline: migration63 permits SELECT/INSERT/UPDATE, rejects DELETE.
pa -d m64_from63 <<'SQL' >/dev/null
DO $$ BEGIN
 IF NOT has_table_privilege('vanstro_runtime','public.dashboard_import_batch','SELECT') OR NOT has_table_privilege('vanstro_runtime','public.foundation_sample','INSERT') OR NOT has_table_privilege('vanstro_runtime','public.foundation_sample','UPDATE') OR has_table_privilege('vanstro_runtime','public.foundation_sample','DELETE') THEN RAISE EXCEPTION 'migration63 failure baseline missing'; END IF;
END $$;
SQL
dep m64_from63 "$ROOT/packages/db/prisma/schema.prisma"
negative(){ local db=$1; pa -d "$db" <<'SQL' >/dev/null
DO $$ DECLARE t text;v text; BEGIN
 FOREACH t IN ARRAY ARRAY['dashboard_import_batch','dashboard_import_row','dashboard_export_request','foundation_sample'] LOOP
  FOREACH v IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
   IF has_table_privilege('vanstro_runtime','public.'||t,v) OR has_table_privilege('public','public.'||t,v) THEN RAISE EXCEPTION 'direct privilege % %',t,v; END IF;
  END LOOP;
 END LOOP;
 IF has_schema_privilege('vanstro_runtime','public','CREATE') OR has_database_privilege('vanstro_runtime',current_database(),'CREATE') THEN RAISE EXCEPTION 'runtime create'; END IF;
 IF EXISTS(SELECT 1 FROM aclexplode((SELECT proacl FROM pg_proc WHERE oid='public.p08_import_detail(text,text,uuid,text,text,text,text)'::regprocedure)) acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'PUBLIC function privilege'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='public' AND p.proname LIKE 'p08_%' AND p.proname<>'p08_canonical_text_array' AND (r.rolname<>'vanstro_p08_guard_owner' OR NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'])) THEN RAISE EXCEPTION 'owner/security/search_path'; END IF;
END $$;
SQL
}
for d in m64_fresh m64_from55 m64_from62 m64_from63; do negative "$d"; done
# Real runtime direct SQL must fail for all 4x4 verbs.
for table in dashboard_import_batch dashboard_import_row dashboard_export_request foundation_sample; do
 for sql in "SELECT * FROM public.$table LIMIT 1" "INSERT INTO public.$table DEFAULT VALUES" "UPDATE public.$table SET \"version\"=0 WHERE false" "DELETE FROM public.$table WHERE false"; do
  if PGPASSWORD="$R" psql -X -v ON_ERROR_STOP=1 "postgresql://vanstro_runtime:$R@127.0.0.1:$PORT/m64_fresh" -c "$sql" >/dev/null 2>&1; then echo "direct SQL unexpectedly succeeded: $table $sql" >&2; exit 1; fi
 done
done
# Controlled adapter positive matrix with database-resolved session/RBAC authority.
pa -d m64_fresh <<'SQL' >/dev/null
DO $$
DECLARE actor text:='p08-actor'; role_id text:='p08-role'; session_hash text:=repeat('a',64); import_id uuid:=gen_random_uuid(); export_id uuid:=gen_random_uuid(); export_job uuid:=gen_random_uuid(); commit_job uuid:=gen_random_uuid(); artifact_id uuid:=gen_random_uuid(); result record;
BEGIN
 INSERT INTO users(id,email,kind,status,"updatedAt") VALUES(actor,'p08@example.invalid','admin','active',CURRENT_TIMESTAMP);
 INSERT INTO roles(id,key,name,"isSystem","updatedAt") VALUES(role_id,'p08_conformance','P08 Conformance',false,CURRENT_TIMESTAMP);
 INSERT INTO user_roles(id,"userId","roleId") VALUES(gen_random_uuid()::text,actor,role_id);
 INSERT INTO role_permissions(id,"roleId","permissionId") SELECT gen_random_uuid()::text,role_id,id FROM permissions WHERE key LIKE 'dashboard.%foundation_sample.%';
 INSERT INTO refresh_sessions(id,"userId","tokenHash","expiresAt") VALUES('p08-session',actor,session_hash,CURRENT_TIMESTAMP+interval '1 hour');
 INSERT INTO async_jobs("id","contractVersion","schemaVersion","jobType","jobTypeVersion","payloadSchemaVersion","resultSchemaVersion","status","createdByActorType","createdByActorId","effectiveRoles","permissionGrants","authorizationScopeKind","dealerIds","locationIds","contextRevision","payload","payloadIdentityHash","progressKind","progressStage","progressUpdatedAt","maxAttempts","maxRetryGenerations","requestId","retentionClass","retentionPolicyVersion","expiresAt","updatedAt") VALUES(export_job,'async-job.v1','async-job-schema.v1','dashboard.export.generate','dashboard.export.generate.v1','dashboard-export-generate-input.v1','dashboard-export-generate-result.v1','queued','admin_user',actor,'[]','[]','global','[]','[]','ctx','{}','x','current_total','queued',CURRENT_TIMESTAMP,1,0,'p08-export','default','v1',CURRENT_TIMESTAMP+interval '1 day',CURRENT_TIMESTAMP);
 PERFORM * FROM p08_create_import(session_hash,actor,'ctx',repeat('b',64),repeat('c',64),'global',ARRAY[]::text[],ARRAY[]::text[],import_id,'sample.csv','text/csv',100,repeat('d',64),CURRENT_TIMESTAMP+interval '5 minutes',repeat('e',64),'r','s','p','sp');
 PERFORM * FROM p08_import_detail(session_hash,'dashboard.import.foundation_sample.read',import_id,actor,'ctx',repeat('b',64),repeat('c',64));
 PERFORM * FROM p08_create_export(session_hash,actor,'ctx',repeat('b',64),repeat('c',64),'global',ARRAY[]::text[],ARRAY[]::text[],export_id,'{}',export_job);
 PERFORM * FROM p08_export_detail(session_hash,'dashboard.export.foundation_sample.read',export_id,actor,'ctx',repeat('b',64),repeat('c',64));
 PERFORM * FROM p08_transition_export(session_hash,'dashboard.export.foundation_sample.create',export_id,actor,'ctx',repeat('b',64),repeat('c',64),0,'cancel','cancelled');
END $$;
SQL
# Shadow/create/function attacks.
if PGPASSWORD="$R" psql -X -v ON_ERROR_STOP=1 "postgresql://vanstro_runtime:$R@127.0.0.1:$PORT/m64_fresh" -c 'CREATE FUNCTION public.p08_import_detail() RETURNS int LANGUAGE sql AS $$SELECT 1$$' >/dev/null 2>&1; then exit 1; fi
if PGPASSWORD="$R" psql -X -v ON_ERROR_STOP=1 "postgresql://vanstro_runtime:$R@127.0.0.1:$PORT/m64_fresh" -c "SELECT public.p08_authorized_binding('a','b','c','global',ARRAY[]::text[],ARRAY[]::text[])" >/dev/null 2>&1; then exit 1; fi
printf 'migration64 PG16 0->64,55->64,62->64,63->64; m63 fail baseline; 4x4 denial; owner/function/shadow matrix passed\n'
