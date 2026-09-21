import assert from "node:assert/strict";
import test from "node:test";
import type { PrivacyRetentionSettingsValueV1 } from "../api/api-contract.ts";
import { authorizeS10Operation } from "./s10-settings-transport.ts";

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
const value: PrivacyRetentionSettingsValueV1 = {
  consentPolicy: { anonymousConsentEnabled: true, authenticatedConsentEnabled: false, consentCategories: ["functional", "analytics", "targeting"], retentionMonths: 24 },
  retentionPolicy: { retentionByObjectFamily: [{ objectFamily: "consent_events", retentionDays: 730, autoCleanupEnabled: false }] },
  legalHoldPolicy: { legalHoldEnabled: false, legalHoldRefs: [] },
  dsarPolicy: { accessExportDeleteRules: [{ scope: "all_personal_data", method: "export", enabled: true, requireAdminApproval: false }] },
  piiDisplayPolicy: { piiDisplayRules: [{ field: "customer.email", displayMode: "masked", allowedRoles: ["super_admin"] }] },
  lowRiskExecution: { allowlist: [], impactPreviewEnabled: true }
};

test("S10 transport fences every operation to the s10- endpoint family", () => {
  const create = authorizeS10Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.privacy-retention", expectedPublishedVersion: 0, value, changeReason: "S10 transport create", idempotencyKey: "settings-s10-create-0001" } });
  assert.equal(create.path, "/dashboard/settings/s10-drafts");
  const update = authorizeS10Operation({ ...shared, kind: "updateDraft", draftId, status: "draft", input: { expectedVersion: 1, value, changeReason: "S10 transport update", idempotencyKey: "settings-s10-update-0001" } });
  assert.equal(update.path, `/dashboard/settings/s10-drafts/${draftId}`);
  assert.equal(update.init.method, "PATCH");
  const validate = authorizeS10Operation({ ...shared, kind: "validateDraft", draftId, status: "draft", input: { expectedVersion: 1, idempotencyKey: "settings-s10-validate-0001" } });
  assert.equal(validate.path, `/dashboard/settings/s10-drafts/${draftId}/validate`);
  const publish = authorizeS10Operation({ ...shared, kind: "publishDraft", draftId, status: "validated", input: { expectedVersion: 2, idempotencyKey: "settings-s10-publish-0001" } });
  assert.equal(publish.path, `/dashboard/settings/s10-drafts/${draftId}/publish`);
  const rollback = authorizeS10Operation({ ...shared, kind: "createRollbackDraft", publicationId, sourceStatus: "published", input: { expectedPublishedVersion: 2, changeReason: "S10 transport rollback", idempotencyKey: "settings-s10-rollback-0001" } });
  assert.equal(rollback.path, `/dashboard/settings/s10-history/${publicationId}/rollback-draft`);
});

test("S10 transport gates capability, actor context and lifecycle state", () => {
  assert.throws(() => authorizeS10Operation({ ...shared, actorKey: "stale", kind: "createDraft", input: { descriptorKey: "settings.privacy-retention", expectedPublishedVersion: 0, value, changeReason: "S10 transport stale", idempotencyKey: "settings-s10-create-0002" } }));
  assert.throws(() => authorizeS10Operation({ ...shared, capability: { ...capability, actions: { ...capability.actions, publish: false } }, kind: "publishDraft", draftId, status: "validated", input: { expectedVersion: 2, idempotencyKey: "settings-s10-publish-0002" } }));
  assert.throws(() => authorizeS10Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.general-storefront" as never, expectedPublishedVersion: 0, value, changeReason: "S10 transport wrong descriptor", idempotencyKey: "settings-s10-create-0003" } }));
  assert.throws(() => authorizeS10Operation({ ...shared, kind: "publishDraft", draftId, status: "draft", input: { expectedVersion: 1, idempotencyKey: "settings-s10-publish-0003" } }));
  assert.throws(() => authorizeS10Operation({ ...shared, kind: "createRollbackDraft", publicationId: "not-a-uuid", sourceStatus: "published", input: { expectedPublishedVersion: 2, changeReason: "S10 transport bad uuid", idempotencyKey: "settings-s10-rollback-0002" } }));
  assert.throws(() => authorizeS10Operation({ ...shared, kind: "updateDraft", draftId, status: "validated", input: { expectedVersion: 1, value, changeReason: "S10 transport wrong state", idempotencyKey: "settings-s10-update-0002" } }));
});

test("S10 transport rejects out-of-range values before any request", () => {
  const badMonths = JSON.parse(JSON.stringify(value));
  badMonths.consentPolicy.retentionMonths = 5;
  assert.throws(() => authorizeS10Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.privacy-retention", expectedPublishedVersion: 0, value: badMonths, changeReason: "S10 transport bad months", idempotencyKey: "settings-s10-create-0004" } }), /retentionMonths/);
  const badDays = JSON.parse(JSON.stringify(value));
  badDays.retentionPolicy.retentionByObjectFamily = [{ objectFamily: "consent_events", retentionDays: 10, autoCleanupEnabled: false }];
  assert.throws(() => authorizeS10Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.privacy-retention", expectedPublishedVersion: 0, value: badDays, changeReason: "S10 transport bad days", idempotencyKey: "settings-s10-create-0005" } }), /retentionDays/);
  const badFamily = JSON.parse(JSON.stringify(value));
  badFamily.retentionPolicy.retentionByObjectFamily = [{ objectFamily: "chat_logs", retentionDays: 90, autoCleanupEnabled: false }];
  assert.throws(() => authorizeS10Operation({ ...shared, kind: "createDraft", input: { descriptorKey: "settings.privacy-retention", expectedPublishedVersion: 0, value: badFamily, changeReason: "S10 transport bad family", idempotencyKey: "settings-s10-create-0006" } }), /known object family/);
});
