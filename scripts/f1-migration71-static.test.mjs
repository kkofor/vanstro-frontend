import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { AUDIT_RESOURCE_TYPES } from "../packages/db/src/audit-resource-registry.ts";

const root = new URL("../", import.meta.url);
const migrationUrl = new URL("packages/db/prisma/migrations/20260804120000_f1_v15_compatibility_closure/migration.sql", root);
const migration = await readFile(migrationUrl, "utf8");
const auditConstraint = migration.match(/ADD CONSTRAINT audit_events_resource_type_check CHECK \("resourceType" IN \(([\s\S]*?)\n  \)\);/);
assert.ok(auditConstraint, "migration71 must define the Audit resource constraint");
const sqlResources = [...auditConstraint[1].matchAll(/'([a-z][a-z0-9_]*)'/g)]
  .map((match) => match[1]);

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("81-tree source preserves migrations69-71 byte-exact in order", async () => {
  const entries = (await readdir(new URL("packages/db/prisma/migrations/", root), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.equal(entries.length, 81);
  const index69 = entries.indexOf("20260804100000_f1_v15_expand");
  const index70 = entries.indexOf("20260804110000_f1_v15_phase_b");
  const index71 = entries.indexOf("20260804120000_f1_v15_compatibility_closure");
  assert.ok(index69 >= 0 && index70 > index69 && index71 > index70, "migration69/70/71 order must be preserved");
  assert.equal(entries.at(-1), "20260810110000_s12_erp_webhooks");
  assert.equal(sha(await readFile(new URL("packages/db/prisma/migrations/20260804100000_f1_v15_expand/migration.sql", root))), "07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051");
  assert.equal(sha(await readFile(new URL("packages/db/prisma/migrations/20260804110000_f1_v15_phase_b/migration.sql", root))), "93e3657383c8d1f9ae023cdcd1344a33cf49090444dcbbcdabe2ab3e0d525288");
  assert.equal(sha(await readFile(migrationUrl)), "fdeb31836e907fa198cf995b973bd6ccd4a62ce03a291b5b9e3fc0317c66e41e");
  const generated = await readFile(new URL("packages/db/src/generated/source-latest-migration.ts", root), "utf8");
  assert.match(generated, /SOURCE_LATEST_MIGRATION_NUMBER = 73/);
  assert.match(generated, /20260805100000_s01_settings_core/);
});

test("migration71 Audit CHECK exactly matches the canonical registry", () => {
  assert.deepEqual(sqlResources, [...AUDIT_RESOURCE_TYPES]);
  for (const required of ["async_job", "work_queue_item", "media_asset", "media_variant", "media_upload_intent", "analytics_event", "analytics_release", "privacy_consent"]) {
    assert.ok(AUDIT_RESOURCE_TYPES.includes(required));
  }
  assert.equal(new Set(AUDIT_RESOURCE_TYPES).size, AUDIT_RESOURCE_TYPES.length);
});

test("worker observer is exact, safe, and hardened", () => {
  assert.match(migration, /public\.p09_worker_observation_v3\(\)[\s\S]*active_count bigint,[\s\S]*latest_error_code text,[\s\S]*observed_at timestamptz/);
  assert.match(migration, /FROM public\.p09_observe_readiness_internal_v2\(\)/);
  assert.match(migration, /COALESCE\(sum\(heartbeat\."effectiveCapacity"\) FILTER[\s\S]*heartbeat\."lifecycleState" = 'active'[\s\S]*heartbeat\."claimEnabled"[\s\S]*\), 0\)/);
  assert.doesNotMatch(migration, /readiness\.total_capacity/);
  assert.match(migration, /async-job-registry\.v1/);
  assert.match(migration, /b895534656015eaaf3e7a76ed76a9fb9ba4ee73dbb46457ac6dadadd19650f6a/);
  assert.match(migration, /dashboard\.artifact\.expire[\s\S]*dashboard\.export\.generate[\s\S]*dashboard\.import\.commit[\s\S]*dashboard\.import\.parse[\s\S]*foundation\.probe[\s\S]*media\.cleanup[\s\S]*media\.process/);
  assert.doesNotMatch(migration, /async-job-registry\.v2|analytics\.release\.seal/);
  assert.match(migration, /CASE WHEN bool_or\(heartbeat\."lastError" IS NOT NULL\) FILTER \([\s\S]*heartbeat\."heartbeatObservedAt" > readiness\.observed_at - interval '2 minutes'[\s\S]*\) THEN 'worker_error' END/);
  assert.doesNotMatch(migration, /RETURN QUERY[\s\S]*"instanceId"|RETURN QUERY[\s\S]*"lastError"/);
  assert.match(migration, /OWNER TO vanstro_p09_guard_owner/);
  assert.match(migration, /SECURITY DEFINER[\s\S]*SET search_path = pg_catalog, public/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.p09_worker_observation_v3\(\) FROM PUBLIC, vanstro_runtime, vanstro_worker_runtime/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.p09_worker_observation_v3\(\) TO vanstro_runtime/);
  assert.match(migration, /count\(\*\) FROM pg_proc[\s\S]*proname = 'p09_worker_observation_v3'\) <> 1/);
});

test("runtime API product code has no direct worker heartbeat read", async () => {
  const files = [
    "apps/api/src/readiness.ts",
    "apps/api/src/dashboard/work-queue.ts",
    "apps/api/src/operations/alerts.ts"
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, root), "utf8");
    assert.doesNotMatch(source, /prisma\.workerHeartbeat/);
    assert.doesNotMatch(source, /SELECT[\s\S]{0,160}worker_heartbeats/i);
    assert.match(source, /p09WorkerObservation/);
  }
});
