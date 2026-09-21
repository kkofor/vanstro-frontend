import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = join(ROOT, "packages/db/prisma/migrations");
const M79 = join(MIGRATIONS, "20260808000000_s08_api_service_accounts");
// Integration baseline frozen by the S08 contract (a02aa880): migrations 1-78
// must stay byte-immutable; S08 adds exactly one new directory.
const BASELINE = "a02aa880da70a21c88ca2c60098662c346d430ff";

function git(...args) {
  return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
}
function dirs() {
  return execFileSync("bash", ["-c", `cd "${MIGRATIONS}" && for d in */; do basename "$d"; done`], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name !== "migration_lock.toml");
}

test("migration inventory is exactly 79 with S08 latest and no 80", () => {
  const list = dirs();
  assert.equal(list.length, 79, `expected 79 migrations, got ${list.length}`);
  assert.equal(list.at(-1), "20260808000000_s08_api_service_accounts", "latest migration must be S08");
  assert.equal(list.filter((name) => name.includes("s08_api_service_accounts")).length, 1, "exactly one s08 migration dir");
  assert.ok(!list.some((name) => /^20260809/.test(name)), "no migration80 (nothing dated after the S08 slot)");
});

test("migrations 1-78 are byte-immutable vs the Integration baseline a02aa880", () => {
  const baselineDirs = git("ls-tree", "--name-only", BASELINE, "packages/db/prisma/migrations/")
    .split("\n").map((entry) => entry.split("/").at(-1) ?? entry).filter((name) => name !== "migration_lock.toml");
  assert.equal(baselineDirs.length, 78, `baseline must hold 78 migration dirs, got ${baselineDirs.length}`);
  for (const name of baselineDirs) {
    const baselineBlob = git("rev-parse", `${BASELINE}:packages/db/prisma/migrations/${name}/migration.sql`);
    const workingBlob = git("hash-object", join(MIGRATIONS, name, "migration.sql"));
    assert.equal(workingBlob, baselineBlob, `${name}/migration.sql must stay byte-immutable`);
  }
});

test("M79 is isolated typed S08 lifecycle with zero domain side effects", () => {
  const sql = readFileSync(join(M79, "migration.sql"), "utf8");
  for (const name of ["value_shape_valid", "value_business_valid", "authorize_v2", "audit_v2", "ledger_v1", "create_draft_v2", "update_draft_v2", "validate_v2", "publish_v2", "rows_v2", "events_v2"]) {
    assert.match(sql, new RegExp(`CREATE FUNCTION public\\.s08_settings_${name}`), `${name} must be created`);
  }
  assert.match(sql, /hashtextextended\('settings\.api-service-account',0\)/, "S08 must use its own lock domain");
  assert.match(sql, /'settings\.api-service-account'/, "registry CHECK must include the S08 descriptor");
  assert.match(sql, /'s08_create_draft','s08_update_draft','s08_validate_draft','s08_publish_draft','s08_create_rollback_draft'/, "ledger CHECK must include s08_* operations");
  assert.match(sql, /'s03_create_draft','s03_update_draft','s03_validate_draft','s03_publish_draft','s03_create_rollback_draft'/, "S03 operations must remain in the ledger CHECK");
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.s(?:01|02|03|09|10)_/, "S01/S02/S03/S09/S10 _v2 functions must be preserved verbatim, not recreated");
  assert.doesNotMatch(sql, /CREATE TABLE|INSERT INTO public\.(?:orders|payments|carts|inventory|async_jobs|mcp_tool_invocations|audit_logs)/i, "no business fact table rebuild or insert");
  assert.equal((sql.match(/^BEGIN;/gm) ?? []).length, 1, "exactly one BEGIN");
  assert.equal((sql.match(/^COMMIT;/gm) ?? []).length, 1, "exactly one COMMIT");
  assert.equal((sql.match(/END \$fn\$;/g) ?? []).length, (sql.match(/CREATE FUNCTION public\.s08_settings_/g) ?? []).length, "every function body is closed");
  assert.doesNotMatch(sql, /(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|DATABASE_URL\s*[:=]|PASSWORD\s*[:=]|SECRET\s*[:=]|TOKEN\s*[:=])/i, "no secrets or credential patterns");
});

test("M79 adds only minimal ServiceAccount/Token lifecycle metadata", () => {
  const sql = readFileSync(join(M79, "migration.sql"), "utf8");
  assert.match(sql, /ALTER TABLE public\.service_accounts ADD COLUMN IF NOT EXISTS "environment" text NOT NULL DEFAULT 'production'/, "account environment column");
  for (const column of ["replacedByTokenId", "rotateIdempotencyKey", "rotateRequestHash", "overlapUntil"]) {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.service_account_tokens ADD COLUMN IF NOT EXISTS "${column}"`), `token column ${column}`);
  }
  assert.match(sql, /service_account_tokens_replaced_by_fk FOREIGN KEY \("replacedByTokenId"\) REFERENCES public\.service_account_tokens\("id"\)/, "predecessor FK");
  assert.match(sql, /service_account_tokens_rotate_idempotency_idx/, "rotate idempotency index");
  assert.doesNotMatch(sql, /"tokenHash"\s+[^,]*DEFAULT/i, "tokenHash column keeps no SQL default");
  assert.doesNotMatch(sql, /vsa_[A-Za-z0-9_-]{20,}/, "no plaintext vsa_ token literal stored");
  assert.doesNotMatch(sql, /INSERT INTO public\.service_account_tokens/i, "no token rows inserted by the migration");
});
