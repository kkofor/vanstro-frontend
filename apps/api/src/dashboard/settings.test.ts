import assert from "node:assert/strict";
import test from "node:test";
import { DASHBOARD_PERMISSION_RULES } from "./access.js";
import { SETTINGS_CORE_DESCRIPTOR, settingsCenterCapability } from "./settings.js";
import { readFile } from "node:fs/promises";
const settingsSource = () => readFile(new URL("./settings.ts", import.meta.url), "utf8");

function authorization(grants: Array<{ permissionKey:string; global:boolean }>) {
  return { actorId:"actor",globalRoleKeys:[],scopedRoleKeys:[],permissionGrants:grants.map(grant=>({...grant,dealerIds:[],locationIds:[]})),contextRevision:"a".repeat(64) };
}

test("S01 exposes one real non-secret descriptor distinct from the P09 sample", () => {
  assert.deepEqual(SETTINGS_CORE_DESCRIPTOR, {
    key: "settings.core.overview_refresh_seconds", group: "core", title: "Overview refresh interval",
    description: "Controls how often the Settings overview refreshes safe status.", schemaVersion: "settings.core.overview-refresh-seconds.v1",
    availability: "available", valueType: "integer", secret: false, mutable: true, defaultValue: 60
  });
  assert.notEqual(SETTINGS_CORE_DESCRIPTOR.key, "foundation.runtime.refresh_interval_seconds");
});

test("S01 capability requires global settings.read and fail-closes mutations", () => {
  const none = settingsCenterCapability(authorization([]) as never);
  assert.equal(none.enabled, false); assert.equal(none.actions.publish, false);
  const scoped = settingsCenterCapability(authorization([{ permissionKey:"settings.read",global:false }]) as never);
  assert.equal(scoped.enabled, false);
  const read = settingsCenterCapability(authorization([{ permissionKey:"settings.read",global:true }]) as never);
  assert.equal(read.enabled, true); assert.equal(read.actions.read, true); assert.equal(read.actions.publish, false);
  const write = settingsCenterCapability(authorization([{ permissionKey:"settings.read",global:true },{ permissionKey:"settings.write",global:true }]) as never);
  assert.deepEqual(write.actions, { read:true,createDraft:true,updateDraft:true,validate:true,publish:true,rollback:true });
  assert.equal(write.secrets,false); assert.equal(write.externalSideEffects,false); assert.equal(write.partialPublish,false);
});

test("S01 exact nested routes are owned by settings permissions", () => {
  const settings = DASHBOARD_PERMISSION_RULES.filter(rule => rule.path.startsWith("/dashboard/settings/"));
  assert.deepEqual(settings.map(rule => `${rule.method} ${rule.path} ${rule.permission}`), [
    "GET /dashboard/settings/overview settings.read", "GET /dashboard/settings/registry settings.read",
    "GET /dashboard/settings/drafts settings.read", "POST /dashboard/settings/drafts settings.write",
    "GET /dashboard/settings/drafts/:id settings.read", "PATCH /dashboard/settings/drafts/:id settings.write", "POST /dashboard/settings/drafts/:id/validate settings.write",
    "GET /dashboard/settings/drafts/:id/diff settings.read", "POST /dashboard/settings/drafts/:id/publish settings.write",
    "GET /dashboard/settings/history settings.read", "POST /dashboard/settings/history/:publicationId/rollback-draft settings.write",
    "GET /dashboard/settings/readiness settings.read",
    "GET /dashboard/settings/s02-drafts settings.read", "POST /dashboard/settings/s02-drafts settings.write",
    "GET /dashboard/settings/s02-drafts/:id settings.read", "PATCH /dashboard/settings/s02-drafts/:id settings.write", "POST /dashboard/settings/s02-drafts/:id/validate settings.write",
    "GET /dashboard/settings/s02-drafts/:id/diff settings.read", "POST /dashboard/settings/s02-drafts/:id/publish settings.write",
    "GET /dashboard/settings/s02-history settings.read", "POST /dashboard/settings/s02-history/:publicationId/rollback-draft settings.write",
    "GET /dashboard/settings/s02-readiness settings.read",
    "GET /dashboard/settings/s09-overview settings.read", "GET /dashboard/settings/s09-drafts settings.read",
    "POST /dashboard/settings/s09-drafts settings.write", "GET /dashboard/settings/s09-drafts/:id settings.read",
    "PATCH /dashboard/settings/s09-drafts/:id settings.write", "POST /dashboard/settings/s09-drafts/:id/validate settings.write",
    "GET /dashboard/settings/s09-drafts/:id/diff settings.read", "POST /dashboard/settings/s09-drafts/:id/publish settings.write",
    "GET /dashboard/settings/s09-history settings.read", "POST /dashboard/settings/s09-history/:publicationId/rollback-draft settings.write",
    "GET /dashboard/settings/s09-readiness settings.read", "POST /dashboard/settings/s09-impact-preview settings.read",
    "POST /dashboard/settings/s09-session-revoke sessions.revoke",
    "GET /dashboard/settings/s10-overview settings.read", "GET /dashboard/settings/s10-drafts settings.read",
    "POST /dashboard/settings/s10-drafts settings.write", "GET /dashboard/settings/s10-drafts/:id settings.read",
    "PATCH /dashboard/settings/s10-drafts/:id settings.write", "POST /dashboard/settings/s10-drafts/:id/validate settings.write",
    "GET /dashboard/settings/s10-drafts/:id/diff settings.read", "POST /dashboard/settings/s10-drafts/:id/publish settings.write",
    "GET /dashboard/settings/s10-history settings.read", "POST /dashboard/settings/s10-history/:publicationId/rollback-draft settings.write",
    "GET /dashboard/settings/s10-readiness settings.read", "POST /dashboard/settings/s10-impact-preview settings.read",
    "GET /dashboard/settings/s03-overview settings.read", "GET /dashboard/settings/s03-drafts settings.read",
    "POST /dashboard/settings/s03-drafts settings.write", "GET /dashboard/settings/s03-drafts/:id settings.read",
    "PATCH /dashboard/settings/s03-drafts/:id settings.write", "POST /dashboard/settings/s03-drafts/:id/validate settings.write",
    "GET /dashboard/settings/s03-drafts/:id/diff settings.read", "POST /dashboard/settings/s03-drafts/:id/publish settings.write",
    "GET /dashboard/settings/s03-history settings.read", "POST /dashboard/settings/s03-history/:publicationId/rollback-draft settings.write",
    "GET /dashboard/settings/s03-readiness settings.read", "POST /dashboard/settings/s03-impact-preview settings.read",
    "GET /dashboard/settings/s08-overview settings.read", "GET /dashboard/settings/s08-drafts settings.read",
    "POST /dashboard/settings/s08-drafts settings.write", "GET /dashboard/settings/s08-drafts/:id settings.read",
    "PATCH /dashboard/settings/s08-drafts/:id settings.write", "POST /dashboard/settings/s08-drafts/:id/validate settings.write",
    "GET /dashboard/settings/s08-drafts/:id/diff settings.read", "POST /dashboard/settings/s08-drafts/:id/publish settings.write",
    "GET /dashboard/settings/s08-history settings.read", "POST /dashboard/settings/s08-history/:publicationId/rollback-draft settings.write",
    "GET /dashboard/settings/s08-readiness settings.read", "POST /dashboard/settings/s08-impact-preview settings.read"
  ]);
});


test("S01 public versions and validation time are persisted revision projections", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("./settings.ts", import.meta.url), "utf8"));
  assert.match(source, /draftVersion: row\.settingsRevision \?\? row\.version/);
  assert.match(source, /publicationDto\(row, sourceVersion/);
  assert.match(source, /validatedAt: \(updated\.settingsValidatedAt \?\? updated\.createdAt\)\.toISOString\(\)/);
  assert.match(source, /settingsLifecycleStatus === "superseded" \? "superseded"/);
  assert.doesNotMatch(source, /validatedAt: new Date/);
});


test("S01 diff uses persisted draft base and lifecycle timestamps are durable", async () => {
  const source = await settingsSource();
  assert.match(source, /before: asNumber\(row\.effectiveValue\)/);
  assert.match(source, /updatedAt: \(row\.settingsUpdatedAt \?\? row\.createdAt\)\.toISOString\(\)/);
});

test("S01B history is served from the append-only event stream", async () => {
  const source = await settingsSource();
  assert.match(source, /settingsEvents\(prisma/);
  assert.match(source, /events\.map\(\(event\) =>/);
  assert.match(source, /version: event\.publicationSequence/);
  assert.match(source, /auditEventId: event\.auditEventId/);
  assert.doesNotMatch(source, /publicationId: row\.id/);
  assert.doesNotMatch(source, /row\.successAuditEventId/);
});

test("S01B state/version/not-found errors are separated in mapConflict", async () => {
  const source = await settingsSource();
  const s01NotFound = source.indexOf('message.includes("S01_NOT_FOUND")');
  const versionConflict = source.indexOf('message.includes("S01_VERSION_CONFLICT")');
  const stateConflict = source.indexOf('message.includes("S01_STATE_CONFLICT")');
  assert.ok(s01NotFound >= 0 && versionConflict > s01NotFound && stateConflict > versionConflict, "S01B error precedence: not-found before version before state");
  assert.match(source, /publicError\(context, 404, "SETTINGS_DESCRIPTOR_UNAVAILABLE"/);
  assert.match(source, /publicError\(context, 409, "VERSION_CONFLICT"/);
  assert.match(source, /publicError\(context, 409, "SETTINGS_STATE_CONFLICT"/);
});

test("S01B version and UUID boundaries are enforced at the API boundary", async () => {
  const source = await settingsSource();
  assert.match(source, /function validVersion\(value: unknown\): value is number/);
  assert.match(source, /Number\.isSafeInteger\(value\)/);
  assert.match(source, /value >= 0 && value <= 2147483647/);
  assert.match(source, /function validUuid\(value: unknown\): value is string/);
  assert.match(source, /\/\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$\/i/);
  assert.ok(source.split("validUuid(id)").length - 1 >= 5, "every mutation path validates its id");
});

test("S01B invalid lifecycle is server-decided and structurally valid values persist", async () => {
  const source = await settingsSource();
  assert.match(source, /function structuralValue\(value: unknown\): value is number/);
  assert.match(source, /SETTINGS_VALUE_OUT_OF_RANGE.*severity: "blocker"/);
  assert.match(source, /status: valid \? "validated" : "invalid"/);
  assert.match(source, /\["draft","validated","invalid","activation_failed"\]/);
});

test("S01B corrective readiness is event-sequence bound and side-effect-free", async () => {
  const source = await settingsSource();
  assert.match(source, /activePublicationSequence\(active, events\)/);
  assert.match(source, /event\.eventType === "published" \|\| event\.eventType === "rollback_published"/);
  assert.match(source, /context\.req\.query\("consumerGeneration"\)/);
  assert.match(source, /consumer_generation_missing/);
  assert.match(source, /consumer_generation_mismatch/);
  assert.match(source, /effectiveOverviewRefreshSeconds/);
  assert.match(source, /publicationDto\(row, sourceVersion, publishedGeneration\)/);
  assert.doesNotMatch(source, /publishedGeneration = Number\(active\.generation\)/);
});

test("S01B Audit snapshot is derived from the real P02 context", async () => {
  const source = await settingsSource();
  assert.match(source, /settingsEvents/);
  const migration = await readFile(new URL("../../../../packages/db/prisma/migrations/20260805110000_s01_settings_contract_closure/migration.sql", import.meta.url), "utf8");
  assert.match(migration, /s01_settings_audit_v2\(actor_id,ctx/);
  assert.match(migration, /effective_roles:=COALESCE\(ctx->'globalRoleKeys'/);
  assert.match(migration, /grants:=COALESCE\(ctx->'permissionGrants'/);
  // The audit VALUES row must use the derived variables, not a hardcoded
  // empty roles array or a fixed settings.write grant.
  const auditFn = migration.split("CREATE OR REPLACE FUNCTION public.s01_settings_audit_v2")[1] ?? "";
  const valuesRow = auditFn.split("INSERT INTO public.audit_events")[1] ?? "";
  assert.match(valuesRow, /VALUES\(event_id,'audit-event\.v1',CURRENT_TIMESTAMP,'admin_user',actor_id,'staff',effective_roles,grants/);
  assert.doesNotMatch(valuesRow, /'\[\]'::jsonb/);
  assert.doesNotMatch(valuesRow, /'settings\.write'/);
});
