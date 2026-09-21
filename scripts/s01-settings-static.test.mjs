import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url);
const sql = await readFile(new URL("packages/db/prisma/migrations/20260805100000_s01_settings_core/migration.sql", root), "utf8");
const schema = await readFile(new URL("packages/db/prisma/schema.prisma", root), "utf8");
const api = await readFile(new URL("apps/api/src/dashboard/settings.ts", root), "utf8");

test("S01 migration is one atomic forward migration with exact descriptor", () => {
  assert.match(sql,/^BEGIN;/); assert.match(sql,/COMMIT;\s*$/);
  assert.equal((sql.match(/settings\.core\.overview_refresh_seconds/g)??[]).length > 5,true);
  assert.doesNotMatch(sql,/payment\.credentials|smtp\.credentials|erp\.credentials|universal|provider/i);
  assert.match(schema,/settingsChangeReason\s+String\?/);
});
test("S01 controlled functions enforce global authority, CAS and idempotency", () => {
  assert.match(sql,/s01_settings_authorize_v2/); assert.match(sql,/\(value->>'global'\)::boolean/);
  assert.match(sql,/S01_VERSION_CONFLICT/); assert.match(sql,/settings_command_ledger/); assert.match(sql,/S01_IDEMPOTENCY_CONFLICT/);
  assert.match(sql,/pg_advisory_xact_lock/); assert.match(sql,/s01_settings_audit_v2/); assert.match(sql,/settingsLifecycleStatus/); assert.doesNotMatch(sql,/settingsLifecycleStatus"='rolled_back'/);
  assert.match(sql,/REVOKE ALL ON FUNCTION/); assert.match(sql,/GRANT EXECUTE ON FUNCTION/);
});
test("S01 routes are typed and readiness remains side-effect-free", () => {
  for (const route of ["overview","registry","drafts","validate","diff","publish","history","rollback-draft","readiness"]) assert.match(api,new RegExp(route.replace("-","\\-")));
  const readiness = api.match(/routes\.get\("\/dashboard\/settings\/readiness"[^;]+;/s)?.[0] ?? "";
  assert.match(readiness,/allSettingsRows/); assert.doesNotMatch(readiness,/create|update|publish|provider/i);
  assert.doesNotMatch(api,/foundation\.runtime\.refresh_interval_seconds/);
});
