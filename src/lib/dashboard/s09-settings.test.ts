import assert from "node:assert/strict";
import test from "node:test";
import type { S09HistoryEntry, S09SafeDiff, S09ValidationResult } from "../api/api-contract.ts";
import {
  bindCreatedS09Draft,
  bindPublishedS09,
  bindRollbackS09Draft,
  bindS09Diff,
  bindS09Readiness,
  bindS09Validation,
  bindUpdatedS09Draft,
  canTransitionS09Lifecycle,
  isStructurallyValidS09Value,
  isValidS09Reason,
  parseS09Location,
  S09_COMPILED_VALUE,
  s09PageHref
} from "./s09-settings.ts";

test("S09 routes canonicalize locale pages and reject non-S09 paths", () => {
  assert.deepEqual(parseS09Location("/dashboard/settings/auth-rbac"), { kind: "valid", page: "authRbac", canonicalHref: "/dashboard/settings/auth-rbac" });
  assert.deepEqual(parseS09Location("/fr/dashboard/settings/auth-rbac"), { kind: "valid", page: "authRbac", canonicalHref: "/fr/dashboard/settings/auth-rbac" });
  assert.deepEqual(parseS09Location("/dashboard/settings/auth-rbac/"), { kind: "valid", page: "authRbac", canonicalHref: "/dashboard/settings/auth-rbac" });
  assert.equal(parseS09Location("/dashboard/settings/overview").kind, "not-s09");
  assert.equal(parseS09Location("/dashboard/settings/general-storefront").kind, "not-s09");
  assert.equal(parseS09Location("/dashboard/products").kind, "not-s09");
  assert.equal(s09PageHref("authRbac", "fr-CA"), "/fr/dashboard/settings/auth-rbac");
});

test("S09 compiled fallback is structurally valid and lifecycle forbids partial publish", () => {
  assert.equal(isStructurallyValidS09Value(S09_COMPILED_VALUE), true);
  assert.equal(canTransitionS09Lifecycle("draft", "validated"), true);
  assert.equal(canTransitionS09Lifecycle("draft", "published"), false);
  assert.equal(canTransitionS09Lifecycle("validated", "publishing"), true);
  assert.equal(canTransitionS09Lifecycle("published", "rollback_draft"), true);
  assert.equal(canTransitionS09Lifecycle("rolled_back", "published"), false);
  assert.equal(isValidS09Reason("   short   "), false);
  assert.equal(isValidS09Reason("  12345678  "), true);
});

test("S09 structural validation rejects out-of-range and unknown-shape values", () => {
  assert.equal(isStructurallyValidS09Value({ ...S09_COMPILED_VALUE, passwordPolicy: { minimumLength: 11, resetTokenTtlMinutes: 30 } }), false);
  assert.equal(isStructurallyValidS09Value({ ...S09_COMPILED_VALUE, passwordPolicy: { minimumLength: 129, resetTokenTtlMinutes: 30 } }), false);
  assert.equal(isStructurallyValidS09Value({ ...S09_COMPILED_VALUE, passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 4 } }), false);
  assert.equal(isStructurallyValidS09Value({ ...S09_COMPILED_VALUE, passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 32 } }), false);
  assert.equal(isStructurallyValidS09Value({ ...S09_COMPILED_VALUE, sessionPolicy: { sessionLifetimeMinutes: 14 } }), false);
  assert.equal(isStructurallyValidS09Value({ ...S09_COMPILED_VALUE, sessionPolicy: { sessionLifetimeMinutes: 11521 } }), false);
  assert.equal(isStructurallyValidS09Value({ ...S09_COMPILED_VALUE, passwordPolicy: { ...S09_COMPILED_VALUE.passwordPolicy, cookieSecret: "x" } as never }), false);
  assert.equal(isStructurallyValidS09Value({ ...S09_COMPILED_VALUE, sessionPolicy: { ...S09_COMPILED_VALUE.sessionPolicy, authorizationHeader: "x" } as never }), false);
  assert.equal(isStructurallyValidS09Value({ ...S09_COMPILED_VALUE, passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 30.5 } }), false);
  assert.equal(isStructurallyValidS09Value({ ...S09_COMPILED_VALUE, sessionPolicy: { sessionLifetimeMinutes: 10080.5 } }), false);
});

test("S09 mutation responses bind submitted and confirmed authority", async () => {
  const created = { id: "11111111-1111-4111-8111-111111111111", descriptorKey: "settings.auth-rbac", status: "draft", value: S09_COMPILED_VALUE, basePublicationVersion: 0, version: 1, changeReason: "Trimmed reason", createdAt: "2026-08-06T00:00:00.000Z", updatedAt: "2026-08-06T00:00:00.000Z", validationRevision: null, rollbackOfPublicationId: null } as const;
  const createInput = { descriptorKey: "settings.auth-rbac", expectedPublishedVersion: 0, value: S09_COMPILED_VALUE, changeReason: "  Trimmed reason  ", idempotencyKey: "settings-s09-create-0001" } as const;
  assert.equal(bindCreatedS09Draft(created, createInput), created);
  assert.throws(() => bindCreatedS09Draft({ ...created, basePublicationVersion: 3 }, createInput));
  assert.throws(() => bindCreatedS09Draft({ ...created, value: { ...S09_COMPILED_VALUE, sessionPolicy: { sessionLifetimeMinutes: 60 } } }, createInput));

  const updated = { ...created, version: 2 };
  assert.equal(bindUpdatedS09Draft(updated, created, S09_COMPILED_VALUE, "  Trimmed reason  "), updated);
  assert.throws(() => bindUpdatedS09Draft(created, created, S09_COMPILED_VALUE, "Trimmed reason"));
  assert.throws(() => bindUpdatedS09Draft({ ...updated, version: 1 }, created, S09_COMPILED_VALUE, "Trimmed reason"));
  assert.throws(() => bindUpdatedS09Draft({ ...updated, status: "validated" }, created, S09_COMPILED_VALUE, "Trimmed reason"));

  const validation: S09ValidationResult = { draftId: "11111111-1111-4111-8111-111111111111", draftVersion: 2, validationRevision: 2, status: "validated", issues: [], validatedAt: "2026-08-06T00:01:00.000Z" };
  assert.equal(bindS09Validation(validation, "11111111-1111-4111-8111-111111111111", 1, "draft"), validation);
  assert.throws(() => bindS09Validation({ ...validation, draftVersion: 1 }, "11111111-1111-4111-8111-111111111111", 1, "draft"));
  assert.throws(() => bindS09Validation(validation, "11111111-1111-4111-8111-111111111111", 1, "publishing"));

  const diff: S09SafeDiff = { draftId: "11111111-1111-4111-8111-111111111111", draftVersion: 2, descriptorKey: "settings.auth-rbac", changes: [{ field: "sessionPolicy.sessionLifetimeMinutes", before: 10080, after: 60, sensitivity: "public" }], secretChangeCount: 0, restartRequired: false, affectedServices: ["auth", "dashboard"] };
  assert.equal(bindS09Diff(diff, validation), diff);
  assert.throws(() => bindS09Diff({ ...diff, draftVersion: 3 }, validation));

  const publication = { id: "11111111-1111-4111-8111-111111111112", generation: "1", version: 1, sourceDraftId: "11111111-1111-4111-8111-111111111111", sourceDraftVersion: 2, status: "published", publishedAt: "2026-08-06T00:02:00.000Z", rollbackOfPublicationId: null, readiness: { state: "ready", reasonCode: "ready", observedAt: "2026-08-06T00:02:00.000Z", publishedGeneration: 1, publicationVersion: 1, consumerGeneration: 1, projectionState: "published" } } as const;
  assert.equal(bindPublishedS09(publication, "11111111-1111-4111-8111-111111111111", 2), publication);
  assert.throws(() => bindPublishedS09({ ...publication, sourceDraftVersion: 3 }, "11111111-1111-4111-8111-111111111111", 2));

  const target: S09HistoryEntry = { publicationId: "11111111-1111-4111-8111-111111111112", generation: "1", version: 1, status: "published", descriptorKeys: ["settings.auth-rbac"], changeReason: "Original publication", publishedAt: "2026-08-05T00:00:00.000Z", rollbackOfPublicationId: null, auditEventId: "11111111-1111-4111-8111-111111111113" };
  const rollback = { ...created, id: "11111111-1111-4111-8111-111111111114", status: "rollback_draft", basePublicationVersion: 1, rollbackOfPublicationId: "11111111-1111-4111-8111-111111111112" } as const;
  assert.equal(bindRollbackS09Draft(rollback, target, 1), rollback);
  assert.throws(() => bindRollbackS09Draft({ ...rollback, basePublicationVersion: 2 }, target, 1));

  const readiness = { state: "ready" as const, reasonCode: "ready" as const, observedAt: "2026-08-06T00:03:00.000Z", publishedGeneration: 1, publicationVersion: 1, publicationCas: 2, consumerGeneration: 1, projectionState: "published" as const };
  assert.equal(bindS09Readiness(readiness, 1), readiness);
  assert.throws(() => bindS09Readiness({ ...readiness, consumerGeneration: null }, 1));
  assert.throws(() => bindS09Readiness({ ...readiness, state: "degraded" }, 1));
});
