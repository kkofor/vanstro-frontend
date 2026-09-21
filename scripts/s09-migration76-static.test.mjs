import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = join(ROOT, "packages/db/prisma/migrations");
const M76 = join(MIGRATIONS, "20260806100000_s09_auth_rbac_settings");

function dirs() {
  return execFileSync("bash", ["-c", `cd "${MIGRATIONS}" && for d in */; do basename "$d"; done`], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name !== "migration_lock.toml");
}

test("migration count is 79 with exactly one s09 and one s08 dir and no 80", () => {
  const list = dirs();
  assert.equal(list.length, 79, `expected 79 migrations, got ${list.length}`);
  assert.equal(list.filter((name) => name.includes("s09_auth_rbac_settings")).length, 1, "exactly one s09 migration dir");
  assert.equal(list.filter((name) => name.includes("s08_api_service_accounts")).length, 1, "exactly one s08 migration dir");
  assert.ok(!list.some((name) => /^20260809/.test(name)), "no migration80");
});

test("migration76 keeps S01/S02 _v2 functions untouched and adds s09_* functions", () => {
  const sql = readFileSync(join(M76, "migration.sql"), "utf8");
  // S01/S02 _v2 functions must not be CREATE OR REPLACE'd in migration76
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.s0[12]_settings_/s, "S01/S02 _v2 functions must be preserved verbatim, not recreated");
  // S09 controlled functions must exist
  for (const fn of [
    "s09_settings_value_shape_valid", "s09_settings_value_business_valid",
    "s09_settings_authorize_v2", "s09_settings_audit_v2", "s09_settings_ledger_v1",
    "s09_settings_create_draft_v2", "s09_settings_update_draft_v2", "s09_settings_validate_v2",
    "s09_settings_publish_v2", "s09_settings_rows_v2", "s09_settings_events_v2",
    "s09_settings_effective_policy_v1"
  ]) {
    assert.match(sql, new RegExp(`CREATE FUNCTION public\\.${fn}\\b`), `${fn} must be created`);
  }
  // Independent lock domain
  assert.match(sql, /hashtextextended\('settings\.auth-rbac',0\)/, "S09 must use its own lock domain");
  // Forward-extended ledger operation CHECK with s09_* operations (S01+S02 retained)
  assert.match(sql, /'s09_create_draft','s09_update_draft','s09_validate_draft','s09_publish_draft','s09_create_rollback_draft'/, "ledger CHECK must include s09_* operations");
  assert.match(sql, /'create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft'/, "S01 operations must remain in the ledger CHECK");
  assert.match(sql, /'s02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft'/, "S02 operations must remain in the ledger CHECK");
  // Registry allowlist forward extension (both legal Settings descriptors)
  assert.match(sql, /'settings\.general-storefront','settings\.auth-rbac'/, "registry CHECK must include S02 and S09 descriptors");
  // Typed value: exact key sets with integer bounds (no secrets, no session facts)
  assert.match(sql, /minimumLength.{0,80}12.{0,80}128/s, "minimumLength bound 12..128");
  assert.match(sql, /resetTokenTtlMinutes.{0,80}5.{0,80}31/s, "resetTokenTtlMinutes bound 5..31");
  assert.match(sql, /sessionLifetimeMinutes.{0,80}15.{0,80}11520/s, "sessionLifetimeMinutes bound 15..11520");
  // Secret denylist in business_valid (TTL suffix exempt)
  assert.match(sql, /cookie\|secret\|hash\|salt\|credential\|authorization\|token\(\?!ttl\)/, "business_valid must reject secret-shaped fields");
  // Effective policy resolver with compiled defaults
  assert.match(sql, /s09_settings_effective_policy_v1\(\)/, "effective policy resolver must exist");
  assert.match(sql, /compiled_default/, "resolver must expose compiled_default projection state");
  assert.match(sql, /publishedGeneration/, "resolver must expose publishedGeneration");
  // No new descriptor column / no copy of User/Role/Permission or session facts / no secret storage / no S10
  assert.doesNotMatch(sql, /CREATE TABLE public\.(users|roles|permissions|role_permissions|user_roles|refresh_sessions)/, "no new identity or session tables");
  assert.doesNotMatch(sql, /CREATE TABLE.*(secret|credential|token)/i, "no secret storage");
  assert.doesNotMatch(sql, /S10|s10_/, "no S10 schema or functions");
  // ACL pattern for the resolver: runtime role must be able to read it
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.s09_settings_effective_policy_v1\(\) TO vanstro_runtime/, "resolver must be callable by vanstro_runtime");
});

test("migration76 SQL is well-formed: BEGIN/COMMIT balanced, functions closed", () => {
  const sql = readFileSync(join(M76, "migration.sql"), "utf8");
  const begins = (sql.match(/^BEGIN;/gm) ?? []).length;
  const commits = (sql.match(/^COMMIT;/gm) ?? []).length;
  assert.equal(begins, 1, "exactly one BEGIN");
  assert.equal(commits, 1, "exactly one COMMIT");
  const fns = (sql.match(/CREATE FUNCTION/g) ?? []).length;
  const fnEnds = (sql.match(/\$fn\$/g) ?? []).length;
  // each CREATE FUNCTION has exactly one opening and one closing $fn$ delimiter
  assert.equal(fnEnds, fns * 2, `function delimiter count must be 2x functions (${fns} functions, ${fnEnds} delimiters)`);
});

test("no secrets or credential patterns in migration76", () => {
  const sql = readFileSync(join(M76, "migration.sql"), "utf8");
  const pattern = /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|DATABASE_URL\s*[:=]|PASSWORD\s*[:=]|SECRET\s*[:=]|TOKEN\s*[:=])/i;
  assert.doesNotMatch(sql, pattern);
});
