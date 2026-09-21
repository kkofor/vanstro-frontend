import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalProductIdFor,
  cartProductIdentityFor
} from "../src/lib/api/product-identity.ts";
import {
  contactLeadFromForm,
  dealerApplicationFromForm
} from "../src/lib/api/form-endpoints.ts";
import { API_ENDPOINTS, CHECKOUT_SESSION_STATUSES, DASHBOARD_FOUNDATION_MODULE_STATE, PUBLIC_API_ERROR_CODES, SETTINGS_CORE_DESCRIPTOR_KEY } from "../src/lib/api/api-contract.ts";
import {
  ApiValidationError,
  validateAccountOrder,
  validateApiResult,
  validateCart,
  validateCheckoutSession,
  validateCustomerAccount,
  validateCustomerAddress,
  validateDashboardFoundation,
  validateDashboardAuthorization,
  validateDataJobCommitRequest,
  validateDataJobCreateExportRequest,
  validateDataJobCreateImportRequest,
  validateDataJobCreateImportResponse,
  validateDataJobExportDetail,
  validateMediaRetryBinding,
  validateMediaRetryRequest,
  validateMediaRetryResponse,
  validateSettingsCenterCapability,
  validateSettingsCreateDraftRequest,
  validateSettingsCreateRollbackDraftRequest,
  validateSettingsDraft,
  validateSettingsDraftCommandRequest,
  validateSettingsHistoryEntry,
  validateSettingsOverview,
  validateSettingsPublication,
  validateSettingsReadiness,
  validateSettingsRegistryEntry,
  validateSettingsSafeDiff,
  validateSettingsUpdateDraftRequest,
  validateSettingsValidationResult,
  validateWebsiteApiProduct
} from "../src/lib/api/runtime-validation.ts";
import { localizeApiError } from "../src/lib/i18n/api-error-localization.ts";

test("S03 Commerce settings endpoints and P06-P08 routes remain distinct", () => {
  const endpoints = API_ENDPOINTS as Record<string, unknown>;
  assert.equal(endpoints.dashboardS03SettingsOverview, "/dashboard/settings/s03-overview");
  assert.equal(endpoints.dashboardS03SettingsDrafts, "/dashboard/settings/s03-drafts");
  assert.equal(endpoints.dashboardS03SettingsHistory, "/dashboard/settings/s03-history");
  assert.equal(endpoints.dashboardS03SettingsReadiness, "/dashboard/settings/s03-readiness");
  assert.equal(endpoints.dashboardS03SettingsImpactPreview, "/dashboard/settings/s03-impact-preview");
  for (const route of ["/dashboard/work-queue", "/dashboard/media", "/dashboard/data-jobs"]) assert.notEqual(route, endpoints.dashboardS03SettingsOverview);
});
test("S08 API/Service Account settings endpoints stay distinct and business routes live under /dashboard/mcp", () => {
  const endpoints = API_ENDPOINTS as Record<string, unknown>;
  const accountId = "11111111-1111-4111-8111-111111111113", tokenId = "11111111-1111-4111-8111-111111111114";
  assert.equal(endpoints.dashboardS08SettingsOverview, "/dashboard/settings/s08-overview");
  assert.equal(endpoints.dashboardS08SettingsDrafts, "/dashboard/settings/s08-drafts");
  assert.equal(endpoints.dashboardS08SettingsDraft(accountId), `/dashboard/settings/s08-drafts/${accountId}`);
  assert.equal(endpoints.dashboardS08SettingsDraftValidate(accountId), `/dashboard/settings/s08-drafts/${accountId}/validate`);
  assert.equal(endpoints.dashboardS08SettingsDraftDiff(accountId), `/dashboard/settings/s08-drafts/${accountId}/diff`);
  assert.equal(endpoints.dashboardS08SettingsDraftPublish(accountId), `/dashboard/settings/s08-drafts/${accountId}/publish`);
  assert.equal(endpoints.dashboardS08SettingsHistory, "/dashboard/settings/s08-history");
  assert.equal(endpoints.dashboardS08SettingsReadiness, "/dashboard/settings/s08-readiness");
  assert.equal(endpoints.dashboardS08SettingsImpactPreview, "/dashboard/settings/s08-impact-preview");
  assert.equal(endpoints.dashboardS08ServiceAccounts, "/dashboard/mcp/service-accounts");
  assert.equal(endpoints.dashboardS08ServiceAccount(accountId), `/dashboard/mcp/service-accounts/${accountId}`);
  assert.equal(endpoints.dashboardS08ServiceAccountTokens(accountId), `/dashboard/mcp/service-accounts/${accountId}/tokens`);
  assert.equal(endpoints.dashboardS08ServiceAccountTokenRotate(accountId, tokenId), `/dashboard/mcp/service-accounts/${accountId}/tokens/${tokenId}/rotate`);
  assert.equal(endpoints.dashboardS08InvocationReadModel, "/dashboard/mcp/invocations");
  for (const route of ["/dashboard/settings/s03-overview", "/dashboard/settings/s09-overview", "/dashboard/settings/s10-overview", "/dashboard/mcp"]) assert.notEqual(route, endpoints.dashboardS08SettingsOverview);
});
test("S01 Settings contract freezes exact routes, lifecycle DTOs, and safe boundaries", () => {
  const draftId = "draft-001", publicationId = "publication-001";
  assert.deepEqual([
    API_ENDPOINTS.dashboardSettingsOverview,
    API_ENDPOINTS.dashboardSettingsRegistry,
    API_ENDPOINTS.dashboardSettingsDrafts,
    API_ENDPOINTS.dashboardSettingsDraft(draftId),
    API_ENDPOINTS.dashboardSettingsDraftValidate(draftId),
    API_ENDPOINTS.dashboardSettingsDraftDiff(draftId),
    API_ENDPOINTS.dashboardSettingsDraftPublish(draftId),
    API_ENDPOINTS.dashboardSettingsHistory,
    API_ENDPOINTS.dashboardSettingsRollbackDraft(publicationId),
    API_ENDPOINTS.dashboardSettingsReadiness
  ], [
    "/dashboard/settings/overview", "/dashboard/settings/registry", "/dashboard/settings/drafts", "/dashboard/settings/drafts/draft-001",
    "/dashboard/settings/drafts/draft-001/validate", "/dashboard/settings/drafts/draft-001/diff", "/dashboard/settings/drafts/draft-001/publish",
    "/dashboard/settings/history", "/dashboard/settings/history/publication-001/rollback-draft", "/dashboard/settings/readiness"
  ]);
  for (const code of ["SETTINGS_DESCRIPTOR_UNAVAILABLE", "SETTINGS_STATE_CONFLICT", "SETTINGS_VALIDATION_FAILED", "VERSION_CONFLICT", "IDEMPOTENCY_CONFLICT"] as const) assert.ok(PUBLIC_API_ERROR_CODES.includes(code));
  const capability = { enabled: true, contractVersion: "settings-center.v1", registryVersion: "settings-registry.v1", coreDescriptorKey: SETTINGS_CORE_DESCRIPTOR_KEY, actions: { read: true, createDraft: true, updateDraft: true, validate: true, publish: true, rollback: true }, history: { read: true }, readiness: { read: true }, audit: { integrated: true }, secrets: false, externalSideEffects: false, partialPublish: false } as const;
  const registry = { key: SETTINGS_CORE_DESCRIPTOR_KEY, group: "core", title: "Overview refresh interval", description: "Controls how often the Settings overview refreshes safe status.", schemaVersion: "settings.core.overview-refresh-seconds.v1", availability: "available", valueType: "integer", secret: false, mutable: true, defaultValue: 60 } as const;
  const readiness = { state: "ready", reasonCode: "ready", observedAt: "2026-08-05T12:00:00.000Z", publishedGeneration: 1, publicationVersion: 1, consumerGeneration: 1, effectiveOverviewRefreshSeconds: 60, projectionState: "published" } as const;
  const overview = { contractVersion: "settings-center.v1", environment: { label: "Local development", kind: "local" }, publication: { generation: "1", version: 1, publishedAt: "2026-08-05T12:00:00.000Z" }, openDraftCount: 1, latestLifecycle: { status: "published", occurredAt: "2026-08-05T12:00:00.000Z" }, readiness, registry: { availableCount: 1, comingInV1Count: 11, notImplementedCount: 0 } } as const;
  const create = { descriptorKey: SETTINGS_CORE_DESCRIPTOR_KEY, expectedPublishedVersion: 1, value: 90, changeReason: "Reduce unnecessary Settings refresh traffic.", idempotencyKey: "settings-draft-0001" } as const;
  const update = { expectedVersion: 2, value: 120, changeReason: "Correct the draft after validation feedback.", idempotencyKey: "settings-update-0001" } as const;
  const command = { expectedVersion: 2, idempotencyKey: "settings-command-0001" } as const;
  const rollback = { expectedPublishedVersion: 2, changeReason: "Restore the previous safe refresh interval.", idempotencyKey: "settings-rollback-0001" } as const;
  const draft = { id: draftId, descriptorKey: SETTINGS_CORE_DESCRIPTOR_KEY, status: "validated", value: 90, basePublicationVersion: 1, version: 2, changeReason: create.changeReason, createdAt: "2026-08-05T11:55:00.000Z", updatedAt: "2026-08-05T12:00:00.000Z", validationRevision: 1, rollbackOfPublicationId: null } as const;
  const validation = { draftId, draftVersion: 2, validationRevision: 1, status: "validated", issues: [{ code: "SETTINGS_CHANGE_REVIEWED", severity: "info", field: "value", message: "The refresh interval is within the supported range." }], validatedAt: "2026-08-05T12:00:00.000Z" } as const;
  const diff = { draftId, draftVersion: 2, descriptorKey: SETTINGS_CORE_DESCRIPTOR_KEY, changes: [{ field: "value", before: 60, after: 90, sensitivity: "public" }], secretChangeCount: 0, restartRequired: false, affectedServices: ["dashboard"] } as const;
  const publication = { id: publicationId, generation: "2", version: 2, sourceDraftId: draftId, sourceDraftVersion: 2, status: "published", publishedAt: "2026-08-05T12:01:00.000Z", rollbackOfPublicationId: null, readiness: { ...readiness, state: "degraded", reasonCode: "consumer_generation_missing", publishedGeneration: 2, publicationVersion: 2, consumerGeneration: null } } as const;
  const history = { publicationId, generation: "2", version: 2, status: "published", descriptorKeys: [SETTINGS_CORE_DESCRIPTOR_KEY], changeReason: create.changeReason, publishedAt: publication.publishedAt, rollbackOfPublicationId: null, auditEventId: "audit-event-001" } as const;
  assert.deepEqual(validateSettingsCenterCapability(capability), capability);
  assert.deepEqual(validateSettingsRegistryEntry(registry), registry);
  assert.deepEqual(validateSettingsReadiness(readiness), readiness);
  assert.deepEqual(validateSettingsOverview(overview), overview);
  const compiledDefault = { state: "ready", reasonCode: "ready", observedAt: "2026-08-05T12:00:00Z", publishedGeneration: 0, publicationVersion: null, consumerGeneration: 0, effectiveOverviewRefreshSeconds: 60, projectionState: "compiled_default" } as const;
  assert.deepEqual(validateSettingsOverview({ ...overview, publication: { generation: "0", version: 0, publishedAt: null }, latestLifecycle: { status: "none", occurredAt: null }, readiness: compiledDefault }), { ...overview, publication: { generation: "0", version: 0, publishedAt: null }, latestLifecycle: { status: "none", occurredAt: null }, readiness: compiledDefault });
  assert.deepEqual(validateSettingsCreateDraftRequest(create), create);
  assert.deepEqual(validateSettingsUpdateDraftRequest(update), update);
  assert.deepEqual(validateSettingsDraftCommandRequest(command), command);
  assert.deepEqual(validateSettingsCreateRollbackDraftRequest(rollback), rollback);
  assert.deepEqual(validateSettingsDraft(draft), draft);
  assert.deepEqual(validateSettingsValidationResult(validation), validation);
  assert.deepEqual(validateSettingsSafeDiff(diff), diff);
  assert.deepEqual(validateSettingsPublication(publication), publication);
  assert.deepEqual(validateSettingsHistoryEntry(history), history);
  const supersededHistory = { ...history, publicationId: "publication-000", status: "superseded" as const };
  assert.deepEqual(validateSettingsHistoryEntry(supersededHistory), supersededHistory);
  // S01B: structurally correct business-invalid values are accepted into
  // drafts (server validation decides invalid); only structurally invalid
  // values (non-integer, unsafe, negative) are rejected at the boundary.
  assert.deepEqual(validateSettingsCreateDraftRequest({ ...create, value: 5 }), { ...create, value: 5 });
  for (const invalid of [
    () => validateSettingsRegistryEntry({ ...registry, key: "foundation.runtime.sample_flag" }),
    () => validateSettingsRegistryEntry({ ...registry, secret: true }),
    () => validateSettingsCreateDraftRequest({ ...create, value: 1.5 }),
    () => validateSettingsCreateDraftRequest({ ...create, value: -10 }),
    () => validateSettingsCreateDraftRequest({ ...create, value: 2 ** 53 }),
    () => validateSettingsCreateDraftRequest({ ...create, provider: "payment" }),
    () => validateSettingsUpdateDraftRequest({ ...update, expectedVersion: -1 }),
    () => validateSettingsUpdateDraftRequest({ ...update, value: 1.5 }),
    () => validateSettingsUpdateDraftRequest({ ...update, secret: "forbidden" }),
    () => validateSettingsSafeDiff({ ...diff, storagePath: "/private/settings" }),
    () => validateSettingsSafeDiff({ ...diff, secretChangeCount: 1 }),
    () => validateSettingsReadiness({ ...readiness, observedAt: "2026-08-05" }),
    () => validateSettingsReadiness({ ...readiness, observedAt: "2026-08-05 12:00:00Z" }),
    () => validateSettingsReadiness({ ...readiness, observedAt: "2026-02-30T12:00:00Z" }),
    () => validateSettingsReadiness({ ...readiness, observedAt: "2026-08-05T25:00:00Z" }),
    () => validateSettingsReadiness({ ...readiness, observedAt: "2026-08-05T23:60:00Z" }),
    () => validateSettingsReadiness({ ...readiness, reasonCode: "no_publication" }),
    () => validateSettingsOverview({ ...overview, readiness: { ...readiness, publicationVersion: 2 } }),
    () => validateSettingsOverview({ ...overview, publication: { generation: "0", version: 0, publishedAt: null } }),
    () => validateSettingsPublication({ ...publication, readiness }),
    () => validateSettingsPublication({ ...publication, status: "activation_failed" }),
    () => validateSettingsPublication({ ...publication, rawError: "SQL failed" }),
    () => validateSettingsHistoryEntry({ ...history, descriptorKeys: ["payment.secret"] })
  ]) assert.throws(invalid, ApiValidationError);
});

test("P08 canonical routes, error codes, and safe DTO boundaries are exact", () => {
  const id = "imp_example";
  assert.equal("dashboardDataImportUploadComplete" in API_ENDPOINTS, false);
  assert.deepEqual([
    API_ENDPOINTS.dashboardDataImports,
    API_ENDPOINTS.dashboardDataImport(id),
    API_ENDPOINTS.dashboardDataImportContent(id),
    API_ENDPOINTS.dashboardDataImportPreview(id),
    API_ENDPOINTS.dashboardDataImportCommit(id),
    API_ENDPOINTS.dashboardDataImportCancel(id),
    API_ENDPOINTS.dashboardDataExports,
    API_ENDPOINTS.dashboardDataExport(id),
    API_ENDPOINTS.dashboardDataExportCancel(id),
    API_ENDPOINTS.dashboardDataExportDownload(id)
  ], [
    "/dashboard/data-jobs/imports", "/dashboard/data-jobs/imports/imp_example", "/dashboard/data-jobs/imports/imp_example/content",
    "/dashboard/data-jobs/imports/imp_example/preview", "/dashboard/data-jobs/imports/imp_example/commit", "/dashboard/data-jobs/imports/imp_example/cancel",
    "/dashboard/data-jobs/exports", "/dashboard/data-jobs/exports/imp_example", "/dashboard/data-jobs/exports/imp_example/cancel", "/dashboard/data-jobs/exports/imp_example/download"
  ]);
  for (const code of ["OBJECT_DISABLED", "OBJECT_NOT_SUPPORTED", "IMPORT_NOT_READY", "VERSION_CONFLICT", "DOWNLOAD_NOT_AUTHORIZED"] as const) assert.ok(PUBLIC_API_ERROR_CODES.includes(code));
  assert.match(API_ENDPOINTS.dashboardDataImportContent(id), /^\/dashboard\/data-jobs\/imports\/[^/]+\/content$/);
  assert.equal(API_ENDPOINTS.dashboardAnalyticsRelease("2026-08-03"), "/dashboard/analytics/releases/2026-08-03");
  const createImport = { object_key: "foundation.sample", filename: "sample.csv", content_type: "text/csv", byte_size: 1024 } as const;
  const upload = { id, object_key: "foundation.sample", status: "awaiting_upload", upload: { method: "PUT", endpoint: `/api/v1${API_ENDPOINTS.dashboardDataImportContent(id)}`, token: "opaque-token", expires_at: "2026-08-03T12:05:00Z" }, version: 1 } as const;
  const commit = { mode: "valid_rows", expected_version: 2 } as const;
  const createExport = { object_key: "foundation.sample", format: "csv", query: { filters: [], sort: ["external_key:asc"] } } as const;
  const exportDetail = { id: "exp_example", object_key: "foundation.sample", status: "completed", formula_version: "foundation.sample.export.v1", row_count: 2, byte_size: 180, sha256: "a".repeat(64), expires_at: "2026-08-10T12:00:00Z", version: 3 } as const;
  assert.deepEqual(validateDataJobCreateImportRequest(createImport), createImport);
  assert.deepEqual(validateDataJobCreateImportResponse(upload), upload);
  assert.deepEqual(validateDataJobCommitRequest(commit), commit);
  assert.deepEqual(validateDataJobCreateExportRequest(createExport), createExport);
  assert.deepEqual(validateDataJobExportDetail(exportDetail), exportDetail);
  for (const invalid of [
    () => validateDataJobCreateImportRequest({ ...createImport, scope: "global" }),
    () => validateDataJobCreateImportRequest({ ...createImport, object_key: "category" }),
    () => validateDataJobCreateImportResponse({ ...upload, upload: { ...upload.upload, endpoint: "https://storage.example/file" } }),
    () => validateDataJobCreateImportResponse({ ...upload, upload: { ...upload.upload, storagePath: "/private/file" } }),
    () => validateDataJobCommitRequest({ ...commit, mode: "all_rows" }),
    () => validateDataJobCreateExportRequest({ ...createExport, tenantId: "tenant-1" }),
    () => validateDataJobCreateExportRequest({ ...createExport, format: "xlsx" }),
    () => validateDataJobExportDetail({ ...exportDetail, sha256: "A".repeat(64) }),
    () => validateDataJobExportDetail({ ...exportDetail, download_url: "https://public.example/file" }),
    () => validateDataJobExportDetail({ ...exportDetail, status: "done" })
  ]) assert.throws(invalid, ApiValidationError);
});

test("dashboard foundation runtime validation enforces the read-only contract", () => {
  const modules = DASHBOARD_FOUNDATION_MODULE_STATE.map((state) => ({
    module: state.module,
    label: state.label,
    group: state.group,
    status: state.status,
    route: state.route,
    selectors: state.selectors,
    readAllowed: state.status === "available" && state.module === "overview",
    ...(state.status === "coming_soon"
      ? { reason: "coming_soon" as const }
      : state.status === "available" && state.module !== "overview"
        ? { reason: "permission_required" as const }
        : {})
  }));
  const foundation = {
    contractVersion: "dashboard-foundation.v1.1",
    actor: { id: "admin-1", displayLabel: "Administrator", roleLabels: ["admin"] },
    modules,
    visibility: { scope: "unavailable", fields: "permission-only" },
    shell: { flag: "dashboard.shell.v2", mode: "internal", enabled: true, code: "DASHBOARD_SHELL_READY", readOnly: true },
    readiness: "ready",
    requestId: "request-1"
  } as const;
  assert.deepEqual(validateApiResult({ data: foundation }, validateDashboardFoundation).data, foundation);
  for (const state of [
    { mode: "disabled", enabled: false, code: "DASHBOARD_SHELL_DISABLED", readiness: "disabled" },
    { mode: "internal", enabled: false, code: "DASHBOARD_SHELL_ACTOR_NOT_ALLOWED", readiness: "disabled" },
    { mode: "internal", enabled: true, code: "DASHBOARD_SHELL_READY", readiness: "ready" }
  ] as const) {
    assert.doesNotThrow(() => validateApiResult({
      data: { ...foundation, shell: { ...foundation.shell, ...state }, readiness: state.readiness }
    }, validateDashboardFoundation));
  }
  assert.throws(
    () => validateApiResult({ data: { ...foundation, visibility: { scope: "global", fields: "permission-only" } } }, validateDashboardFoundation),
    ApiValidationError
  );
  for (const data of [
    { ...foundation, contractVersion: "dashboard-foundation.v1" },
    { ...foundation, shell: { ...foundation.shell, readOnly: false } },
    { ...foundation, shell: { ...foundation.shell, mode: "disabled" } },
    { ...foundation, shell: { ...foundation.shell, enabled: false, code: "DASHBOARD_SHELL_DISABLED" }, readiness: "disabled" },
    { ...foundation, shell: { ...foundation.shell, enabled: false, code: "DASHBOARD_SHELL_READY" }, readiness: "disabled" },
    { ...foundation, readiness: "disabled" },
    { ...foundation, modules: [{ module: "unknown", label: "未知", group: "platform", status: "available", readAllowed: true, route: "/dashboard/unknown", selectors: [] }] },
    { ...foundation, modules: [{ ...modules.find((module) => module.module === "overview")!, route: "/dashboard/products" }] },
    { ...foundation, modules: modules.map((module) => module.module === "overview" ? { ...module, readAllowed: false } : module) },
    { ...foundation, modules: modules.map((module) => module.module === "overview" ? { ...module, reason: "permission_required" } : module) },
    { ...foundation, modules: modules.map((module) => module.module === "payments" ? { ...module, readAllowed: true } : module) },
    { ...foundation, modules: modules.map((module) => module.module === "orders" ? { ...module, status: "coming_soon" } : module) }
  ]) {
    assert.throws(() => validateApiResult({ data }, validateDashboardFoundation), ApiValidationError);
  }
});

test("dashboard authorization validation rejects unknown and inconsistent scope contracts", () => {
  const payload = {
    contractVersion: "dashboard-authorization.v1",
    status: "ready",
    requestId: "request-p02",
    issuedAt: "2026-07-31T00:00:00.000Z",
    expiresAt: "2026-07-31T00:01:00.000Z",
    contextRevision: "revision-p02",
    actor: { principalType: "user", id: "actor-1", kind: "admin", status: "active", roleKeys: ["super_admin"] },
    effectiveRoles: [{ roleKey: "super_admin", scope: "global" }],
    modules: [{ module: "overview", route: "/dashboard", status: "allowed", actions: [{ action: "read", permissionKey: "dashboard.access", decision: "allow", reason: "granted_by_persisted_permission", scope: { kind: "global" } }] }],
    scope: { kind: "global", source: "persisted_grants" },
    fieldVisibility: [{ resourceType: "users", profileId: "pii-omitted" }],
    commonQueryV1: { products: { enabled: true }, dealers: { enabled: true } },
    auditFoundationV1: { enabled: false, queryProfile: "dashboard.audit-events.v1", eventVersion: "audit-event.v1", sensitive: { enabled: false } },
    asyncJobFoundationV1: { enabled: false, contractVersion: "async-job.v1", queryProfile: "dashboard.async-jobs.v1", registryVersion: "async-job-registry.v1", sensitive: { enabled: false }, mutations: { create: false, cancel: false, retry: false }, artifacts: { metadata: false, download: false } },
    workQueueFoundationV1: { enabled: false, contractVersion: "work-queue-item.v1", queryProfile: "dashboard.work-queue.v1", registryVersion: "work-queue-registry.v1", sensitive: { enabled: false }, actions: { assign: false, acknowledge: false, resolve: false, dismiss: false, reopen: false }, notifications: { enabled: false, contractVersion: "in-app-notification.v1", queryProfile: "dashboard.in-app-notifications.v1", markRead: false, externalDelivery: false } },
    dataJobFoundationV1: { enabled: false, contractVersion: "dashboard.data-jobs.v1", registryVersion: "dashboard.data-jobs.registry.v1", objectKey: "foundation.sample", imports: { read: false, create: false, commit: false }, exports: { read: false, create: false, download: false }, upload: { controlled: true, directAuthenticatedApi: true }, download: { controlled: true, directAuthenticatedApi: true }, tenantPartition: false },
    mediaFoundationV1: { enabled: false, contractVersion: "media-asset.v1", queryProfile: "dashboard.media-assets.v1", registryVersion: "media-registry.v1", safeProfile: "dashboard.media-assets.safe.v1", sensitiveProfile: { enabled: false, profileId: "dashboard.media-assets.sensitive.v1" }, actions: { create: false, update: false, archive: false, restore: false, downloadOriginal: false, manageVariants: false }, upload: { enabled: false, image: false, pdf: false, maxBytes: { image: 10_485_760, pdf: 26_214_400 }, intentLifetimeSeconds: 600, directControlledApi: true }, preview: { controlled: true, pdfInline: false }, legacyAdapters: { enabled: true, partial: true }, externalDelivery: false, ai: false, bulkImportExport: false },
    settingsCenterV1: { enabled: false, contractVersion: "settings-center.v1", registryVersion: "settings-registry.v1", coreDescriptorKey: SETTINGS_CORE_DESCRIPTOR_KEY, actions: { read: false, createDraft: false, updateDraft: false, validate: false, publish: false, rollback: false }, history: { read: false }, readiness: { read: false }, audit: { integrated: true }, secrets: false, externalSideEffects: false, partialPublish: false },
    serviceAccountsV1: { enabled: false, manage: false }
  } as const;
  assert.deepEqual(validateApiResult({ data: payload }, validateDashboardAuthorization).data, payload);
  const withoutP08 = { ...payload } as Record<string, unknown>;
  delete withoutP08.dataJobFoundationV1;
  assert.deepEqual(validateApiResult({ data: withoutP08 }, validateDashboardAuthorization).data.dataJobFoundationV1, payload.dataJobFoundationV1);
  const withoutS01 = { ...payload } as Record<string, unknown>;
  delete withoutS01.settingsCenterV1;
  assert.deepEqual(validateApiResult({ data: withoutS01 }, validateDashboardAuthorization).data.settingsCenterV1, payload.settingsCenterV1);
  assert.deepEqual(validateApiResult({ data: { ...payload, settingsCenterV1: { ...payload.settingsCenterV1, secrets: true, enabled: true } } }, validateDashboardAuthorization).data.settingsCenterV1, payload.settingsCenterV1);
  const enabledS01 = { ...payload.settingsCenterV1, enabled: true, actions: { read: true, createDraft: true, updateDraft: true, validate: true, publish: true, rollback: true }, history: { read: true }, readiness: { read: true } } as const;
  const settingsModule = { module: "settings", route: "/dashboard/settings", status: "allowed", actions: [{ action: "read", permissionKey: "settings.read", decision: "allow", reason: "granted_by_persisted_permission", scope: { kind: "global" } }] } as const;
  assert.deepEqual(validateApiResult({ data: { ...payload, modules: [...payload.modules, settingsModule], settingsCenterV1: enabledS01 } }, validateDashboardAuthorization).data.settingsCenterV1, enabledS01);
  assert.deepEqual(validateApiResult({ data: { ...payload, settingsCenterV1: enabledS01 } }, validateDashboardAuthorization).data.settingsCenterV1, payload.settingsCenterV1);
  assert.deepEqual(validateApiResult({ data: { ...payload, modules: [...payload.modules, { ...settingsModule, actions: [{ ...settingsModule.actions[0], scope: { kind: "dealer", dealerIds: ["dealer-a"], locationIds: [] } }] }], settingsCenterV1: enabledS01 } }, validateDashboardAuthorization).data.settingsCenterV1, payload.settingsCenterV1);
  for (const malformed of [
    { ...payload.dataJobFoundationV1, objectKey: "category", enabled: true },
    { ...payload.dataJobFoundationV1, tenantPartition: true },
    { ...payload.dataJobFoundationV1, upload: { ...payload.dataJobFoundationV1.upload, url: "https://storage.example/file" } },
    { ...payload.dataJobFoundationV1, exports: { ...payload.dataJobFoundationV1.exports, download: true, storagePath: "/private/file" } }
  ]) {
    assert.deepEqual(validateApiResult({ data: { ...payload, dataJobFoundationV1: malformed } }, validateDashboardAuthorization).data.dataJobFoundationV1, payload.dataJobFoundationV1);
  }
  assert.throws(() => validateApiResult({ data: { ...payload, modules: [...payload.modules, payload.modules[0]] } }, validateDashboardAuthorization), ApiValidationError);
  assert.throws(() => validateApiResult({ data: { ...payload, scope: { kind: "future", source: "unknown" } } }, validateDashboardAuthorization), ApiValidationError);
  assert.throws(() => validateApiResult({ data: { ...payload, modules: [{ ...payload.modules[0], actions: [{ ...payload.modules[0].actions[0], scope: { kind: "location", dealerIds: ["dealer-a"], locationIds: [] } }] }] } }, validateDashboardAuthorization), ApiValidationError);
  assert.throws(() => validateApiResult({ data: { ...payload, modules: [{ ...payload.modules[0], actions: [{ ...payload.modules[0].actions[0], decision: "deny", reason: "permission_required", scope: { kind: "global" } }] }] } }, validateDashboardAuthorization), ApiValidationError);
  assert.throws(() => validateApiResult({ data: { ...payload, effectiveRoles: [{ roleKey: "super_admin", scope: "location" }] } }, validateDashboardAuthorization), ApiValidationError);
  assert.throws(() => validateApiResult({ data: { ...payload, modules: [{ ...payload.modules[0], actions: [{ ...payload.modules[0].actions[0], permissionKey: "not.canonical" }] }] } }, validateDashboardAuthorization), ApiValidationError);
  assert.throws(() => validateApiResult({ data: { ...payload, modules: [{ ...payload.modules[0], actions: [{ ...payload.modules[0].actions[0], decision: "permit", reason: "permission_required", scope: { kind: "unavailable" } }] }] } }, validateDashboardAuthorization), ApiValidationError);
});

test("media retry safe DTO and command contracts reject leakage and ambiguity", () => {
  const jobId = "10000000-0000-4000-8000-000000000001";
  const assetId = "10000000-0000-4000-8000-000000000002";
  const binding = { jobId, jobVersion: 3, variants: [{ role: "original", expectedVersion: 2 }, { role: "thumbnail", expectedVersion: 4 }] } as const;
  const request = { expectedAssetVersion: 5, expectedJobId: jobId, expectedJobVersion: 3, variants: binding.variants };
  const response = { jobId, assetId, jobVersion: 4, assetVersion: 6, retryGeneration: 1 };
  assert.deepEqual(validateMediaRetryBinding(binding), binding);
  assert.deepEqual(validateMediaRetryRequest(request), request);
  assert.deepEqual(validateMediaRetryResponse(response), response);
  for (const leaked of ["attempt", "leaseRevision", "fencingToken", "storagePath", "sourceOperationId", "payload", "processingConfigHash", "checksum"]) {
    assert.throws(() => validateMediaRetryBinding({ ...binding, [leaked]: "forbidden" }), ApiValidationError);
  }
  assert.throws(() => validateMediaRetryBinding({ ...binding, variants: [...binding.variants].reverse() }), ApiValidationError);
  assert.throws(() => validateMediaRetryBinding({ ...binding, variants: [binding.variants[0], binding.variants[0]] }), ApiValidationError);
  assert.throws(() => validateMediaRetryRequest({ ...request, expectedJobVersion: -1 }), ApiValidationError);
  assert.throws(() => validateMediaRetryResponse({ ...response, attempt: 1 }), ApiValidationError);
});

test("runtime validation rejects malformed envelopes and currency", () => {
  assert.throws(
    () => validateApiResult({}, validateCart),
    ApiValidationError
  );
  assert.throws(
    () => validateApiResult({ data: {
      id: "cart-1",
      items: [],
      subtotal: { amount: 10, currency: "EUR" }
    } }, validateCart),
    /CAD or USD/
  );
});

const cartProduct = {
  id: "product-1",
  slug: "sample-product",
  name: "Sample product",
  unit: "each",
  dimensions: "24 in",
  images: [{ url: "/sample.jpg", alt: "Sample" }],
  inStock: true
};

function cartFixture() {
  return {
    id: "cart-1",
    items: [
      {
        id: "cart-item-1",
        skuId: "sku-id-1",
        product: { ...cartProduct, sku: "SKU-1" },
        quantity: 2,
        unitPrice: { amount: 10, currency: "CAD" },
        lineTotal: { amount: 18, currency: "CAD" }
      },
      {
        id: "cart-item-2",
        skuId: "sku-id-2",
        product: { ...cartProduct, sku: "SKU-2" },
        quantity: 1,
        unitPrice: { amount: 12, currency: "CAD" },
        lineTotal: { amount: 12, currency: "CAD" }
      }
    ],
    subtotal: { amount: 30, currency: "CAD" }
  } as const;
}

test("cart validation preserves cart-item, SKU, and authoritative totals", () => {
  const result = validateApiResult({ data: cartFixture() }, validateCart);

  assert.deepEqual(result.data.items.map((item) => ({
    id: item.id,
    skuId: item.skuId,
    sku: item.product.sku
  })), [
    { id: "cart-item-1", skuId: "sku-id-1", sku: "SKU-1" },
    { id: "cart-item-2", skuId: "sku-id-2", sku: "SKU-2" }
  ]);
  assert.deepEqual(result.data.items[0].lineTotal, { amount: 18, currency: "CAD" });
  assert.deepEqual(result.data.subtotal, { amount: 30, currency: "CAD" });
});

test("cart validation rejects invalid quantities and inconsistent currencies", () => {
  for (const mutate of [
    (cart: ReturnType<typeof cartFixture>) => ({
      ...cart,
      items: [{ ...cart.items[0], quantity: 0 }, cart.items[1]]
    }),
    (cart: ReturnType<typeof cartFixture>) => ({
      ...cart,
      items: [{
        ...cart.items[0],
        lineTotal: { ...cart.items[0].lineTotal, currency: "USD" as const }
      }, cart.items[1]]
    }),
    (cart: ReturnType<typeof cartFixture>) => ({
      ...cart,
      subtotal: { ...cart.subtotal, currency: "USD" as const }
    })
  ]) {
    assert.throws(
      () => validateApiResult({ data: mutate(cartFixture()) }, validateCart),
      ApiValidationError
    );
  }
});

test("unknown internal API errors are not exposed to customers", () => {
  const internal = Object.assign(new Error("The API base URL is not configured."), {
    code: "API_ERROR",
    status: 503
  });
  assert.equal(
    localizeApiError(internal, "en-CA", "The request could not be completed. Please try again."),
    "The request could not be completed. Please try again."
  );
  assert.equal(
    localizeApiError(internal, "fr-CA"),
    "La demande n’a pas pu être traitée. Veuillez réessayer."
  );
  assert.equal(
    localizeApiError(Object.assign(new Error("Prisma connection failed for db.internal"), {
      code: "API_ERROR",
      status: 500
    }), "en-CA"),
    "The request could not be completed. Please try again."
  );
});

test("runtime validation accepts Backend offset and page pagination metadata", () => {
  assert.deepEqual(
    validateApiResult({ data: [], meta: { limit: 0, offset: 0, total: 0 } }, (value) => value as unknown[]).meta,
    { limit: 0, offset: 0, total: 0 }
  );
  assert.deepEqual(
    validateApiResult({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }, (value) => value as unknown[]).meta,
    { page: 1, pageSize: 20, total: 0, totalPages: 1 }
  );
});

test("runtime validation rejects malformed pagination metadata", () => {
  for (const meta of [
    { limit: "100", offset: 0, total: 140 },
    { limit: 100, offset: -1, total: 140 },
    { limit: 100, offset: 0.5, total: 140 },
    { limit: 100, offset: 0, total: Number.POSITIVE_INFINITY },
    { page: "1", pageSize: 20, total: 140, totalPages: 7 },
    { page: 0, pageSize: 20, total: 140, totalPages: 7 },
    { page: 1, pageSize: -1, total: 140, totalPages: 7 },
    { page: 1, pageSize: 20, total: 140, totalPages: 0 },
    { page: 1, pageSize: 20, total: 140, totalPages: 7, replayed: "yes" }
  ]) {
    assert.throws(
      () => validateApiResult({ data: [], meta }, (value) => value as unknown[]),
      ApiValidationError
    );
  }
});

test("runtime validation enforces the canonical customer account contract", () => {
  const account = validateApiResult({ data: {
    id: "customer-1",
    email: "customer@example.com",
    firstName: "Customer"
  } }, validateCustomerAccount);
  assert.deepEqual(account.data, {
    id: "customer-1",
    email: "customer@example.com",
    firstName: "Customer"
  });
  assert.throws(
    () => validateApiResult({ data: { id: "customer-1" } }, validateCustomerAccount),
    ApiValidationError
  );
  assert.throws(
    () => validateApiResult({ data: { id: 1, email: "customer@example.com" } }, validateCustomerAccount),
    ApiValidationError
  );
});

test("runtime validation protects account address and order detail", () => {
  const address = {
    id: "address-1",
    label: null,
    firstName: "Customer",
    lastName: "Example",
    phone: null,
    addressLine1: "1 Main Street",
    addressLine2: null,
    city: "Winnipeg",
    province: "MB",
    postalCode: "R3C 0V8",
    country: "CA",
    isDefault: true
  };
  assert.deepEqual(validateCustomerAddress(address), address);
  assert.throws(() => validateCustomerAddress({ ...address, isDefault: "false" }), ApiValidationError);

  const order = {
    id: "order-1",
    status: "paid",
    fulfillment: "delivery",
    paymentMethod: "cash",
    total: { amount: 100, amountCents: 10000, currency: "CAD" },
    createdAt: "2026-07-30T12:00:00.000Z",
    items: [{ skuCode: "SKU-1", productName: "Base cabinet", quantity: 1 }]
  };
  assert.deepEqual(validateAccountOrder(order).items[0], order.items[0]);
  assert.throws(() => validateAccountOrder({ ...order, items: null }), ApiValidationError);
  assert.throws(() => validateAccountOrder({ ...order, createdAt: "not-a-date" }), ApiValidationError);
});

function checkoutSessionFixture() {
  return {
    id: "session-1",
    status: "pending",
    fulfillment: "delivery",
    paymentMethod: "cash",
    expiresAt: "2026-07-16T12:00:00.000Z",
    subtotal: { amount: 100, amountCents: 10000, currency: "CAD" },
    tax: { amount: 12, amountCents: 1200, currency: "CAD" },
    shipping: { amount: 13, amountCents: 1300, currency: "CAD" },
    total: { amount: 125, amountCents: 12500, currency: "CAD" },
    guestOrderToken: "guest-token",
    shippingAddress: {
      addressLine1: "1 Main Street",
      city: "Winnipeg",
      province: "MB",
      postalCode: "R3C 0V8",
      country: "CA"
    }
  } as const;
}

test("runtime validation accepts every Backend checkout session status", () => {
  for (const status of CHECKOUT_SESSION_STATUSES) {
    const result = validateApiResult({
      data: { ...checkoutSessionFixture(), status }
    }, validateCheckoutSession);
    assert.equal(result.data.status, status);
    assert.equal(result.data.total.currency, "CAD");
    assert.equal(result.data.total.amountCents, 12500);
    assert.equal(result.data.guestOrderToken, "guest-token");
    assert.equal(result.data.shippingAddress?.addressLine1, "1 Main Street");
  }
});

test("checkout validation rejects malformed money, dates, tokens and addresses", () => {
  for (const mutate of [
    (session: ReturnType<typeof checkoutSessionFixture>) => ({
      ...session,
      subtotal: { ...session.subtotal, amount: -1 }
    }),
    (session: ReturnType<typeof checkoutSessionFixture>) => ({
      ...session,
      tax: { ...session.tax, currency: "USD" as const }
    }),
    (session: ReturnType<typeof checkoutSessionFixture>) => ({ ...session, expiresAt: "not-a-date" }),
    (session: ReturnType<typeof checkoutSessionFixture>) => ({ ...session, guestOrderToken: "" }),
    (session: ReturnType<typeof checkoutSessionFixture>) => ({
      ...session,
      shippingAddress: { ...session.shippingAddress, addressLine1: { unexpected: true } }
    })
  ]) {
    assert.throws(
      () => validateApiResult({ data: mutate(checkoutSessionFixture()) }, validateCheckoutSession),
      ApiValidationError
    );
  }
});

test("website product validation preserves validated optional wire fields", () => {
  const product = validateWebsiteApiProduct({
    id: "product-1",
    slug: "sample-product",
    name: "Sample",
    category: "Kitchen cabinets",
    assets: [{ id: "asset-1", url: "/sample.jpg", altText: null, kind: "image", sortOrder: 0 }],
    specifications: { Width: "24 in" },
    ratingSummary: { average: 4.5, count: 2, writeReviewEnabled: true },
    reviews: [{ id: "review-1", name: "Ada", body: "Useful", rating: 5, verifiedBuyer: true }]
  });
  assert.equal(product.category, "Kitchen cabinets");
  assert.equal(product.assets?.[0].url, "/sample.jpg");
  assert.deepEqual(product.specifications, { Width: "24 in" });
  assert.equal(product.ratingSummary?.average, 4.5);
  assert.equal(product.reviews?.[0].verifiedBuyer, true);
});

test("website product validation rejects malformed optional wire fields", () => {
  assert.throws(
    () => validateWebsiteApiProduct({
      id: "product-1",
      slug: "sample-product",
      name: "Sample",
      assets: { kind: "image" }
    }),
    ApiValidationError
  );
  assert.throws(
    () => validateWebsiteApiProduct({
      id: "product-1",
      slug: "sample-product",
      name: "Sample",
      specifications: { Width: { internal: true } }
    }),
    ApiValidationError
  );
  assert.throws(
    () => validateWebsiteApiProduct({
      id: "product-1",
      slug: "sample-product",
      name: "Sample",
      price: { amount: 10, amountCents: 1000.5, currency: "CAD" }
    }),
    ApiValidationError
  );
});

test("canonical product identity requires matching slug and SKU", () => {
  const product = { id: "mb01-1", slug: "sample-product", sku: "SKU-1" };
  const canonical = {
    id: "product-1",
    slug: "sample-product",
    name: "Sample",
    primarySku: { id: "sku-1", skuCode: "SKU-1", name: "Sample SKU" }
  };
  assert.equal(canonicalProductIdFor(product, canonical), "product-1");
  assert.throws(
    () => canonicalProductIdFor(product, {
      ...canonical,
      primarySku: { ...canonical.primarySku, skuCode: "SKU-2" }
    }),
    /does not match/
  );
});

test("variant cart identity preserves the selected SKU", () => {
  const selectedVariant = {
    id: "sample-product-sku-2",
    slug: "sample-product",
    sku: "SKU-2"
  };
  assert.deepEqual(
    cartProductIdentityFor(selectedVariant),
    { productId: "sample-product", skuCode: "SKU-2" }
  );
});

test("contact and dealer forms produce canonical locale-aware payloads", () => {
  const contact = new FormData();
  contact.set("name", " Ada ");
  contact.set("email", "ada@example.com");
  contact.set("topic", "products");
  contact.set("message", "Details");
  assert.deepEqual(contactLeadFromForm(contact, "zh-CN", "/zh/contact"), {
    name: "Ada",
    email: "ada@example.com",
    topic: "products",
    message: "Details",
    locale: "zh-CN",
    sourcePath: "/zh/contact"
  });

  const dealer = new FormData();
  for (const [key, value] of Object.entries({
    companyName: "VanStro Dealer",
    contactName: "Ada",
    email: "ada@example.com",
    phone: "204-555-0100",
    city: "Winnipeg",
    province: "MB"
  })) dealer.set(key, value);
  dealer.set("applicationAcknowledgement", "on");
  dealer.append("capabilities", "Pickup coordination");
  const payload = dealerApplicationFromForm(dealer, "en-CA");
  assert.equal(payload.locale, "en-CA");
  assert.equal(payload.applicationAcknowledgement, true);
  assert.deepEqual(payload.capabilities, ["Pickup coordination"]);
});

test("V11-2 Dashboard auth reuses the existing cookie session endpoints only", () => {
  const endpoints = API_ENDPOINTS as Record<string, unknown>;
  assert.equal(endpoints.login, "/auth/login");
  assert.equal(endpoints.currentSession, "/auth/me");
  assert.equal(endpoints.logout, "/auth/logout");
  // The Dashboard never builds a token体系: login/me/logout are the only
  // session transports referenced by the Dashboard auth module, and no
  // storage-backed token endpoint exists in the shared contract.
  assert.equal(endpoints.refreshSession, "/auth/refresh");
  for (const tokenish of Object.values(endpoints)) {
    if (typeof tokenish !== "string") continue;
    assert.doesNotMatch(tokenish, /token/i, "no token-shaped endpoint may exist in the public contract");
  }
});
