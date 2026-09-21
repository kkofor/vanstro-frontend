#!/usr/bin/env node
// =============================================================================
// LOCAL-STAGING E2E — real migration chain (1..81) + commerce round trip on a
// disposable PostgreSQL 16 database, all in one process lifecycle.
//
// IDENTITY SPLIT (fixes the historical harness conflict where ONE
// DATABASE_URL served createdb/dropdb, migrate AND runtime):
//   admin    — postgres superuser of the disposable PG16 container (or the
//              detected superuser of a local PG16 server when docker is
//              unavailable and VANSTRO_E2E_DATABASE_URL is set). Owns
//              create/drop of the database, role provisioning, extensions,
//              GUCs, the deployment fixture and the post-migration runtime
//              ACL. Never a runtime or deploy URL.
//   migrator — vanstro_migrator (LOGIN NOINHERIT NOCREATEDB): deploys the
//              M59-bearing boundary segments (1..68, then 69). Migration 59
//              hard-asserts current_user='vanstro_migrator', so those segments
//              cannot run as any other principal.
//   deploy   — vanstro_deployment_owner (deployment-only admin, migrate-only,
//              never API/Worker): deploys 70..81 and the no-op second deploy.
//              Migrations 73/74 CREATE OR REPLACE guard-owned functions, which
//              needs an owner/superuser session; no migration in 70..81
//              asserts the deploy session, so the superuser deploy principal
//              is assertion-safe.
//   runtime  — vanstro_runtime (API + seed) / vanstro_worker_runtime (Worker,
//              incl. WORKER_LIFECYCLE_DATABASE_URL). Never deploy connections.
//
// WHY PG16: the migration chain is verified end-to-end on postgres:16-bookworm
// (F0 gate). PostgreSQL 17 changes ALTER OWNER to record the new MAINTAIN
// privilege in relacl, which fails migration 69's frozen aclexplode ACL
// assertions — so the harness always provisions its own disposable PG16.
// Memberships are re-granted to the contract form (NOINHERIT) because PG16+
// has_*_privilege() respects per-membership inheritance (migration 60).
//
// MIGRATION CHAIN — real `prisma migrate deploy` only (no db push, no
// resolve --applied, no manual _prisma_migrations edits):
//   deploy 1..68 (migrator, temp migration-view tree) → out-of-migration
//   manifest + bootstrap audit (migrator) → deploy 69 (migrator, view tree) →
//   post-69 schema CREATE re-grant (admin) → deployment fixture (admin
//   superuser: signed attestation + 31 old68 telemetry rows) → deploy 70..81
//   (deployment owner, full tree) → no-op second deploy → ledger 81/0/0.
//   The GUCs vanstro.rollout_id/environment/manifest_digest are persisted with
//   ALTER DATABASE so every deploy connection inherits them.
//
// COMMERCE LIFECYCLE (same process): prisma generate + backend build → demo
// seed as vanstro_runtime → Mailpit + ERP mock + API + Worker → API readiness
// → cart → checkout (cash + demo card) → payment callback + idempotent replay
// → worker ERP push → inbound order-status webhook → order processing → mail
// delivery (Mailpit + email_outbox) → worker startup/heartbeat observation →
// async task consumption (erp_sync_jobs succeeded).
//
// EVIDENCE — bounded artifacts (credentials never written, URLs redacted):
//   $V11_E2E_EVIDENCE_OUT (default tasks/evidence/v11-r1-functional-first-
//   commerce-e2e/runs/<run-id>/): identity.json, summary.json and, on failure
//   only, first-error.json with the failing stage + precise first error
//   (migration name / SQLSTATE / deploy output when a deploy failed).
//
// CLEANUP — always: SIGTERM all children (wait for exit), remove the
// disposable PG16 container (or drop the local disposable database), remove
// the temp dir (migration views, fixture SQL, Mailpit DB).
//
// Usage:
//   node --experimental-strip-types scripts/local-staging-e2e.mts
//   optional: VANSTRO_E2E_DATABASE_URL (local PG16 server fallback),
//             VANSTRO_TEST_POSTGRES_IMAGE (default postgres:16-bookworm),
//             V11_E2E_EVIDENCE_OUT, V11_E2E_RUN_ID
// =============================================================================
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { cpSync, createWriteStream, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { dirname, join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const dbPackage = join(root, "packages/db");
const migrationsDir = join(dbPackage, "prisma/migrations");
const manifestSql = join(root, "qa/v11-auth-browser/f1-source-manifest.sql");
const nodeBinPath = `/opt/homebrew/opt/node@22/bin:${process.env.PATH ?? ""}`;
const pgImage = process.env.VANSTRO_TEST_POSTGRES_IMAGE ?? "postgres:16-bookworm";

const suffix = randomBytes(4).toString("hex");
const runId = process.env.V11_E2E_RUN_ID ?? `v11-r1-commerce-${suffix}`;
const databaseName = `vanstro_smoke_e2e_${suffix}`;
const tmpRoot = mkdtempSync(join(tmpdir(), "vanstro-e2e-"));
const mailpitDatabase = join(tmpRoot, "mailpit.db");
const logDir = join(tmpRoot, "logs");
mkdirSync(logDir, { recursive: true });
const evidenceOut = process.env.V11_E2E_EVIDENCE_OUT ?? join(root, "tasks/evidence/v11-r1-functional-first-commerce-e2e/runs", runId);

// ---- disposable server bootstrap ---------------------------------------------
// Primary: a disposable postgres:16-bookworm container (F0-verified chain).
// Fallback: a local PostgreSQL server via VANSTRO_E2E_DATABASE_URL — used only
// when docker is unavailable, and asserted to be PG16 (PG17 fails migration 69
// because ALTER OWNER records the new MAINTAIN privilege in relacl).
type Server = {
  host: string;
  port: string;
  adminUser: string;
  adminPassword: string;
  adminUrl: string; // psql-safe (no query params)
  dbArgs: string[];
  pgEnv: NodeJS.ProcessEnv;
  mode: "docker" | "local";
  remove: () => void;
};
function bootstrapServer(): Server {
  const dockerOk = spawnSync("docker", ["info"], { stdio: "ignore", timeout: 15000 }).status === 0;
  if (dockerOk) {
    const container = `vanstro-e2e-pg-${suffix}`;
    const superPassword = `e2e-${randomBytes(24).toString("base64url")}`;
    const started = spawnSync("docker", ["run", "-d", "--name", container, "-e", `POSTGRES_PASSWORD=${superPassword}`, "-e", `POSTGRES_DB=${databaseName}`, "-p", "127.0.0.1::5432", pgImage]);
    if (started.status !== 0) throw new Error(`docker run failed: ${started.stderr}`);
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const check = spawnSync("docker", ["exec", "-e", `PGPASSWORD=${superPassword}`, container, "pg_isready", "-U", "postgres", "-d", databaseName]);
      if (check.status === 0) {
        ready = true;
        break;
      }
      spawnSync("sleep", ["1"]);
    }
    if (!ready) {
      spawnSync("docker", ["rm", "-f", container]);
      throw new Error("disposable PG16 container did not become ready");
    }
    const portInfo = spawnSync("docker", ["port", container, "5432/tcp"], { encoding: "utf8" });
    const port = portInfo.stdout.trim().split("\n")[0]?.split(":")[1] ?? "";
    if (!port) throw new Error("could not resolve container port");
    const host = "127.0.0.1";
    return {
      host,
      port,
      adminUser: "postgres",
      adminPassword: superPassword,
      adminUrl: `postgresql://postgres:${superPassword}@${host}:${port}/${databaseName}`,
      dbArgs: ["-h", host, "-p", port, "-U", "postgres"],
      pgEnv: { ...process.env, PATH: nodeBinPath, PGPASSWORD: superPassword },
      mode: "docker",
      remove: () => {
        spawnSync("docker", ["rm", "-f", container]);
      }
    };
  }
  const sourceDatabaseUrl = process.env.VANSTRO_E2E_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!sourceDatabaseUrl) {
    throw new Error("No database server available: docker is not running, and VANSTRO_E2E_DATABASE_URL (or DATABASE_URL) is not set.");
  }
  const source = new URL(sourceDatabaseUrl);
  const candidates: string[] = [];
  if (process.env.VANSTRO_E2E_ADMIN_URL) candidates.push(process.env.VANSTRO_E2E_ADMIN_URL);
  const asUser = (user: string) => {
    const url = new URL(sourceDatabaseUrl);
    url.username = user;
    url.pathname = "/postgres";
    url.search = "";
    return url.toString();
  };
  candidates.push(asUser(decodeURIComponent(source.username)), asUser(userInfo().username), asUser("postgres"));
  let adminUrl = "";
  for (const url of [...new Set(candidates)]) {
    const probe = spawnSync("psql", [url, "-X", "-t", "-A", "-c", "SELECT rolsuper OR rolcreaterole FROM pg_roles WHERE rolname = current_user"], {
      env: { ...process.env, PATH: nodeBinPath },
      encoding: "utf8"
    });
    if (probe.status === 0 && probe.stdout.trim() === "t") {
      adminUrl = url;
      break;
    }
  }
  if (!adminUrl) throw new Error("No admin (superuser/createrole) connection is available on the local server; set VANSTRO_E2E_ADMIN_URL.");
  const version = spawnSync("psql", [adminUrl, "-X", "-t", "-A", "-c", "SELECT current_setting('server_version_num')"], { encoding: "utf8" });
  const versionNum = Number(version.stdout.trim());
  if (!(versionNum >= 160000 && versionNum < 170000)) {
    throw new Error(`Local server is PostgreSQL ${Math.floor(versionNum / 10000)} — the migration chain is only verified on PostgreSQL 16 (PG17 records MAINTAIN in relacl and fails migration 69). Use docker or a PG16 server.`);
  }
  const parsed = new URL(adminUrl);
  const dbArgs = ["-h", parsed.hostname, "-p", parsed.port || "5432", "-U", decodeURIComponent(parsed.username)];
  const pgPassword = parsed.password ? decodeURIComponent(parsed.password) : "";
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    adminUser: decodeURIComponent(parsed.username),
    adminPassword: pgPassword,
    adminUrl,
    dbArgs,
    pgEnv: { ...process.env, PATH: nodeBinPath, ...(pgPassword ? { PGPASSWORD: pgPassword } : {}) },
    mode: "local",
    remove: () => {
      spawnSync("dropdb", ["--if-exists", ...dbArgs, databaseName], { env: { ...process.env, PATH: nodeBinPath, ...(pgPassword ? { PGPASSWORD: pgPassword } : {}) } });
    }
  };
}
const server = bootstrapServer();

// ---- identity surfaces --------------------------------------------------------
// Role URLs derive from the disposable database URL. The container uses
// scram (passwords required); a trust-auth local server needs none. Each role
// gets a fresh disposable password (set at CREATE ROLE, kept in memory only).
const hasServerPassword = Boolean(server.adminPassword);
const rolePasswords = new Map<string, string>();
const disposablePassword = (role: string) => {
  if (!rolePasswords.has(role)) rolePasswords.set(role, `e2e-${randomBytes(24).toString("base64url")}`);
  return rolePasswords.get(role)!;
};
const roleUrl = (role: string) =>
  `postgresql://${role}:${hasServerPassword ? disposablePassword(role) : ""}@${server.host}:${server.port}/${databaseName}?schema=public`;
const migratorUrl = roleUrl("vanstro_migrator");
const migratorPsqlUrl = new URL(migratorUrl);
migratorPsqlUrl.search = "";
const deployUrl = roleUrl("vanstro_deployment_owner");
const runtimeUrl = roleUrl("vanstro_runtime");
const workerUrl = roleUrl("vanstro_worker_runtime");

// ---- evidence / assertion collection ------------------------------------------
type Assertion = { key: string; expected: string; actual: string; pass: boolean };
const assertions: Assertion[] = [];
const facts: Record<string, string> = {};
const segments: Array<{ name: string; startedAt: string; endedAt: string; durationMs: number; detail?: string }> = [];
let segmentStart = 0;
let segmentName = "";
function seg(name: string) {
  segmentName = name;
  segmentStart = Date.now();
}
function segEnd(detail?: string) {
  segments.push({ name: segmentName, startedAt: new Date(segmentStart).toISOString(), endedAt: new Date().toISOString(), durationMs: Date.now() - segmentStart, detail });
}
function assertEq(key: string, expected: string | number, actual: string | number) {
  const pass = String(expected) === String(actual);
  assertions.push({ key, expected: String(expected), actual: String(actual), pass });
  if (!pass) throw new Error(`assertion failed: ${key} expected=${expected} actual=${actual}`);
}
function assertPass(key: string, pass: boolean, detail: string) {
  assertions.push({ key, expected: pass ? "true" : "false", actual: pass ? "true" : "false", pass });
  if (!pass) throw new Error(`assertion failed: ${key} ${detail}`);
}
function recordFact(key: string, value: string | number | boolean) {
  facts[key] = String(value);
}
function nowIso() {
  return new Date().toISOString();
}

// ---- process helpers ------------------------------------------------------------
const children: ReturnType<typeof spawn>[] = [];
let lastDeployLabel = "";
let lastDeployOutput = "";
function run(command: string, args: string[], env: NodeJS.ProcessEnv = { ...process.env, PATH: nodeBinPath }) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed (rc=${result.status}).`);
}
function start(name: string, command: string, args: string[], env: NodeJS.ProcessEnv) {
  const logFile = join(logDir, `${name}.log`);
  const child = spawn(command, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  const sink = createWriteStream(logFile, { flags: "a" });
  child.stdout?.pipe(sink);
  child.stderr?.pipe(sink);
  children.push(child);
  return child;
}
function waitForExit(child: ReturnType<typeof spawn>, timeoutMs: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve(true);
      return;
    }
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}
async function waitFor(url: string, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${url} did not become ready.`);
}
async function poll<T>(label: string, fn: () => Promise<T | undefined>, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T | undefined;
  while (Date.now() < deadline) {
    last = await fn();
    if (last !== undefined) return last;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`poll timed out: ${label}`);
}
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`http://127.0.0.1:4001/api/v1${path}`, {
    ...init,
    headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}
function psql(url: string, sql: string, extra: string[] = []) {
  const result = spawnSync("psql", [url, "-X", "-v", "ON_ERROR_STOP=1", ...extra, "-c", sql], {
    env: { ...process.env, PATH: nodeBinPath },
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(`psql failed: ${result.stderr?.slice(0, 400)}`);
  return result.stdout.trim();
}
function psqlFile(url: string, file: string, extra: string[] = []) {
  const result = spawnSync("psql", [url, "-X", "-v", "ON_ERROR_STOP=1", ...extra, "-f", file], {
    env: { ...process.env, PATH: nodeBinPath },
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(`psql -f ${file} failed: ${result.stderr?.slice(0, 400)}`);
  return result.stdout.trim();
}
function psqlQ(url: string, sql: string) {
  const result = spawnSync("psql", [url, "-X", "-t", "-A", "-c", sql], {
    env: { ...process.env, PATH: nodeBinPath },
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(`psql query failed: ${result.stderr?.slice(0, 400)}`);
  return result.stdout.trim();
}
function ledgerSnapshot(adminUrl: string) {
  const counts = psqlQ(
    adminUrl,
    `SELECT (SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)||','||(SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL)||','||(SELECT count(*) FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL)`
  );
  const [applied, unresolved, rolledBack] = counts.split(",");
  return { applied, unresolved, rolledBack };
}
function firstFailedMigration(adminUrl: string) {
  const row = psqlQ(
    adminUrl,
    `SELECT migration_name||'|'||left(coalesce(logs,''), 300) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at LIMIT 1`
  );
  if (!row) return undefined;
  const [name, logs] = row.split("|");
  const sqlState = (logs.match(/SQLSTATE[=: ]+([0-9A-Z]{5})/) ?? logs.match(/P[0-9]{4}/) ?? [])[1] ?? "UNKNOWN";
  return { name, sqlState, logs: logs.slice(0, 300) };
}
function prismaMigrateDeploy(schemaDir: string, url: string) {
  const result = spawnSync("pnpm", ["--dir", dbPackage, "exec", "prisma", "migrate", "deploy", "--schema", join(schemaDir, "schema.prisma")], {
    cwd: root,
    env: { ...process.env, PATH: nodeBinPath, DATABASE_URL: url },
    encoding: "utf8"
  });
  lastDeployLabel = join(schemaDir, "schema.prisma");
  lastDeployOutput = `${result.stdout}\n${result.stderr}`;
  return { rc: result.status ?? -1, out: lastDeployOutput };
}
function makeMigrationView(first: number, last: number) {
  const dir = join(tmpRoot, `view-${first}-${last}`);
  mkdirSync(join(dir, "migrations"), { recursive: true });
  cpSync(join(dbPackage, "prisma/schema.prisma"), join(dir, "schema.prisma"));
  cpSync(join(migrationsDir, "migration_lock.toml"), join(dir, "migrations/migration_lock.toml"));
  const names = readdirSync(migrationsDir)
    .filter((name) => name !== "migration_lock.toml")
    .sort();
  for (let i = first - 1; i < last; i += 1) {
    cpSync(join(migrationsDir, names[i]), join(dir, "migrations", names[i]), { recursive: true });
  }
  return dir;
}
function generateFixture(rollout?: string) {
  const args = ["qa/v11-auth-browser/v11-p7-fixture.mjs", "--root", root, "--out", tmpRoot, "--tag", "e2e", ...(rollout ? ["--rollout", rollout] : [])];
  const result = spawnSync("node", args, { cwd: root, env: { ...process.env, PATH: nodeBinPath }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`fixture generation failed: ${result.stderr?.slice(0, 400)}`);
  const line = result.stdout.trim().split("\n").filter(Boolean).pop()!;
  const json = JSON.parse(line) as { rolloutId: string; manifestDigest: string };
  // the helper writes fixture-<tag>-<rollout>.sql/.json into --out; the stdout
  // JSON carries no file paths, so derive them from the rollout id
  const sqlFile = join(tmpRoot, `fixture-e2e-${json.rolloutId}.sql`);
  return { rolloutId: json.rolloutId, manifestDigest: json.manifestDigest, files: { sql: sqlFile } };
}
function redact(text: string) {
  return text
    .replace(/postgresql:\/\/[^ @/]+:[^ @/]*@/g, "postgresql://***@")
    .replace(/(PGPASSWORD|DATABASE_PASSWORD|SUPER_PASSWORD|MIGRATOR_PASSWORD|DEPLOY_PASSWORD)=[^ ]*/g, "$1=***")
    .replace(/PASSWORD '([^']*)'/g, "PASSWORD '***'");
}

// ---- base env for every child (secrets live only in process memory) ------------
const baseEnv: NodeJS.ProcessEnv = {
  ...process.env,
  PATH: nodeBinPath,
  DATABASE_URL: `postgresql://${server.adminUser}:${server.adminPassword}@${server.host}:${server.port}/${databaseName}?schema=public`,
  VANSTRO_RUNTIME_MODE: "test",
  PAYMENT_CALLBACK_SECRET: "local-staging-payment-secret",
  ERP_WEBHOOK_SECRET: "local-staging-erp-webhook-secret",
  SUPER_ADMIN_EMAIL: "admin@vanstro.test",
  SUPER_ADMIN_PASSWORD: "local-staging-admin-password",
  ALLOW_DEMO_SEED: "true",
  ALLOW_DESTRUCTIVE_SMOKE: "true"
};

// ---- graceful signal handling (cleanup runs even on Ctrl-C) ----------------------
let cleaningUp = false;
async function cleanup() {
  if (cleaningUp) return;
  cleaningUp = true;
  for (const child of children.reverse()) child.kill("SIGTERM");
  await Promise.all(children.map((child) => waitForExit(child, 5000)));
  try {
    server.remove();
  } catch {
    // cleanup must never mask the original failure
  }
  rmSync(tmpRoot, { recursive: true, force: true });
}
process.on("SIGINT", () => {
  void cleanup().finally(() => process.exit(130));
});
process.on("SIGTERM", () => {
  void cleanup().finally(() => process.exit(143));
});

// ===== PART2 =====
try {
  const adminUrl = server.adminUrl;
  const adminPsqlUrl = new URL(adminUrl);
  adminPsqlUrl.search = "";

  // ---- 0. disposable database (docker: created at container init; local:
  //        created/dropped by the admin principal) ------------------------------
  if (server.mode === "local") {
    seg("database-create");
    spawnSync("dropdb", ["--if-exists", ...server.dbArgs, databaseName], { env: server.pgEnv });
    const created = spawnSync("createdb", [...server.dbArgs, databaseName], { env: server.pgEnv });
    if (created.status !== 0) throw new Error(`createdb failed: ${created.stderr}`);
    segEnd();
  }
  recordFact("server.mode", server.mode);
  recordFact("adminPrincipal", server.adminUser);

  // ---- 1. out-of-migration admin contract (roles/extensions/GUCs) --------------
  seg("provision");
  const provisionSql = `
-- A. role topology (idempotent: on a local fallback server the shared cluster
--    may already hold some principals; the disposable container starts empty).
--    Attributes match the migration 59/69 assertions (migrator LOGIN NOINHERIT
--    NOCREATEDB, etc.). Passwords are disposable in-memory values (container
--    uses scram; a trust-auth local server leaves them empty).
DO $topo$ DECLARE _role text; BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='vanstro_migrator') THEN
    CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='vanstro_deployment_owner') THEN
    CREATE ROLE vanstro_deployment_owner LOGIN NOINHERIT SUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='vanstro_runtime') THEN
    CREATE ROLE vanstro_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='vanstro_worker_runtime') THEN
    CREATE ROLE vanstro_worker_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  FOREACH _role IN ARRAY ARRAY['vanstro_media_guard_owner','vanstro_p02_guard_owner','vanstro_p04_guard_owner','vanstro_p07_guard_owner','vanstro_p08_guard_owner','vanstro_p09_guard_owner','vanstro_p10_guard_owner','vanstro_p10_dsar_guard_owner','vanstro_telemetry_guard_owner','vanstro_crypto_verifier_owner','vanstro_worker_lifecycle_cap','vanstro_p10_release_cap','vanstro_p10_signer_admin_cap','vanstro_p10_kms_rotation_cap','vanstro_p10_dsar_cap','vanstro_signer_admin_runtime','vanstro_kms_rotation_runtime','vanstro_dsar_runtime','vanstro_telemetry_runtime'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname=_role) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', _role);
    END IF;
  END LOOP;
END $topo$;
${hasServerPassword ? `ALTER ROLE vanstro_migrator PASSWORD :'f0_migrator_pass';\nALTER ROLE vanstro_deployment_owner PASSWORD :'f0_deploy_pass';\nALTER ROLE vanstro_runtime PASSWORD :'f0_runtime_pass';\nALTER ROLE vanstro_worker_runtime PASSWORD :'f0_worker_pass';` : ""}
-- Memberships carry ADMIN OPTION (migration 69 runs AS vanstro_migrator and
-- GRANTs the cap roles to the runtime principals; migration 59 requires
-- migrator to be MEMBER of vanstro_media_guard_owner). GRANT role ... WITH
-- ADMIN OPTION creates NOINHERIT memberships (verified on PG16/PG17): PG16+
-- has_*_privilege() respects the per-membership inherit option, and migration
-- 60's frozen-boundary assertion requires guard-owner table grants NOT to
-- leak into vanstro_migrator's effective ACLs through memberships. The
-- re-grant normalizes any legacy INHERIT membership on a shared cluster.
REVOKE vanstro_media_guard_owner,vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p07_guard_owner,vanstro_p08_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner,vanstro_p10_dsar_guard_owner,vanstro_telemetry_guard_owner,vanstro_crypto_verifier_owner FROM vanstro_migrator;
GRANT vanstro_media_guard_owner,vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p07_guard_owner,vanstro_p08_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner,vanstro_p10_dsar_guard_owner,vanstro_telemetry_guard_owner,vanstro_crypto_verifier_owner TO vanstro_migrator WITH ADMIN OPTION;
REVOKE vanstro_worker_lifecycle_cap,vanstro_p10_release_cap,vanstro_p10_signer_admin_cap,vanstro_p10_kms_rotation_cap,vanstro_p10_dsar_cap FROM vanstro_migrator;
GRANT vanstro_worker_lifecycle_cap,vanstro_p10_release_cap,vanstro_p10_signer_admin_cap,vanstro_p10_kms_rotation_cap,vanstro_p10_dsar_cap TO vanstro_migrator WITH ADMIN OPTION;
-- B. ownership: migrator owns database + public schema (migrations 59/69 run
--    ALTER OWNER / REVOKE statements that require it).
ALTER DATABASE :"f0_db" OWNER TO vanstro_migrator;
ALTER SCHEMA public OWNER TO vanstro_migrator;
-- C. CREATE revocation (migration 59/69 assert it as prior state).
REVOKE CREATE ON DATABASE :"f0_db" FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
-- D. platform extensions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- E. crypto verifier preset (owned by vanstro_crypto_verifier_owner; the
--    migrations ship SECURITY DEFINER functions that CALL these at runtime).
CREATE OR REPLACE FUNCTION public.vanstro_subject_erasure_token_v1(input bytea) RETURNS bytea
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path=pg_catalog
AS $$ SELECT public.hmac(input, decode(repeat('42',32),'hex'), 'sha256') $$;
ALTER FUNCTION public.vanstro_subject_erasure_token_v1(bytea) OWNER TO vanstro_crypto_verifier_owner;
REVOKE ALL ON FUNCTION public.vanstro_subject_erasure_token_v1(bytea) FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.vanstro_subject_erasure_token_v1(bytea) TO vanstro_p10_guard_owner,vanstro_p10_dsar_guard_owner,vanstro_migrator;
CREATE OR REPLACE FUNCTION public.vanstro_verify_ed25519_v1(payload bytea, signature bytea, public_key bytea) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path=pg_catalog
AS $fn$ SELECT (public.digest(payload,'sha256')=decode('9050b73baea6322d588df611f0c61fb6d1c5f5a40fa6605004491995bbaa8604','hex') AND signature=decode('9db30313d6371f494262a9351f1e5a1a02bfa95bf2b114c83da9b91e3b32098d40a22fd6fc7e6c98910ea00bb4835d3bdd9ff9f0d797b80c0d426e390464fb03','hex') AND public_key=decode('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','hex')) $fn$;
ALTER FUNCTION public.vanstro_verify_ed25519_v1(bytea,bytea,bytea) OWNER TO vanstro_crypto_verifier_owner;
REVOKE ALL ON FUNCTION public.vanstro_verify_ed25519_v1(bytea,bytea,bytea) FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.vanstro_verify_ed25519_v1(bytea,bytea,bytea) TO vanstro_p10_guard_owner,vanstro_migrator,vanstro_telemetry_guard_owner;
`;
  psqlFile(
    adminPsqlUrl.toString(),
    (() => {
      const file = join(tmpRoot, "provision.sql");
      writeFileSync(file, provisionSql);
      return file;
    })(),
    [
      "-v",
      `f0_db=${databaseName}`,
      "-v",
      `f0_migrator_pass=${hasServerPassword ? disposablePassword("vanstro_migrator") : ""}`,
      "-v",
      `f0_deploy_pass=${hasServerPassword ? disposablePassword("vanstro_deployment_owner") : ""}`,
      "-v",
      `f0_runtime_pass=${hasServerPassword ? disposablePassword("vanstro_runtime") : ""}`,
      "-v",
      `f0_worker_pass=${hasServerPassword ? disposablePassword("vanstro_worker_runtime") : ""}`
    ]
  );
  const roleCount = psqlQ(
    adminPsqlUrl.toString(),
    `SELECT count(*) FROM pg_roles WHERE rolname IN ('vanstro_migrator','vanstro_deployment_owner','vanstro_runtime','vanstro_worker_runtime','vanstro_media_guard_owner','vanstro_p02_guard_owner','vanstro_p04_guard_owner','vanstro_p07_guard_owner','vanstro_p08_guard_owner','vanstro_p09_guard_owner','vanstro_p10_guard_owner','vanstro_p10_dsar_guard_owner','vanstro_telemetry_guard_owner','vanstro_crypto_verifier_owner','vanstro_worker_lifecycle_cap','vanstro_p10_release_cap','vanstro_p10_signer_admin_cap','vanstro_p10_kms_rotation_cap','vanstro_p10_dsar_cap','vanstro_signer_admin_runtime','vanstro_kms_rotation_runtime','vanstro_dsar_runtime','vanstro_telemetry_runtime')`
  );
  assertEq("provision.roles", "23", roleCount);
  segEnd();

  // ---- 2. early fixture (deterministic manifest digest for GUCs) --------------
  seg("fixture-early");
  const early = generateFixture();
  recordFact("fixture.rolloutId", early.rolloutId);
  recordFact("fixture.manifestDigest", early.manifestDigest);
  psqlFile(
    adminPsqlUrl.toString(),
    (() => {
      const file = join(tmpRoot, "gucs.sql");
      writeFileSync(file, `ALTER DATABASE :"f0_db" SET vanstro.rollout_id TO :'f0_rollout';\nALTER DATABASE :"f0_db" SET vanstro.environment TO :'f0_env';\nALTER DATABASE :"f0_db" SET vanstro.manifest_digest TO :'f0_digest';\n`);
      return file;
    })(),
    ["-v", `f0_db=${databaseName}`, "-v", `f0_rollout=${early.rolloutId}`, "-v", "f0_env=test", "-v", `f0_digest=${early.manifestDigest}`]
  );
  segEnd();

  // ---- 3. boundary deploys via temporary migration views (migrator) -----------
  seg("deploy-1-68");
  const view168 = makeMigrationView(1, 68);
  const d168 = prismaMigrateDeploy(view168, migratorUrl);
  const applied168 = psqlQ(adminPsqlUrl.toString(), "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL");
  recordFact("deploy-1-68.identity", "vanstro_migrator");
  recordFact("deploy-1-68.rc", String(d168.rc));
  if (d168.rc !== 0) throw new Error(`deploy 1..68 failed (rc=${d168.rc}): ${redact(d168.out).slice(-1200)}`);
  assertEq("deploy-1-68.applied", "68", applied168);
  if (applied168 !== "68") throw new Error(`deploy 1..68 applied ${applied168} migrations, expected 68`);
  segEnd(applied168);

  // ---- 4. block G: manifest + bootstrap audit (migrator, pre-69) --------------
  seg("provision-manifest");
  const manifestSqlText = `CREATE TABLE IF NOT EXISTS public.f1_source_migration_manifest (name text PRIMARY KEY, checksum text NOT NULL);
CREATE TABLE IF NOT EXISTS public.f1_authority_bootstrap_audit (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "operation" text NOT NULL,
  "objectIdentity" text NOT NULL,
  "actor" text NOT NULL,
  "occurredAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "manifestDigest" text NOT NULL
);
INSERT INTO public.f1_authority_bootstrap_audit ("operation","objectIdentity","actor","manifestDigest")
VALUES ('bootstrap','roles/source manifest (68 rows)','vanstro_migrator', :'f0_digest');
`;
  psqlFile(
    migratorPsqlUrl.toString(),
    (() => {
      const file = join(tmpRoot, "manifest-tables.sql");
      writeFileSync(file, manifestSqlText);
      return file;
    })(),
    ["-v", `f0_digest=${early.manifestDigest}`]
  );
  psqlFile(migratorPsqlUrl.toString(), manifestSql);
  const manifestRows = psqlQ(adminPsqlUrl.toString(), "SELECT count(*) FROM public.f1_source_migration_manifest");
  const auditRows = psqlQ(adminPsqlUrl.toString(), "SELECT count(*) FROM public.f1_authority_bootstrap_audit");
  assertEq("manifest.rows", "68", manifestRows);
  assertEq("manifest.auditRows", "1", auditRows);
  psql(adminPsqlUrl.toString(), "GRANT USAGE,CREATE ON SCHEMA public TO vanstro_migrator,vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner,vanstro_p10_dsar_guard_owner,vanstro_telemetry_guard_owner;");
  segEnd();

  // ---- 5. migration 69 (migrator, view tree) -----------------------------------
  seg("deploy-69");
  const view69 = makeMigrationView(69, 69);
  const d69 = prismaMigrateDeploy(view69, migratorUrl);
  const applied69 = psqlQ(adminPsqlUrl.toString(), "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL");
  recordFact("deploy-69.identity", "vanstro_migrator");
  recordFact("deploy-69.rc", String(d69.rc));
  if (d69.rc !== 0) throw new Error(`deploy 69 failed (rc=${d69.rc}): ${redact(d69.out).slice(-1200)}`);
  assertEq("deploy-69.applied", "69", applied69);
  if (applied69 !== "69") throw new Error(`deploy 69 applied ${applied69} migrations, expected 69`);
  segEnd(applied69);

  // ---- 6. post-69 schema CREATE re-grant (deploy-time admin contract) ----------
  seg("post69-grants");
  psql(
    adminPsqlUrl.toString(),
    "GRANT USAGE,CREATE ON SCHEMA public TO vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner,vanstro_p10_dsar_guard_owner,vanstro_telemetry_guard_owner;"
  );
  segEnd();

  // ---- 7. deployment fixture: REGENERATE with the SAME rollout id so the
  //        attestation observedAt lands inside the consume window ----------------
  seg("fixture-apply");
  const final = generateFixture(early.rolloutId);
  assertEq("fixture.digestStable", early.manifestDigest, final.manifestDigest);
  psqlFile(adminPsqlUrl.toString(), final.files.sql);
  const telemetryRows = psqlQ(adminPsqlUrl.toString(), "SELECT count(*) FROM public.f1_old_function_call_telemetry");
  assertEq("fixture.telemetryRows", "31", telemetryRows);
  segEnd();

  // ---- 8. full-dir deploy 70..81 (deployment owner) + no-op deploy -------------
  seg("deploy-70-81");
  const d7081 = prismaMigrateDeploy(join(dbPackage, "prisma"), deployUrl);
  const applied81 = psqlQ(adminPsqlUrl.toString(), "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL");
  const consumed = psqlQ(adminPsqlUrl.toString(), "SELECT count(*) FROM public.f1_deployment_attestation_consumption");
  recordFact("deploy-70-81.identity", "vanstro_deployment_owner");
  recordFact("deploy-70-81.rc", String(d7081.rc));
  recordFact("fixture.consumed", consumed);
  if (d7081.rc !== 0) throw new Error(`deploy 70..81 failed (rc=${d7081.rc}): ${redact(d7081.out).slice(-1200)}`);
  assertEq("deploy-70-81.applied", "81", applied81);
  assertEq("fixture.consumed", "1", consumed);
  if (applied81 !== "81" || consumed !== "1") throw new Error(`deploy 70..81 applied=${applied81} consumed=${consumed}, expected 81/1`);
  segEnd(applied81);

  seg("deploy-noop");
  const dNoop = prismaMigrateDeploy(join(dbPackage, "prisma"), deployUrl);
  const appliedNoop = psqlQ(adminPsqlUrl.toString(), "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL");
  recordFact("deploy-noop.identity", "vanstro_deployment_owner");
  recordFact("deploy-noop.rc", String(dNoop.rc));
  if (dNoop.rc !== 0) throw new Error(`no-op deploy failed (rc=${dNoop.rc}): ${redact(dNoop.out).slice(-1200)}`);
  assertEq("deploy-noop.applied", "81", appliedNoop);
  if (appliedNoop !== "81") throw new Error(`no-op deploy applied ${appliedNoop} migrations, expected 81`);
  segEnd(appliedNoop);

  const ledger = ledgerSnapshot(adminPsqlUrl.toString());
  recordFact("ledger.applied", ledger.applied);
  recordFact("ledger.unresolvedFailed", ledger.unresolved);
  recordFact("ledger.rolledBack", ledger.rolledBack);
  assertEq("ledger.applied", "81", ledger.applied);
  assertEq("ledger.unresolvedFailed", "0", ledger.unresolved);
  assertEq("ledger.rolledBack", "0", ledger.rolledBack);

  // ---- 9. runtime ACL closure (admin): DML for API/Worker principals -----------
  seg("runtime-acl");
  psql(
    adminPsqlUrl.toString(),
    "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO vanstro_runtime,vanstro_worker_runtime; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO vanstro_runtime,vanstro_worker_runtime;"
  );
  segEnd();

  // ---- 10. build + demo seed (as vanstro_runtime, not as admin) ----------------
  seg("build");
  // A stale generated Prisma client (e.g. a killed previous run) breaks tsc with
  // "Module '@prisma/client' has no exported member" — regenerate cleanly.
  const clientResolve = spawnSync("node", ["-e", "process.stdout.write(require.resolve('@prisma/client/package.json'))"], {
    cwd: dbPackage,
    env: { ...process.env, PATH: nodeBinPath },
    encoding: "utf8"
  });
  if (clientResolve.status === 0 && clientResolve.stdout.trim()) {
    const clientPackageDir = dirname(clientResolve.stdout.trim());
    rmSync(join(clientPackageDir, "..", ".prisma"), { recursive: true, force: true });
  }
  run("pnpm", ["--filter", "@vanstro/db", "exec", "prisma", "generate"]);
  run("pnpm", ["build:backend"]);
  segEnd();
  seg("seed");
  run("pnpm", ["--filter", "@vanstro/db", "db:seed"], { ...baseEnv, DATABASE_URL: runtimeUrl });
  segEnd();

  // ---- 11. services (same lifecycle) --------------------------------------------
  seg("services");
  start("mailpit", "mailpit", ["--smtp", "127.0.0.1:1026", "--listen", "127.0.0.1:8026", "--database", mailpitDatabase], baseEnv);
  start(
    "erp-mock",
    "pnpm",
    ["--filter", "@vanstro/erp-mock", "start"],
    { ...baseEnv, ERP_MOCK_PORT: "4101", ERP_MOCK_SYSTEM: "configured-erp", ERP_MOCK_AUTO_WEBHOOK: "true", ERP_MOCK_API_WEBHOOK_URL: "http://127.0.0.1:4001/api/v1/integrations/erp/webhooks/order-status" }
  );
  start("api", "node", ["apps/api/dist/index.js"], {
    ...baseEnv,
    DATABASE_URL: runtimeUrl,
    API_HOST: "127.0.0.1",
    API_PORT: "4001",
    ENABLE_PAYMENT_SIMULATION: "true",
    ENABLE_DEMO_INTEGRATIONS: "true"
  });
  start("worker", "node", ["apps/worker/dist/index.js"], {
    ...baseEnv,
    // Worker main connection runs as the runtime principal: the current
    // worker code registers/heartbeats through the v1 lifecycle functions
    // (p09_worker_startup/heartbeat/transition), which migration 58 grants to
    // vanstro_runtime only. The independent Worker lifecycle principal
    // (vanstro_worker_runtime) is wired via WORKER_LIFECYCLE_DATABASE_URL,
    // matching the repo's worker config contract.
    DATABASE_URL: runtimeUrl,
    WORKER_LIFECYCLE_DATABASE_URL: workerUrl,
    WORKER_POLL_INTERVAL_MS: "1000",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "1026",
    SMTP_USER: "test",
    SMTP_PASSWORD: "test-password",
    SMTP_FROM: "VanStro Test <test@vanstro.local>",
    SMTP_REQUIRE_TLS: "false",
    ERP_API_BASE_URL: "http://127.0.0.1:4101",
    ERP_SERVICE_TOKEN: "local-staging-erp-service-token",
    VANSTRO_API_BASE_URL: "http://127.0.0.1:4001/api/v1"
  });
  await Promise.all([waitFor("http://127.0.0.1:4001/health/ready"), waitFor("http://127.0.0.1:4101/health"), waitFor("http://127.0.0.1:8026/api/v1/info")]);
  const ready = await fetch("http://127.0.0.1:4001/health/ready").then((response) => response.json());
  recordFact("api.ready.state", String(ready.data?.readiness ?? ready.readiness ?? "unknown"));
  segEnd();

  // ---- 12. business chain --------------------------------------------------------
  seg("commerce");
  const fixtureRow = psqlQ(
    adminPsqlUrl.toString(),
    `SELECT p.id || '|' || dl.id FROM products p JOIN platform_skus s ON s."productId"=p.id JOIN inventory_snapshots i ON i."skuId"=s.id JOIN dealer_locations dl ON dl.id=i."dealerLocationId" WHERE p.status='active' AND s.status='active' AND i."quantityOnHand">i."quantityReserved" LIMIT 1`
  );
  const [productId, dealerLocationId] = fixtureRow.split("|");
  if (!productId || !dealerLocationId) throw new Error("no seeded product+dealer fixture found");
  recordFact("fixture.productId", productId);

  const addressSuggestions = await request("/address/autocomplete?query=Winnipeg");
  const demoAddress = await request(`/address/autocomplete?id=${encodeURIComponent(addressSuggestions.data.suggestions[0].id)}`);
  assertEq("demoAddress.country", "CA", demoAddress.data.address.country);
  recordFact("demoAddress.city", demoAddress.data.address.city);

  // cash (manual in-store) flow
  const cart = await request("/cart");
  const cartToken = cart.meta.cartToken;
  await request("/cart/items", { method: "POST", headers: { "x-cart-token": cartToken }, body: JSON.stringify({ productId, quantity: 1 }) });
  const checkout = await request("/checkout/session", {
    method: "POST",
    headers: { "x-cart-token": cartToken, "idempotency-key": randomUUID() },
    body: JSON.stringify({ firstName: "Stage", lastName: "Buyer", email: `stage-${suffix}@vanstro.test`, phone: "2045550100", fulfillment: "pickup", paymentMethod: "cash", dealerLocationId })
  });
  const simulation = await request("/payments/simulate", { method: "POST", body: JSON.stringify({ sessionId: checkout.data.id }) });
  const paid = await request("/payments/callback", {
    method: "POST",
    headers: { "x-payment-signature": simulation.data.signature },
    body: JSON.stringify({ sessionId: checkout.data.id, status: "paid", providerPaymentId: simulation.data.providerPaymentId })
  });
  assertEq("cash.paid", "paid", paid.data.status);
  // idempotent replay of the SAME callback must not error and must not double-apply
  const replay = await request("/payments/callback", {
    method: "POST",
    headers: { "x-payment-signature": simulation.data.signature },
    body: JSON.stringify({ sessionId: checkout.data.id, status: "paid", providerPaymentId: simulation.data.providerPaymentId })
  });
  assertEq("cash.replayStatus", "paid", replay.data.status);

  // demo card flow
  const cardCart = await request("/cart");
  await request("/cart/items", { method: "POST", headers: { "x-cart-token": cardCart.meta.cartToken }, body: JSON.stringify({ productId, quantity: 1 }) });
  const cardCheckout = await request("/checkout/session", {
    method: "POST",
    headers: { "x-cart-token": cardCart.meta.cartToken, "idempotency-key": randomUUID() },
    body: JSON.stringify({ firstName: "Demo", lastName: "Card", email: `demo-card-${suffix}@vanstro.test`, phone: "2045550101", fulfillment: "pickup", paymentMethod: "card", dealerLocationId })
  });
  assertEq("card.provider", "demo", cardCheckout.meta.payment.provider);
  assertEq("card.demoFlag", "true", String(cardCheckout.meta.payment.demo === true));
  const cardPaid = await request("/payments/callback", {
    method: "POST",
    body: JSON.stringify({ sessionId: cardCheckout.data.id, status: "paid", ticket: cardCheckout.meta.payment.ticket })
  });
  assertEq("card.paid", "paid", cardPaid.data.status);

  // order reaches "processing" via worker ERP push -> mock webhook -> API
  const order = await poll(
    "order processing",
    async () => {
      const current = await request(`/orders/${paid.data.id}?token=${encodeURIComponent(checkout.data.guestOrderToken)}`);
      return current.data.status === "processing" ? current : undefined;
    },
    60_000
  );
  assertEq("order.status", "processing", order.data.status);
  recordFact("order.id", paid.data.id);
  recordFact("demoCardOrder.id", cardPaid.data.id);

  // worker startup + heartbeat: active lifecycle row with advancing observedAt
  const heartbeat = await poll(
    "worker heartbeat",
    async () => {
      const row = psqlQ(
        adminPsqlUrl.toString(),
        `SELECT "lifecycleState"||'|'||to_char("heartbeatObservedAt",'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') FROM worker_heartbeats WHERE "lifecycleState"='active' ORDER BY "heartbeatObservedAt" DESC LIMIT 1`
      );
      return row ? { raw: row, state: row.split("|")[0] } : undefined;
    },
    30_000
  );
  assertEq("worker.lifecycleState", "active", heartbeat.state);
  const later = await poll(
    "worker heartbeat advance",
    async () => {
      const row = psqlQ(
        adminPsqlUrl.toString(),
        `SELECT "lifecycleState"||'|'||to_char("heartbeatObservedAt",'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') FROM worker_heartbeats WHERE "lifecycleState"='active' ORDER BY "heartbeatObservedAt" DESC LIMIT 1`
      );
      if (!row) return undefined;
      return row > heartbeat.raw ? row : undefined;
    },
    15_000
  );
  recordFact("worker.heartbeatFirst", heartbeat.raw);
  recordFact("worker.heartbeatLater", later);

  // async task consumption: ERP job succeeded + emails delivered
  const erpStatus = await poll(
    "erp job succeeded",
    async () => {
      const status = psqlQ(adminPsqlUrl.toString(), `SELECT status FROM erp_sync_jobs WHERE type='order_create' AND payload->>'orderId'='${paid.data.id}' LIMIT 1`);
      return status === "succeeded" ? status : undefined;
    },
    60_000
  );
  assertEq("erp.jobStatus", "succeeded", erpStatus);

  const mail = await poll(
    "mailpit delivery",
    async () => {
      const response = await fetch("http://127.0.0.1:8026/api/v1/messages").then((r) => r.json());
      return response.total >= 2 ? response : undefined;
    },
    60_000
  );
  const recipients = (mail.messages as Array<{ To: Array<{ Address: string }> }>)
    .flatMap((message) => message.To.map((recipient) => recipient.Address))
    .join(",");
  assertPass("mailpit.total", mail.total >= 2, `total=${mail.total}`);
  assertPass("mailpit.stageRecipient", recipients.includes(`stage-${suffix}@vanstro.test`), `recipients=${recipients}`);
  assertPass("mailpit.cardRecipient", recipients.includes(`demo-card-${suffix}@vanstro.test`), `recipients=${recipients}`);
  const sentEmails = psqlQ(adminPsqlUrl.toString(), "SELECT count(*) FROM email_outbox WHERE status='sent'");
  assertPass("emailOutbox.sent", Number(sentEmails) >= 2, `sent=${sentEmails}`);
  recordFact("mailpit.total", String(mail.total));
  recordFact("emailOutbox.sentCount", sentEmails);
  segEnd();

  // ---- 13. evidence + success summary --------------------------------------------
  mkdirSync(evidenceOut, { recursive: true });
  const git = (args: string[]) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const identity = {
    runId,
    generatedAt: nowIso(),
    testedCommit: git(["rev-parse", "HEAD"]).stdout.trim(),
    testedTree: git(["rev-parse", "HEAD^{tree}"]).stdout.trim(),
    node: process.version,
    harness: "scripts/local-staging-e2e.mts",
    server: { mode: server.mode, host: server.host, port: server.port, database: databaseName },
    identities: {
      admin: server.adminUser,
      migrator: "vanstro_migrator",
      deploy: "vanstro_deployment_owner",
      api: "vanstro_runtime",
      workerMain: "vanstro_runtime",
      workerLifecycle: "vanstro_worker_runtime"
    }
  };
  writeFileSync(join(evidenceOut, "identity.json"), JSON.stringify(identity, null, 2) + "\n");
  const summary = {
    runId,
    overall: "SUCCESS",
    generatedAt: nowIso(),
    segments,
    assertions,
    facts,
    ledger,
    evidenceDir: evidenceOut
  };
  writeFileSync(join(evidenceOut, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, runId, orderId: paid.data.id, demoCardOrderId: cardPaid.data.id, status: order.data.status, demoAddress: demoAddress.data.address, mailCount: mail.total, heartbeatFirst: heartbeat.raw, heartbeatLater: later, erpStatus, ledger, evidenceDir: evidenceOut }, null, 2));
  console.log(`F1_COMMERCE_E2E_SUCCEEDED runId=${runId} ledger=${ledger.applied}/${ledger.unresolved}/${ledger.rolledBack}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const firstError: Record<string, string> = {
    runId,
    stage: segmentName || "unknown",
    message: redact(message),
    recordedAt: nowIso()
  };
  try {
    const adminPsqlUrl = new URL(server.adminUrl);
    adminPsqlUrl.search = "";
    const failed = firstFailedMigration(adminPsqlUrl.toString());
    if (failed) {
      firstError.failedMigration = failed.name;
      firstError.sqlState = failed.sqlState;
      firstError.migrationLog = redact(failed.logs);
    }
    const ledger = ledgerSnapshot(adminPsqlUrl.toString());
    firstError.ledger = `${ledger.applied}/${ledger.unresolved}/${ledger.rolledBack}`;
  } catch {
    // database may not exist yet; the stage + message are already recorded
  }
  if (lastDeployLabel) {
    firstError.deployLabel = lastDeployLabel;
    firstError.deployOutput = redact(lastDeployOutput).slice(-1200);
  }
  // attach bounded tails of the service logs (read before cleanup removes them)
  try {
    const logTails: Record<string, string> = {};
    for (const name of ["mailpit", "erp-mock", "api", "worker"]) {
      const file = join(logDir, `${name}.log`);
      const text = readFileSync(file, "utf8").trim();
      if (text) logTails[name] = redact(text.slice(-1500));
    }
    if (Object.keys(logTails).length > 0) firstError.logs = JSON.stringify(logTails);
  } catch {
    // logs may not exist yet
  }
  mkdirSync(evidenceOut, { recursive: true });
  writeFileSync(join(evidenceOut, "first-error.json"), JSON.stringify(firstError, null, 2) + "\n");
  console.error(JSON.stringify({ ok: false, runId, stage: firstError.stage, message: firstError.message, evidenceDir: evidenceOut }, null, 2));
  console.error(`F1_COMMERCE_E2E_FAILED runId=${runId} stage=${firstError.stage}`);
  throw error;
} finally {
  await cleanup();
}
