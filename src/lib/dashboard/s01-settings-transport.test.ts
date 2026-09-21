import assert from "node:assert/strict";
import test from "node:test";
import type { SettingsCenterCapability } from "../api/api-contract.ts";
import { authorizeSettingsOperation } from "./s01-settings-transport.ts";

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

test("S01 transport derives exact draft request without caller URL or method", () => {
  const request = authorizeSettingsOperation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.core.overview_refresh_seconds", expectedPublishedVersion: 2, value: 45, changeReason: "Improve overview freshness", idempotencyKey: "settings-draft-key-0001" } });
  assert.equal(request.path, "/dashboard/settings/drafts");
  assert.equal(request.init.method, "POST");
  assert.deepEqual(JSON.parse(String(request.init.body)), { descriptorKey: "settings.core.overview_refresh_seconds", expectedPublishedVersion: 2, value: 45, changeReason: "Improve overview freshness", idempotencyKey: "settings-draft-key-0001" });
});

test("S01 transport fences actor, permission, descriptor and identifiers", () => {
  assert.throws(() => authorizeSettingsOperation({ ...shared, actorKey: "stale", kind: "validateDraft", draftId: "draft-1", status: "draft", input: { expectedVersion: 1, idempotencyKey: "settings-validate-0001" } }));
  assert.throws(() => authorizeSettingsOperation({ ...shared, capability: { ...capability, actions: { ...capability.actions, publish: false } }, kind: "publishDraft", draftId: "draft-1", status: "validated", input: { expectedVersion: 1, idempotencyKey: "settings-publish-0001" } }));
  assert.throws(() => authorizeSettingsOperation({ ...shared, kind: "createDraft", input: { descriptorKey: "future.secret" as never, expectedPublishedVersion: 2, value: 45, changeReason: "Unsafe future descriptor", idempotencyKey: "settings-draft-key-0002" } }));
  assert.throws(() => authorizeSettingsOperation({ ...shared, kind: "createRollbackDraft", publicationId: "../escape", sourceStatus: "published", input: { expectedPublishedVersion: 2, changeReason: "Restore prior publication", idempotencyKey: "settings-rollback-0001" } }));
});

test("S01 update derives exact PATCH and uses updateDraft capability only", () => {
  const request = authorizeSettingsOperation({ ...shared, kind: "updateDraft", draftId: "draft-1", status: "invalid", input: { expectedVersion: 2, value: 30, changeReason: "Correct invalid cadence", idempotencyKey: "settings-update-0001" } });
  assert.equal(request.path, "/dashboard/settings/drafts/draft-1");
  assert.equal(request.init.method, "PATCH");
  const updateOnly = { ...capability, actions: { ...capability.actions, createDraft: false, updateDraft: true } };
  assert.equal(authorizeSettingsOperation({ ...shared, capability: updateOnly, kind: "updateDraft", draftId: "draft-1", status: "draft", input: { expectedVersion: 2, value: 30, changeReason: "Correct draft cadence", idempotencyKey: "settings-update-0002" } }).init.method, "PATCH");
  assert.throws(() => authorizeSettingsOperation({ ...shared, capability: { ...capability, actions: { ...capability.actions, createDraft: true, updateDraft: false } }, kind: "updateDraft", draftId: "draft-1", status: "draft", input: { expectedVersion: 2, value: 30, changeReason: "Correct draft cadence", idempotencyKey: "settings-update-0003" } }));
  assert.throws(() => authorizeSettingsOperation({ ...shared, kind: "updateDraft", draftId: "draft-1", status: "publishing", input: { expectedVersion: 2, value: 30, changeReason: "Unsafe publishing edit", idempotencyKey: "settings-update-0004" } }));
});

test("S01 publish and rollback routes bind command versions", () => {
  const publish = authorizeSettingsOperation({ ...shared, kind: "publishDraft", draftId: "draft-1", status: "validated", input: { expectedVersion: 3, idempotencyKey: "settings-publish-0002" } });
  assert.equal(publish.path, "/dashboard/settings/drafts/draft-1/publish");
  assert.deepEqual(JSON.parse(String(publish.init.body)), { expectedVersion: 3, idempotencyKey: "settings-publish-0002" });
  assert.throws(() => authorizeSettingsOperation({ ...shared, kind: "publishDraft", draftId: "draft-1", status: "publishing", input: { expectedVersion: 3, idempotencyKey: "settings-publish-0003" } }));
  const rollback = authorizeSettingsOperation({ ...shared, kind: "createRollbackDraft", publicationId: "publication-1", sourceStatus: "published", input: { expectedPublishedVersion: 4, changeReason: "Restore known safe cadence", idempotencyKey: "settings-rollback-0002" } });
  assert.equal(rollback.path, "/dashboard/settings/history/publication-1/rollback-draft");
  assert.equal(authorizeSettingsOperation({ ...shared, kind: "createRollbackDraft", publicationId: "publication-0", sourceStatus: "superseded", input: { expectedPublishedVersion: 4, changeReason: "Restore superseded publication", idempotencyKey: "settings-rollback-0003" } }).path, "/dashboard/settings/history/publication-0/rollback-draft");
  assert.throws(() => authorizeSettingsOperation({ ...shared, kind: "createRollbackDraft", publicationId: "publication-1", sourceStatus: "activation_failed", input: { expectedPublishedVersion: 4, changeReason: "Reject failed activation", idempotencyKey: "settings-rollback-0004" } }));
  assert.throws(() => authorizeSettingsOperation({ ...shared, kind: "createRollbackDraft", publicationId: "publication-1", sourceStatus: "rolled_back", input: { expectedPublishedVersion: 4, changeReason: "Reject legacy rollback state", idempotencyKey: "settings-rollback-0005" } }));
});
