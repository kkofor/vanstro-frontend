import assert from "node:assert/strict";
import test from "node:test";
import type { SettingsCenterCapability } from "../api/api-contract.ts";
import { S02_COMPILED_VALUE } from "./s02-settings.ts";
import { authorizeS02Operation } from "./s02-settings-transport.ts";

const capability: SettingsCenterCapability = {
  enabled: true,
  contractVersion: "settings-center.v1",
  registryVersion: "settings-registry.v1",
  coreDescriptorKey: "settings.core.overview_refresh_seconds",
  actions: { read: true, createDraft: true, updateDraft: true, validate: true, publish: true, rollback: true },
  history: { read: true }, readiness: { read: true }, audit: { integrated: true },
  secrets: false, externalSideEffects: false, partialPublish: false
};
const shared = { actorKey: "actor:context", expectedActorKey: "actor:context", capability };
const draftId = "11111111-1111-4111-8111-111111111111";

test("S02 transport derives exact draft request without caller URL or method", () => {
  const request = authorizeS02Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.general-storefront", expectedPublishedVersion: 0, value: S02_COMPILED_VALUE, changeReason: "Initialize storefront settings", idempotencyKey: "settings-s02-draft-0001" } });
  assert.equal(request.path, "/dashboard/settings/s02-drafts");
  assert.equal(request.init.method, "POST");
  assert.deepEqual(JSON.parse(String(request.init.body)), { descriptorKey: "settings.general-storefront", expectedPublishedVersion: 0, value: S02_COMPILED_VALUE, changeReason: "Initialize storefront settings", idempotencyKey: "settings-s02-draft-0001" });
});

test("S02 transport fences actor, permission, descriptor and identifiers", () => {
  assert.throws(() => authorizeS02Operation({ ...shared, actorKey: "stale", kind: "validateDraft", draftId, status: "draft", input: { expectedVersion: 1, idempotencyKey: "settings-s02-validate-0001" } }));
  assert.throws(() => authorizeS02Operation({ ...shared, capability: { ...capability, actions: { ...capability.actions, publish: false } }, kind: "publishDraft", draftId, status: "validated", input: { expectedVersion: 1, idempotencyKey: "settings-s02-publish-0001" } }));
  assert.throws(() => authorizeS02Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "future.secret" as never, expectedPublishedVersion: 0, value: S02_COMPILED_VALUE, changeReason: "Unsafe future descriptor", idempotencyKey: "settings-s02-draft-0002" } }));
  assert.throws(() => authorizeS02Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.general-storefront", expectedPublishedVersion: 0, value: { ...S02_COMPILED_VALUE, brand: { ...S02_COMPILED_VALUE.brand, brandName: "" } }, changeReason: "Invalid value shape", idempotencyKey: "settings-s02-draft-0003" } }));
  assert.throws(() => authorizeS02Operation({ ...shared, kind: "createRollbackDraft", publicationId: "../escape", sourceStatus: "published", input: { expectedPublishedVersion: 1, changeReason: "Restore prior publication", idempotencyKey: "settings-s02-rollback-0001" } }));
});

test("S02 update derives exact PATCH and uses updateDraft capability only", () => {
  const request = authorizeS02Operation({ ...shared, kind: "updateDraft", draftId, status: "invalid", input: { expectedVersion: 2, value: S02_COMPILED_VALUE, changeReason: "Correct invalid storefront settings", idempotencyKey: "settings-s02-update-0001" } });
  assert.equal(request.path, "/dashboard/settings/s02-drafts/11111111-1111-4111-8111-111111111111");
  assert.equal(request.init.method, "PATCH");
  const updateOnly = { ...capability, actions: { ...capability.actions, createDraft: false, updateDraft: true } };
  assert.equal(authorizeS02Operation({ ...shared, capability: updateOnly, kind: "updateDraft", draftId, status: "draft", input: { expectedVersion: 2, value: S02_COMPILED_VALUE, changeReason: "Correct draft settings", idempotencyKey: "settings-s02-update-0002" } }).init.method, "PATCH");
  assert.throws(() => authorizeS02Operation({ ...shared, capability: { ...capability, actions: { ...capability.actions, createDraft: true, updateDraft: false } }, kind: "updateDraft", draftId, status: "draft", input: { expectedVersion: 2, value: S02_COMPILED_VALUE, changeReason: "Correct draft settings", idempotencyKey: "settings-s02-update-0003" } }));
  assert.throws(() => authorizeS02Operation({ ...shared, kind: "updateDraft", draftId, status: "publishing", input: { expectedVersion: 2, value: S02_COMPILED_VALUE, changeReason: "Unsafe publishing edit", idempotencyKey: "settings-s02-update-0004" } }));
});

test("S02 publish and rollback routes bind command versions", () => {
  const publish = authorizeS02Operation({ ...shared, kind: "publishDraft", draftId, status: "validated", input: { expectedVersion: 3, idempotencyKey: "settings-s02-publish-0002" } });
  assert.equal(publish.path, "/dashboard/settings/s02-drafts/11111111-1111-4111-8111-111111111111/publish");
  assert.deepEqual(JSON.parse(String(publish.init.body)), { expectedVersion: 3, idempotencyKey: "settings-s02-publish-0002" });
  assert.throws(() => authorizeS02Operation({ ...shared, kind: "publishDraft", draftId, status: "publishing", input: { expectedVersion: 3, idempotencyKey: "settings-s02-publish-0003" } }));
  const rollback = authorizeS02Operation({ ...shared, kind: "createRollbackDraft", publicationId: draftId, sourceStatus: "published", input: { expectedPublishedVersion: 4, changeReason: "Restore known safe storefront", idempotencyKey: "settings-s02-rollback-0002" } });
  assert.equal(rollback.path, "/dashboard/settings/s02-history/11111111-1111-4111-8111-111111111111/rollback-draft");
  assert.equal(authorizeS02Operation({ ...shared, kind: "createRollbackDraft", publicationId: draftId, sourceStatus: "superseded", input: { expectedPublishedVersion: 4, changeReason: "Restore superseded publication", idempotencyKey: "settings-s02-rollback-0003" } }).path, "/dashboard/settings/s02-history/11111111-1111-4111-8111-111111111111/rollback-draft");
  assert.throws(() => authorizeS02Operation({ ...shared, kind: "createRollbackDraft", publicationId: draftId, sourceStatus: "activation_failed", input: { expectedPublishedVersion: 4, changeReason: "Reject failed activation", idempotencyKey: "settings-s02-rollback-0004" } }));
  assert.throws(() => authorizeS02Operation({ ...shared, kind: "createRollbackDraft", publicationId: draftId, sourceStatus: "rolled_back", input: { expectedPublishedVersion: 4, changeReason: "Reject legacy rollback state", idempotencyKey: "settings-s02-rollback-0005" } }));
});
