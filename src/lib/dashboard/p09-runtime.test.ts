import assert from "node:assert/strict";
import test from "node:test";
import { parseP09Location, p09ScopeQuery, validateConfigList, validateFlagList, validateReadiness } from "./p09-runtime.ts";

test("P09 canonical location rejects arbitrary keys and params", () => {
  assert.equal(parseP09Location("/dashboard/runtime", "view=config&key=foundation.runtime.display_mode").kind, "valid");
  assert.equal(parseP09Location("/fr/dashboard/runtime", "view=flags&key=foundation.runtime.sample_flag").kind, "valid");
  assert.equal(parseP09Location("/dashboard/runtime", "view=config&key=arbitrary.sql").kind, "invalid");
  assert.equal(parseP09Location("/dashboard/runtime", "view=readiness&url=https://evil.invalid").kind, "invalid");
  assert.equal(p09ScopeQuery({ kind: "location", dealerIds: ["d1"], locationIds: ["l1"] }), "scopeKind=location&dealerId=d1&locationId=l1");
});

test("P09 validates exact config list array and rejects old envelopes or secrets", () => {
  const valid = { data: [{ configKey: "foundation.runtime.display_mode", schemaVersion: "runtime-config.v2", activeVersion: 3, safeValue: "compact", updatedAt: "2026-08-04T12:00:00Z" }] };
  assert.equal(validateConfigList(valid)[0]?.safeValue, "compact");
  assert.deepEqual(validateConfigList({ data: [] }), []);
  assert.throws(() => validateConfigList({ data: { states: [] } }));
  assert.throws(() => validateConfigList({ data: [{ ...valid.data[0], DATABASE_URL: "postgresql://secret" }] }));
  assert.throws(() => validateConfigList({ data: [{ ...valid.data[0], safeValue: "postgresql://secret" }] }));
});

test("P09 validates exact flag list array", () => {
  const valid = { data: [{ flagKey: "foundation.runtime.sample_flag", schemaVersion: "runtime-flag.v2", activeState: "internal", version: 4, updatedAt: "2026-08-04T12:00:00Z" }] };
  assert.equal(validateFlagList(valid)[0]?.activeState, "internal");
  assert.deepEqual(validateFlagList({ data: [] }), []);
  assert.throws(() => validateFlagList({ data: { states: [] } }));
  assert.throws(() => validateFlagList({ data: [{ ...valid.data[0], activeState: "future" }] }));
});

test("P09 validates exact summary DTO with bigint-safe values", () => {
  const summary = { data: { readinessState: "degraded", reasonCode: "capacity_missing", activeCount: "9007199254740993", staleCount: 1, totalCapacity: "18446744073709551615", observedAt: "2026-08-04T12:00:00Z" } };
  const value = validateReadiness(summary, false);
  assert.equal(value.activeCount, "9007199254740993"); assert.equal(value.totalCapacity, "18446744073709551615"); assert.equal(value.detail, false);
  assert.throws(() => validateReadiness({ data: { ...summary.data, secondaryReasons: [] } }, false));
  assert.throws(() => validateReadiness({ data: { ...summary.data, activeCount: 1.5 } }, false));
});

test("P09 detail DTO requires exact secondary reasons and rejects identity leakage", () => {
  const detail = { data: { readinessState: "not_ready", reasonCode: "database_unhealthy", activeCount: 0, staleCount: 2, totalCapacity: 0, observedAt: "2026-08-04T12:00:00Z", secondaryReasons: ["storage_unhealthy"] } };
  assert.deepEqual(validateReadiness(detail, true).secondaryReasons, ["storage_unhealthy"]);
  assert.throws(() => validateReadiness({ data: { ...detail.data, instanceId: "worker-1" } }, true));
  assert.throws(() => validateReadiness({ data: { ...detail.data, secondaryReasons: undefined } }, true));
  assert.throws(() => validateReadiness({ data: { ...detail.data, reasonCode: "postgresql://secret" } }, true));
});
