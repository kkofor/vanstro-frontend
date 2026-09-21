#!/usr/bin/env bash
set -euo pipefail
[[ "$(node -p 'process.versions.node.split(`.`)[0]')" == 22 ]] || { echo 'migration65 requires Node22' >&2; exit 1; }
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd); IMAGE=postgres:16-bookworm; C="vanstro-p09-m65-$$"; T=$(mktemp -d "${CLAUDE_JOB_DIR:-${TMPDIR:-/tmp}}/p09-m65.XXXXXX")
A=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))'); M=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))'); R=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("base64url"))')
cleanup(){ docker rm -f "$C" >/dev/null 2>&1||true; rm -rf "$T"; }; trap cleanup EXIT
docker run -d --name "$C" -e POSTGRES_PASSWORD="$A" -p 127.0.0.1::5432 "$IMAGE" >/dev/null
for _ in $(seq 1 60); do docker exec -e PGPASSWORD="$A" "$C" pg_isready -U postgres >/dev/null 2>&1&&break; sleep 1; done
PORT=$(docker port "$C" 5432/tcp|sed 's/.*://'); pa(){ docker exec -i -e PGPASSWORD="$A" "$C" psql -X -v ON_ERROR_STOP=1 -U postgres "$@"; }
pa -d postgres <<SQL >/dev/null
CREATE ROLE vanstro_media_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p08_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p09_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '$M';
CREATE ROLE vanstro_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '$R';
GRANT vanstro_media_guard_owner,vanstro_p08_guard_owner,vanstro_p09_guard_owner TO vanstro_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
snap(){ local name=$1 count=$2; local dir="$T/$name"; mkdir -p "$dir/migrations"; cp "$ROOT/packages/db/prisma/schema.prisma" "$dir/schema.prisma"; cp "$ROOT/packages/db/prisma/migrations/migration_lock.toml" "$dir/migrations/"; find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d | LC_ALL=C sort | sed -n "1,${count}p" | while read -r m; do cp -R "$m" "$dir/migrations/"; done; echo "$dir/schema.prisma"; }
S55=$(snap s55 55); S62=$(snap s62 62); S64=$(snap s64 64)
prep(){ pa -d postgres -c "CREATE DATABASE \"$1\" OWNER vanstro_migrator" >/dev/null; pa -d "$1" -c 'REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO vanstro_runtime' >/dev/null; }
dep(){ DATABASE_URL="postgresql://vanstro_migrator:$M@127.0.0.1:$PORT/$1" pnpm --dir "$ROOT/packages/db" exec prisma migrate deploy --schema "$2" >/dev/null; }
for db in p09_fresh_disposable p09_from55 p09_from62 p09_from64; do prep "$db"; done
dep p09_fresh_disposable "$ROOT/packages/db/prisma/schema.prisma"
dep p09_from55 "$S55"; dep p09_from55 "$ROOT/packages/db/prisma/schema.prisma"
dep p09_from62 "$S62"; dep p09_from62 "$ROOT/packages/db/prisma/schema.prisma"
dep p09_from64 "$S64"; dep p09_from64 "$ROOT/packages/db/prisma/schema.prisma"
verify(){ local db=$1 source=$2; pa -d "$db" -v source="$source" <<'SQL' >/dev/null
DO $$ DECLARE t text; v text; owner_name text; BEGIN
 FOREACH t IN ARRAY ARRAY['runtime_config_version','feature_flag_version'] LOOP
  FOREACH v IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
   IF has_table_privilege('vanstro_runtime','public.'||t,v) OR has_table_privilege('public','public.'||t,v) THEN RAISE EXCEPTION 'direct privilege % %',t,v; END IF;
  END LOOP;
 END LOOP;
 IF has_schema_privilege('vanstro_runtime','public','CREATE') OR has_database_privilege('vanstro_runtime',current_database(),'CREATE') THEN RAISE EXCEPTION 'runtime create'; END IF;
 IF pg_has_role('vanstro_runtime','vanstro_p09_guard_owner','MEMBER') OR pg_has_role('vanstro_runtime','vanstro_migrator','MEMBER') THEN RAISE EXCEPTION 'runtime membership'; END IF;
 SELECT rolname INTO owner_name FROM pg_roles WHERE oid=(SELECT relowner FROM pg_class WHERE oid='public.runtime_config_version'::regclass);
 IF owner_name<>'vanstro_migrator' THEN RAISE EXCEPTION 'table owner %',owner_name; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='public' AND p.proname LIKE 'p09_%' AND p.proname<>'p09_validate_config' AND (r.rolname<>'vanstro_p09_guard_owner' OR NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'])) THEN RAISE EXCEPTION 'function boundary'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace, LATERAL aclexplode(p.proacl) a WHERE n.nspname='public' AND p.proname LIKE 'p09_%' AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'PUBLIC execute'; END IF;
 IF (SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)<>65 THEN RAISE EXCEPTION 'migration count'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='runtime_config_registry') OR NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='runtime_config_lookup') THEN RAISE EXCEPTION 'schema sentinel'; END IF;
END $$;
SQL
 printf '%s source=%s target=65 objects=2 permission-denials=8 owner/search_path/public/roles/sentinel=pass\n' "$db" "$source"
}
verify p09_fresh_disposable 0; verify p09_from55 55; verify p09_from62 62; verify p09_from64 64
# Controlled positive path and negative cross-scope/CAS/idempotency/concurrency on fresh DB.
pa -d p09_fresh_disposable <<'SQL' >/dev/null
DO $$ DECLARE actor text:='p09-actor'; role_id text:='p09-role'; session_hash text:=repeat('a',64); row record; BEGIN
 INSERT INTO permissions(id,key,description) SELECT gen_random_uuid()::text,key,'P09 conformance' FROM unnest(ARRAY['config.read','config.manage','config.activate','flags.read','flags.manage','flags.kill_switch','readiness.read_summary','readiness.read_detail']) key ON CONFLICT(key) DO NOTHING;
 INSERT INTO users(id,email,kind,status,"updatedAt") VALUES(actor,'p09@example.invalid','admin','active',CURRENT_TIMESTAMP);
 INSERT INTO roles(id,key,name,"isSystem","updatedAt") VALUES(role_id,'p09-conformance','P09',false,CURRENT_TIMESTAMP);
 INSERT INTO user_roles(id,"userId","roleId") VALUES(gen_random_uuid()::text,actor,role_id);
 INSERT INTO role_permissions(id,"roleId","permissionId") SELECT gen_random_uuid()::text,role_id,id FROM permissions WHERE key IN ('config.read','config.manage','config.activate','flags.read','flags.manage','flags.kill_switch','readiness.read_summary','readiness.read_detail');
 INSERT INTO refresh_sessions(id,"userId","tokenHash","expiresAt") VALUES('p09-session',actor,session_hash,CURRENT_TIMESTAMP+interval '1 hour');
 SELECT * INTO row FROM p09_config_propose(session_hash,actor,'ctx',repeat('b',64),repeat('c',64),'global',ARRAY[]::text[],ARRAY[]::text[],'foundation.runtime.display_mode','runtime-config-schema.v1','"compact"'::jsonb,0,repeat('d',64),repeat('e',64),'p09-request');
 IF row."version"<>1 OR row."activationStatus"<>'draft' THEN RAISE EXCEPTION 'propose'; END IF;
 SELECT * INTO row FROM p09_config_activate(session_hash,actor,'ctx',repeat('b',64),repeat('c',64),'global',ARRAY[]::text[],ARRAY[]::text[],'foundation.runtime.display_mode',1,repeat('f',64),repeat('1',64),'p09-activate',false);
 IF row."effectiveValue"<>'"compact"'::jsonb OR row."activationStatus"<>'active' THEN RAISE EXCEPTION 'activate'; END IF;
 BEGIN PERFORM * FROM p09_config_list(session_hash,actor,'ctx',repeat('b',64),repeat('c',64),'dealer',ARRAY['other'],ARRAY[]::text[]); RAISE EXCEPTION 'cross scope accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='cross scope accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM * FROM p09_config_propose(session_hash,actor,'ctx',repeat('b',64),repeat('c',64),'global',ARRAY[]::text[],ARRAY[]::text[],'foundation.runtime.display_mode','runtime-config-schema.v1','"standard"'::jsonb,0,repeat('2',64),repeat('3',64),'stale'); RAISE EXCEPTION 'stale accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='stale accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM * FROM p09_config_propose(session_hash,actor,'ctx',repeat('b',64),repeat('c',64),'global',ARRAY[]::text[],ARRAY[]::text[],'foundation.runtime.display_mode','runtime-config-schema.v1','"standard"'::jsonb,1,repeat('d',64),repeat('4',64),'idem-conflict'); RAISE EXCEPTION 'idem conflict accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='idem conflict accepted' THEN RAISE; END IF; END;
END $$;
SQL
# Real runtime SQL cannot directly touch either table.
for table in runtime_config_version feature_flag_version; do for sql in "SELECT * FROM public.$table LIMIT 1" "INSERT INTO public.$table DEFAULT VALUES" "UPDATE public.$table SET \"version\"=0 WHERE false" "DELETE FROM public.$table WHERE false"; do if PGPASSWORD="$R" psql -X -v ON_ERROR_STOP=1 "postgresql://vanstro_runtime:$R@127.0.0.1:$PORT/p09_fresh_disposable" -c "$sql" >/dev/null 2>&1; then echo "direct SQL succeeded $table" >&2; exit 1; fi; done; done
printf 'migration65 PG16 0/55/62/64->65; controlled positive, cross-scope, CAS, idempotency and 2x4 direct denial passed\n'
