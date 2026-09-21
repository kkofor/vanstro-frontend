import assert from "node:assert/strict";
import test from "node:test";
import type { SettingsHistoryEntry, SettingsSafeDiff, SettingsValidationResult } from "../api/api-contract.ts";
import { canTransitionSettingsLifecycle, isValidSettingsDraftValue, isValidSettingsReason, parseSettingsCenterLocation, settingsCenterHref } from "./s01-settings.ts";

test("S01 Settings routes canonicalize root and locale pages", () => {
  assert.deepEqual(parseSettingsCenterLocation("/dashboard/settings", ""), { kind: "valid", page: "overview", canonicalHref: "/dashboard/settings/overview" });
  assert.deepEqual(parseSettingsCenterLocation("/fr/dashboard/settings/history/", ""), { kind: "valid", page: "history", canonicalHref: "/fr/dashboard/settings/history" });
  assert.equal(settingsCenterHref("lifecycle", "en-CA", "draft-1"), "/dashboard/settings/lifecycle?draftId=draft-1");
  assert.equal(settingsCenterHref("overview", "fr-CA"), "/fr/dashboard/settings/overview");
});

test("S01 Settings routes reject unknown and repeated parameters", () => {
  assert.equal(parseSettingsCenterLocation("/dashboard/products", "").kind, "not-settings");
  assert.deepEqual(parseSettingsCenterLocation("/dashboard/settings/history", "draftId=draft-1"), { kind: "invalid", clearHref: "/dashboard/settings/overview", message: "Settings draft selection is invalid." });
  assert.equal(parseSettingsCenterLocation("/dashboard/settings/lifecycle", "draftId=a&draftId=b").kind, "invalid");
  assert.equal(parseSettingsCenterLocation("/dashboard/settings/overview", "provider=payment").kind, "invalid");
});

test("S01 field errors remain until each edited value becomes valid", () => {
  assert.equal(isValidSettingsDraftValue("14"), false);
  assert.equal(isValidSettingsDraftValue("14.5"), false);
  assert.equal(isValidSettingsDraftValue("15"), true);
  assert.equal(isValidSettingsDraftValue("300"), true);
  assert.equal(isValidSettingsDraftValue("301"), false);
  assert.equal(isValidSettingsReason("   short   "), false);
  assert.equal(isValidSettingsReason("  12345678  "), true);
});

test("S01 mutation responses bind submitted and confirmed authority", async () => {
  const {
    bindCreatedSettingsDraft,
    bindPublishedSettings,
    bindRollbackSettingsDraft,
    bindSettingsDiff,
    bindSettingsValidation,
    bindUpdatedSettingsDraft
  } = await import("./s01-settings.ts");
  const created = { id: "draft-2", descriptorKey: "settings.core.overview_refresh_seconds", status: "draft", value: 45, basePublicationVersion: 2, version: 1, changeReason: "Trimmed reason", createdAt: "2026-08-05T00:00:00.000Z", updatedAt: "2026-08-05T00:00:00.000Z", validationRevision: null, rollbackOfPublicationId: null } as const;
  const createInput = { descriptorKey: "settings.core.overview_refresh_seconds", expectedPublishedVersion: 2, value: 45, changeReason: "  Trimmed reason  ", idempotencyKey: "settings-create-0001" } as const;
  assert.equal(bindCreatedSettingsDraft(created, createInput), created);
  assert.throws(() => bindCreatedSettingsDraft({ ...created, basePublicationVersion: 3 }, createInput));
  assert.throws(() => bindCreatedSettingsDraft({ ...created, value: 46 }, createInput));
  const updated = { ...created, version: 2 };
  assert.equal(bindUpdatedSettingsDraft(updated, created, 45, "  Trimmed reason  "), updated);
  assert.throws(() => bindUpdatedSettingsDraft(created, created, 45, "Trimmed reason"));
  assert.throws(() => bindUpdatedSettingsDraft({ ...updated, value: 46 }, created, 45, "Trimmed reason"));
  assert.throws(() => bindUpdatedSettingsDraft({ ...updated, basePublicationVersion: 3 }, created, 45, "Trimmed reason"));
  assert.throws(() => bindUpdatedSettingsDraft({ ...updated, status: "validated" }, created, 45, "Trimmed reason"));

  const validation: SettingsValidationResult = { draftId: "draft-2", draftVersion: 2, validationRevision: 2, status: "validated", issues: [], validatedAt: "2026-08-05T00:01:00.000Z" };
  assert.equal(bindSettingsValidation(validation, "draft-2", 1, "draft"), validation);
  assert.throws(() => bindSettingsValidation({ ...validation, draftVersion: 1 }, "draft-2", 1, "draft"));
  assert.throws(() => bindSettingsValidation({ ...validation, validationRevision: 1 }, "draft-2", 1, "draft"));
  assert.throws(() => bindSettingsValidation(validation, "draft-2", 1, "publishing"));
  const diff: SettingsSafeDiff = { draftId: "draft-2", draftVersion: 2, descriptorKey: "settings.core.overview_refresh_seconds", changes: [{ field: "value", before: 30, after: 45, sensitivity: "public" }], secretChangeCount: 0, restartRequired: false, affectedServices: ["dashboard"] };
  assert.equal(bindSettingsDiff(diff, validation), diff);
  assert.throws(() => bindSettingsDiff({ ...diff, draftVersion: 3 }, validation));

  const publication = { id: "publication-3", generation: "3", version: 3, sourceDraftId: "draft-2", sourceDraftVersion: 2, status: "published", publishedAt: "2026-08-05T00:02:00.000Z", rollbackOfPublicationId: null, readiness: { state: "degraded", reasonCode: "consumer_generation_missing", observedAt: "2026-08-05T00:02:00.000Z", publishedGeneration: 3, publicationVersion: 3, consumerGeneration: null, effectiveOverviewRefreshSeconds: 45, projectionState: "published" } } as const;
  assert.equal(bindPublishedSettings(publication, "draft-2", 2), publication);
  assert.throws(() => bindPublishedSettings({ ...publication, sourceDraftVersion: 3 }, "draft-2", 2));
  const target: SettingsHistoryEntry = { publicationId: "publication-1", generation: "1", version: 1, status: "published", descriptorKeys: ["settings.core.overview_refresh_seconds"], changeReason: "Original publication", publishedAt: "2026-08-04T00:00:00.000Z", rollbackOfPublicationId: null, auditEventId: "audit-1" };
  const rollback = { ...created, id: "draft-rollback", status: "rollback_draft", basePublicationVersion: 3, rollbackOfPublicationId: "publication-1" } as const;
  assert.equal(bindRollbackSettingsDraft(rollback, target, 3), rollback);
  assert.throws(() => bindRollbackSettingsDraft({ ...rollback, basePublicationVersion: 2 }, target, 3));
});

test("S01 lifecycle transition matrix forbids partial publication and history rewrite", () => {
  assert.equal(canTransitionSettingsLifecycle("draft", "validated"), true);
  assert.equal(canTransitionSettingsLifecycle("draft", "published"), false);
  assert.equal(canTransitionSettingsLifecycle("validated", "publishing"), true);
  assert.equal(canTransitionSettingsLifecycle("publishing", "published"), true);
  assert.equal(canTransitionSettingsLifecycle("publishing", "rolled_back"), true);
  assert.equal(canTransitionSettingsLifecycle("published", "rollback_draft"), true);
  assert.equal(canTransitionSettingsLifecycle("published", "draft"), false);
  assert.equal(canTransitionSettingsLifecycle("rolled_back", "published"), false);
});
