import assert from "node:assert/strict";
import test from "node:test";
import { P10_CELL_KEYS, parseP10Location, p10Href, validateReleaseFamilies } from "./p10-analytics.ts";

function family(overrides: Record<string, unknown> = {}) {
  return { releaseId: "release-1", releaseDay: "2026-08-03", metricDefinitionVersion: "metric.v1", identityEpoch: "epoch-1", suppressionPolicyVersion: "suppression.v1", fieldVisibilityProfile: "safe.v1", status: "suppressed", completeness: "sealed", cells: P10_CELL_KEYS.map((cellKey) => ({ cellKey, state: "suppressed", valueKind: cellKey === "rate" ? "rate" : "count", publishedValue: null })), ...overrides };
}

test("P10 owns only sealed release views and rejects raw-event or metric URLs", () => {
  assert.equal(parseP10Location("/dashboard/analytics-foundation", "view=release&releaseDay=2026-08-03").kind, "valid");
  assert.equal(parseP10Location("/fr/dashboard/analytics-foundation", "view=overview").kind, "valid");
  for (const query of ["view=events", "view=metrics", "view=release", "view=overview&releaseDay=2026-08-03", "view=release&releaseDay=2026-02-30", "view=release&url=https://evil.invalid"]) assert.equal(parseP10Location("/dashboard/analytics-foundation", query).kind, "invalid");
  assert.equal(p10Href("/dashboard/analytics-foundation", "release", "2026-08-03"), "/dashboard/analytics-foundation?view=release&releaseDay=2026-08-03");
});

test("P10 validates release family arrays and preserves suppression nulls", () => {
  const value = validateReleaseFamilies({ data: [family()] }, "2026-08-03");
  assert.equal(value[0]?.status, "suppressed");
  assert.deepEqual(value[0]?.cells.map((cell) => cell.cellKey), [...P10_CELL_KEYS]);
  assert.ok(value[0]?.cells.every((cell) => cell.publishedValue === null));
  assert.deepEqual(validateReleaseFamilies({ data: [] }, "2026-08-03"), []);
  assert.throws(() => validateReleaseFamilies({ data: family() }));
  assert.throws(() => validateReleaseFamilies({ data: [family({ rawEvents: [] })] }));
  assert.throws(() => validateReleaseFamilies({ data: [family({ releaseDay: "2026-08-02" })] }, "2026-08-03"));
  assert.throws(() => validateReleaseFamilies({ data: [family({ cells: family().cells.slice(0, 5) })] }));
});

test("P10 validates multiple sorted families and privacy states", () => {
  const publishedCells = P10_CELL_KEYS.map((cellKey, index) => ({ cellKey, state: "published", valueKind: cellKey === "rate" ? "rate" : "count", publishedValue: cellKey === "rate" ? 0.5 : index + 3 }));
  const first = family({ releaseId: "release-a", metricDefinitionVersion: "metric.v1" });
  const second = family({ releaseId: "release-b", metricDefinitionVersion: "metric.v2", status: "published", completeness: "late_excluded", cells: publishedCells });
  assert.equal(validateReleaseFamilies({ data: [first, second] })[1]?.cells.at(-1)?.publishedValue, 8);
  assert.throws(() => validateReleaseFamilies({ data: [second, first] }));
  assert.throws(() => validateReleaseFamilies({ data: [family({ cells: family().cells.map((cell, index) => index ? cell : { ...cell, publishedValue: 0 }) })] }));
  assert.throws(() => validateReleaseFamilies({ data: [family({ cells: family().cells.map((cell, index) => index ? cell : { ...cell, actorId: "secret" }) })] }));
});
