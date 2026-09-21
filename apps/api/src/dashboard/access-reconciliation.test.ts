import assert from "node:assert/strict";
import test from "node:test";
import { INITIAL_PERMISSIONS } from "@vanstro/db/permissions";
import { createApp } from "../app.js";
import { DASHBOARD_PERMISSION_RULES } from "./access.js";

function normalize(path: string) {
  return path.replace(/^\/api\/v1/, "");
}

test("every registered Dashboard route has exactly one canonical ACL rule", () => {
  const app = createApp();
  const registered = app.routes
    .filter((route) => route.path.startsWith("/api/v1/dashboard") && route.method !== "ALL")
    .map((route) => `${route.method} ${normalize(route.path)}`)
    .sort();
  const rules = DASHBOARD_PERMISSION_RULES.map((rule) => `${rule.method} ${rule.path}`).sort();
  assert.equal(new Set(registered).size, registered.length, "Dashboard routes must not be duplicated");
  assert.equal(new Set(rules).size, rules.length, "Dashboard ACL rules must not be duplicated");
  assert.deepEqual(registered, rules);
  const canonical = new Set<string>(INITIAL_PERMISSIONS);
  assert.ok(DASHBOARD_PERMISSION_RULES.every((rule) => canonical.has(rule.permission)));
  assert.equal(DASHBOARD_PERMISSION_RULES.some((rule) => rule.permission === "system.settings.write"), false);
});
