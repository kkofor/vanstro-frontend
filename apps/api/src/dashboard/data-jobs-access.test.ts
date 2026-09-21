import assert from "node:assert/strict";
import test from "node:test";
import { DASHBOARD_PERMISSION_RULES } from "./access.js";

const expected = new Map([
  ["POST /dashboard/data-jobs/imports", "dashboard.import.foundation_sample.create"],
  ["PUT /dashboard/data-jobs/imports/:id/content", "dashboard.import.foundation_sample.create"],
  ["GET /dashboard/data-jobs/imports", "dashboard.import.foundation_sample.read"],
  ["GET /dashboard/data-jobs/imports/:id", "dashboard.import.foundation_sample.read"],
  ["GET /dashboard/data-jobs/imports/:id/preview", "dashboard.import.foundation_sample.read"],
  ["POST /dashboard/data-jobs/imports/:id/commit", "dashboard.import.foundation_sample.commit"],
  ["POST /dashboard/data-jobs/imports/:id/cancel", "dashboard.import.foundation_sample.create"],
  ["POST /dashboard/data-jobs/exports", "dashboard.export.foundation_sample.create"],
  ["GET /dashboard/data-jobs/exports", "dashboard.export.foundation_sample.read"],
  ["GET /dashboard/data-jobs/exports/:id", "dashboard.export.foundation_sample.read"],
  ["POST /dashboard/data-jobs/exports/:id/cancel", "dashboard.export.foundation_sample.create"],
  ["GET /dashboard/data-jobs/exports/:id/download", "dashboard.export.foundation_sample.download"]
]);

const exactPermissions = new Set([
  "dashboard.import.foundation_sample.read",
  "dashboard.import.foundation_sample.create",
  "dashboard.import.foundation_sample.commit",
  "dashboard.export.foundation_sample.read",
  "dashboard.export.foundation_sample.create",
  "dashboard.export.foundation_sample.download"
]);

test("P08 registers twelve canonical routes with six independent permissions", () => {
  const rules = DASHBOARD_PERMISSION_RULES.filter((rule) => rule.path.startsWith("/dashboard/data-jobs/"));
  assert.equal(rules.length, 12);
  assert.equal(new Set(rules.map((rule) => `${rule.method} ${rule.path}`)).size, 12);
  for (const rule of rules) {
    const key = `${rule.method} ${rule.path}`;
    assert.equal(rule.permission, expected.get(key), key);
    expected.delete(key);
  }
  assert.equal(expected.size, 0);
  assert.deepEqual(new Set(rules.map((rule) => rule.permission)), exactPermissions);
  assert.equal(rules.some((rule) => rule.permission.startsWith("jobs.") || rule.permission.startsWith("media.")), false);
});
