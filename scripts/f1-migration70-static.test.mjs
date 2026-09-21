import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
// Functional-first M70 byte authority: the repo migration70 must be
// byte-identical to the v1.0.3 successor's generated executable authority.
// This focused gate is functional-first by contract: it asserts the kept
// functional surface (consume / CONFIG_AUDIT_PRECHECK / 3 constraints /
// attestation consume check / source_latest / resolver role-wrap / 3 v3
// functions / GRANT EXECUTE / limited final postassert) and explicitly does
// NOT require the A+ multi-role ACL closure (no REVOKE, no ALTER OWNER, no
// OLD_EXECUTE_REMAINS, no owner/grantor/grantable/public/worker purity).
const successorAuthority = new URL(
  "../tasks/tooling/f1-v15-clarification/v1.0.3-migration70-authority/",
  import.meta.url
);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

const migrationBytes = await readFile(new URL("packages/db/prisma/migrations/20260804110000_f1_v15_phase_b/migration.sql", root));
const migration = migrationBytes.toString("utf8");

test("migration70 is byte-identical to the v1.0.3 generated functional-first authority", async () => {
  const generated = await readFile(new URL("generated/10-migration70-executable-authority.sql", successorAuthority));
  assert.deepEqual(migrationBytes, generated);
  assert.equal(sha(migrationBytes), "93e3657383c8d1f9ae023cdcd1344a33cf49090444dcbbcdabe2ab3e0d525288");
  assert.match(migration, /^BEGIN;\n/);
  assert.match(migration, /-- GENERATED — DO NOT EDIT\n-- model SHA-256: [0-9a-f]{64}\n-- status: FROZEN/);
  assert.equal((migration.match(/^BEGIN;$/gm) ?? []).length, 1);
  assert.equal((migration.match(/^COMMIT;$/gm) ?? []).length, 1);
  assert.match(migration, /COMMIT;\n$/);
});

test("vendored v1.0.3 authority manifest and hashes match the frozen package", async () => {
  const manifest = (await readFile(new URL("MANIFEST.sha256", successorAuthority), "utf8")).trim().split("\n").map((line) => line.split(/\s+/));
  assert.equal(manifest.length, 8);
  for (const [expected, file] of manifest) {
    assert.equal(sha(await readFile(new URL(file, successorAuthority))), expected, `vendored ${file} drifts from MANIFEST.sha256`);
  }
  assert.equal(sha(await readFile(new URL("generated/10-migration70-executable-authority.sql", successorAuthority))), "93e3657383c8d1f9ae023cdcd1344a33cf49090444dcbbcdabe2ab3e0d525288");
});

test("migration70 keeps the functional-first surface in order", () => {
  // preamble: timeouts + serializable + consume + precheck
  assert.match(migration, /SET LOCAL lock_timeout='5s';/);
  assert.match(migration, /SET LOCAL statement_timeout='60s';/);
  assert.match(migration, /SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;/);
  assert.match(migration, /SELECT public\.f1_consume_no_old_instances_v2\(current_setting\('vanstro\.rollout_id'\),current_setting\('vanstro\.environment'\),current_setting\('vanstro\.manifest_digest'\)\);/);
  assert.match(migration, /CONFIG_AUDIT_PRECHECK/);
  // 3 audit-required constraints: ADD NOT VALID + VALIDATE pairs
  assert.equal((migration.match(/runtime_config_version_authority2_audit_required/g) ?? []).length, 2);
  assert.equal((migration.match(/feature_flag_version_authority2_audit_required/g) ?? []).length, 2);
  assert.equal((migration.match(/analytics_foundation_event_authority2_audit_required/g) ?? []).length, 2);
  assert.equal((migration.match(/NOT VALID;/g) ?? []).length, 3);
  assert.equal((migration.match(/VALIDATE CONSTRAINT/g) ?? []).length, 3);
  // attestation consume check WITHOUT OLD_EXECUTE
  assert.match(migration, /ATTESTATION_CONSUME_POSTASSERT/);
  // source_latest
  assert.match(migration, /DO \$source_latest\$/);
  assert.match(migration, /F1_PHASE_B_SOURCE_LATEST_POSTASSERT/);
  // resolver DROP/ADD wrapped exactly twice with the p02 guard owner role
  assert.equal((migration.match(/SET LOCAL ROLE vanstro_p02_guard_owner;/g) ?? []).length, 2);
  assert.equal((migration.match(/^RESET ROLE;$/gm) ?? []).length, 2);
  assert.match(migration, /SET LOCAL ROLE vanstro_p02_guard_owner;[\s\S]*DROP CONSTRAINT f1_p02_resolver_registry_closed_check;[\s\S]*RESET ROLE;[\s\S]*SET LOCAL ROLE vanstro_p02_guard_owner;[\s\S]*ADD CONSTRAINT f1_p02_resolver_registry_closed_check[\s\S]*RESET ROLE;[\s\S]*INSERT INTO public\.f1_p02_resolver_registry/);
  // 3 v3 functions present and unchanged in shape
  assert.equal((migration.match(/CREATE OR REPLACE FUNCTION public\.p09_config_list_v3\(/g) ?? []).length, 1);
  assert.equal((migration.match(/CREATE OR REPLACE FUNCTION public\.p09_flag_list_v3\(/g) ?? []).length, 1);
  assert.equal((migration.match(/CREATE OR REPLACE FUNCTION public\.p10_list_release_day_v3\(/g) ?? []).length, 1);
  // GRANT EXECUTE v3 x3 to vanstro_runtime
  assert.equal((migration.match(/GRANT EXECUTE ON FUNCTION public\.p09_config_list_v3\(text,text,text,text\[\],text\[\]\) TO vanstro_runtime;/g) ?? []).length, 1);
  assert.equal((migration.match(/GRANT EXECUTE ON FUNCTION public\.p09_flag_list_v3\(text,text,text,text\[\],text\[\]\) TO vanstro_runtime;/g) ?? []).length, 1);
  assert.equal((migration.match(/GRANT EXECUTE ON FUNCTION public\.p10_list_release_day_v3\(text,date,text\) TO vanstro_runtime;/g) ?? []).length, 1);
});

test("migration70 has no A+ multi-role ACL gates", () => {
  // no legacy / v2 revokes, no ALTER OWNER, no default-privilege revoke
  assert.equal((migration.match(/REVOKE/g) ?? []).length, 0);
  assert.equal((migration.match(/ALTER FUNCTION/g) ?? []).length, 0);
  assert.equal((migration.match(/ALTER DEFAULT PRIVILEGES/g) ?? []).length, 0);
  assert.equal((migration.match(/OWNER TO /g) ?? []).length, 0);
  // no OLD_EXECUTE / role-reset / closure postasserts, no guard-owner owners,
  // no aclexplode closure, no worker-runtime purity
  assert.equal((migration.match(/OLD_EXECUTE_REMAINS|M70_ROLE_RESET|F1_PHASE_B_OLD_EXECUTE_POSTASSERT|F1_PHASE_B_OWNER_POSTASSERT|M70_GRANTABLE_RECLAIM|M70_GUARD_SCHEMA_CREATE_DENIAL/g) ?? []).length, 0);
  assert.equal((migration.match(/aclexplode/g) ?? []).length, 0);
  assert.equal((migration.match(/vanstro_p08_guard_owner|vanstro_p09_guard_owner|vanstro_p10_guard_owner|vanstro_worker_runtime/g) ?? []).length, 0);
});

test("final postassert is limited to the 4 functional checks", () => {
  assert.equal((migration.match(/F1_PHASE_B_ATTESTATION_POSTASSERT/g) ?? []).length, 1);
  assert.equal((migration.match(/F1_PHASE_B_RESOLVER_POSTASSERT/g) ?? []).length, 1);
  assert.equal((migration.match(/F1_PHASE_B_FUNCTION_HARDENING_POSTASSERT/g) ?? []).length, 1);
  assert.equal((migration.match(/F1_PHASE_B_ACL_POSTASSERT/g) ?? []).length, 1);
  // runtime EXECUTE is asserted positively for vanstro_runtime only
  assert.equal((migration.match(/has_function_privilege\('vanstro_runtime'/g) ?? []).length, 3);
  assert.doesNotMatch(migration, /has_function_privilege\('vanstro_worker_runtime'/);
});

test("81-tree source preserves migrations69-70 byte-exact in order", async () => {
  const entries = (await readdir(new URL("packages/db/prisma/migrations/", root), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.equal(entries.length, 81);
  const index69 = entries.indexOf("20260804100000_f1_v15_expand");
  const index70 = entries.indexOf("20260804110000_f1_v15_phase_b");
  assert.ok(index69 >= 0 && index70 > index69, "migration69 must precede migration70");
  assert.equal(entries.at(-1), "20260810110000_s12_erp_webhooks");
  const migration69 = await readFile(new URL("packages/db/prisma/migrations/20260804100000_f1_v15_expand/migration.sql", root));
  assert.equal(sha(migration69), "07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051");
  assert.equal(sha(migrationBytes), "93e3657383c8d1f9ae023cdcd1344a33cf49090444dcbbcdabe2ab3e0d525288");
  const generated = await readFile(new URL("packages/db/src/generated/source-latest-migration.ts", root), "utf8");
  assert.match(generated, /SOURCE_LATEST_MIGRATION_NUMBER = 73/);
  assert.match(generated, /20260805100000_s01_settings_core/);
});

test("v3 list and release boundaries are fixed, redacted, and ordered", () => {
  assert.match(migration, /p09_config_list_v3\(\s*session_token_hash text,\s*expected_context_revision text/);
  assert.equal((migration.match(/r\."activationStatus" = 'active'/g) ?? []).length, 2);
  assert.match(migration, /p09_flag_list_v3\(\s*session_token_hash text,\s*expected_context_revision text/);
  assert.match(migration, /p10_list_release_day_v3\(\s*session_token_hash text,\s*release_day date,\s*expected_context_revision text/);
  assert.match(migration, /WHERE r\."releaseDay" = release_day[\s\S]*r\."fieldVisibilityProfile" = 'safe'[\s\S]*r\."authorityVersion" = 2/);
  assert.match(migration, /'publishedValue', CASE WHEN c\.state = 'published' THEN c\."publishedValue" ELSE NULL END/);
  assert.match(migration, /'cells', COALESCE\([\s\S]*'\[\]'::jsonb/);
  assert.match(migration, /ORDER BY CASE c\."cellKey"[\s\S]*WHEN 'view' THEN 6/);
  assert.doesNotMatch(migration, /'scopeFingerprint', release_row\."scopeFingerprint"|'sourceCutoff', release_row|'sealedAt', release_row|'lateExcludedCount', release_row/);
  assert.match(migration, /'releaseId', release_row\.id/);
  assert.match(migration, /'releaseDay', release_row\."releaseDay"/);
  assert.match(migration, /'metricDefinitionVersion', release_row\."metricDefinitionVersion"/);
  assert.match(migration, /'identityEpoch', release_row\."identityEpoch"/);
});
