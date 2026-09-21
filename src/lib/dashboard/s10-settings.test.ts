import assert from "node:assert/strict";
import test from "node:test";
import type { PrivacyRetentionSettingsValueV1, S10Draft, S10HistoryEntry, S10Readiness, S10SafeDiff, S10ValidationResult } from "../api/api-contract.ts";
import {
  bindCreatedS10Draft,
  bindPublishedS10,
  bindRollbackS10Draft,
  bindS10Diff,
  bindS10Readiness,
  bindS10Validation,
  bindUpdatedS10Draft,
  canTransitionS10Lifecycle,
  isStructurallyValidS10Value,
  isValidS10Reason,
  parseS10Location,
  s10PageHref,
  S10_COMPILED_VALUE,
  S10_HIGH_RISK_FAMILIES
} from "./s10-settings.ts";

const VALID_VALUE: PrivacyRetentionSettingsValueV1 = {
  consentPolicy: { anonymousConsentEnabled: true, authenticatedConsentEnabled: false, consentCategories: ["functional", "analytics", "targeting"], retentionMonths: 24 },
  retentionPolicy: { retentionByObjectFamily: [{ objectFamily: "consent_events", retentionDays: 730, autoCleanupEnabled: false }] },
  legalHoldPolicy: { legalHoldEnabled: false, legalHoldRefs: [] },
  dsarPolicy: { accessExportDeleteRules: [{ scope: "all_personal_data", method: "export", enabled: true, requireAdminApproval: false }] },
  piiDisplayPolicy: { piiDisplayRules: [{ field: "customer.email", displayMode: "masked", allowedRoles: ["super_admin"] }] },
  lowRiskExecution: { allowlist: [], impactPreviewEnabled: true }
};
const DRAFT: S10Draft = {
  id: "0a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
  descriptorKey: "settings.privacy-retention",
  status: "draft",
  value: VALID_VALUE,
  basePublicationVersion: 0,
  version: 1,
  changeReason: "S10 测试草稿原因",
  createdAt: "2026-08-06T00:00:00.000Z",
  updatedAt: "2026-08-06T00:00:00.000Z",
  validationRevision: null,
  rollbackOfPublicationId: null
};

test("S10 location parse and hrefs", () => {
  assert.deepEqual(parseS10Location("/dashboard/settings/privacy-retention"), { kind: "valid", page: "privacyRetention", canonicalHref: "/dashboard/settings/privacy-retention" });
  assert.deepEqual(parseS10Location("/fr/dashboard/settings/privacy-retention/"), { kind: "valid", page: "privacyRetention", canonicalHref: "/fr/dashboard/settings/privacy-retention" });
  assert.deepEqual(parseS10Location("/dashboard/settings/auth-rbac"), { kind: "not-s10" });
  assert.deepEqual(parseS10Location("/dashboard/customers"), { kind: "not-s10" });
  assert.equal(s10PageHref("privacyRetention", "en-CA"), "/dashboard/settings/privacy-retention");
  assert.equal(s10PageHref("privacyRetention", "fr-CA"), "/fr/dashboard/settings/privacy-retention");
});

test("S10 lifecycle transitions match the controlled lifecycle", () => {
  assert.equal(canTransitionS10Lifecycle("draft", "validated"), true);
  assert.equal(canTransitionS10Lifecycle("draft", "published"), false);
  assert.equal(canTransitionS10Lifecycle("validated", "publishing"), true);
  assert.equal(canTransitionS10Lifecycle("published", "rollback_draft"), true);
  assert.equal(canTransitionS10Lifecycle("invalid", "validated"), true);
  assert.equal(canTransitionS10Lifecycle("invalid", "published"), false);
  assert.equal(isValidS10Reason("short"), false);
  assert.equal(isValidS10Reason("这是足够长的变更原因文本"), true);
});

test("S10 structural value validation enforces typed bounds and enums", () => {
  assert.equal(isStructurallyValidS10Value(S10_COMPILED_VALUE), true);
  assert.equal(isStructurallyValidS10Value(VALID_VALUE), true);
  assert.equal(isStructurallyValidS10Value({ ...VALID_VALUE, extra: true } as unknown as PrivacyRetentionSettingsValueV1), false);
  const badMonths = JSON.parse(JSON.stringify(VALID_VALUE));
  badMonths.consentPolicy.retentionMonths = 5;
  assert.equal(isStructurallyValidS10Value(badMonths), false);
  const badCategory = JSON.parse(JSON.stringify(VALID_VALUE));
  badCategory.consentPolicy.consentCategories = ["marketing"];
  assert.equal(isStructurallyValidS10Value(badCategory), false);
  const badFamily = JSON.parse(JSON.stringify(VALID_VALUE));
  badFamily.retentionPolicy.retentionByObjectFamily = [{ objectFamily: "chat_logs", retentionDays: 90, autoCleanupEnabled: false }];
  assert.equal(isStructurallyValidS10Value(badFamily), false);
  const duplicateFamily = JSON.parse(JSON.stringify(VALID_VALUE));
  duplicateFamily.retentionPolicy.retentionByObjectFamily = [
    { objectFamily: "consent_events", retentionDays: 90, autoCleanupEnabled: false },
    { objectFamily: "consent_events", retentionDays: 180, autoCleanupEnabled: false }
  ];
  assert.equal(isStructurallyValidS10Value(duplicateFamily), false);
  const badMode = JSON.parse(JSON.stringify(VALID_VALUE));
  badMode.piiDisplayPolicy.piiDisplayRules = [{ field: "customer.email", displayMode: "raw", allowedRoles: ["super_admin"] }];
  assert.equal(isStructurallyValidS10Value(badMode), false);
  const badRef = JSON.parse(JSON.stringify(VALID_VALUE));
  badRef.legalHoldPolicy.legalHoldRefs = ["not-a-uuid"];
  assert.equal(isStructurallyValidS10Value(badRef), false);
  assert.equal(S10_HIGH_RISK_FAMILIES.has("orders"), true);
  assert.equal(S10_HIGH_RISK_FAMILIES.has("consent_events"), false);
});

test("S10 bind helpers reject mismatched responses", () => {
  assert.equal(bindCreatedS10Draft(DRAFT, { descriptorKey: "settings.privacy-retention", expectedPublishedVersion: 0, value: VALID_VALUE, changeReason: "S10 测试草稿原因" }), DRAFT);
  assert.throws(() => bindCreatedS10Draft({ ...DRAFT, version: 0 }, { descriptorKey: "settings.privacy-retention", expectedPublishedVersion: 0, value: VALID_VALUE, changeReason: "S10 测试草稿原因" }), /创建 S10 草稿响应/);
  const updated = { ...DRAFT, version: 2, changeReason: "S10 测试更新原因文本" };
  assert.equal(bindUpdatedS10Draft(updated, DRAFT, VALID_VALUE, "S10 测试更新原因文本"), updated);
  assert.throws(() => bindUpdatedS10Draft({ ...updated, status: "validated" }, DRAFT, VALID_VALUE, "S10 测试更新原因文本"), /S10 草稿更新响应/);
  const validation: S10ValidationResult = { draftId: DRAFT.id, draftVersion: 2, validationRevision: 2, status: "validated", issues: [], validatedAt: "2026-08-06T00:00:00.000Z" };
  assert.equal(bindS10Validation(validation, DRAFT.id, 1, "draft"), validation);
  assert.throws(() => bindS10Validation({ ...validation, status: "published" } as unknown as S10ValidationResult, DRAFT.id, 1, "draft"), /S10 验证响应/);
  const diff: S10SafeDiff = { draftId: DRAFT.id, draftVersion: 2, descriptorKey: "settings.privacy-retention", changes: [{ field: "consentPolicy.retentionMonths", before: 24, after: 36, sensitivity: "public" }], secretChangeCount: 0, restartRequired: false, affectedServices: ["dashboard"] };
  assert.equal(bindS10Diff(diff, validation), diff);
  assert.throws(() => bindS10Diff({ ...diff, descriptorKey: "settings.auth-rbac" } as unknown as S10SafeDiff, validation), /S10 安全差异/);
  const publication = { id: DRAFT.id, generation: "1", version: 1, sourceDraftId: DRAFT.id, sourceDraftVersion: 2, status: "published", publishedAt: "2026-08-06T00:00:00.000Z", rollbackOfPublicationId: null, readiness: { state: "degraded", reasonCode: "cleanup_consumer_unavailable", observedAt: "2026-08-06T00:00:00.000Z", publishedGeneration: 1, publicationVersion: 1, consumerGeneration: null, projectionState: "published" } } as const;
  assert.equal(bindPublishedS10(publication, DRAFT.id, 2), publication);
  assert.throws(() => bindPublishedS10({ ...publication, sourceDraftVersion: 3 }, DRAFT.id, 2), /S10 发布响应/);
  const historyEntry: S10HistoryEntry = { publicationId: DRAFT.id, generation: "1", version: 1, status: "published", descriptorKeys: ["settings.privacy-retention"], changeReason: "S10 历史记录原因", publishedAt: "2026-08-06T00:00:00.000Z", rollbackOfPublicationId: null, auditEventId: DRAFT.id };
  const rollback = { ...DRAFT, status: "rollback_draft", rollbackOfPublicationId: DRAFT.id, basePublicationVersion: 1, changeReason: "S10 回滚草稿原因文本" } as const;
  assert.equal(bindRollbackS10Draft(rollback, historyEntry, 1), rollback);
  assert.throws(() => bindRollbackS10Draft({ ...rollback, basePublicationVersion: 2 }, historyEntry, 1), /S10 回滚草稿响应/);
});

test("S10 readiness binding requires honest degraded cleanup consumer", () => {
  const degraded: S10Readiness = { state: "degraded", reasonCode: "cleanup_consumer_unavailable", observedAt: "2026-08-06T00:00:00.000Z", publishedGeneration: 3, publicationVersion: 3, publicationCas: 3, consumerGeneration: 3, projectionState: "published", cleanupConsumer: { state: "degraded", reasonCode: "cleanup_consumer_unavailable", observedAt: "2026-08-06T00:00:00.000Z" } };
  assert.equal(bindS10Readiness(degraded, 3), degraded);
  // Even an exact generation match must NOT fake ready.
  assert.throws(() => bindS10Readiness({ ...degraded, state: "ready", reasonCode: "ready" } as unknown as S10Readiness, 3), /S10 就绪响应必须诚实报告缺失的清理消费者/);
  assert.throws(() => bindS10Readiness({ ...degraded, consumerGeneration: null }, 3), /S10 就绪响应必须诚实报告缺失的清理消费者/);
  assert.throws(() => bindS10Readiness({ ...degraded, cleanupConsumer: { ...degraded.cleanupConsumer, state: "ready" } as unknown as S10Readiness["cleanupConsumer"] }, 3), /S10 就绪响应必须诚实报告缺失的清理消费者/);
});
