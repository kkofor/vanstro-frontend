#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")}\n${result.stderr || result.stdout}`);
  return result.stdout;
};

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) values[argv[index].replace(/^--/u, "")] = argv[index + 1];
  for (const key of ["root", "model", "output"]) if (!values[key]) throw new Error(`--${key} is required`);
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, resolve(value)]));
}

const args = parseArgs(process.argv.slice(2));
const model = JSON.parse(await readFile(args.model, "utf8"));
const migrationsRoot = join(args.root, "packages/db/prisma/migrations");
const migrationDirs = (await readdir(migrationsRoot, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
if (migrationDirs.length !== 68) throw new Error(`EXPECTED_68_MIGRATIONS: ${migrationDirs.length}`);

const workspace = await mkdtemp(join(tmpdir(), "vanstro-f1-owned-probe-"));
const container = `vanstro-f1-probe-${process.pid}`;
const password = "f1-owned-probe-only";
try {
  run("docker", ["run", "--detach", "--rm", "--name", container, "-e", `POSTGRES_PASSWORD=${password}`, "-e", "POSTGRES_DB=vanstro_probe", "postgres:16-alpine"]);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres", "-d", "vanstro_probe"], { encoding: "utf8" });
    if (ready.status === 0) break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    if (attempt === 59) throw new Error("POSTGRES_NOT_READY");
  }
  const requiredHistoricalRoles = [{ name: "vanstro_media_guard_owner", login: false }];
  const roleSql = [...model.roles.map(role => ({ name: role.name, login: role.login })), ...requiredHistoricalRoles].map(role => `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${role.name}') THEN CREATE ROLE ${role.name} ${role.login ? "LOGIN" : "NOLOGIN"} NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS; END IF; END $$;`).join("\n");
  run("docker", ["exec", "-i", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "vanstro_probe"], { input: `${roleSql}\nGRANT vanstro_media_guard_owner,vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p08_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner TO vanstro_migrator;\nALTER DATABASE vanstro_probe OWNER TO vanstro_migrator;\nREVOKE CREATE ON DATABASE vanstro_probe FROM PUBLIC,vanstro_runtime;\nREVOKE CREATE ON SCHEMA public FROM PUBLIC,vanstro_runtime;\nCREATE EXTENSION IF NOT EXISTS pgcrypto;\n` });
  const checksums = [];
  for (const directory of migrationDirs) {
    const path = join(migrationsRoot, directory, "migration.sql");
    const bytes = await readFile(path);
    checksums.push({ name: directory, checksum: sha256(bytes) });
    const user = directory < "20260802153000_dashboard_p07_media_role_boundary" ? "postgres" : "vanstro_migrator";
    if (directory === "20260802153000_dashboard_p07_media_role_boundary") {
      const ownershipSql = `DO $$ DECLARE row record; BEGIN FOR row IN SELECT c.oid::regclass AS object_id FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','S') LOOP EXECUTE format('ALTER %s %s OWNER TO vanstro_migrator', CASE WHEN (SELECT relkind FROM pg_class WHERE oid=row.object_id)='S' THEN 'SEQUENCE' ELSE 'TABLE' END,row.object_id); END LOOP; FOR row IN SELECT p.oid::regprocedure AS object_id FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' LOOP EXECUTE format('ALTER FUNCTION %s OWNER TO vanstro_migrator',row.object_id); END LOOP; END $$;`;
      run("docker", ["exec", "-i", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "vanstro_probe"], { input: ownershipSql });
    }
    run("docker", ["exec", "-i", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", "vanstro_probe"], { input: bytes });
  }
  const query = sql => JSON.parse(run("docker", ["exec", container, "psql", "-XAt", "-U", "postgres", "-d", "vanstro_probe", "-c", `SELECT COALESCE(json_agg(row_to_json(q) ORDER BY 1),'[]'::json)::text FROM (${sql}) q;`]).trim());
  const result = {
    schemaVersion: "vanstro.f1-v1.5-owned-pg16-probe.v1",
    engine: query("SELECT current_setting('server_version_num')::integer AS version_num"),
    overloads: query("SELECT n.nspname AS schema_name,p.proname AS function_name,pg_get_function_identity_arguments(p.oid) AS identity_arguments,r.rolname AS owner,p.prosecdef AS security_definer,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='public' AND (p.proname LIKE 'p08_%' OR p.proname LIKE 'p09_%' OR p.proname LIKE 'p10_%')"),
    migrationChecksums: checksums,
    owners: query("SELECT 'table' AS object_type,n.nspname AS schema_name,c.relname AS object_name,r.rolname AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' AND c.relkind IN ('r','S') UNION ALL SELECT 'function',n.nspname,p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',r.rolname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='public' AND (p.proname LIKE 'p08_%' OR p.proname LIKE 'p09_%' OR p.proname LIKE 'p10_%')"),
    memberships: query("SELECT member.rolname AS member_role,granted.rolname AS granted_role,am.admin_option FROM pg_auth_members am JOIN pg_roles member ON member.oid=am.member JOIN pg_roles granted ON granted.oid=am.roleid"),
    effectivePrivileges: query("SELECT role_name,object_type,object_name,verb,allowed FROM (SELECT r.rolname AS role_name,'schema' AS object_type,'public' AS object_name,v.verb,has_schema_privilege(r.rolname,'public',v.verb) AS allowed FROM pg_roles r CROSS JOIN (VALUES ('USAGE'),('CREATE')) v(verb) WHERE r.rolname IN ('vanstro_runtime','vanstro_worker_runtime','vanstro_p02_guard_owner','vanstro_p04_guard_owner','vanstro_p08_guard_owner','vanstro_p09_guard_owner','vanstro_p10_guard_owner','vanstro_worker_lifecycle_cap','vanstro_migrator') UNION ALL SELECT r.rolname,'table',c.relname,v.verb,has_table_privilege(r.rolname,format('%I.%I',n.nspname,c.relname),v.verb) FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) v(verb) WHERE n.nspname='public' AND c.relkind='r' AND r.rolname IN ('vanstro_runtime','vanstro_worker_runtime','vanstro_p02_guard_owner','vanstro_p04_guard_owner','vanstro_p08_guard_owner','vanstro_p09_guard_owner','vanstro_p10_guard_owner','vanstro_worker_lifecycle_cap','vanstro_migrator')) privileges"),
    unknownRequiresOwnedProbe: []
  };
  const sortValue = value => Array.isArray(value)
    ? value.map(sortValue)
    : value && typeof value === "object"
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]))
      : value;
  const canonical = `${JSON.stringify(sortValue(result), null, 2)}\n`;
  await writeFile(args.output, canonical);
  process.stdout.write(`${JSON.stringify({ ok: true, output: args.output, sha256: sha256(Buffer.from(canonical)), migrationCount: checksums.length })}\n`);
} finally {
  spawnSync("docker", ["rm", "--force", container], { encoding: "utf8" });
  await rm(workspace, { recursive: true, force: true });
}
