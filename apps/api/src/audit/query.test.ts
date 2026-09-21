import assert from "node:assert/strict";
import test from "node:test";
import { rawCommonQueryParams } from "../dashboard/common-query.js";
import { auditScopeWhere, createAuditCursorCodec, parseAuditQuery, sameAuditGrantScope, serializeAuditEvent } from "./query.js";
import type { AuditEvent } from "@vanstro/db";
import { parseCursorKeyset } from "../dashboard/common-query.js";

test("audit detail raw occurrence map preserves duplicate and unsupported versions", () => {
  assert.deepEqual(rawCommonQueryParams("queryVersion=common-query.v1&queryVersion=common-query.v1").queryVersion, ["common-query.v1", "common-query.v1"]);
  assert.deepEqual(rawCommonQueryParams("queryVersion=future").queryVersion, ["future"]);
});

test("audit scope and sensitive grants preserve exact P02 dimensions", () => {
  const scoped = { permissionKey: "audit_logs.read", global: false, dealerIds: ["dealer-a"], locationIds: ["location-a"] };
  assert.equal(sameAuditGrantScope(scoped, { ...scoped, permissionKey: "audit.read_sensitive" }), true);
  assert.equal(sameAuditGrantScope(scoped, { permissionKey: "audit.read_sensitive", global: false, dealerIds: ["dealer-a"], locationIds: [] }), false);
  assert.deepEqual(auditScopeWhere({ permissionKey: "audit_logs.read", global: false, dealerIds: [], locationIds: [] }), { id: { in: [] } });
  assert.deepEqual(auditScopeWhere({ permissionKey: "audit_logs.read", global: true, dealerIds: [], locationIds: [] }), {});
});

test("audit default range is frozen and explicit cursor bounds cannot drift", () => {
  const now = new Date("2026-08-02T12:00:00.000Z");
  const first = parseAuditQuery(rawCommonQueryParams("queryVersion=common-query.v1"), undefined, now);
  assert.equal(first.rangeAnchor, now.toISOString());
  assert.equal(Date.parse(first.occurredTo) - Date.parse(first.occurredFrom), 30 * 86_400_000);
  const restored = { rangeAnchor: first.rangeAnchor, occurredFrom: first.occurredFrom, occurredTo: first.occurredTo } as never;
  assert.deepEqual(parseAuditQuery(rawCommonQueryParams("queryVersion=common-query.v1"), restored, new Date(now.getTime() + 5_000)).occurredTo, first.occurredTo);
  assert.throws(() => parseAuditQuery(rawCommonQueryParams("queryVersion=common-query.v1&occurredFrom=2026-01-01T00%3A00%3A00Z&occurredTo=2026-02-01T00%3A00%3A00Z"), restored));
  assert.throws(() => parseAuditQuery(rawCommonQueryParams("queryVersion=common-query.v1&limit=1e2"), undefined, now));
});

test("audit cursor rejects tamper, cross-binding replay, expiry and bad position", () => {
  const now = 1_800_000_000_000;
  const keyset = parseCursorKeyset(JSON.stringify({ activeKid: "k1", keys: [{ kid: "k1", key: Buffer.alloc(32, 4).toString("base64"), mode: "active" }] }));
  const codec = createAuditCursorCodec(() => now, keyset, () => Buffer.alloc(12, 7));
  const base = { v: 1 as const, resource: "audit-events" as const, profileVersion: "dashboard.audit-events.v1" as const, permissionKey: "audit_logs.read" as const, actorId: "actor-a", contextRevision: "revision-a", grantFingerprint: "grant-a", fieldProfileHash: "field-a", queryHash: "query-a", order: [{ field: "occurredAt", direction: "desc", nulls: "last" }, { field: "recordId", direction: "desc", nulls: "last" }] as const, position: ["2026-08-02T00:00:00.000Z", "123e4567-e89b-42d3-a456-426614174000"] as [string,string], rangeAnchor: "2026-08-02T00:00:00.000Z", occurredFrom: "2026-07-03T00:00:00.000Z", occurredTo: "2026-08-02T00:00:00.000Z", retentionPolicyVersion: "audit-retention.v1" as const, retentionPolicyGeneration: "audit-retention.v1", auditSchemaVersion: "audit-event.v1" as const };
  const token = codec.seal(base);
  assert.equal(codec.open(token, { actorId: "actor-a", queryHash: "query-a" }).position[1], base.position[1]);
  for (const mismatch of [{ actorId: "actor-b" }, { contextRevision: "revision-b" }, { grantFingerprint: "grant-b" }, { fieldProfileHash: "field-b" }, { queryHash: "query-b" }]) assert.throws(() => codec.open(token, mismatch));
  assert.throws(() => codec.open(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"), {}));
  assert.throws(() => createAuditCursorCodec(() => now + 900_000, keyset).open(token, {}));
  assert.throws(() => createAuditCursorCodec(() => now - 60_001, keyset).open(token, {}));
  const badPosition = codec.seal({ ...base, position: ["bad-time", "bad-id"] });
  assert.throws(() => codec.open(badPosition, {}));
});

test("audit filter grammar rejects invalid enums and accepts canonical resources", () => {
  const now = new Date("2026-08-02T12:00:00.000Z");
  const parsed = parseAuditQuery(rawCommonQueryParams("queryVersion=common-query.v1&action=create&result=succeeded&requestId=req-1"), undefined, now);
  assert.deepEqual(parsed.filters.action, ["create"]);
  assert.equal(parsed.filters.requestId, "req-1");
  for (const resourceType of ["async_job", "work_queue_item", "media_asset", "media_variant", "media_upload_intent", "analytics_event", "analytics_release", "privacy_consent"]) {
    assert.deepEqual(parseAuditQuery(rawCommonQueryParams(`queryVersion=common-query.v1&resourceType=${resourceType}`), undefined, now).filters.resourceType, [resourceType]);
  }
  assert.throws(() => parseAuditQuery(rawCommonQueryParams("queryVersion=common-query.v1&resourceType=unknown"), undefined, now));
  assert.throws(() => parseAuditQuery(rawCommonQueryParams("queryVersion=common-query.v1&action=future"), undefined, now));
  assert.throws(() => parseAuditQuery(rawCommonQueryParams("queryVersion=common-query.v1&occurredFrom=not-a-date&occurredTo=2026-08-02T00%3A00%3A00Z"), undefined, now));
});

test("audit serializer redacts or validates sensitive JSON", () => {
  const now = new Date();
  const row = { id: "123e4567-e89b-42d3-a456-426614174000", eventVersion: "audit-event.v1", occurredAt: now, actorType: "service_account", actorId: "machine-a", actorDisplayClass: "machine", effectiveRoles: [{ roleKey: "service", scope: "global" }], permissionGrants: [{ permissionKey: "audit_logs.read", scope: { kind: "global" } }], authorizationScopeKind: "global", dealerIds: [], locationIds: [], contextRevision: "r", authorizationContractVersion: "service-authorization.v1", capabilityVersion: null, action: "create", resourceType: "category", resourceId: null, result: "succeeded", reason: null, requestId: "req", source: "service_api", correlationId: null, parentEventId: null, idempotencyKeyHash: null, eventIntentHash: null, beforeSummary: null, afterSummary: { schemaVersion: "audit-change-summary.v1", changedFields: ["status"], redactedFields: [], values: { status: "active" } }, metadata: { schemaVersion: "audit-metadata.v1", entries: { roleCount: 1 } }, sensitive: true, retentionClass: "default", retentionPolicyVersion: "audit-retention.v1", expiresAt: new Date(now.getTime() + 1), createdAt: now } as AuditEvent;
  const redacted = serializeAuditEvent(row, false) as any;
  assert.equal(redacted.actor.id, undefined); assert.equal(redacted.metadata, undefined); assert.equal(redacted.changeSummary.values, undefined);
  const visible = serializeAuditEvent(row, true) as any;
  assert.equal(visible.actor.id, "machine-a"); assert.equal(visible.metadata.entries.roleCount, 1); assert.equal(visible.changeSummary.values.status, "active");
  assert.throws(() => serializeAuditEvent({ ...row, metadata: { schemaVersion: "audit-metadata.v1", entries: { nested: { unsafe: true } } } } as AuditEvent, true));
  assert.throws(() => serializeAuditEvent({ ...row, authorizationScopeKind: "dealer", dealerIds: ["b", "a"], locationIds: ["location"] } as AuditEvent, true));
  assert.throws(() => serializeAuditEvent({ ...row, actorDisplayClass: "future" } as AuditEvent, true));
  const getter = Object.defineProperty({}, "entries", { enumerable: true, get: () => ({ ok: true }) });
  assert.throws(() => serializeAuditEvent({ ...row, metadata: getter as never } as AuditEvent, true));
});

test("audit legacy and strict dispatch stay exclusive in source", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../dashboard/system.ts", import.meta.url), "utf8"));
  assert.match(source, /query\("queryVersion"\) !== undefined/);
  assert.match(source, /prisma\.auditLog\.findMany/);
  assert.doesNotMatch(source, /auditLog[\s\S]{0,100}auditEvent[\s\S]{0,100}concat/);
});
