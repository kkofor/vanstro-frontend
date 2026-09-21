import assert from "node:assert/strict";
import test from "node:test";
import { buildAuditMetadata, buildAuditSummary, auditAuthorization, recordAuditEvent, recordFailedAuditEvent, serviceAuditContext, workerAuditContext } from "./foundation.js";

test("audit metadata rejects prototypes getters forbidden and unknown keys", () => {
  const metadata = buildAuditMetadata({ roleCount: 2 }, ["roleCount"]);
  assert.deepEqual({ ...metadata.entries }, { roleCount: 2 });
  assert.equal(Object.getPrototypeOf(metadata.entries), null);
  assert.throws(() => buildAuditMetadata(Object.create({ roleCount: 2 }), ["roleCount"]));
  const getter = Object.defineProperty({}, "roleCount", { enumerable: true, get: () => 2 });
  assert.throws(() => buildAuditMetadata(getter, ["roleCount"]));
  assert.throws(() => buildAuditMetadata({ password: "secret" }, ["password"]));
  assert.throws(() => buildAuditMetadata(JSON.parse('{"__proto__":"pollute"}'), ["__proto__"]));
  assert.throws(() => buildAuditMetadata({ unknown: true }, ["roleCount"]));
});

test("audit summary is canonical and omits PII values", () => {
  const summary = buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["status", "status"], values: { status: "active" } }, ["status"]);
  assert.deepEqual(summary.changedFields, ["status"]);
  assert.deepEqual({ ...summary.values }, { status: "active" });
  assert.equal(Object.getPrototypeOf(summary.values), null);
  assert.throws(() => buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["email"], values: { email: "x@example.test" } }, ["email"]));
  assert.throws(() => buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["email"] }, []));
  assert.deepEqual(buildAuditSummary({ schemaVersion: "audit-change-summary.v1", changedFields: ["email"], redactedFields: ["email"] }, []).redactedFields, ["email"]);
});

test("transaction recorder propagates persistence failure while best-effort contains it", async () => {
  const context = { res: { headers: new Headers({ "X-Request-Id": "req-1" }) } } as any;
  const authorization = { actorId: "actor", globalRoleKeys: ["super_admin"], scopedRoleKeys: [], contextRevision: "r", permissionGrants: [{ permissionKey: "categories.write", global: true, dealerIds: [], locationIds: [] }, { permissionKey: "dashboard.access", global: true, dealerIds: [], locationIds: [] }] };
  const input = { action: "create" as const, resource: { type: "category" as const, id: "category-1" }, result: "succeeded" as const, requiredPermissions: ["categories.write", "dashboard.access"], primaryPermission: "categories.write", afterSummary: { schemaVersion: "audit-change-summary.v1" as const, changedFields: ["slug"], values: { slug: "safe" } } };
  const database = { auditEvent: { create: async () => { throw new Error("DB_DOWN"); } } } as any;
  await assert.rejects(() => recordAuditEvent(context, authorization, input, database), /DB_DOWN/);
  assert.equal(await recordFailedAuditEvent(context, authorization, { ...input, result: "failed", reason: "dependency_unavailable" }, database), undefined);
  await assert.rejects(() => recordFailedAuditEvent(context, authorization, { ...input, metadata: { schemaVersion: "audit-metadata.v1", entries: { password: "secret" } } as any }, database), /AUDIT/);
});

test("service and worker permission provenance mismatches fail closed", async () => {
  const context = { res: { headers: new Headers({ "X-Request-Id": "req-provenance" }) } } as any;
  const create = async () => ({ id: "event" });
  const database = { auditEvent: { create } } as any;
  const service = serviceAuditContext("service-a", { effectiveRoles: [{ roleKey: "service", scope: "global" }], permissionGrants: [{ permissionKey: "categories.write", scope: { kind: "global" } }], scope: { kind: "global" }, contextRevision: "service-r1", authorizationContractVersion: "service-authorization.v1" });
  const input = { action: "create" as const, resource: { type: "category" as const, id: "category" }, result: "succeeded" as const, requiredPermissions: ["categories.write"], primaryPermission: "categories.write", afterSummary: { schemaVersion: "audit-change-summary.v1" as const, changedFields: ["slug"], values: { slug: "safe" } } };
  await recordAuditEvent(context, service, input, database);
  await assert.rejects(() => recordAuditEvent(context, service, { ...input, requiredPermissions: ["settings.write"], primaryPermission: "settings.write" }, database), /AUDIT_PERMISSIONS_INVALID/);
  await assert.rejects(() => recordAuditEvent(context, workerAuditContext("worker-a", "categories.write"), { ...input, requiredPermissions: ["categories.write", "settings.write"] }, database), /AUDIT_PERMISSIONS_INVALID/);
  const mismatchedScope = serviceAuditContext("service-b", { effectiveRoles: [], permissionGrants: [{ permissionKey: "categories.write", scope: { kind: "dealer", dealerIds: ["d"], locationIds: [] } }], scope: { kind: "global" }, contextRevision: "r", authorizationContractVersion: "service-authorization.v1" });
  await assert.rejects(() => recordAuditEvent(context, mismatchedScope, input, database), /AUDIT_PERMISSIONS_INVALID/);
});

test("audit authorization preserves every required permission provenance", () => {
  const authorization = auditAuthorization({ actorId: "actor", globalRoleKeys: ["super_admin"], scopedRoleKeys: [], contextRevision: "r", permissionGrants: [
    { permissionKey: "users.manage", global: true, dealerIds: [], locationIds: [] },
    { permissionKey: "settings.write", global: true, dealerIds: [], locationIds: [] }
  ] }, ["settings.write", "users.manage"], "users.manage");
  assert.deepEqual(authorization.permissionGrants.map((entry) => entry.permissionKey), ["settings.write", "users.manage"]);
  assert.equal(authorization.scope.kind, "global");
  assert.throws(() => auditAuthorization({ actorId: "actor", globalRoleKeys: [], scopedRoleKeys: [], contextRevision: "r", permissionGrants: [] }, [], "users.manage"));
});
