import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "../../..");
const migration = readFileSync(join(root, "packages/db/prisma/migrations/20260803120000_dashboard_p09_runtime_foundation/migration.sql"), "utf8");
const contract = readFileSync("/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p09-runtime-config-flags-readiness-contract-v1.0-20260803.md", "utf8");

test("P09 contract identity and deny-by-default registry are fixed", () => {
  assert.equal(contract.includes("Contract version: **v1.0**"), true);
  assert.equal(contract.includes("Contract status: **FROZEN**"), true);
  assert.match(migration, /configKey" IN \('foundation\.runtime\.refresh_interval_seconds','foundation\.runtime\.display_mode','foundation\.runtime\.safe_origin'\)/);
  assert.match(migration, /flagKey"='foundation\.runtime\.sample_flag'/);
  assert.doesNotMatch(migration, /EXECUTE\s+[^;]*\|\|/i);
});

test("P09 migration denies direct runtime tables and fixes security definer boundaries", () => {
  assert.match(migration, /REVOKE ALL ON TABLE public\.runtime_config_version, public\.feature_flag_version FROM PUBLIC, vanstro_runtime/);
  assert.match(migration, /SECURITY DEFINER SET search_path = pg_catalog, public/g);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.p09_authorized_binding/);
  assert.match(migration, /current_database\(\)!~\*'\(test\|smoke\|disposable\)'/);
  assert.doesNotMatch(migration, /GRANT (?:SELECT|INSERT|UPDATE|DELETE)[^;]* TO vanstro_runtime/i);
});

test("P09 migration stores no plaintext secret and uses operation-specific functions", () => {
  assert.doesNotMatch(migration, /password|tokenValue|credentialValue|secretValue/i);
  assert.match(migration, /CREATE FUNCTION public\.p09_config_propose/);
  assert.match(migration, /CREATE FUNCTION public\.p09_config_activate/);
  assert.match(migration, /CREATE FUNCTION public\.p09_config_rollback/);
  assert.match(migration, /CREATE FUNCTION public\.p09_flag_propose/);
  assert.match(migration, /CREATE FUNCTION public\.p09_flag_activate/);
  assert.doesNotMatch(migration, /p09_(?:generic|crud|execute|query)/i);
});
