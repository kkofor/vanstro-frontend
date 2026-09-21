import assert from "node:assert/strict";
import test from "node:test";
import { authorizeS09Operation } from "./s09-settings-transport.ts";

const capability = {
  enabled: true,
  contractVersion: "settings-center.v1" as const,
  registryVersion: "settings-registry.v1" as const,
  coreDescriptorKey: "settings.core.overview_refresh_seconds" as const,
  actions: { read: true, createDraft: true, updateDraft: true, validate: true, publish: true, rollback: true },
  history: { read: true },
  readiness: { read: true },
  audit: { integrated: true as const },
  secrets: false as const,
  externalSideEffects: false as const,
  partialPublish: false as const
};

const shared = { actorKey: "actor:rev", expectedActorKey: "actor:rev", capability };
const draftId = "11111111-1111-4111-8111-111111111111";
const publicationId = "11111111-1111-4111-8111-111111111112";
const value = { passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 30 }, sessionPolicy: { sessionLifetimeMinutes: 10080 } };

test("S09 transport fences every operation to the s09- endpoint family", () => {
  const create = authorizeS09Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.auth-rbac", expectedPublishedVersion: 0, value, changeReason: "S09 transport create", idempotencyKey: "settings-s09-create-0001" } });
  assert.equal(create.path, "/dashboard/settings/s09-drafts");
  const update = authorizeS09Operation({ ...shared, kind: "updateDraft", draftId, status: "draft", input: { expectedVersion: 1, value, changeReason: "S09 transport update", idempotencyKey: "settings-s09-update-0001" } });
  assert.equal(update.path, `/dashboard/settings/s09-drafts/${draftId}`);
  assert.equal(update.init.method, "PATCH");
  const validate = authorizeS09Operation({ ...shared, kind: "validateDraft", draftId, status: "draft", input: { expectedVersion: 1, idempotencyKey: "settings-s09-validate-0001" } });
  assert.equal(validate.path, `/dashboard/settings/s09-drafts/${draftId}/validate`);
  const publish = authorizeS09Operation({ ...shared, kind: "publishDraft", draftId, status: "validated", input: { expectedVersion: 2, idempotencyKey: "settings-s09-publish-0001" } });
  assert.equal(publish.path, `/dashboard/settings/s09-drafts/${draftId}/publish`);
  const rollback = authorizeS09Operation({ ...shared, kind: "createRollbackDraft", publicationId, sourceStatus: "published", input: { expectedPublishedVersion: 2, changeReason: "S09 transport rollback", idempotencyKey: "settings-s09-rollback-0001" } });
  assert.equal(rollback.path, `/dashboard/settings/s09-history/${publicationId}/rollback-draft`);
});

test("S09 transport gates capability, actor context and lifecycle state", () => {
  assert.throws(() => authorizeS09Operation({ ...shared, actorKey: "stale", kind: "createDraft", input: { descriptorKey: "settings.auth-rbac", expectedPublishedVersion: 0, value, changeReason: "S09 transport stale", idempotencyKey: "settings-s09-create-0002" } }));
  assert.throws(() => authorizeS09Operation({ ...shared, capability: { ...capability, actions: { ...capability.actions, publish: false } }, kind: "publishDraft", draftId, status: "validated", input: { expectedVersion: 2, idempotencyKey: "settings-s09-publish-0002" } }));
  assert.throws(() => authorizeS09Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.general-storefront" as never, expectedPublishedVersion: 0, value, changeReason: "S09 transport wrong descriptor", idempotencyKey: "settings-s09-create-0003" } }));
  assert.throws(() => authorizeS09Operation({ ...shared, kind: "publishDraft", draftId, status: "draft", input: { expectedVersion: 1, idempotencyKey: "settings-s09-publish-0003" } }));
  assert.throws(() => authorizeS09Operation({ ...shared, kind: "createRollbackDraft", publicationId: "not-a-uuid", sourceStatus: "published", input: { expectedPublishedVersion: 2, changeReason: "S09 transport bad uuid", idempotencyKey: "settings-s09-rollback-0002" } }));
  assert.throws(() => authorizeS09Operation({ ...shared, kind: "updateDraft", draftId, status: "validated", input: { expectedVersion: 1, value, changeReason: "S09 transport wrong state", idempotencyKey: "settings-s09-update-0002" } }));
});

test("S09 transport rejects out-of-range values before any request", () => {
  assert.throws(() => authorizeS09Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.auth-rbac", expectedPublishedVersion: 0, value: { passwordPolicy: { minimumLength: 8, resetTokenTtlMinutes: 30 }, sessionPolicy: { sessionLifetimeMinutes: 10080 } }, changeReason: "S09 transport bad length", idempotencyKey: "settings-s09-create-0004" } }), /minimumLength/);
  assert.throws(() => authorizeS09Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.auth-rbac", expectedPublishedVersion: 0, value: { passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 30 }, sessionPolicy: { sessionLifetimeMinutes: 20000 } }, changeReason: "S09 transport bad session ttl", idempotencyKey: "settings-s09-create-0005" } }), /sessionLifetimeMinutes/);
});
