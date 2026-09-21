import assert from "node:assert/strict";
import test from "node:test";
import type { S02HistoryEntry, S02SafeDiff, S02ValidationResult } from "../api/api-contract.ts";
import {
  bindCreatedS02Draft,
  bindPublishedS02,
  bindRollbackS02Draft,
  bindS02Diff,
  bindS02Readiness,
  bindS02Validation,
  bindUpdatedS02Draft,
  canTransitionS02Lifecycle,
  isStructurallyValidS02Value,
  isValidS02Reason,
  parseS02Location,
  S02_COMPILED_VALUE,
  s02PageHref
} from "./s02-settings.ts";

test("S02 routes canonicalize locale pages and reject non-S02 paths", () => {
  assert.deepEqual(parseS02Location("/dashboard/settings/general-storefront"), { kind: "valid", page: "generalStorefront", canonicalHref: "/dashboard/settings/general-storefront" });
  assert.deepEqual(parseS02Location("/fr/dashboard/settings/general-storefront"), { kind: "valid", page: "generalStorefront", canonicalHref: "/fr/dashboard/settings/general-storefront" });
  assert.deepEqual(parseS02Location("/dashboard/settings/general-storefront/"), { kind: "valid", page: "generalStorefront", canonicalHref: "/dashboard/settings/general-storefront" });
  assert.equal(parseS02Location("/dashboard/settings/overview").kind, "not-s02");
  assert.equal(parseS02Location("/dashboard/products").kind, "not-s02");
  assert.equal(s02PageHref("generalStorefront", "fr-CA"), "/fr/dashboard/settings/general-storefront");
});

test("S02 compiled fallback is structurally valid and lifecycle forbids partial publish", () => {
  assert.equal(isStructurallyValidS02Value(S02_COMPILED_VALUE), true);
  assert.equal(canTransitionS02Lifecycle("draft", "validated"), true);
  assert.equal(canTransitionS02Lifecycle("draft", "published"), false);
  assert.equal(canTransitionS02Lifecycle("validated", "publishing"), true);
  assert.equal(canTransitionS02Lifecycle("published", "rollback_draft"), true);
  assert.equal(canTransitionS02Lifecycle("rolled_back", "published"), false);
  assert.equal(isValidS02Reason("   short   "), false);
  assert.equal(isValidS02Reason("  12345678  "), true);
});

test("S02 structural validation rejects bad identity, pairing and locale shapes", () => {
  assert.equal(isStructurallyValidS02Value({ ...S02_COMPILED_VALUE, generalIdentity: { ...S02_COMPILED_VALUE.generalIdentity, siteDisplayName: "" } }), false);
  assert.equal(isStructurallyValidS02Value({ ...S02_COMPILED_VALUE, generalIdentity: { ...S02_COMPILED_VALUE.generalIdentity, canonicalUrl: "ftp://x" } }), false);
  assert.equal(isStructurallyValidS02Value({ ...S02_COMPILED_VALUE, generalIdentity: { ...S02_COMPILED_VALUE.generalIdentity, defaultTimezone: "America/New_York" as never } }), false);
  assert.equal(isStructurallyValidS02Value({ ...S02_COMPILED_VALUE, localization: { ...S02_COMPILED_VALUE.localization, currency: "USD" as never } }), false);
  assert.equal(isStructurallyValidS02Value({ ...S02_COMPILED_VALUE, localization: { ...S02_COMPILED_VALUE.localization, supportedLocales: ["zh-CN"] as never } }), false);
  assert.equal(isStructurallyValidS02Value({ ...S02_COMPILED_VALUE, storefront: { ...S02_COMPILED_VALUE.storefront, defaultProductSort: "random" as never } }), false);
});

test("S02 mutation responses bind submitted and confirmed authority", async () => {
  const created = { id: "11111111-1111-4111-8111-111111111111", descriptorKey: "settings.general-storefront", status: "draft", value: S02_COMPILED_VALUE, basePublicationVersion: 0, version: 1, changeReason: "Trimmed reason", createdAt: "2026-08-05T00:00:00.000Z", updatedAt: "2026-08-05T00:00:00.000Z", validationRevision: null, rollbackOfPublicationId: null } as const;
  const createInput = { descriptorKey: "settings.general-storefront", expectedPublishedVersion: 0, value: S02_COMPILED_VALUE, changeReason: "  Trimmed reason  ", idempotencyKey: "settings-s02-create-0001" } as const;
  assert.equal(bindCreatedS02Draft(created, createInput), created);
  assert.throws(() => bindCreatedS02Draft({ ...created, basePublicationVersion: 3 }, createInput));
  assert.throws(() => bindCreatedS02Draft({ ...created, value: { ...S02_COMPILED_VALUE, brand: { ...S02_COMPILED_VALUE.brand, brandName: "Other" } } }, createInput));

  const updated = { ...created, version: 2 };
  assert.equal(bindUpdatedS02Draft(updated, created, S02_COMPILED_VALUE, "  Trimmed reason  "), updated);
  assert.throws(() => bindUpdatedS02Draft(created, created, S02_COMPILED_VALUE, "Trimmed reason"));
  assert.throws(() => bindUpdatedS02Draft({ ...updated, version: 1 }, created, S02_COMPILED_VALUE, "Trimmed reason"));
  assert.throws(() => bindUpdatedS02Draft({ ...updated, status: "validated" }, created, S02_COMPILED_VALUE, "Trimmed reason"));

  const validation: S02ValidationResult = { draftId: "11111111-1111-4111-8111-111111111111", draftVersion: 2, validationRevision: 2, status: "validated", issues: [], validatedAt: "2026-08-05T00:01:00.000Z" };
  assert.equal(bindS02Validation(validation, "11111111-1111-4111-8111-111111111111", 1, "draft"), validation);
  assert.throws(() => bindS02Validation({ ...validation, draftVersion: 1 }, "11111111-1111-4111-8111-111111111111", 1, "draft"));
  assert.throws(() => bindS02Validation(validation, "11111111-1111-4111-8111-111111111111", 1, "publishing"));

  const diff: S02SafeDiff = { draftId: "11111111-1111-4111-8111-111111111111", draftVersion: 2, descriptorKey: "settings.general-storefront", changes: [{ field: "generalIdentity.siteDisplayName", before: "VanStro", after: "VanStro Global Supply", sensitivity: "public" }], secretChangeCount: 0, restartRequired: false, affectedServices: ["storefront", "dashboard"] };
  assert.equal(bindS02Diff(diff, validation), diff);
  assert.throws(() => bindS02Diff({ ...diff, draftVersion: 3 }, validation));

  const publication = { id: "11111111-1111-4111-8111-111111111112", generation: "1", version: 1, sourceDraftId: "11111111-1111-4111-8111-111111111111", sourceDraftVersion: 2, status: "published", publishedAt: "2026-08-05T00:02:00.000Z", rollbackOfPublicationId: null, readiness: { state: "degraded", reasonCode: "consumer_generation_missing", observedAt: "2026-08-05T00:02:00.000Z", publishedGeneration: 1, publicationVersion: 1, consumerGeneration: null, projectionState: "published" } } as const;
  assert.equal(bindPublishedS02(publication, "11111111-1111-4111-8111-111111111111", 2), publication);
  assert.throws(() => bindPublishedS02({ ...publication, sourceDraftVersion: 3 }, "11111111-1111-4111-8111-111111111111", 2));

  const target: S02HistoryEntry = { publicationId: "11111111-1111-4111-8111-111111111112", generation: "1", version: 1, status: "published", descriptorKeys: ["settings.general-storefront"], changeReason: "Original publication", publishedAt: "2026-08-04T00:00:00.000Z", rollbackOfPublicationId: null, auditEventId: "11111111-1111-4111-8111-111111111113" };
  const rollback = { ...created, id: "11111111-1111-4111-8111-111111111114", status: "rollback_draft", basePublicationVersion: 1, rollbackOfPublicationId: "11111111-1111-4111-8111-111111111112" } as const;
  assert.equal(bindRollbackS02Draft(rollback, target, 1), rollback);
  assert.throws(() => bindRollbackS02Draft({ ...rollback, basePublicationVersion: 2 }, target, 1));

  const readiness = { state: "ready" as const, reasonCode: "ready" as const, observedAt: "2026-08-05T00:03:00.000Z", publishedGeneration: 1, publicationVersion: 1, publicationCas: 2, consumerGeneration: 1, projectionState: "published" as const };
  assert.equal(bindS02Readiness(readiness, 1), readiness);
  assert.throws(() => bindS02Readiness({ ...readiness, consumerGeneration: null }, 1));
  assert.throws(() => bindS02Readiness({ ...readiness, state: "degraded" }, 1));
});
