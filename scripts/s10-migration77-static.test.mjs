import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = join(ROOT, "packages/db/prisma/migrations");
const M77 = join(MIGRATIONS, "20260807000000_s10_privacy_retention_settings");

function dirs() {
  return execFileSync("bash", ["-c", `cd "${MIGRATIONS}" && for d in */; do basename "$d"; done`], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name !== "migration_lock.toml");
}

test("migration count is 79 with exactly one s10 and one s08 dir and no 80", () => {
  const list = dirs();
  assert.equal(list.length, 79, `expected 79 migrations, got ${list.length}`);
  const s10 = list.filter((name) => name.includes("s10_privacy_retention_settings"));
  assert.equal(s10.length, 1, "exactly one s10 migration dir");
  assert.equal(list.filter((name) => name.includes("s08_api_service_accounts")).length, 1, "exactly one s08 migration79");
  assert.ok(!list.some((name) => /^20260809/.test(name)), "no migration80");
});

test("migration77 keeps S01/S02/S09 _v2 functions untouched and adds s10_* functions", () => {
  const sql = readFileSync(join(M77, "migration.sql"), "utf8");
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.s0[129]_settings_/s, "S01/S02/S09 _v2 functions must be preserved verbatim, not recreated");
  for (const fn of [
    "s10_settings_value_shape_valid", "s10_settings_value_business_valid",
    "s10_settings_authorize_v2", "s10_settings_audit_v2", "s10_settings_ledger_v1",
    "s10_settings_create_draft_v2", "s10_settings_update_draft_v2", "s10_settings_validate_v2",
    "s10_settings_publish_v2", "s10_settings_rows_v2", "s10_settings_events_v2"
  ]) {
    assert.match(sql, new RegExp(`CREATE FUNCTION public\\.${fn}\\b`), `${fn} must be created`);
  }
  assert.match(sql, /hashtextextended\('settings\.privacy-retention',0\)/, "S10 must use its own lock domain");
  assert.match(sql, /'s10_create_draft','s10_update_draft','s10_validate_draft','s10_publish_draft','s10_create_rollback_draft'/, "ledger CHECK must include s10_* operations");
  assert.match(sql, /'s09_create_draft','s09_update_draft','s09_validate_draft','s09_publish_draft','s09_create_rollback_draft'/, "S09 operations must remain in the ledger CHECK");
  assert.match(sql, /'settings\.privacy-retention'/, "registry CHECK must include the S10 descriptor");
  assert.match(sql, /retentionMonths.{0,80}6.{0,80}120/s, "retentionMonths bound 6..120");
  assert.match(sql, /retentionDays.{0,80}30.{0,80}7300/s, "retentionDays bound 30..7300");
  assert.match(sql, /legalHoldEnabled/, "legal hold policy must be validated");
  assert.match(sql, /high-risk/, "high-risk family invariant must be explicit");
  // Zero data side effects: no DELETE/UPDATE on business tables, no job creation.
  assert.doesNotMatch(sql, /DELETE FROM public\.(privacy_consent_events|audit_events|async_jobs|orders|payments|media_assets|privacy_requests)/i, "no deletion operations on business data");
  assert.doesNotMatch(sql, /INSERT INTO public\.async_jobs/i, "no job creation");
  assert.doesNotMatch(sql, /jobType/i, "no job creation");
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.cleanup/i, "no cleanup scheduler function");
  assert.doesNotMatch(sql, /CREATE TABLE public\.(privacy|audit|dsar|legal_hold)/i, "no duplicate privacy/Audit fact tables");
  assert.doesNotMatch(sql, /public\.s1[12]_|public\.b09_|'s1[12]_|'b09_/i, "no S11/S12/B09 code paths");
  assert.doesNotMatch(sql, /s09_settings_effective_policy|SESSION_TTL/i, "no cross-domain resolver reuse");
});

test("migration77 SQL is well-formed: BEGIN/COMMIT balanced, functions closed", () => {
  const sql = readFileSync(join(M77, "migration.sql"), "utf8");
  const begins = (sql.match(/^BEGIN;/gm) ?? []).length;
  const commits = (sql.match(/^COMMIT;/gm) ?? []).length;
  assert.equal(begins, 1, "exactly one BEGIN");
  assert.equal(commits, 1, "exactly one COMMIT");
  const fns = (sql.match(/CREATE FUNCTION/g) ?? []).length;
  const fnEnds = (sql.match(/\$fn\$/g) ?? []).length;
  assert.equal(fnEnds, fns * 2, `function delimiter count must be 2x functions (${fns} functions, ${fnEnds} delimiters)`);
});

test("no secrets or PII patterns in migration77", () => {
  const sql = readFileSync(join(M77, "migration.sql"), "utf8");
  const pattern = /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|DATABASE_URL\s*[:=]|PASSWORD\s*[:=]|SECRET\s*[:=]|TOKEN\s*[:=])/i;
  assert.doesNotMatch(sql, pattern);
  assert.doesNotMatch(sql, /consentPayload|deletionTarget|privacy_consent_events\.preferences/, "no consent payload or deletion target handling");
});
