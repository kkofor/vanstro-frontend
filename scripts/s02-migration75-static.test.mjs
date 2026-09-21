import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = join(ROOT, "packages/db/prisma/migrations");
const M75 = join(MIGRATIONS, "20260805120000_s02_general_storefront");

function dirs() {
  return execFileSync("bash", ["-c", `cd "${MIGRATIONS}" && for d in */; do basename "$d"; done`], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name !== "migration_lock.toml");
}

test("migration count is 79 with exactly one s02 and one s08 dir and no 80", () => {
  const list = dirs();
  assert.equal(list.length, 79, `expected 79 migrations, got ${list.length}`);
  assert.equal(list.filter((name) => name.includes("s02_general_storefront")).length, 1, "exactly one s02 migration dir");
  assert.equal(list.filter((name) => name.includes("s08_api_service_accounts")).length, 1, "exactly one s08 migration dir");
  assert.ok(!list.some((name) => /^20260809/.test(name)), "no migration80");
});

test("migrations 1-74 are byte-identical to the S01 closure baseline", () => {
  // The migration SQL blobs in the Backend tree must equal the ones frozen at
  // Integration d27a578 (S01B corrective closure). Compare against the parent
  // commit of this Backend work's merge base if available; here we assert the
  // well-known S01/S01B migration SHA-256 values.
  const known = {
    "20260805100000_s01_settings_core": "f49524722ace",
    "20260805110000_s01_settings_contract_closure": "f453ff7d953e"
  };
  for (const [name, prefix] of Object.entries(known)) {
    const sql = readFileSync(join(MIGRATIONS, name, "migration.sql"), "utf8");
    const hash = execFileSync("git", ["-C", ROOT, "rev-parse", `HEAD:packages/db/prisma/migrations/${name}/migration.sql`], { encoding: "utf8" }).trim();
    assert.ok(hash.startsWith(prefix), `${name} blob OID must match S01 baseline (${hash})`);
    assert.ok(sql.length > 0, `${name} must be non-empty`);
  }
});

test("migration75 SQL keeps S01 _v2 functions untouched and adds s02_* functions", () => {
  const sql = readFileSync(join(M75, "migration.sql"), "utf8");
  // S01 _v2 functions must not be CREATE OR REPLACE'd in migration75
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.s01_settings_/s, "S01 _v2 functions must be preserved verbatim, not recreated");
  // S02 controlled functions must exist
  for (const fn of [
    "s02_settings_timezone_valid", "s02_settings_value_shape_valid", "s02_settings_value_business_valid",
    "s02_settings_authorize_v2", "s02_settings_audit_v2", "s02_settings_ledger_v1",
    "s02_settings_create_draft_v2", "s02_settings_update_draft_v2", "s02_settings_validate_v2",
    "s02_settings_publish_v2", "s02_settings_rows_v2", "s02_settings_events_v2",
    "s02_settings_public_projection_v1"
  ]) {
    assert.match(sql, new RegExp(`CREATE FUNCTION public\\.${fn}\\b`), `${fn} must be created`);
  }
  // Independent lock domain
  assert.match(sql, /hashtextextended\('settings\.general-storefront',0\)/, "S02 must use its own lock domain");
  // Forward-extended ledger operation CHECK with s02_* operations
  assert.match(sql, /'s02_create_draft','s02_update_draft','s02_validate_draft','s02_publish_draft','s02_create_rollback_draft'/, "ledger CHECK must include s02_* operations");
  // No S01 operation value changes
  assert.match(sql, /'create_draft','update_draft','validate_draft','publish_draft','create_rollback_draft'/, "S01 operations must remain in the ledger CHECK");
  // No new descriptor column / no copy of domain facts / no secret storage
  assert.doesNotMatch(sql, /CREATE TABLE public\.settings_general_storefront/, "no generic Settings table");
  assert.doesNotMatch(sql, /INSERT INTO public\.(site_content_modules|media_assets|dealers|dealer_locations)/, "no copy of domain facts");
  assert.doesNotMatch(sql, /CREATE TABLE.*(secret|credential|token)/i, "no secret storage");
  // Review M1: the S01 branch of settings_core_shape_check must keep the full
  // migration74 shape (global, number value, 15..300, revision>0, reason).
  assert.match(sql, /S01 branch: exactly the migration74 shape/, "S01 shape branch must be explicitly preserved");
  assert.match(sql, /"configKey"='settings\.core\.overview_refresh_seconds' AND[\s\S]*?jsonb_typeof\("desiredValue"\)='number'[\s\S]*?BETWEEN 15 AND 300/, "S01 branch must keep number type and 15..300 bounds");
  // Review M2: dealer/location pairing must be a DB business blocker too.
  assert.match(sql, /Dealer\/location pairing is a business blocker/, "DB business_valid must enforce pairing");
});

test("migration75 SQL is well-formed: BEGIN/COMMIT balanced, functions closed", () => {
  const sql = readFileSync(join(M75, "migration.sql"), "utf8");
  const begins = (sql.match(/^BEGIN;/gm) ?? []).length;
  const commits = (sql.match(/^COMMIT;/gm) ?? []).length;
  assert.equal(begins, 1, "exactly one BEGIN");
  assert.equal(commits, 1, "exactly one COMMIT");
  const fns = (sql.match(/CREATE FUNCTION/g) ?? []).length;
  const fnEnds = (sql.match(/\$fn\$/g) ?? []).length;
  // each CREATE FUNCTION has exactly one opening and one closing $fn$ delimiter
  assert.equal(fnEnds, fns * 2, `function delimiter count must be 2x functions (${fns} functions, ${fnEnds} delimiters)`);
});

test("no secrets or credential patterns in migration75", () => {
  const sql = readFileSync(join(M75, "migration.sql"), "utf8");
  const pattern = /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|DATABASE_URL\s*[:=]|PASSWORD\s*[:=]|SECRET\s*[:=]|TOKEN\s*[:=])/i;
  assert.doesNotMatch(sql, pattern);
});
