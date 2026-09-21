import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "./index.js";

async function createEvent() {
  const occurredAt = new Date();
  return prisma.auditEvent.create({ data: {
    eventVersion: "audit-event.v1", occurredAt, actorType: "admin_user", actorId: crypto.randomUUID(), actorDisplayClass: "staff",
    effectiveRoles: [{ roleKey: "super_admin", scope: "global" }], permissionGrants: [{ permissionKey: "audit_logs.read", scope: { kind: "global" } }], authorizationScopeKind: "global", dealerIds: [], locationIds: [], contextRevision: "test", authorizationContractVersion: "dashboard-authorization.v1", action: "create", resourceType: "category", result: "succeeded", requestId: crypto.randomUUID(), source: "dashboard_api", sensitive: false, retentionClass: "default", retentionPolicyVersion: "audit-retention.v1", expiresAt: new Date(occurredAt.getTime() + 730 * 86400000)
  } });
}

test("audit_events rejects Prisma and raw SQL update/delete", async (t) => {
  const databaseName = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/unknown").pathname.slice(1).toLowerCase();
  if (!/(test|smoke|disposable)/.test(databaseName)) return t.skip("immutable-row test requires an owned disposable database");
  const row = await createEvent();
  try {
    await assert.rejects(() => prisma.auditEvent.update({ where: { id: row.id }, data: { requestId: "changed" } }), /immutable/);
    await assert.rejects(() => prisma.$executeRaw`DELETE FROM "audit_events" WHERE "id" = ${row.id}::uuid`, /immutable/);
    assert.ok(await prisma.auditEvent.findUnique({ where: { id: row.id } }));
  } finally {
    // The immutable trigger intentionally prevents application cleanup; disposable DB tests own their database.
  }
});
