import { CHECKOUT_SESSION_STATUSES, DASHBOARD_FOUNDATION_MODULE_PERMISSIONS, DASHBOARD_FOUNDATION_MODULE_ROUTES, DASHBOARD_FOUNDATION_MODULE_STATE } from "./api-contract.ts";
import type {
  ApiResult,
  AccountOrder,
  AuthSession,
  Cart,
  CategorySummary,
  CheckoutSession,
  CurrencyCode,
  CustomerAccount,
  CustomerAddress,
  DashboardFoundation,
  DashboardAuthorization,
  DashboardModuleSelectorSummary,
  DataJobCommitRequestV1,
  DataJobCreateExportRequestV1,
  DataJobCreateImportRequestV1,
  DataJobCreateImportResponseV1,
  DataJobExportDetailV1,
  StorefrontDealerSummary,
  FavoriteItem,
  Money,
  MediaRetryBindingV1,
  MediaRetryRequestV1,
  MediaRetryResponseV1,
  ProductSummary,
  ProductFinishOption,
  SettingsCenterCapability,
  SettingsCreateDraftRequest,
  SettingsCreateRollbackDraftRequest,
  SettingsDraft,
  SettingsDraftCommandRequest,
  SettingsHistoryEntry,
  SettingsUpdateDraftRequest,
  SettingsOverview,
  SettingsPublication,
  SettingsReadiness,
  SettingsRegistryEntry,
  SettingsSafeDiff,
  SettingsValidationResult,
  ShippingAddress,
  WebsiteApiProduct,
  S02CreateDraftRequest,
  S02Draft,
  S02HistoryEntry,
  S02Publication,
  S02Readiness,
  S02SafeDiff,
  S02UpdateDraftRequest,
  S02ValidationResult,
  StorefrontConfigProjection,
  GeneralStorefrontSettingsValueV1,
  S09CreateDraftRequest,
  S09Draft,
  S09HistoryEntry,
  S09ImpactPreviewResult,
  S09Overview,
  S09Publication,
  S09Readiness,
  S09SafeDiff,
  S09SessionRevokeResult,
  S09UpdateDraftRequest,
  S09ValidationResult,
  ConsentCategory,
  DsarMethod,
  DsarScope,
  ObjectFamily,
  PiiDisplayMode,
  PrivacyRetentionSettingsValueV1,
  S10CreateDraftRequest,
  S10Draft,
  S10HistoryEntry,
  S10ImpactPreviewResult,
  S10Overview,
  S10Publication,
  S10Readiness,
  S10SafeDiff,
  S10UpdateDraftRequest,
  S10ValidationResult,
  AuthRbacSettingsValueV1,
  CommerceOrderState,
  CommerceSettingsValueV1,
  S03ConsumerId,
  S03CreateDraftRequest,
  S03Draft,
  S03HistoryEntry,
  S03ImpactPreviewResult,
  S03Overview,
  S03Publication,
  S03Readiness,
  S03SafeDiff,
  S03UpdateDraftRequest,
  S03ValidationResult,
  ApiServiceAccountsValueV1,
  InvocationSummary,
  S08ConsumerId,
  S08CreateDraftRequest,
  S08Draft,
  S08HistoryEntry,
  S08ImpactPreviewResult,
  S08Overview,
  S08Publication,
  S08Readiness,
  S08SafeDiff,
  S08UpdateDraftRequest,
  S08ValidationResult,
  ServiceAccountSummary,
  TokenCreateResult,
  TokenMetadata,
  TokenRotateResult
} from "./api-contract";
export {
  validateCommerceSettingsValueV1,
  validateS03CreateDraftRequest,
  validateS03Draft,
  validateS03HistoryEntry,
  validateS03ImpactPreviewResult,
  validateS03Overview,
  validateS03Publication,
  validateS03Readiness,
  validateS03SafeDiff,
  validateS03UpdateDraftRequest,
  validateS03ValidationResult
} from "./s03-runtime-validation.ts";
export {
  validateApiServiceAccountsValueV1,
  validateS08CreateDraftRequest,
  validateS08Draft,
  validateS08HistoryEntry,
  validateS08ImpactPreviewResult,
  validateS08Overview,
  validateS08Publication,
  validateS08Readiness,
  validateS08SafeDiff,
  validateS08UpdateDraftRequest,
  validateS08ValidationResult,
  validateServiceAccountSummary,
  validateServiceAccountSummaryList,
  validateTokenMetadata,
  validateTokenMetadataList,
  validateTokenCreateResult,
  validateTokenRotateResult,
  validateInvocationSummary,
  validateInvocationSummaryList
} from "./s08-runtime-validation.ts";

export type RuntimeValidator<T> = (value: unknown, path?: string) => T;

export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiValidationError";
  }
}

function fail(path: string, expectation: string): never {
  throw new ApiValidationError(`${path} must be ${expectation}.`);
}

export function objectValue(value: unknown, path = "value"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail(path, "an object");
  }
  return value as Record<string, unknown>;
}

export function stringValue(value: unknown, path = "value"): string {
  if (typeof value !== "string" || !value.trim()) return fail(path, "a non-empty string");
  return value;
}

export function numberValue(value: unknown, path = "value"): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fail(path, "a finite number");
  return value;
}

export function booleanValue(value: unknown, path = "value"): boolean {
  if (typeof value !== "boolean") return fail(path, "a boolean");
  return value;
}

const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MEDIA_RETRY_ROLES = ["original", "thumbnail", "small", "medium", "large"] as const;
function exactKeys(record: Record<string, unknown>, required: readonly string[], path: string): void {
  const actual = Object.keys(record).sort();
  const expected = [...required].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) return fail(path, `exactly ${required.join(", ")}`);
}
function nonnegativeInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) return fail(path, "a nonnegative safe integer");
  return value as number;
}

function validateMediaRetryVariants(value: unknown, path: string): MediaRetryBindingV1["variants"] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MEDIA_RETRY_ROLES.length) return fail(path, "a non-empty bounded array");
  const variants = value.map((item, index) => {
    const variant = objectValue(item, `${path}[${index}]`);
    exactKeys(variant, ["role", "expectedVersion"], `${path}[${index}]`);
    if (!MEDIA_RETRY_ROLES.includes(variant.role as never)) return fail(`${path}[${index}].role`, "a known Media Variant role");
    return { role: variant.role as MediaRetryBindingV1["variants"][number]["role"], expectedVersion: nonnegativeInteger(variant.expectedVersion, `${path}[${index}].expectedVersion`) };
  });
  const roleIndexes = variants.map(({ role }) => MEDIA_RETRY_ROLES.indexOf(role));
  if (new Set(roleIndexes).size !== roleIndexes.length || roleIndexes.some((roleIndex, index) => index > 0 && roleIndex <= roleIndexes[index - 1]!)) return fail(path, "unique roles in canonical order");
  return variants;
}

export function validateMediaRetryBinding(value: unknown, path = "mediaRetryBinding"): MediaRetryBindingV1 {
  const binding = objectValue(value, path);
  exactKeys(binding, ["jobId", "jobVersion", "variants"], path);
  if (typeof binding.jobId !== "string" || !UUID_VALUE.test(binding.jobId)) return fail(`${path}.jobId`, "a UUID");
  return { jobId: binding.jobId, jobVersion: nonnegativeInteger(binding.jobVersion, `${path}.jobVersion`), variants: validateMediaRetryVariants(binding.variants, `${path}.variants`) };
}

export function validateMediaRetryRequest(value: unknown, path = "mediaRetryRequest"): MediaRetryRequestV1 {
  const request = objectValue(value, path);
  exactKeys(request, ["expectedAssetVersion", "expectedJobId", "expectedJobVersion", "variants"], path);
  if (typeof request.expectedJobId !== "string" || !UUID_VALUE.test(request.expectedJobId)) return fail(`${path}.expectedJobId`, "a UUID");
  return { expectedAssetVersion: nonnegativeInteger(request.expectedAssetVersion, `${path}.expectedAssetVersion`), expectedJobId: request.expectedJobId, expectedJobVersion: nonnegativeInteger(request.expectedJobVersion, `${path}.expectedJobVersion`), variants: validateMediaRetryVariants(request.variants, `${path}.variants`) };
}

export function validateMediaRetryResponse(value: unknown, path = "mediaRetryResponse"): MediaRetryResponseV1 {
  const response = objectValue(value, path);
  exactKeys(response, ["jobId", "assetId", "jobVersion", "assetVersion", "retryGeneration"], path);
  for (const key of ["jobId", "assetId"] as const) if (typeof response[key] !== "string" || !UUID_VALUE.test(response[key])) return fail(`${path}.${key}`, "a UUID");
  return { jobId: response.jobId as string, assetId: response.assetId as string, jobVersion: nonnegativeInteger(response.jobVersion, `${path}.jobVersion`), assetVersion: nonnegativeInteger(response.assetVersion, `${path}.assetVersion`), retryGeneration: nonnegativeInteger(response.retryGeneration, `${path}.retryGeneration`) };
}

function isoDateTime(value: unknown, path: string): string {
  const result = stringValue(value, path);
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d{3})?Z$/.exec(result);
  const time = Date.parse(result);
  if (!match || !Number.isFinite(time) || new Date(time).toISOString() !== `${match[1]}${match[2] ?? ".000"}Z`) return fail(path, "a canonical RFC3339 UTC date-time string");
  return result;
}

function nullableIsoDateTime(value: unknown, path: string): string | null {
  return value === null ? null : isoDateTime(value, path);
}

function positiveInteger(value: unknown, path: string): number {
  const result = nonnegativeInteger(value, path);
  if (result < 1) return fail(path, "a positive safe integer");
  return result;
}

function decimalGeneration(value: unknown, path: string): string {
  const result = stringValue(value, path);
  if (!/^(0|[1-9]\d*)$/.test(result)) return fail(path, "a nonnegative decimal generation string");
  return result;
}

function settingsId(value: unknown, path: string): string {
  const result = stringValue(value, path);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(result)) return fail(path, "an opaque Settings identifier");
  return result;
}

function settingsCoreValue(value: unknown, path: string): number {
  const result = positiveInteger(value, path);
  if (result < 15 || result > 300) return fail(path, "an integer from 15 through 300");
  return result;
}

/** Structurally valid Settings value (safe integer). Business validity in
 *  15..300 is decided by the server validation lifecycle, so drafts and
 *  requests may carry structurally correct business-invalid values. */
function settingsStructuralValue(value: unknown, path: string): number {
  return nonnegativeInteger(value, path);
}

function settingsReason(value: unknown, path: string): string {
  const result = stringValue(value, path).trim();
  if (result.length < 8 || result.length > 500) return fail(path, "8 through 500 characters");
  return result;
}

function settingsIdempotencyKey(value: unknown, path: string): string {
  const result = stringValue(value, path);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(result)) return fail(path, "a bounded opaque idempotency key");
  return result;
}

export const validateSettingsCenterCapability: RuntimeValidator<SettingsCenterCapability> = (value, path = "settingsCenterV1") => {
  const capability = objectValue(value, path), actions = objectValue(capability.actions, `${path}.actions`), history = objectValue(capability.history, `${path}.history`), readiness = objectValue(capability.readiness, `${path}.readiness`), audit = objectValue(capability.audit, `${path}.audit`);
  exactKeys(capability, ["enabled", "contractVersion", "registryVersion", "coreDescriptorKey", "actions", "history", "readiness", "audit", "secrets", "externalSideEffects", "partialPublish"], path);
  exactKeys(actions, ["read", "createDraft", "updateDraft", "validate", "publish", "rollback"], `${path}.actions`);
  exactKeys(history, ["read"], `${path}.history`);
  exactKeys(readiness, ["read"], `${path}.readiness`);
  exactKeys(audit, ["integrated"], `${path}.audit`);
  if (capability.contractVersion !== "settings-center.v1" || capability.registryVersion !== "settings-registry.v1" || capability.coreDescriptorKey !== "settings.core.overview_refresh_seconds" || audit.integrated !== true || capability.secrets !== false || capability.externalSideEffects !== false || capability.partialPublish !== false) return fail(path, "the S01 Settings capability contract");
  const booleans = [capability.enabled, actions.read, actions.createDraft, actions.updateDraft, actions.validate, actions.publish, actions.rollback, history.read, readiness.read];
  if (booleans.some((entry) => typeof entry !== "boolean")) return fail(path, "boolean capability actions");
  if (capability.enabled !== actions.read || (!actions.read && booleans.slice(2).some(Boolean))) return fail(path, "fail-closed capability dependencies");
  return capability as SettingsCenterCapability;
};

export const validateSettingsRegistryEntry: RuntimeValidator<SettingsRegistryEntry> = (value, path = "settingsRegistryEntry") => {
  const entry = objectValue(value, path);
  exactKeys(entry, ["key", "group", "title", "description", "schemaVersion", "availability", "valueType", "secret", "mutable", "defaultValue"], path);
  const group = stringValue(entry.group, `${path}.group`), availability = stringValue(entry.availability, `${path}.availability`);
  if (!["core", "general", "commerce", "payments", "email", "integrations", "webhooks", "developer", "auth", "privacy", "media", "system"].includes(group)) return fail(`${path}.group`, "a known Settings group");
  if (!["available", "coming_in_v1", "not_implemented"].includes(availability)) return fail(`${path}.availability`, "a known availability");
  if (entry.valueType !== "integer" || entry.secret !== false || typeof entry.mutable !== "boolean") return fail(path, "a non-secret integer descriptor");
  const key = stringValue(entry.key, `${path}.key`), defaultValue = settingsCoreValue(entry.defaultValue, `${path}.defaultValue`);
  if ((availability === "available") !== (key === "settings.core.overview_refresh_seconds" && group === "core" && entry.mutable === true)) return fail(path, "only the S01 core descriptor available");
  return { key, group: group as SettingsRegistryEntry["group"], title: stringValue(entry.title, `${path}.title`), description: stringValue(entry.description, `${path}.description`), schemaVersion: stringValue(entry.schemaVersion, `${path}.schemaVersion`), availability: availability as SettingsRegistryEntry["availability"], valueType: "integer", secret: false, mutable: entry.mutable as boolean, defaultValue };
};

export const validateSettingsReadiness: RuntimeValidator<SettingsReadiness> = (value, path = "settingsReadiness") => {
  const readiness = objectValue(value, path); exactKeys(readiness, ["state", "reasonCode", "observedAt", "publishedGeneration", "publicationVersion", "consumerGeneration", "effectiveOverviewRefreshSeconds", "projectionState"], path);
  const state = stringValue(readiness.state, `${path}.state`), reasonCode = stringValue(readiness.reasonCode, `${path}.reasonCode`), projectionState = stringValue(readiness.projectionState, `${path}.projectionState`);
  if (!["ready", "degraded", "not_ready"].includes(state) || !["ready", "consumer_generation_missing", "consumer_generation_mismatch", "consumer_unavailable", "activation_failed", "dependency_unavailable"].includes(reasonCode) || !["compiled_default", "published", "activation_failed"].includes(projectionState)) return fail(path, "a known Settings readiness state");
  const publishedGeneration = nonnegativeInteger(readiness.publishedGeneration, `${path}.publishedGeneration`);
  const publicationVersion = readiness.publicationVersion === null ? null : positiveInteger(readiness.publicationVersion, `${path}.publicationVersion`);
  const consumerGeneration = readiness.consumerGeneration === null ? null : nonnegativeInteger(readiness.consumerGeneration, `${path}.consumerGeneration`);
  const effectiveOverviewRefreshSeconds = settingsCoreValue(readiness.effectiveOverviewRefreshSeconds, `${path}.effectiveOverviewRefreshSeconds`);
  const exact = consumerGeneration === publishedGeneration && projectionState !== "activation_failed";
  if ((state === "ready") !== (reasonCode === "ready") || (state === "ready") !== exact) return fail(path, "a consumer-generation-bound Settings readiness state");
  if ((projectionState === "compiled_default") !== (publishedGeneration === 0 && publicationVersion === null && effectiveOverviewRefreshSeconds === 60)) return fail(path, "a projection-consistent Settings readiness state");
  if (projectionState === "published" && publicationVersion !== publishedGeneration) return fail(path, "a publication-sequence Settings readiness state");
  return { state: state as SettingsReadiness["state"], reasonCode: reasonCode as SettingsReadiness["reasonCode"], observedAt: isoDateTime(readiness.observedAt, `${path}.observedAt`), publishedGeneration, publicationVersion, consumerGeneration, effectiveOverviewRefreshSeconds, projectionState: projectionState as SettingsReadiness["projectionState"] };
};

export const validateSettingsOverview: RuntimeValidator<SettingsOverview> = (value, path = "settingsOverview") => {
  const overview = objectValue(value, path), environment = objectValue(overview.environment, `${path}.environment`), publication = objectValue(overview.publication, `${path}.publication`), latest = objectValue(overview.latestLifecycle, `${path}.latestLifecycle`), registry = objectValue(overview.registry, `${path}.registry`);
  exactKeys(overview, ["contractVersion", "environment", "publication", "openDraftCount", "latestLifecycle", "readiness", "registry"], path); exactKeys(environment, ["label", "kind"], `${path}.environment`); exactKeys(publication, ["generation", "version", "publishedAt"], `${path}.publication`); exactKeys(latest, ["status", "occurredAt"], `${path}.latestLifecycle`); exactKeys(registry, ["availableCount", "comingInV1Count", "notImplementedCount"], `${path}.registry`);
  const kind = stringValue(environment.kind, `${path}.environment.kind`), status = stringValue(latest.status, `${path}.latestLifecycle.status`);
  if (overview.contractVersion !== "settings-center.v1" || !["local", "development", "staging", "production"].includes(kind) || !["none", "draft", "validated", "invalid", "publishing", "published", "superseded", "activation_failed", "rollback_draft", "rolled_back"].includes(status)) return fail(path, "the Settings overview contract");
  const publicationVersion = nonnegativeInteger(publication.version, `${path}.publication.version`), publishedAt = nullableIsoDateTime(publication.publishedAt, `${path}.publication.publishedAt`), readiness = validateSettingsReadiness(overview.readiness, `${path}.readiness`);
  if ((publicationVersion === 0) !== (publishedAt === null) || readiness.publishedGeneration !== publicationVersion || readiness.publicationVersion !== (publicationVersion === 0 ? null : publicationVersion)) return fail(path, "a publication-consistent Settings overview");
  return { contractVersion: "settings-center.v1", environment: { label: stringValue(environment.label, `${path}.environment.label`), kind: kind as SettingsOverview["environment"]["kind"] }, publication: { generation: decimalGeneration(publication.generation, `${path}.publication.generation`), version: publicationVersion, publishedAt }, openDraftCount: nonnegativeInteger(overview.openDraftCount, `${path}.openDraftCount`), latestLifecycle: { status: status as SettingsOverview["latestLifecycle"]["status"], occurredAt: nullableIsoDateTime(latest.occurredAt, `${path}.latestLifecycle.occurredAt`) }, readiness, registry: { availableCount: nonnegativeInteger(registry.availableCount, `${path}.registry.availableCount`), comingInV1Count: nonnegativeInteger(registry.comingInV1Count, `${path}.registry.comingInV1Count`), notImplementedCount: nonnegativeInteger(registry.notImplementedCount, `${path}.registry.notImplementedCount`) } };
};

export const validateSettingsCreateDraftRequest: RuntimeValidator<SettingsCreateDraftRequest> = (value, path = "settingsCreateDraft") => { const request = objectValue(value, path); exactKeys(request, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"], path); if (request.descriptorKey !== "settings.core.overview_refresh_seconds") return fail(`${path}.descriptorKey`, "the S01 core descriptor"); return { descriptorKey: "settings.core.overview_refresh_seconds", expectedPublishedVersion: nonnegativeInteger(request.expectedPublishedVersion, `${path}.expectedPublishedVersion`), value: settingsStructuralValue(request.value, `${path}.value`), changeReason: settingsReason(request.changeReason, `${path}.changeReason`), idempotencyKey: settingsIdempotencyKey(request.idempotencyKey, `${path}.idempotencyKey`) }; };
export const validateSettingsUpdateDraftRequest: RuntimeValidator<SettingsUpdateDraftRequest> = (value, path = "settingsUpdateDraft") => { const request = objectValue(value, path); exactKeys(request, ["expectedVersion", "value", "changeReason", "idempotencyKey"], path); return { expectedVersion: nonnegativeInteger(request.expectedVersion, `${path}.expectedVersion`), value: settingsStructuralValue(request.value, `${path}.value`), changeReason: settingsReason(request.changeReason, `${path}.changeReason`), idempotencyKey: settingsIdempotencyKey(request.idempotencyKey, `${path}.idempotencyKey`) }; };
export const validateSettingsDraftCommandRequest: RuntimeValidator<SettingsDraftCommandRequest> = (value, path = "settingsDraftCommand") => { const request = objectValue(value, path); exactKeys(request, ["expectedVersion", "idempotencyKey"], path); return { expectedVersion: nonnegativeInteger(request.expectedVersion, `${path}.expectedVersion`), idempotencyKey: settingsIdempotencyKey(request.idempotencyKey, `${path}.idempotencyKey`) }; };
export const validateSettingsCreateRollbackDraftRequest: RuntimeValidator<SettingsCreateRollbackDraftRequest> = (value, path = "settingsRollbackDraft") => { const request = objectValue(value, path); exactKeys(request, ["expectedPublishedVersion", "changeReason", "idempotencyKey"], path); return { expectedPublishedVersion: nonnegativeInteger(request.expectedPublishedVersion, `${path}.expectedPublishedVersion`), changeReason: settingsReason(request.changeReason, `${path}.changeReason`), idempotencyKey: settingsIdempotencyKey(request.idempotencyKey, `${path}.idempotencyKey`) }; };
export const validateSettingsDraft: RuntimeValidator<SettingsDraft> = (value, path = "settingsDraft") => { const draft = objectValue(value, path); exactKeys(draft, ["id", "descriptorKey", "status", "value", "basePublicationVersion", "version", "changeReason", "createdAt", "updatedAt", "validationRevision", "rollbackOfPublicationId"], path); const status = stringValue(draft.status, `${path}.status`); if (draft.descriptorKey !== "settings.core.overview_refresh_seconds" || !["draft", "validated", "invalid", "publishing", "activation_failed", "rollback_draft"].includes(status)) return fail(path, "a Settings draft"); return { id: settingsId(draft.id, `${path}.id`), descriptorKey: "settings.core.overview_refresh_seconds", status: status as SettingsDraft["status"], value: settingsStructuralValue(draft.value, `${path}.value`), basePublicationVersion: nonnegativeInteger(draft.basePublicationVersion, `${path}.basePublicationVersion`), version: nonnegativeInteger(draft.version, `${path}.version`), changeReason: settingsReason(draft.changeReason, `${path}.changeReason`), createdAt: isoDateTime(draft.createdAt, `${path}.createdAt`), updatedAt: isoDateTime(draft.updatedAt, `${path}.updatedAt`), validationRevision: draft.validationRevision === null ? null : nonnegativeInteger(draft.validationRevision, `${path}.validationRevision`), rollbackOfPublicationId: draft.rollbackOfPublicationId === null ? null : settingsId(draft.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`) }; };
export const validateSettingsValidationResult: RuntimeValidator<SettingsValidationResult> = (value, path = "settingsValidation") => { const result = objectValue(value, path); exactKeys(result, ["draftId", "draftVersion", "validationRevision", "status", "issues", "validatedAt"], path); const status = stringValue(result.status, `${path}.status`); if (status !== "validated" && status !== "invalid") return fail(`${path}.status`, "validated or invalid"); const issues = arrayOf((entry, issuePath = "issue") => { const issue = objectValue(entry, issuePath); exactKeys(issue, ["code", "severity", "field", "message"], issuePath); const severity = stringValue(issue.severity, `${issuePath}.severity`), field = stringValue(issue.field, `${issuePath}.field`); if (!["blocker", "warning", "info"].includes(severity) || !["value", "changeReason", "publication"].includes(field)) return fail(issuePath, "a known validation issue"); return { code: stringValue(issue.code, `${issuePath}.code`), severity: severity as SettingsValidationResult["issues"][number]["severity"], field: field as SettingsValidationResult["issues"][number]["field"], message: stringValue(issue.message, `${issuePath}.message`) }; })(result.issues, `${path}.issues`); if ((status === "invalid") !== issues.some((issue) => issue.severity === "blocker")) return fail(path, "a status consistent with blockers"); return { draftId: settingsId(result.draftId, `${path}.draftId`), draftVersion: nonnegativeInteger(result.draftVersion, `${path}.draftVersion`), validationRevision: positiveInteger(result.validationRevision, `${path}.validationRevision`), status, issues, validatedAt: isoDateTime(result.validatedAt, `${path}.validatedAt`) }; };
export const validateSettingsSafeDiff: RuntimeValidator<SettingsSafeDiff> = (value, path = "settingsDiff") => { const diff = objectValue(value, path); exactKeys(diff, ["draftId", "draftVersion", "descriptorKey", "changes", "secretChangeCount", "restartRequired", "affectedServices"], path); if (diff.descriptorKey !== "settings.core.overview_refresh_seconds" || diff.secretChangeCount !== 0 || diff.restartRequired !== false) return fail(path, "a non-secret S01 safe diff"); const services = arrayOf(stringValue)(diff.affectedServices, `${path}.affectedServices`); if (services.length !== 1 || services[0] !== "dashboard") return fail(`${path}.affectedServices`, "dashboard only"); const changes = arrayOf((entry, changePath = "change") => { const change = objectValue(entry, changePath); exactKeys(change, ["field", "before", "after", "sensitivity"], changePath); if (change.field !== "value" || change.sensitivity !== "public") return fail(changePath, "the public value field"); return { field: "value" as const, before: settingsStructuralValue(change.before, `${changePath}.before`), after: settingsStructuralValue(change.after, `${changePath}.after`), sensitivity: "public" as const }; })(diff.changes, `${path}.changes`); return { draftId: settingsId(diff.draftId, `${path}.draftId`), draftVersion: nonnegativeInteger(diff.draftVersion, `${path}.draftVersion`), descriptorKey: "settings.core.overview_refresh_seconds", changes, secretChangeCount: 0, restartRequired: false, affectedServices: ["dashboard"] }; };
export const validateSettingsPublication: RuntimeValidator<SettingsPublication> = (value, path = "settingsPublication") => { const publication = objectValue(value, path); exactKeys(publication, ["id", "generation", "version", "sourceDraftId", "sourceDraftVersion", "status", "publishedAt", "rollbackOfPublicationId", "readiness"], path); const status = stringValue(publication.status, `${path}.status`); if (!["published", "superseded", "activation_failed", "rolled_back"].includes(status)) return fail(`${path}.status`, "a publication status"); const version = positiveInteger(publication.version, `${path}.version`), readiness = validateSettingsReadiness(publication.readiness, `${path}.readiness`); if (readiness.publishedGeneration !== version || readiness.publicationVersion !== version || readiness.consumerGeneration !== null || readiness.state !== "degraded" || readiness.reasonCode !== "consumer_generation_missing" || readiness.projectionState !== (status === "activation_failed" ? "activation_failed" : "published")) return fail(path, "publication-consistent Settings readiness"); return { id: settingsId(publication.id, `${path}.id`), generation: decimalGeneration(publication.generation, `${path}.generation`), version, sourceDraftId: settingsId(publication.sourceDraftId, `${path}.sourceDraftId`), sourceDraftVersion: nonnegativeInteger(publication.sourceDraftVersion, `${path}.sourceDraftVersion`), status: status as SettingsPublication["status"], publishedAt: isoDateTime(publication.publishedAt, `${path}.publishedAt`), rollbackOfPublicationId: publication.rollbackOfPublicationId === null ? null : settingsId(publication.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`), readiness }; };
export const validateSettingsHistoryEntry: RuntimeValidator<SettingsHistoryEntry> = (value, path = "settingsHistoryEntry") => { const entry = objectValue(value, path); exactKeys(entry, ["publicationId", "generation", "version", "status", "descriptorKeys", "changeReason", "publishedAt", "rollbackOfPublicationId", "auditEventId"], path); const status = stringValue(entry.status, `${path}.status`), keys = arrayOf(stringValue)(entry.descriptorKeys, `${path}.descriptorKeys`); if (!["published", "superseded", "activation_failed", "rolled_back"].includes(status) || keys.length !== 1 || keys[0] !== "settings.core.overview_refresh_seconds") return fail(path, "a Settings history entry"); return { publicationId: settingsId(entry.publicationId, `${path}.publicationId`), generation: decimalGeneration(entry.generation, `${path}.generation`), version: positiveInteger(entry.version, `${path}.version`), status: status as SettingsHistoryEntry["status"], descriptorKeys: ["settings.core.overview_refresh_seconds"], changeReason: settingsReason(entry.changeReason, `${path}.changeReason`), publishedAt: isoDateTime(entry.publishedAt, `${path}.publishedAt`), rollbackOfPublicationId: entry.rollbackOfPublicationId === null ? null : settingsId(entry.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`), auditEventId: settingsId(entry.auditEventId, `${path}.auditEventId`) }; };

const CANADA_TIMEZONES = new Set([
  "America/St_Johns", "America/Halifax", "America/Moncton", "America/Glace_Bay", "America/Goose_Bay",
  "America/Blanc-Sablon", "America/Toronto", "America/Iqaluit", "America/Winnipeg", "America/Rankin_Inlet",
  "America/Regina", "America/Swift_Current", "America/Edmonton", "America/Cambridge_Bay", "America/Inuvik",
  "America/Dawson_Creek", "America/Fort_Nelson", "America/Creston", "America/Vancouver", "America/Whitehorse",
  "America/Dawson"
]);
const S02_SUPPORTED_LOCALES = new Set(["en-CA", "fr-CA"]);

function s02OptionalUuid(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !UUID_VALUE.test(value)) return fail(path, "a UUID or null");
  return value;
}
function s02BoundedString(value: unknown, path: string, max: number): string {
  const result = stringValue(value, path);
  if (result.length > max) return fail(path, `at most ${max} characters`);
  return result;
}
function s02PostalCode(value: unknown, path: string): string {
  const result = stringValue(value, path);
  if (result.length > 10) return fail(path, "at most 10 characters");
  return result;
}
function s02Phone(value: unknown, path: string): string {
  const result = stringValue(value, path);
  if (!/^[+0-9()\s-]{7,25}$/.test(result)) return fail(path, "a bounded phone string");
  return result;
}
function s02Email(value: unknown, path: string): string {
  const result = stringValue(value, path);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(result)) return fail(path, "an email string");
  return result;
}
/** Contact email in a public projection: empty is valid (compiled default
 * has no contact info), non-empty must be a well-formed email. */
function s02OptionalEmail(value: unknown, path: string): string {
  const result = s02BoundedOrEmptyString(value, path, 254);
  if (result && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(result)) return fail(path, "an email string");
  return result;
}
/** Contact phone in a public projection: empty is valid, non-empty bounded. */
function s02OptionalPhone(value: unknown, path: string): string {
  const result = s02BoundedOrEmptyString(value, path, 25);
  if (result && !/^[+0-9()\s-]{7,25}$/.test(result)) return fail(path, "a bounded phone string");
  return result;
}
function s02Url(value: unknown, path: string): string {
  const result = stringValue(value, path);
  if (result.length > 2048 || !/^https?:\/\//.test(result)) return fail(path, "a bounded http(s) URL");
  return result;
}
function s02Timezone(value: unknown, path: string): GeneralStorefrontSettingsValueV1["generalIdentity"]["defaultTimezone"] {
  const result = stringValue(value, path);
  if (!CANADA_TIMEZONES.has(result)) return fail(path, "a Canada IANA timezone");
  return result as GeneralStorefrontSettingsValueV1["generalIdentity"]["defaultTimezone"];
}
function s02Reason(value: unknown, path: string): string {
  const result = stringValue(value, path).trim();
  if (result.length < 8 || result.length > 500) return fail(path, "8 through 500 characters");
  return result;
}
function s02IsoDateTimeOrNull(value: unknown, path: string): string | null {
  return value === null || value === undefined ? null : isoDateTime(value, path);
}

export const validateGeneralIdentityV1: RuntimeValidator<GeneralStorefrontSettingsValueV1["generalIdentity"]> = (value, path = "generalIdentity") => {
  const identity = objectValue(value, path), address = objectValue(identity.contactAddress, `${path}.contactAddress`);
  exactKeys(identity, ["siteDisplayName", "legalName", "canonicalUrl", "contactEmail", "contactPhone", "contactAddress", "defaultTimezone"], path);
  const addressKeys = Object.keys(address).sort();
  const expectedAddressKeys = address.line2 === undefined || address.line2 === null ? ["line1", "city", "province", "postalCode", "country"].sort() : ["line1", "line2", "city", "province", "postalCode", "country"].sort();
  if (addressKeys.length !== expectedAddressKeys.length || addressKeys.some((key, index) => key !== expectedAddressKeys[index])) return fail(`${path}.contactAddress`, "exactly line1, line2?, city, province, postalCode, country");
  return {
    siteDisplayName: s02BoundedString(identity.siteDisplayName, `${path}.siteDisplayName`, 120),
    legalName: s02BoundedString(identity.legalName, `${path}.legalName`, 200),
    canonicalUrl: s02Url(identity.canonicalUrl, `${path}.canonicalUrl`),
    contactEmail: s02Email(identity.contactEmail, `${path}.contactEmail`),
    contactPhone: s02Phone(identity.contactPhone, `${path}.contactPhone`),
    contactAddress: {
      line1: s02BoundedString(address.line1, `${path}.contactAddress.line1`, 200),
      ...(address.line2 === undefined || address.line2 === null ? {} : { line2: s02BoundedString(address.line2, `${path}.contactAddress.line2`, 200) }),
      city: s02BoundedString(address.city, `${path}.contactAddress.city`, 120),
      province: s02BoundedString(address.province, `${path}.contactAddress.province`, 80),
      postalCode: s02PostalCode(address.postalCode, `${path}.contactAddress.postalCode`),
      country: s02BoundedString(address.country, `${path}.contactAddress.country`, 80)
    },
    defaultTimezone: s02Timezone(identity.defaultTimezone, `${path}.defaultTimezone`)
  };
};
function s02BoundedOrEmptyString(value: unknown, path: string, max: number): string {
  if (typeof value !== "string") return fail(path, "a string");
  if (value.length > max) return fail(path, `at most ${max} characters`);
  return value;
}
export const validateBrandV1: RuntimeValidator<GeneralStorefrontSettingsValueV1["brand"]> = (value, path = "brand") => {
  const brand = objectValue(value, path);
  exactKeys(brand, ["brandName", "brandDescription", "logoMediaRef", "faviconMediaRef"], path);
  return { brandName: s02BoundedString(brand.brandName, `${path}.brandName`, 120), brandDescription: s02BoundedOrEmptyString(brand.brandDescription, `${path}.brandDescription`, 500), logoMediaRef: s02OptionalUuid(brand.logoMediaRef, `${path}.logoMediaRef`), faviconMediaRef: s02OptionalUuid(brand.faviconMediaRef, `${path}.faviconMediaRef`) };
};
export const validateAnnouncementRuleV1: RuntimeValidator<GeneralStorefrontSettingsValueV1["storefront"]["announcementRule"]> = (value, path = "announcementRule") => {
  const rule = objectValue(value, path);
  const keys = Object.keys(rule).sort();
  const allowedKeys = ["enabled", "message", "locale", "startsAt", "endsAt"].sort();
  if (!["enabled", "message"].every((key) => keys.includes(key)) || keys.some((key) => !allowedKeys.includes(key))) return fail(path, "enabled and message plus optional locale, startsAt, endsAt");
  const locale = rule.locale === undefined || rule.locale === null ? undefined : stringValue(rule.locale, `${path}.locale`);
  if (locale !== undefined && !S02_SUPPORTED_LOCALES.has(locale)) return fail(`${path}.locale`, "en-CA or fr-CA");
  const result: GeneralStorefrontSettingsValueV1["storefront"]["announcementRule"] = { enabled: booleanValue(rule.enabled, `${path}.enabled`), message: s02BoundedOrEmptyString(rule.message, `${path}.message`, 300) };
  if (locale !== undefined) result.locale = locale as "en-CA" | "fr-CA";
  if (rule.startsAt !== undefined && rule.startsAt !== null) result.startsAt = isoDateTime(rule.startsAt, `${path}.startsAt`);
  if (rule.endsAt !== undefined && rule.endsAt !== null) result.endsAt = isoDateTime(rule.endsAt, `${path}.endsAt`);
  return result;
};
export const validateStorefrontRulesV1: RuntimeValidator<GeneralStorefrontSettingsValueV1["storefront"]> = (value, path = "storefront") => {
  const storefront = objectValue(value, path), maintenance = objectValue(storefront.maintenanceBannerRule, `${path}.maintenanceBannerRule`);
  exactKeys(storefront, ["homeContentRef", "navigationRef", "footerRef", "defaultProductSort", "outOfStockDisplay", "dealerSelectionEnabled", "cartCheckoutEnabled", "announcementRule", "maintenanceBannerRule", "storefrontConfigRef", "enFrRoutesEnabled"], path);
  exactKeys(maintenance, ["enabled", "message"], `${path}.maintenanceBannerRule`);
  const defaultProductSort = stringValue(storefront.defaultProductSort, `${path}.defaultProductSort`), outOfStockDisplay = stringValue(storefront.outOfStockDisplay, `${path}.outOfStockDisplay`);
  if (!["newest", "price_asc", "price_desc", "featured"].includes(defaultProductSort) || !["hide", "show", "hide_with_contact"].includes(outOfStockDisplay)) return fail(path, "a known Storefront policy enum");
  return { homeContentRef: s02OptionalUuid(storefront.homeContentRef, `${path}.homeContentRef`), navigationRef: s02OptionalUuid(storefront.navigationRef, `${path}.navigationRef`), footerRef: s02OptionalUuid(storefront.footerRef, `${path}.footerRef`), defaultProductSort: defaultProductSort as GeneralStorefrontSettingsValueV1["storefront"]["defaultProductSort"], outOfStockDisplay: outOfStockDisplay as GeneralStorefrontSettingsValueV1["storefront"]["outOfStockDisplay"], dealerSelectionEnabled: booleanValue(storefront.dealerSelectionEnabled, `${path}.dealerSelectionEnabled`), cartCheckoutEnabled: booleanValue(storefront.cartCheckoutEnabled, `${path}.cartCheckoutEnabled`), announcementRule: validateAnnouncementRuleV1(storefront.announcementRule, `${path}.announcementRule`), maintenanceBannerRule: { enabled: booleanValue(maintenance.enabled, `${path}.maintenanceBannerRule.enabled`), message: s02BoundedOrEmptyString(maintenance.message, `${path}.maintenanceBannerRule.message`, 300) }, storefrontConfigRef: s02OptionalUuid(storefront.storefrontConfigRef, `${path}.storefrontConfigRef`), enFrRoutesEnabled: booleanValue(storefront.enFrRoutesEnabled, `${path}.enFrRoutesEnabled`) };
};
export const validateProvinceServiceMappingV1: RuntimeValidator<GeneralStorefrontSettingsValueV1["localization"]["provinceServiceMapping"]> = (value, path = "provinceServiceMapping") => {
  if (!Array.isArray(value) || value.length > 13) return fail(path, "a bounded array");
  return value.map((entry, index) => {
    const mapping = objectValue(entry, `${path}[${index}]`);
    exactKeys(mapping, ["province", "dealerRef", "locationRef"], `${path}[${index}]`);
    return { province: s02BoundedString(mapping.province, `${path}[${index}].province`, 80), ...(mapping.dealerRef === undefined || mapping.dealerRef === null ? {} : { dealerRef: s02OptionalUuid(mapping.dealerRef, `${path}[${index}].dealerRef`) ?? undefined }), ...(mapping.locationRef === undefined || mapping.locationRef === null ? {} : { locationRef: s02OptionalUuid(mapping.locationRef, `${path}[${index}].locationRef`) ?? undefined }) };
  });
};
export const validateLocalizationV1: RuntimeValidator<GeneralStorefrontSettingsValueV1["localization"]> = (value, path = "localization") => {
  const localization = objectValue(value, path);
  exactKeys(localization, ["defaultLocale", "supportedLocales", "dashboardLocale", "currency", "timezone", "dateFormat", "phoneFormat", "addressFormat", "weightUnits", "dimensionUnits", "translationFallback", "provinceServiceMapping"], path);
  const defaultLocale = stringValue(localization.defaultLocale, `${path}.defaultLocale`), dateFormat = stringValue(localization.dateFormat, `${path}.dateFormat`), phoneFormat = stringValue(localization.phoneFormat, `${path}.phoneFormat`), weightUnits = stringValue(localization.weightUnits, `${path}.weightUnits`), dimensionUnits = stringValue(localization.dimensionUnits, `${path}.dimensionUnits`);
  if (!S02_SUPPORTED_LOCALES.has(defaultLocale) || !["yyyy-mm-dd", "dd-mm-yyyy", "mm-dd-yyyy"].includes(dateFormat) || !["national", "international"].includes(phoneFormat) || !["kg", "lb"].includes(weightUnits) || !["cm", "in"].includes(dimensionUnits) || localization.dashboardLocale !== "zh-CN" || localization.currency !== "CAD" || localization.addressFormat !== "canada_default" || localization.translationFallback !== "en_ca") return fail(path, "the S02 localization contract");
  const supportedLocales = arrayOf((entry, localePath = "locale") => { const result = stringValue(entry, localePath); if (!S02_SUPPORTED_LOCALES.has(result)) return fail(localePath, "en-CA or fr-CA"); return result as "en-CA" | "fr-CA"; })(localization.supportedLocales, `${path}.supportedLocales`);
  if (supportedLocales.length < 1 || supportedLocales.length > 2 || !supportedLocales.includes(defaultLocale as "en-CA" | "fr-CA")) return fail(`${path}.supportedLocales`, "a bounded list containing the default locale");
  return { defaultLocale: defaultLocale as "en-CA" | "fr-CA", supportedLocales, dashboardLocale: "zh-CN", currency: "CAD", timezone: s02Timezone(localization.timezone, `${path}.timezone`), dateFormat: dateFormat as GeneralStorefrontSettingsValueV1["localization"]["dateFormat"], phoneFormat: phoneFormat as "national" | "international", addressFormat: "canada_default", weightUnits: weightUnits as "kg" | "lb", dimensionUnits: dimensionUnits as "cm" | "in", translationFallback: "en_ca", provinceServiceMapping: validateProvinceServiceMappingV1(localization.provinceServiceMapping, `${path}.provinceServiceMapping`) };
};
export const validateDefaultDealerLocationV1: RuntimeValidator<GeneralStorefrontSettingsValueV1["defaultDealerLocation"]> = (value, path = "defaultDealerLocation") => {
  const pairing = objectValue(value, path);
  exactKeys(pairing, ["defaultDealerRef", "defaultLocationRef"], path);
  return { defaultDealerRef: s02OptionalUuid(pairing.defaultDealerRef, `${path}.defaultDealerRef`), defaultLocationRef: s02OptionalUuid(pairing.defaultLocationRef, `${path}.defaultLocationRef`) };
};
export const validateGeneralStorefrontSettingsValueV1: RuntimeValidator<GeneralStorefrontSettingsValueV1> = (value, path = "generalStorefrontSettingsValue") => {
  const settings = objectValue(value, path);
  exactKeys(settings, ["generalIdentity", "brand", "storefront", "localization", "defaultDealerLocation"], path);
  return { generalIdentity: validateGeneralIdentityV1(settings.generalIdentity, `${path}.generalIdentity`), brand: validateBrandV1(settings.brand, `${path}.brand`), storefront: validateStorefrontRulesV1(settings.storefront, `${path}.storefront`), localization: validateLocalizationV1(settings.localization, `${path}.localization`), defaultDealerLocation: validateDefaultDealerLocationV1(settings.defaultDealerLocation, `${path}.defaultDealerLocation`) };
};
export const validateS02Draft: RuntimeValidator<S02Draft> = (value, path = "s02Draft") => {
  const draft = objectValue(value, path);
  exactKeys(draft, ["id", "descriptorKey", "status", "value", "basePublicationVersion", "version", "changeReason", "createdAt", "updatedAt", "validationRevision", "rollbackOfPublicationId"], path);
  const status = stringValue(draft.status, `${path}.status`);
  if (draft.descriptorKey !== "settings.general-storefront" || !["draft", "validated", "invalid", "publishing", "activation_failed", "rollback_draft"].includes(status)) return fail(path, "a General Storefront draft");
  return { id: settingsId(draft.id, `${path}.id`), descriptorKey: "settings.general-storefront", status: status as S02Draft["status"], value: validateGeneralStorefrontSettingsValueV1(draft.value, `${path}.value`), basePublicationVersion: nonnegativeInteger(draft.basePublicationVersion, `${path}.basePublicationVersion`), version: nonnegativeInteger(draft.version, `${path}.version`), changeReason: s02Reason(draft.changeReason, `${path}.changeReason`), createdAt: isoDateTime(draft.createdAt, `${path}.createdAt`), updatedAt: isoDateTime(draft.updatedAt, `${path}.updatedAt`), validationRevision: draft.validationRevision === null ? null : nonnegativeInteger(draft.validationRevision, `${path}.validationRevision`), rollbackOfPublicationId: draft.rollbackOfPublicationId === null ? null : settingsId(draft.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`) };
};
export const validateS02ValidationResult: RuntimeValidator<S02ValidationResult> = (value, path = "s02Validation") => {
  const result = objectValue(value, path);
  exactKeys(result, ["draftId", "draftVersion", "validationRevision", "status", "issues", "validatedAt"], path);
  const status = stringValue(result.status, `${path}.status`);
  if (status !== "validated" && status !== "invalid") return fail(`${path}.status`, "validated or invalid");
  const issues = arrayOf((entry, issuePath = "issue") => { const issue = objectValue(entry, issuePath); exactKeys(issue, ["code", "severity", "field", "message"], issuePath); const severity = stringValue(issue.severity, `${issuePath}.severity`), field = stringValue(issue.field, `${issuePath}.field`); if (!["blocker", "warning", "info"].includes(severity) || !field.trim()) return fail(issuePath, "a known validation issue"); return { code: stringValue(issue.code, `${issuePath}.code`), severity: severity as S02ValidationResult["issues"][number]["severity"], field, message: stringValue(issue.message, `${issuePath}.message`) }; })(result.issues, `${path}.issues`);
  if ((status === "invalid") !== issues.some((issue) => issue.severity === "blocker")) return fail(path, "a status consistent with blockers");
  return { draftId: settingsId(result.draftId, `${path}.draftId`), draftVersion: nonnegativeInteger(result.draftVersion, `${path}.draftVersion`), validationRevision: positiveInteger(result.validationRevision, `${path}.validationRevision`), status, issues, validatedAt: isoDateTime(result.validatedAt, `${path}.validatedAt`) };
};
export const validateS02SafeDiff: RuntimeValidator<S02SafeDiff> = (value, path = "s02Diff") => {
  const diff = objectValue(value, path);
  exactKeys(diff, ["draftId", "draftVersion", "descriptorKey", "changes", "secretChangeCount", "restartRequired", "affectedServices"], path);
  if (diff.descriptorKey !== "settings.general-storefront" || diff.secretChangeCount !== 0 || diff.restartRequired !== false) return fail(path, "a non-secret General Storefront safe diff");
  const services = arrayOf(stringValue)(diff.affectedServices, `${path}.affectedServices`);
  if (services.length !== 2 || services[0] !== "storefront" || services[1] !== "dashboard") return fail(`${path}.affectedServices`, "storefront and dashboard only");
  const changes = arrayOf((entry, changePath = "change") => { const change = objectValue(entry, changePath); exactKeys(change, ["field", "before", "after", "sensitivity"], changePath); if (change.sensitivity !== "public") return fail(changePath, "the public field"); const field = stringValue(change.field, `${changePath}.field`); return { field, before: change.before ?? null, after: change.after ?? null, sensitivity: "public" as const }; })(diff.changes, `${path}.changes`);
  return { draftId: settingsId(diff.draftId, `${path}.draftId`), draftVersion: nonnegativeInteger(diff.draftVersion, `${path}.draftVersion`), descriptorKey: "settings.general-storefront", changes, secretChangeCount: 0, restartRequired: false, affectedServices: ["storefront", "dashboard"] };
};
export const validateS02Readiness: RuntimeValidator<S02Readiness> = (value, path = "s02Readiness") => {
  const readiness = objectValue(value, path);
  exactKeys(readiness, ["state", "reasonCode", "observedAt", "publishedGeneration", "publicationVersion", "publicationCas", "consumerGeneration", "projectionState"], path);
  const state = stringValue(readiness.state, `${path}.state`), reasonCode = stringValue(readiness.reasonCode, `${path}.reasonCode`), projectionState = stringValue(readiness.projectionState, `${path}.projectionState`);
  if (!["ready", "degraded", "not_ready"].includes(state) || !["ready", "consumer_generation_missing", "consumer_generation_mismatch", "consumer_unavailable", "activation_failed", "dependency_unavailable"].includes(reasonCode) || !["compiled_default", "published", "activation_failed"].includes(projectionState)) return fail(path, "a known S02 readiness state");
  const publishedGeneration = nonnegativeInteger(readiness.publishedGeneration, `${path}.publishedGeneration`);
  const publicationVersion = readiness.publicationVersion === null ? null : positiveInteger(readiness.publicationVersion, `${path}.publicationVersion`);
  const publicationCas = readiness.publicationCas === null ? null : nonnegativeInteger(readiness.publicationCas, `${path}.publicationCas`);
  const consumerGeneration = readiness.consumerGeneration === null ? null : nonnegativeInteger(readiness.consumerGeneration, `${path}.consumerGeneration`);
  const exact = consumerGeneration !== null && consumerGeneration === publishedGeneration && publishedGeneration > 0 && projectionState !== "activation_failed";
  if ((state === "ready") !== exact || (state === "ready") !== (reasonCode === "ready")) return fail(path, "a consumer-generation-bound S02 readiness state");
  if ((projectionState === "compiled_default") !== (publishedGeneration === 0 && publicationVersion === null)) return fail(path, "a projection-consistent S02 readiness state");
  return { state: state as S02Readiness["state"], reasonCode: reasonCode as S02Readiness["reasonCode"], observedAt: isoDateTime(readiness.observedAt, `${path}.observedAt`), publishedGeneration, publicationVersion, publicationCas, consumerGeneration, projectionState: projectionState as S02Readiness["projectionState"] };
};
export const validateS02PublicationReadiness: RuntimeValidator<S02Publication["readiness"]> = (value, path = "s02PublicationReadiness") => {
  const readiness = objectValue(value, path);
  exactKeys(readiness, ["state", "reasonCode", "observedAt", "publishedGeneration", "publicationVersion", "consumerGeneration", "projectionState"], path);
  const state = stringValue(readiness.state, `${path}.state`), reasonCode = stringValue(readiness.reasonCode, `${path}.reasonCode`), projectionState = stringValue(readiness.projectionState, `${path}.projectionState`);
  if (!["ready", "degraded", "not_ready"].includes(state) || !["ready", "consumer_generation_missing", "consumer_generation_mismatch", "consumer_unavailable", "activation_failed", "dependency_unavailable"].includes(reasonCode) || !["compiled_default", "published", "activation_failed"].includes(projectionState)) return fail(path, "a known S02 publication readiness state");
  const publishedGeneration = nonnegativeInteger(readiness.publishedGeneration, `${path}.publishedGeneration`), publicationVersion = positiveInteger(readiness.publicationVersion, `${path}.publicationVersion`), consumerGeneration = readiness.consumerGeneration === null ? null : nonnegativeInteger(readiness.consumerGeneration, `${path}.consumerGeneration`);
  if (consumerGeneration !== null || publishedGeneration !== publicationVersion || state !== "degraded" || reasonCode !== "consumer_generation_missing") return fail(path, "an unconsumed S02 publication readiness state");
  return { state: state as S02Publication["readiness"]["state"], reasonCode: reasonCode as S02Publication["readiness"]["reasonCode"], observedAt: isoDateTime(readiness.observedAt, `${path}.observedAt`), publishedGeneration, publicationVersion, consumerGeneration, projectionState: projectionState as S02Publication["readiness"]["projectionState"] };
};
export const validateS02Publication: RuntimeValidator<S02Publication> = (value, path = "s02Publication") => {
  const publication = objectValue(value, path);
  exactKeys(publication, ["id", "generation", "version", "sourceDraftId", "sourceDraftVersion", "status", "publishedAt", "rollbackOfPublicationId", "readiness"], path);
  const status = stringValue(publication.status, `${path}.status`);
  if (!["published", "superseded", "activation_failed", "rolled_back"].includes(status)) return fail(`${path}.status`, "a publication status");
  const version = positiveInteger(publication.version, `${path}.version`), readiness = validateS02PublicationReadiness(publication.readiness, `${path}.readiness`);
  if (readiness.publishedGeneration !== version || readiness.publicationVersion !== version || readiness.projectionState !== (status === "activation_failed" ? "activation_failed" : "published")) return fail(path, "publication-consistent S02 readiness");
  return { id: settingsId(publication.id, `${path}.id`), generation: decimalGeneration(publication.generation, `${path}.generation`), version, sourceDraftId: settingsId(publication.sourceDraftId, `${path}.sourceDraftId`), sourceDraftVersion: nonnegativeInteger(publication.sourceDraftVersion, `${path}.sourceDraftVersion`), status: status as S02Publication["status"], publishedAt: isoDateTime(publication.publishedAt, `${path}.publishedAt`), rollbackOfPublicationId: publication.rollbackOfPublicationId === null ? null : settingsId(publication.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`), readiness };
};
export const validateS02HistoryEntry: RuntimeValidator<S02HistoryEntry> = (value, path = "s02HistoryEntry") => {
  const entry = objectValue(value, path);
  exactKeys(entry, ["publicationId", "generation", "version", "status", "descriptorKeys", "changeReason", "publishedAt", "rollbackOfPublicationId", "auditEventId"], path);
  const status = stringValue(entry.status, `${path}.status`), keys = arrayOf(stringValue)(entry.descriptorKeys, `${path}.descriptorKeys`);
  if (!["published", "superseded", "activation_failed", "rolled_back"].includes(status) || keys.length !== 1 || keys[0] !== "settings.general-storefront") return fail(path, "a General Storefront history entry");
  return { publicationId: settingsId(entry.publicationId, `${path}.publicationId`), generation: decimalGeneration(entry.generation, `${path}.generation`), version: positiveInteger(entry.version, `${path}.version`), status: status as S02HistoryEntry["status"], descriptorKeys: ["settings.general-storefront"], changeReason: s02Reason(entry.changeReason, `${path}.changeReason`), publishedAt: isoDateTime(entry.publishedAt, `${path}.publishedAt`), rollbackOfPublicationId: entry.rollbackOfPublicationId === null ? null : settingsId(entry.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`), auditEventId: settingsId(entry.auditEventId, `${path}.auditEventId`) };
};
export const validateS02CreateDraftRequest: RuntimeValidator<S02CreateDraftRequest> = (value, path = "s02CreateDraft") => {
  const request = objectValue(value, path);
  exactKeys(request, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"], path);
  if (request.descriptorKey !== "settings.general-storefront") return fail(`${path}.descriptorKey`, "the General Storefront descriptor");
  return { descriptorKey: "settings.general-storefront", expectedPublishedVersion: nonnegativeInteger(request.expectedPublishedVersion, `${path}.expectedPublishedVersion`), value: validateGeneralStorefrontSettingsValueV1(request.value, `${path}.value`), changeReason: s02Reason(request.changeReason, `${path}.changeReason`), idempotencyKey: settingsIdempotencyKey(request.idempotencyKey, `${path}.idempotencyKey`) };
};
export const validateS02UpdateDraftRequest: RuntimeValidator<S02UpdateDraftRequest> = (value, path = "s02UpdateDraft") => {
  const request = objectValue(value, path);
  exactKeys(request, ["expectedVersion", "value", "changeReason", "idempotencyKey"], path);
  return { expectedVersion: nonnegativeInteger(request.expectedVersion, `${path}.expectedVersion`), value: validateGeneralStorefrontSettingsValueV1(request.value, `${path}.value`), changeReason: s02Reason(request.changeReason, `${path}.changeReason`), idempotencyKey: settingsIdempotencyKey(request.idempotencyKey, `${path}.idempotencyKey`) };
};
function s09Reason(value: unknown, path: string): string {
  const result = stringValue(value, path).trim();
  if (result.length < 8 || result.length > 500) return fail(path, "8 through 500 characters");
  return result;
}
function s09BoundedInteger(value: unknown, path: string, min: number, max: number): number {
  const result = numberValue(value, path);
  if (!Number.isInteger(result) || result < min || result > max) return fail(path, `an integer between ${min} and ${max}`);
  return result;
}
export const validateAuthRbacSettingsValueV1: RuntimeValidator<AuthRbacSettingsValueV1> = (value, path = "authRbacSettingsValue") => {
  const settings = objectValue(value, path), passwordPolicy = objectValue(settings.passwordPolicy, `${path}.passwordPolicy`), sessionPolicy = objectValue(settings.sessionPolicy, `${path}.sessionPolicy`);
  exactKeys(settings, ["passwordPolicy", "sessionPolicy"], path);
  exactKeys(passwordPolicy, ["minimumLength", "resetTokenTtlMinutes"], `${path}.passwordPolicy`);
  exactKeys(sessionPolicy, ["sessionLifetimeMinutes"], `${path}.sessionPolicy`);
  return {
    passwordPolicy: { minimumLength: s09BoundedInteger(passwordPolicy.minimumLength, `${path}.passwordPolicy.minimumLength`, 12, 128), resetTokenTtlMinutes: s09BoundedInteger(passwordPolicy.resetTokenTtlMinutes, `${path}.passwordPolicy.resetTokenTtlMinutes`, 5, 31) },
    sessionPolicy: { sessionLifetimeMinutes: s09BoundedInteger(sessionPolicy.sessionLifetimeMinutes, `${path}.sessionPolicy.sessionLifetimeMinutes`, 15, 11520) }
  };
};
export const validateS09Draft: RuntimeValidator<S09Draft> = (value, path = "s09Draft") => {
  const draft = objectValue(value, path);
  exactKeys(draft, ["id", "descriptorKey", "status", "value", "basePublicationVersion", "version", "changeReason", "createdAt", "updatedAt", "validationRevision", "rollbackOfPublicationId"], path);
  const status = stringValue(draft.status, `${path}.status`);
  if (draft.descriptorKey !== "settings.auth-rbac" || !["draft", "validated", "invalid", "publishing", "activation_failed", "rollback_draft"].includes(status)) return fail(path, "an Auth/RBAC draft");
  return { id: settingsId(draft.id, `${path}.id`), descriptorKey: "settings.auth-rbac", status: status as S09Draft["status"], value: validateAuthRbacSettingsValueV1(draft.value, `${path}.value`), basePublicationVersion: nonnegativeInteger(draft.basePublicationVersion, `${path}.basePublicationVersion`), version: nonnegativeInteger(draft.version, `${path}.version`), changeReason: s09Reason(draft.changeReason, `${path}.changeReason`), createdAt: isoDateTime(draft.createdAt, `${path}.createdAt`), updatedAt: isoDateTime(draft.updatedAt, `${path}.updatedAt`), validationRevision: draft.validationRevision === null ? null : nonnegativeInteger(draft.validationRevision, `${path}.validationRevision`), rollbackOfPublicationId: draft.rollbackOfPublicationId === null ? null : settingsId(draft.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`) };
};
export const validateS09ValidationResult: RuntimeValidator<S09ValidationResult> = (value, path = "s09Validation") => {
  const result = objectValue(value, path);
  exactKeys(result, ["draftId", "draftVersion", "validationRevision", "status", "issues", "validatedAt"], path);
  const status = stringValue(result.status, `${path}.status`);
  if (status !== "validated" && status !== "invalid") return fail(`${path}.status`, "validated or invalid");
  const issues = arrayOf((entry, issuePath = "issue") => { const issue = objectValue(entry, issuePath); exactKeys(issue, ["code", "severity", "field", "message"], issuePath); const severity = stringValue(issue.severity, `${issuePath}.severity`), field = stringValue(issue.field, `${issuePath}.field`); if (!["blocker", "warning", "info"].includes(severity) || !field.trim()) return fail(issuePath, "a known validation issue"); return { code: stringValue(issue.code, `${issuePath}.code`), severity: severity as S09ValidationResult["issues"][number]["severity"], field, message: stringValue(issue.message, `${issuePath}.message`) }; })(result.issues, `${path}.issues`);
  if ((status === "invalid") !== issues.some((issue) => issue.severity === "blocker")) return fail(path, "a status consistent with blockers");
  return { draftId: settingsId(result.draftId, `${path}.draftId`), draftVersion: nonnegativeInteger(result.draftVersion, `${path}.draftVersion`), validationRevision: positiveInteger(result.validationRevision, `${path}.validationRevision`), status, issues, validatedAt: isoDateTime(result.validatedAt, `${path}.validatedAt`) };
};
export const validateS09SafeDiff: RuntimeValidator<S09SafeDiff> = (value, path = "s09Diff") => {
  const diff = objectValue(value, path);
  exactKeys(diff, ["draftId", "draftVersion", "descriptorKey", "changes", "secretChangeCount", "restartRequired", "affectedServices"], path);
  if (diff.descriptorKey !== "settings.auth-rbac" || diff.secretChangeCount !== 0 || diff.restartRequired !== false) return fail(path, "a non-secret Auth/RBAC safe diff");
  const services = arrayOf(stringValue)(diff.affectedServices, `${path}.affectedServices`);
  if (services.length !== 2 || services[0] !== "auth" || services[1] !== "dashboard") return fail(`${path}.affectedServices`, "auth and dashboard only");
  const changes = arrayOf((entry, changePath = "change") => { const change = objectValue(entry, changePath); exactKeys(change, ["field", "before", "after", "sensitivity"], changePath); if (change.sensitivity !== "public") return fail(changePath, "the public field"); const field = stringValue(change.field, `${changePath}.field`); return { field, before: change.before ?? null, after: change.after ?? null, sensitivity: "public" as const }; })(diff.changes, `${path}.changes`);
  return { draftId: settingsId(diff.draftId, `${path}.draftId`), draftVersion: nonnegativeInteger(diff.draftVersion, `${path}.draftVersion`), descriptorKey: "settings.auth-rbac", changes, secretChangeCount: 0, restartRequired: false, affectedServices: ["auth", "dashboard"] };
};
export const validateS09Readiness: RuntimeValidator<S09Readiness> = (value, path = "s09Readiness") => {
  const readiness = objectValue(value, path);
  exactKeys(readiness, ["state", "reasonCode", "observedAt", "publishedGeneration", "publicationVersion", "publicationCas", "consumerGeneration", "projectionState"], path);
  const state = stringValue(readiness.state, `${path}.state`), reasonCode = stringValue(readiness.reasonCode, `${path}.reasonCode`), projectionState = stringValue(readiness.projectionState, `${path}.projectionState`);
  if (!["ready", "degraded", "not_ready"].includes(state) || !["ready", "consumer_generation_missing", "consumer_generation_mismatch", "consumer_unavailable", "activation_failed", "dependency_unavailable"].includes(reasonCode) || !["compiled_default", "published", "activation_failed"].includes(projectionState)) return fail(path, "a known S09 readiness state");
  const publishedGeneration = nonnegativeInteger(readiness.publishedGeneration, `${path}.publishedGeneration`);
  const publicationVersion = readiness.publicationVersion === null ? null : positiveInteger(readiness.publicationVersion, `${path}.publicationVersion`);
  const publicationCas = readiness.publicationCas === null ? null : nonnegativeInteger(readiness.publicationCas, `${path}.publicationCas`);
  const consumerGeneration = readiness.consumerGeneration === null ? null : nonnegativeInteger(readiness.consumerGeneration, `${path}.consumerGeneration`);
  const exact = consumerGeneration !== null && consumerGeneration === publishedGeneration && publishedGeneration > 0 && projectionState !== "activation_failed";
  if ((state === "ready") !== exact || (state === "ready") !== (reasonCode === "ready")) return fail(path, "a consumer-generation-bound S09 readiness state");
  if ((projectionState === "compiled_default") !== (publishedGeneration === 0 && publicationVersion === null)) return fail(path, "a projection-consistent S09 readiness state");
  return { state: state as S09Readiness["state"], reasonCode: reasonCode as S09Readiness["reasonCode"], observedAt: isoDateTime(readiness.observedAt, `${path}.observedAt`), publishedGeneration, publicationVersion, publicationCas, consumerGeneration, projectionState: projectionState as S09Readiness["projectionState"] };
};
export const validateS09PublicationReadiness: RuntimeValidator<S09Publication["readiness"]> = (value, path = "s09PublicationReadiness") => {
  const readiness = objectValue(value, path);
  exactKeys(readiness, ["state", "reasonCode", "observedAt", "publishedGeneration", "publicationVersion", "consumerGeneration", "projectionState"], path);
  const state = stringValue(readiness.state, `${path}.state`), reasonCode = stringValue(readiness.reasonCode, `${path}.reasonCode`), projectionState = stringValue(readiness.projectionState, `${path}.projectionState`);
  if (!["ready", "degraded", "not_ready"].includes(state) || !["ready", "consumer_generation_missing", "consumer_generation_mismatch", "consumer_unavailable", "activation_failed", "dependency_unavailable"].includes(reasonCode) || !["compiled_default", "published", "activation_failed"].includes(projectionState)) return fail(path, "a known S09 publication readiness state");
  const publishedGeneration = nonnegativeInteger(readiness.publishedGeneration, `${path}.publishedGeneration`), publicationVersion = positiveInteger(readiness.publicationVersion, `${path}.publicationVersion`), consumerGeneration = readiness.consumerGeneration === null ? null : nonnegativeInteger(readiness.consumerGeneration, `${path}.consumerGeneration`);
  if (publishedGeneration !== publicationVersion) return fail(path, "publication-consistent S09 readiness");
  if (state === "ready" && reasonCode === "ready" && consumerGeneration === publishedGeneration && publishedGeneration > 0 && projectionState === "published") {
    return { state: state as S09Publication["readiness"]["state"], reasonCode: reasonCode as S09Publication["readiness"]["reasonCode"], observedAt: isoDateTime(readiness.observedAt, `${path}.observedAt`), publishedGeneration, publicationVersion, consumerGeneration, projectionState: projectionState as S09Publication["readiness"]["projectionState"] };
  }
  if (consumerGeneration === null && state === "degraded" && reasonCode === "consumer_generation_missing") {
    return { state: state as S09Publication["readiness"]["state"], reasonCode: reasonCode as S09Publication["readiness"]["reasonCode"], observedAt: isoDateTime(readiness.observedAt, `${path}.observedAt`), publishedGeneration, publicationVersion, consumerGeneration, projectionState: projectionState as S09Publication["readiness"]["projectionState"] };
  }
  return fail(path, "a known S09 publication readiness state");
};
export const validateS09Publication: RuntimeValidator<S09Publication> = (value, path = "s09Publication") => {
  const publication = objectValue(value, path);
  exactKeys(publication, ["id", "generation", "version", "sourceDraftId", "sourceDraftVersion", "status", "publishedAt", "rollbackOfPublicationId", "readiness"], path);
  const status = stringValue(publication.status, `${path}.status`);
  if (!["published", "superseded", "activation_failed", "rolled_back"].includes(status)) return fail(`${path}.status`, "a publication status");
  const version = positiveInteger(publication.version, `${path}.version`), readiness = validateS09PublicationReadiness(publication.readiness, `${path}.readiness`);
  if (readiness.publishedGeneration !== version || readiness.publicationVersion !== version || readiness.projectionState !== (status === "activation_failed" ? "activation_failed" : "published")) return fail(path, "publication-consistent S09 readiness");
  return { id: settingsId(publication.id, `${path}.id`), generation: decimalGeneration(publication.generation, `${path}.generation`), version, sourceDraftId: settingsId(publication.sourceDraftId, `${path}.sourceDraftId`), sourceDraftVersion: nonnegativeInteger(publication.sourceDraftVersion, `${path}.sourceDraftVersion`), status: status as S09Publication["status"], publishedAt: isoDateTime(publication.publishedAt, `${path}.publishedAt`), rollbackOfPublicationId: publication.rollbackOfPublicationId === null ? null : settingsId(publication.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`), readiness };
};
export const validateS09HistoryEntry: RuntimeValidator<S09HistoryEntry> = (value, path = "s09HistoryEntry") => {
  const entry = objectValue(value, path);
  exactKeys(entry, ["publicationId", "generation", "version", "status", "descriptorKeys", "changeReason", "publishedAt", "rollbackOfPublicationId", "auditEventId"], path);
  const status = stringValue(entry.status, `${path}.status`), keys = arrayOf(stringValue)(entry.descriptorKeys, `${path}.descriptorKeys`);
  if (!["published", "superseded", "activation_failed", "rolled_back"].includes(status) || keys.length !== 1 || keys[0] !== "settings.auth-rbac") return fail(path, "an Auth/RBAC history entry");
  return { publicationId: settingsId(entry.publicationId, `${path}.publicationId`), generation: decimalGeneration(entry.generation, `${path}.generation`), version: positiveInteger(entry.version, `${path}.version`), status: status as S09HistoryEntry["status"], descriptorKeys: ["settings.auth-rbac"], changeReason: s09Reason(entry.changeReason, `${path}.changeReason`), publishedAt: isoDateTime(entry.publishedAt, `${path}.publishedAt`), rollbackOfPublicationId: entry.rollbackOfPublicationId === null ? null : settingsId(entry.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`), auditEventId: settingsId(entry.auditEventId, `${path}.auditEventId`) };
};
export const validateS09Overview: RuntimeValidator<S09Overview> = (value, path = "s09Overview") => {
  const overview = objectValue(value, path);
  exactKeys(overview, ["descriptorKey", "schemaVersion", "projectionState", "publishedGeneration", "publication", "effective"], path);
  const projectionState = stringValue(overview.projectionState, `${path}.projectionState`);
  if (overview.descriptorKey !== "settings.auth-rbac" || overview.schemaVersion !== "settings.auth-rbac.v1" || !["compiled_default", "published", "activation_failed"].includes(projectionState)) return fail(path, "an Auth/RBAC overview");
  const publishedGeneration = nonnegativeInteger(overview.publishedGeneration, `${path}.publishedGeneration`);
  if ((projectionState === "compiled_default") !== (publishedGeneration === 0)) return fail(path, "a projection-consistent Auth/RBAC overview");
  const publication = overview.publication === null ? null : (() => { const publication = objectValue(overview.publication, `${path}.publication`); exactKeys(publication, ["version", "cas", "publishedAt", "changeReason"], `${path}.publication`); return { version: positiveInteger(publication.version, `${path}.publication.version`), cas: publication.cas === null ? null : nonnegativeInteger(publication.cas, `${path}.publication.cas`), publishedAt: isoDateTime(publication.publishedAt, `${path}.publication.publishedAt`), changeReason: s09Reason(publication.changeReason, `${path}.publication.changeReason`) }; })();
  if ((projectionState === "published") !== (publication !== null)) return fail(path, "a publication-consistent Auth/RBAC overview");
  return { descriptorKey: "settings.auth-rbac", schemaVersion: "settings.auth-rbac.v1", projectionState: projectionState as S09Overview["projectionState"], publishedGeneration, publication, effective: validateAuthRbacSettingsValueV1(overview.effective, `${path}.effective`) };
};
export const validateS09CreateDraftRequest: RuntimeValidator<S09CreateDraftRequest> = (value, path = "s09CreateDraft") => {
  const request = objectValue(value, path);
  exactKeys(request, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"], path);
  if (request.descriptorKey !== "settings.auth-rbac") return fail(`${path}.descriptorKey`, "the Auth/RBAC descriptor");
  return { descriptorKey: "settings.auth-rbac", expectedPublishedVersion: nonnegativeInteger(request.expectedPublishedVersion, `${path}.expectedPublishedVersion`), value: validateAuthRbacSettingsValueV1(request.value, `${path}.value`), changeReason: s09Reason(request.changeReason, `${path}.changeReason`), idempotencyKey: settingsIdempotencyKey(request.idempotencyKey, `${path}.idempotencyKey`) };
};
export const validateS09UpdateDraftRequest: RuntimeValidator<S09UpdateDraftRequest> = (value, path = "s09UpdateDraft") => {
  const request = objectValue(value, path);
  exactKeys(request, ["expectedVersion", "value", "changeReason", "idempotencyKey"], path);
  return { expectedVersion: nonnegativeInteger(request.expectedVersion, `${path}.expectedVersion`), value: validateAuthRbacSettingsValueV1(request.value, `${path}.value`), changeReason: s09Reason(request.changeReason, `${path}.changeReason`), idempotencyKey: settingsIdempotencyKey(request.idempotencyKey, `${path}.idempotencyKey`) };
};
export const validateS09ImpactPreviewResult: RuntimeValidator<S09ImpactPreviewResult> = (value, path = "s09ImpactPreview") => {
  const result = objectValue(value, path);
  exactKeys(result, ["targetUserId", "wouldBlockLastSuperAdmin", "activeSuperAdminCount", "safeReasonCode", "contextRevision"], path);
  const safeReasonCode = stringValue(result.safeReasonCode, `${path}.safeReasonCode`), wouldBlock = booleanValue(result.wouldBlockLastSuperAdmin, `${path}.wouldBlockLastSuperAdmin`);
  if (!["allowed", "LAST_SUPER_ADMIN_BLOCKED"].includes(safeReasonCode) || (safeReasonCode === "allowed") === wouldBlock) return fail(path, "a consistent impact preview result");
  return { targetUserId: settingsId(result.targetUserId, `${path}.targetUserId`), wouldBlockLastSuperAdmin: wouldBlock, activeSuperAdminCount: result.activeSuperAdminCount === null ? null : nonnegativeInteger(result.activeSuperAdminCount, `${path}.activeSuperAdminCount`), safeReasonCode: safeReasonCode as S09ImpactPreviewResult["safeReasonCode"], contextRevision: stringValue(result.contextRevision, `${path}.contextRevision`) };
};
export const validateS09SessionRevokeResult: RuntimeValidator<S09SessionRevokeResult> = (value, path = "s09SessionRevoke") => {
  const result = objectValue(value, path);
  exactKeys(result, ["targetUserId", "revokedCount", "reason", "revokedAt"], path);
  return { targetUserId: settingsId(result.targetUserId, `${path}.targetUserId`), revokedCount: nonnegativeInteger(result.revokedCount, `${path}.revokedCount`), reason: s09Reason(result.reason, `${path}.reason`), revokedAt: isoDateTime(result.revokedAt, `${path}.revokedAt`) };
};
const S10_OBJECT_FAMILIES = new Set(["consent_events", "audit_events", "async_jobs", "media_assets", "orders", "payments", "privacy_requests"]);
const S10_CONSENT_CATEGORIES = new Set(["functional", "analytics", "targeting"]);
const S10_DSAR_SCOPES = new Set(["all_personal_data", "orders", "payments", "media", "communications"]);
const S10_DSAR_METHODS = new Set(["access", "export", "delete"]);
const S10_DISPLAY_MODES = new Set(["plain", "masked", "hidden"]);
function s10Reason(value: unknown, path: string): string {
  const result = stringValue(value, path).trim();
  if (result.length < 8 || result.length > 500) return fail(path, "8 through 500 characters");
  return result;
}
export const validatePrivacyRetentionSettingsValueV1: RuntimeValidator<PrivacyRetentionSettingsValueV1> = (value, path = "privacyRetentionSettingsValue") => {
  const settings = objectValue(value, path);
  const consentPolicy = objectValue(settings.consentPolicy, `${path}.consentPolicy`), retentionPolicy = objectValue(settings.retentionPolicy, `${path}.retentionPolicy`), legalHoldPolicy = objectValue(settings.legalHoldPolicy, `${path}.legalHoldPolicy`), dsarPolicy = objectValue(settings.dsarPolicy, `${path}.dsarPolicy`), piiDisplayPolicy = objectValue(settings.piiDisplayPolicy, `${path}.piiDisplayPolicy`), lowRiskExecution = objectValue(settings.lowRiskExecution, `${path}.lowRiskExecution`);
  exactKeys(settings, ["consentPolicy", "retentionPolicy", "legalHoldPolicy", "dsarPolicy", "piiDisplayPolicy", "lowRiskExecution"], path);
  exactKeys(consentPolicy, ["anonymousConsentEnabled", "authenticatedConsentEnabled", "consentCategories", "retentionMonths"], `${path}.consentPolicy`);
  exactKeys(retentionPolicy, ["retentionByObjectFamily"], `${path}.retentionPolicy`);
  exactKeys(legalHoldPolicy, ["legalHoldEnabled", "legalHoldRefs"], `${path}.legalHoldPolicy`);
  exactKeys(dsarPolicy, ["accessExportDeleteRules"], `${path}.dsarPolicy`);
  exactKeys(piiDisplayPolicy, ["piiDisplayRules"], `${path}.piiDisplayPolicy`);
  exactKeys(lowRiskExecution, ["allowlist", "impactPreviewEnabled"], `${path}.lowRiskExecution`);
  const anonymousConsentEnabled = booleanValue(consentPolicy.anonymousConsentEnabled, `${path}.consentPolicy.anonymousConsentEnabled`), authenticatedConsentEnabled = booleanValue(consentPolicy.authenticatedConsentEnabled, `${path}.consentPolicy.authenticatedConsentEnabled`), retentionMonths = s09BoundedInteger(consentPolicy.retentionMonths, `${path}.consentPolicy.retentionMonths`, 6, 120), impactPreviewEnabled = booleanValue(lowRiskExecution.impactPreviewEnabled, `${path}.lowRiskExecution.impactPreviewEnabled`), legalHoldEnabled = booleanValue(legalHoldPolicy.legalHoldEnabled, `${path}.legalHoldPolicy.legalHoldEnabled`);
  const consentCategories = arrayOf((entry, categoryPath = "category") => { const category = stringValue(entry, categoryPath); if (!S10_CONSENT_CATEGORIES.has(category)) return fail(categoryPath, "a known consent category"); return category as ConsentCategory; })(consentPolicy.consentCategories, `${path}.consentPolicy.consentCategories`);
  if (consentCategories.length < 1 || new Set(consentCategories).size !== consentCategories.length) return fail(`${path}.consentPolicy.consentCategories`, "1 through 3 unique categories");
  const retentionByObjectFamily = arrayOf((entry, entryPath = "family") => { const family = objectValue(entry, entryPath); exactKeys(family, ["objectFamily", "retentionDays", "autoCleanupEnabled"], entryPath); const objectFamily = stringValue(family.objectFamily, `${entryPath}.objectFamily`); if (!S10_OBJECT_FAMILIES.has(objectFamily)) return fail(entryPath, "a known object family"); return { objectFamily: objectFamily as ObjectFamily, retentionDays: s09BoundedInteger(family.retentionDays, `${entryPath}.retentionDays`, 30, 7300), autoCleanupEnabled: booleanValue(family.autoCleanupEnabled, `${entryPath}.autoCleanupEnabled`) }; })(retentionPolicy.retentionByObjectFamily, `${path}.retentionPolicy.retentionByObjectFamily`);
  if (new Set(retentionByObjectFamily.map((entry) => entry.objectFamily)).size !== retentionByObjectFamily.length) return fail(`${path}.retentionPolicy.retentionByObjectFamily`, "unique object families");
  const legalHoldRefs = arrayOf((entry, refPath = "ref") => { const ref = stringValue(entry, refPath); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) return fail(refPath, "a UUID legal-hold reference"); return ref; })(legalHoldPolicy.legalHoldRefs, `${path}.legalHoldPolicy.legalHoldRefs`);
  const accessExportDeleteRules = arrayOf((entry, rulePath = "rule") => { const rule = objectValue(entry, rulePath); exactKeys(rule, ["scope", "method", "enabled", "requireAdminApproval"], rulePath); const scope = stringValue(rule.scope, `${rulePath}.scope`), method = stringValue(rule.method, `${rulePath}.method`); if (!S10_DSAR_SCOPES.has(scope) || !S10_DSAR_METHODS.has(method)) return fail(rulePath, "a known DSAR rule"); return { scope: scope as DsarScope, method: method as DsarMethod, enabled: booleanValue(rule.enabled, `${rulePath}.enabled`), requireAdminApproval: booleanValue(rule.requireAdminApproval, `${rulePath}.requireAdminApproval`) }; })(dsarPolicy.accessExportDeleteRules, `${path}.dsarPolicy.accessExportDeleteRules`);
  const piiDisplayRules = arrayOf((entry, rulePath = "rule") => { const rule = objectValue(entry, rulePath); exactKeys(rule, ["field", "displayMode", "allowedRoles"], rulePath); const displayMode = stringValue(rule.displayMode, `${rulePath}.displayMode`); if (!S10_DISPLAY_MODES.has(displayMode)) return fail(rulePath, "a known display mode"); return { field: stringValue(rule.field, `${rulePath}.field`), displayMode: displayMode as PiiDisplayMode, allowedRoles: arrayOf(stringValue)(rule.allowedRoles, `${rulePath}.allowedRoles`) }; })(piiDisplayPolicy.piiDisplayRules, `${path}.piiDisplayPolicy.piiDisplayRules`);
  const allowlist = arrayOf((entry, entryPath = "family") => { const family = stringValue(entry, entryPath); if (family !== "consent_events" && family !== "async_jobs") return fail(entryPath, "a low-risk family"); return family as "consent_events" | "async_jobs"; })(lowRiskExecution.allowlist, `${path}.lowRiskExecution.allowlist`);
  if (new Set(allowlist).size !== allowlist.length) return fail(`${path}.lowRiskExecution.allowlist`, "unique low-risk families");
  return { consentPolicy: { anonymousConsentEnabled, authenticatedConsentEnabled, consentCategories, retentionMonths }, retentionPolicy: { retentionByObjectFamily }, legalHoldPolicy: { legalHoldEnabled, legalHoldRefs }, dsarPolicy: { accessExportDeleteRules }, piiDisplayPolicy: { piiDisplayRules }, lowRiskExecution: { allowlist, impactPreviewEnabled } };
};
export const validateS10Draft: RuntimeValidator<S10Draft> = (value, path = "s10Draft") => {
  const draft = objectValue(value, path);
  exactKeys(draft, ["id", "descriptorKey", "status", "value", "basePublicationVersion", "version", "changeReason", "createdAt", "updatedAt", "validationRevision", "rollbackOfPublicationId"], path);
  const status = stringValue(draft.status, `${path}.status`);
  if (draft.descriptorKey !== "settings.privacy-retention" || !["draft", "validated", "invalid", "publishing", "activation_failed", "rollback_draft"].includes(status)) return fail(path, "a Privacy/Retention draft");
  return { id: settingsId(draft.id, `${path}.id`), descriptorKey: "settings.privacy-retention", status: status as S10Draft["status"], value: validatePrivacyRetentionSettingsValueV1(draft.value, `${path}.value`), basePublicationVersion: nonnegativeInteger(draft.basePublicationVersion, `${path}.basePublicationVersion`), version: nonnegativeInteger(draft.version, `${path}.version`), changeReason: s10Reason(draft.changeReason, `${path}.changeReason`), createdAt: isoDateTime(draft.createdAt, `${path}.createdAt`), updatedAt: isoDateTime(draft.updatedAt, `${path}.updatedAt`), validationRevision: draft.validationRevision === null ? null : nonnegativeInteger(draft.validationRevision, `${path}.validationRevision`), rollbackOfPublicationId: draft.rollbackOfPublicationId === null ? null : settingsId(draft.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`) };
};
export const validateS10ValidationResult: RuntimeValidator<S10ValidationResult> = (value, path = "s10Validation") => {
  const result = objectValue(value, path);
  exactKeys(result, ["draftId", "draftVersion", "validationRevision", "status", "issues", "validatedAt"], path);
  const status = stringValue(result.status, `${path}.status`);
  if (status !== "validated" && status !== "invalid") return fail(`${path}.status`, "validated or invalid");
  const issues = arrayOf((entry, issuePath = "issue") => { const issue = objectValue(entry, issuePath); exactKeys(issue, ["code", "severity", "field", "message"], issuePath); const severity = stringValue(issue.severity, `${issuePath}.severity`), field = stringValue(issue.field, `${issuePath}.field`); if (!["blocker", "warning", "info"].includes(severity) || !field.trim()) return fail(issuePath, "a known validation issue"); return { code: stringValue(issue.code, `${issuePath}.code`), severity: severity as S10ValidationResult["issues"][number]["severity"], field, message: stringValue(issue.message, `${issuePath}.message`) }; })(result.issues, `${path}.issues`);
  if ((status === "invalid") !== issues.some((issue) => issue.severity === "blocker")) return fail(path, "a status consistent with blockers");
  return { draftId: settingsId(result.draftId, `${path}.draftId`), draftVersion: nonnegativeInteger(result.draftVersion, `${path}.draftVersion`), validationRevision: positiveInteger(result.validationRevision, `${path}.validationRevision`), status, issues, validatedAt: isoDateTime(result.validatedAt, `${path}.validatedAt`) };
};
export const validateS10SafeDiff: RuntimeValidator<S10SafeDiff> = (value, path = "s10Diff") => {
  const diff = objectValue(value, path);
  exactKeys(diff, ["draftId", "draftVersion", "descriptorKey", "changes", "secretChangeCount", "restartRequired", "affectedServices"], path);
  if (diff.descriptorKey !== "settings.privacy-retention" || diff.secretChangeCount !== 0 || diff.restartRequired !== false) return fail(path, "a non-secret Privacy/Retention safe diff");
  const services = arrayOf(stringValue)(diff.affectedServices, `${path}.affectedServices`);
  if (services.length !== 1 || services[0] !== "dashboard") return fail(`${path}.affectedServices`, "dashboard only");
  const changes = arrayOf((entry, changePath = "change") => { const change = objectValue(entry, changePath); exactKeys(change, ["field", "before", "after", "sensitivity"], changePath); if (change.sensitivity !== "public") return fail(changePath, "the public field"); const field = stringValue(change.field, `${changePath}.field`); return { field, before: change.before ?? null, after: change.after ?? null, sensitivity: "public" as const }; })(diff.changes, `${path}.changes`);
  return { draftId: settingsId(diff.draftId, `${path}.draftId`), draftVersion: nonnegativeInteger(diff.draftVersion, `${path}.draftVersion`), descriptorKey: "settings.privacy-retention", changes, secretChangeCount: 0, restartRequired: false, affectedServices: ["dashboard"] };
};
export const validateS10Readiness: RuntimeValidator<S10Readiness> = (value, path = "s10Readiness") => {
  const readiness = objectValue(value, path);
  exactKeys(readiness, ["state", "reasonCode", "observedAt", "publishedGeneration", "publicationVersion", "publicationCas", "consumerGeneration", "projectionState", "cleanupConsumer"], path);
  const state = stringValue(readiness.state, `${path}.state`), reasonCode = stringValue(readiness.reasonCode, `${path}.reasonCode`), projectionState = stringValue(readiness.projectionState, `${path}.projectionState`);
  if (state !== "degraded" || reasonCode !== "cleanup_consumer_unavailable" || !["compiled_default", "published", "activation_failed"].includes(projectionState)) return fail(path, "an honestly degraded Privacy/Retention readiness state");
  const cleanupConsumer = objectValue(readiness.cleanupConsumer, `${path}.cleanupConsumer`);
  exactKeys(cleanupConsumer, ["state", "reasonCode", "observedAt"], `${path}.cleanupConsumer`);
  if (cleanupConsumer.state !== "degraded" || cleanupConsumer.reasonCode !== "cleanup_consumer_unavailable") return fail(`${path}.cleanupConsumer`, "the degraded cleanup consumer");
  const publishedGeneration = nonnegativeInteger(readiness.publishedGeneration, `${path}.publishedGeneration`);
  const publicationVersion = readiness.publicationVersion === null ? null : positiveInteger(readiness.publicationVersion, `${path}.publicationVersion`);
  const publicationCas = readiness.publicationCas === null ? null : nonnegativeInteger(readiness.publicationCas, `${path}.publicationCas`);
  const consumerGeneration = readiness.consumerGeneration === null ? null : nonnegativeInteger(readiness.consumerGeneration, `${path}.consumerGeneration`);
  if ((projectionState === "compiled_default") !== (publishedGeneration === 0 && publicationVersion === null)) return fail(path, "a projection-consistent Privacy/Retention readiness state");
  return { state: "degraded" as const, reasonCode: "cleanup_consumer_unavailable" as const, observedAt: isoDateTime(readiness.observedAt, `${path}.observedAt`), publishedGeneration, publicationVersion, publicationCas, consumerGeneration, projectionState: projectionState as S10Readiness["projectionState"], cleanupConsumer: { state: "degraded" as const, reasonCode: "cleanup_consumer_unavailable" as const, observedAt: isoDateTime(cleanupConsumer.observedAt, `${path}.cleanupConsumer.observedAt`) } };
};
export const validateS10PublicationReadiness: RuntimeValidator<S10Publication["readiness"]> = (value, path = "s10PublicationReadiness") => {
  const readiness = objectValue(value, path);
  exactKeys(readiness, ["state", "reasonCode", "observedAt", "publishedGeneration", "publicationVersion", "consumerGeneration", "projectionState"], path);
  const state = stringValue(readiness.state, `${path}.state`), reasonCode = stringValue(readiness.reasonCode, `${path}.reasonCode`), projectionState = stringValue(readiness.projectionState, `${path}.projectionState`);
  if (state !== "degraded" || reasonCode !== "cleanup_consumer_unavailable" || !["compiled_default", "published", "activation_failed"].includes(projectionState)) return fail(path, "an honestly degraded Privacy/Retention publication readiness state");
  const publishedGeneration = nonnegativeInteger(readiness.publishedGeneration, `${path}.publishedGeneration`), publicationVersion = positiveInteger(readiness.publicationVersion, `${path}.publicationVersion`);
  if (publishedGeneration !== publicationVersion || readiness.consumerGeneration !== null) return fail(path, "a publication-consistent Privacy/Retention readiness state");
  return { state: "degraded" as const, reasonCode: "cleanup_consumer_unavailable" as const, observedAt: isoDateTime(readiness.observedAt, `${path}.observedAt`), publishedGeneration, publicationVersion, consumerGeneration: null, projectionState: projectionState as S10Publication["readiness"]["projectionState"] };
};
export const validateS10Publication: RuntimeValidator<S10Publication> = (value, path = "s10Publication") => {
  const publication = objectValue(value, path);
  exactKeys(publication, ["id", "generation", "version", "sourceDraftId", "sourceDraftVersion", "status", "publishedAt", "rollbackOfPublicationId", "readiness"], path);
  const status = stringValue(publication.status, `${path}.status`);
  if (!["published", "superseded", "activation_failed", "rolled_back"].includes(status)) return fail(`${path}.status`, "a publication status");
  const version = positiveInteger(publication.version, `${path}.version`), readiness = validateS10PublicationReadiness(publication.readiness, `${path}.readiness`);
  if (readiness.publishedGeneration !== version || readiness.publicationVersion !== version || readiness.projectionState !== (status === "activation_failed" ? "activation_failed" : "published")) return fail(path, "publication-consistent Privacy/Retention readiness");
  return { id: settingsId(publication.id, `${path}.id`), generation: decimalGeneration(publication.generation, `${path}.generation`), version, sourceDraftId: settingsId(publication.sourceDraftId, `${path}.sourceDraftId`), sourceDraftVersion: nonnegativeInteger(publication.sourceDraftVersion, `${path}.sourceDraftVersion`), status: status as S10Publication["status"], publishedAt: isoDateTime(publication.publishedAt, `${path}.publishedAt`), rollbackOfPublicationId: publication.rollbackOfPublicationId === null ? null : settingsId(publication.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`), readiness };
};
export const validateS10HistoryEntry: RuntimeValidator<S10HistoryEntry> = (value, path = "s10HistoryEntry") => {
  const entry = objectValue(value, path);
  exactKeys(entry, ["publicationId", "generation", "version", "status", "descriptorKeys", "changeReason", "publishedAt", "rollbackOfPublicationId", "auditEventId"], path);
  const status = stringValue(entry.status, `${path}.status`), keys = arrayOf(stringValue)(entry.descriptorKeys, `${path}.descriptorKeys`);
  if (!["published", "superseded", "activation_failed", "rolled_back"].includes(status) || keys.length !== 1 || keys[0] !== "settings.privacy-retention") return fail(path, "a Privacy/Retention history entry");
  return { publicationId: settingsId(entry.publicationId, `${path}.publicationId`), generation: decimalGeneration(entry.generation, `${path}.generation`), version: positiveInteger(entry.version, `${path}.version`), status: status as S10HistoryEntry["status"], descriptorKeys: ["settings.privacy-retention"], changeReason: s10Reason(entry.changeReason, `${path}.changeReason`), publishedAt: isoDateTime(entry.publishedAt, `${path}.publishedAt`), rollbackOfPublicationId: entry.rollbackOfPublicationId === null ? null : settingsId(entry.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`), auditEventId: settingsId(entry.auditEventId, `${path}.auditEventId`) };
};
export const validateS10Overview: RuntimeValidator<S10Overview> = (value, path = "s10Overview") => {
  const overview = objectValue(value, path);
  exactKeys(overview, ["descriptorKey", "schemaVersion", "projectionState", "publishedGeneration", "publication", "effective", "capabilities", "cleanupConsumer"], path);
  const projectionState = stringValue(overview.projectionState, `${path}.projectionState`);
  if (overview.descriptorKey !== "settings.privacy-retention" || overview.schemaVersion !== "settings.privacy-retention.v1" || !["compiled_default", "published", "activation_failed"].includes(projectionState)) return fail(path, "a Privacy/Retention overview");
  const capabilities = objectValue(overview.capabilities, `${path}.capabilities`);
  exactKeys(capabilities, ["anonymousConsent", "authenticatedConsent", "privacySubjectPurge"], `${path}.capabilities`);
  if (capabilities.anonymousConsent !== "current_fact" || capabilities.authenticatedConsent !== "future_unavailable" || capabilities.privacySubjectPurge !== "future_unavailable") return fail(`${path}.capabilities`, "the frozen capability layering");
  const cleanupConsumer = objectValue(overview.cleanupConsumer, `${path}.cleanupConsumer`);
  exactKeys(cleanupConsumer, ["state", "reasonCode", "observedAt"], `${path}.cleanupConsumer`);
  if (cleanupConsumer.state !== "degraded" || cleanupConsumer.reasonCode !== "cleanup_consumer_unavailable") return fail(`${path}.cleanupConsumer`, "the degraded cleanup consumer");
  const publishedGeneration = nonnegativeInteger(overview.publishedGeneration, `${path}.publishedGeneration`);
  if ((projectionState === "compiled_default") !== (publishedGeneration === 0)) return fail(path, "a projection-consistent Privacy/Retention overview");
  const publication = overview.publication === null ? null : (() => { const publication = objectValue(overview.publication, `${path}.publication`); exactKeys(publication, ["version", "cas", "publishedAt", "changeReason"], `${path}.publication`); return { version: positiveInteger(publication.version, `${path}.publication.version`), cas: publication.cas === null ? null : nonnegativeInteger(publication.cas, `${path}.publication.cas`), publishedAt: isoDateTime(publication.publishedAt, `${path}.publication.publishedAt`), changeReason: s10Reason(publication.changeReason, `${path}.publication.changeReason`) }; })();
  if ((projectionState === "published") !== (publication !== null)) return fail(path, "a publication-consistent Privacy/Retention overview");
  return { descriptorKey: "settings.privacy-retention", schemaVersion: "settings.privacy-retention.v1", projectionState: projectionState as S10Overview["projectionState"], publishedGeneration, publication, effective: validatePrivacyRetentionSettingsValueV1(overview.effective, `${path}.effective`), capabilities: { anonymousConsent: "current_fact" as const, authenticatedConsent: "future_unavailable" as const, privacySubjectPurge: "future_unavailable" as const }, cleanupConsumer: { state: "degraded" as const, reasonCode: "cleanup_consumer_unavailable" as const, observedAt: isoDateTime(cleanupConsumer.observedAt, `${path}.cleanupConsumer.observedAt`) } };
};
export const validateS10CreateDraftRequest: RuntimeValidator<S10CreateDraftRequest> = (value, path = "s10CreateDraft") => {
  const request = objectValue(value, path);
  exactKeys(request, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"], path);
  if (request.descriptorKey !== "settings.privacy-retention") return fail(`${path}.descriptorKey`, "the Privacy/Retention descriptor");
  return { descriptorKey: "settings.privacy-retention", expectedPublishedVersion: nonnegativeInteger(request.expectedPublishedVersion, `${path}.expectedPublishedVersion`), value: validatePrivacyRetentionSettingsValueV1(request.value, `${path}.value`), changeReason: s10Reason(request.changeReason, `${path}.changeReason`), idempotencyKey: settingsIdempotencyKey(request.idempotencyKey, `${path}.idempotencyKey`) };
};
export const validateS10UpdateDraftRequest: RuntimeValidator<S10UpdateDraftRequest> = (value, path = "s10UpdateDraft") => {
  const request = objectValue(value, path);
  exactKeys(request, ["expectedVersion", "value", "changeReason", "idempotencyKey"], path);
  return { expectedVersion: nonnegativeInteger(request.expectedVersion, `${path}.expectedVersion`), value: validatePrivacyRetentionSettingsValueV1(request.value, `${path}.value`), changeReason: s10Reason(request.changeReason, `${path}.changeReason`), idempotencyKey: settingsIdempotencyKey(request.idempotencyKey, `${path}.idempotencyKey`) };
};
export const validateS10ImpactPreviewResult: RuntimeValidator<S10ImpactPreviewResult> = (value, path = "s10ImpactPreview") => {
  const result = objectValue(value, path);
  exactKeys(result, ["wouldEnableAutoCleanup", "wouldConflictWithLegalHold", "blockedHighRiskFamilies", "affectedFamilies", "contextRevision"], path);
  const wouldEnableAutoCleanup = booleanValue(result.wouldEnableAutoCleanup, `${path}.wouldEnableAutoCleanup`), wouldConflictWithLegalHold = booleanValue(result.wouldConflictWithLegalHold, `${path}.wouldConflictWithLegalHold`);
  const blocked = arrayOf((entry, entryPath = "family") => { const family = stringValue(entry, entryPath); if (!S10_OBJECT_FAMILIES.has(family)) return fail(entryPath, "a known object family"); return family; })(result.blockedHighRiskFamilies, `${path}.blockedHighRiskFamilies`);
  const affected = arrayOf((entry, entryPath = "family") => { const family = objectValue(entry, entryPath); exactKeys(family, ["objectFamily", "classification", "wouldEnableAutoCleanup"], entryPath); const objectFamily = stringValue(family.objectFamily, `${entryPath}.objectFamily`), classification = stringValue(family.classification, `${entryPath}.classification`); if (!S10_OBJECT_FAMILIES.has(objectFamily) || (classification !== "low_risk" && classification !== "high_risk")) return fail(entryPath, "a known affected family"); return { objectFamily, classification: classification as S10ImpactPreviewResult["affectedFamilies"][number]["classification"], wouldEnableAutoCleanup: booleanValue(family.wouldEnableAutoCleanup, `${entryPath}.wouldEnableAutoCleanup`) }; })(result.affectedFamilies, `${path}.affectedFamilies`);
  if ((wouldConflictWithLegalHold && !wouldEnableAutoCleanup)) return fail(path, "a legal-hold-consistent impact preview");
  return { wouldEnableAutoCleanup, wouldConflictWithLegalHold, blockedHighRiskFamilies: blocked, affectedFamilies: affected, contextRevision: stringValue(result.contextRevision, `${path}.contextRevision`) };
};
export const validateStorefrontConfigProjection: RuntimeValidator<StorefrontConfigProjection> = (value, path = "storefrontConfig") => {
  const projection = objectValue(value, path), effective = objectValue(projection.effective, `${path}.effective`), announcement = objectValue(effective.announcementRule, `${path}.effective.announcementRule`), contact = objectValue(effective.contact, `${path}.effective.contact`);
  exactKeys(projection, ["projectionState", "publishedGeneration", "locale", "effective"], path);
  exactKeys(effective, ["siteDisplayName", "brandName", "announcementRule", "contact", "logoMedia", "defaultDealer", "defaultLocation"], path);
  exactKeys(announcement, ["enabled", "message", "locale", "startsAt", "endsAt"], `${path}.effective.announcementRule`);
  exactKeys(contact, ["email", "phone"], `${path}.effective.contact`);
  const projectionState = stringValue(projection.projectionState, `${path}.projectionState`), locale = stringValue(projection.locale, `${path}.locale`);
  if (!["compiled_default", "published"].includes(projectionState) || !S02_SUPPORTED_LOCALES.has(locale)) return fail(path, "a public storefront projection");
  const publishedGeneration = nonnegativeInteger(projection.publishedGeneration, `${path}.publishedGeneration`);
  const announcementLocale = announcement.locale === undefined || announcement.locale === null ? undefined : stringValue(announcement.locale, `${path}.effective.announcementRule.locale`);
  if (announcementLocale !== undefined && !S02_SUPPORTED_LOCALES.has(announcementLocale)) return fail(`${path}.effective.announcementRule.locale`, "en-CA or fr-CA");
  const optionalObject = (entry: unknown, entryPath: string): Record<string, unknown> | null => entry === null || entry === undefined ? null : objectValue(entry, entryPath);
  const logoMedia = optionalObject(effective.logoMedia, `${path}.effective.logoMedia`);
  const defaultDealer = optionalObject(effective.defaultDealer, `${path}.effective.defaultDealer`);
  const defaultLocation = optionalObject(effective.defaultLocation, `${path}.effective.defaultLocation`);
  if (logoMedia) exactKeys(logoMedia, ["id", "contentType"], `${path}.effective.logoMedia`);
  if (defaultDealer) exactKeys(defaultDealer, ["id", "name"], `${path}.effective.defaultDealer`);
  if (defaultLocation) exactKeys(defaultLocation, ["id", "city", "province"], `${path}.effective.defaultLocation`);
  if ((projectionState === "compiled_default") !== (publishedGeneration === 0)) return fail(path, "a projection-consistent public config");
  return {
    projectionState: projectionState as StorefrontConfigProjection["projectionState"],
    publishedGeneration,
    locale: locale as "en-CA" | "fr-CA",
    effective: {
      siteDisplayName: s02BoundedString(effective.siteDisplayName, `${path}.effective.siteDisplayName`, 120),
      brandName: s02BoundedString(effective.brandName, `${path}.effective.brandName`, 120),
      announcementRule: { enabled: booleanValue(announcement.enabled, `${path}.effective.announcementRule.enabled`), message: s02BoundedOrEmptyString(announcement.message, `${path}.effective.announcementRule.message`, 300), ...(announcementLocale === undefined ? {} : { locale: announcementLocale as "en-CA" | "fr-CA" }), startsAt: s02IsoDateTimeOrNull(announcement.startsAt, `${path}.effective.announcementRule.startsAt`), endsAt: s02IsoDateTimeOrNull(announcement.endsAt, `${path}.effective.announcementRule.endsAt`) },
      contact: { email: s02OptionalEmail(contact.email, `${path}.effective.contact.email`), phone: s02OptionalPhone(contact.phone, `${path}.effective.contact.phone`) },
      logoMedia: logoMedia ? { id: stringValue(logoMedia.id, `${path}.effective.logoMedia.id`), contentType: stringValue(logoMedia.contentType, `${path}.effective.logoMedia.contentType`) } : null,
      defaultDealer: defaultDealer ? { id: stringValue(defaultDealer.id, `${path}.effective.defaultDealer.id`), name: stringValue(defaultDealer.name, `${path}.effective.defaultDealer.name`) } : null,
      defaultLocation: defaultLocation ? { id: stringValue(defaultLocation.id, `${path}.effective.defaultLocation.id`), city: stringValue(defaultLocation.city, `${path}.effective.defaultLocation.city`), province: stringValue(defaultLocation.province, `${path}.effective.defaultLocation.province`) } : null
    }
  };
};

export const validateDataJobCreateImportRequest: RuntimeValidator<DataJobCreateImportRequestV1> = (value, path = "createImport") => {
  const request = objectValue(value, path);
  exactKeys(request, ["object_key", "filename", "content_type", "byte_size"], path);
  if (request.object_key !== "foundation.sample") return fail(`${path}.object_key`, "foundation.sample");
  if (request.content_type !== "text/csv") return fail(`${path}.content_type`, "text/csv");
  const byte_size = nonnegativeInteger(request.byte_size, `${path}.byte_size`);
  if (byte_size < 1) return fail(`${path}.byte_size`, "a positive safe integer");
  return { object_key: "foundation.sample", filename: stringValue(request.filename, `${path}.filename`), content_type: "text/csv", byte_size };
};

export const validateDataJobCreateImportResponse: RuntimeValidator<DataJobCreateImportResponseV1> = (value, path = "createImportResponse") => {
  const response = objectValue(value, path), upload = objectValue(response.upload, `${path}.upload`);
  exactKeys(response, ["id", "object_key", "status", "upload", "version"], path);
  exactKeys(upload, ["method", "endpoint", "token", "expires_at"], `${path}.upload`);
  if (response.object_key !== "foundation.sample" || response.status !== "awaiting_upload" || upload.method !== "PUT") return fail(path, "a canonical foundation.sample upload intent");
  const id = stringValue(response.id, `${path}.id`), endpoint = stringValue(upload.endpoint, `${path}.upload.endpoint`);
  if (endpoint !== `/api/v1/dashboard/data-jobs/imports/${id}/content`) return fail(`${path}.upload.endpoint`, "the canonical relative upload endpoint");
  return { id, object_key: "foundation.sample", status: "awaiting_upload", upload: { method: "PUT", endpoint, token: stringValue(upload.token, `${path}.upload.token`), expires_at: isoDateTime(upload.expires_at, `${path}.upload.expires_at`) }, version: nonnegativeInteger(response.version, `${path}.version`) };
};

export const validateDataJobCommitRequest: RuntimeValidator<DataJobCommitRequestV1> = (value, path = "commitImport") => {
  const request = objectValue(value, path); exactKeys(request, ["mode", "expected_version"], path);
  if (request.mode !== "valid_rows") return fail(`${path}.mode`, "valid_rows");
  return { mode: "valid_rows", expected_version: nonnegativeInteger(request.expected_version, `${path}.expected_version`) };
};

export const validateDataJobCreateExportRequest: RuntimeValidator<DataJobCreateExportRequestV1> = (value, path = "createExport") => {
  const request = objectValue(value, path), query = objectValue(request.query, `${path}.query`);
  exactKeys(request, ["object_key", "format", "query"], path); exactKeys(query, ["filters", "sort"], `${path}.query`);
  if (request.object_key !== "foundation.sample" || request.format !== "csv") return fail(path, "a foundation.sample CSV export");
  return { object_key: "foundation.sample", format: "csv", query: { filters: arrayOf(stringValue)(query.filters, `${path}.query.filters`), sort: arrayOf(stringValue)(query.sort, `${path}.query.sort`) } };
};

export const validateDataJobExportDetail: RuntimeValidator<DataJobExportDetailV1> = (value, path = "exportDetail") => {
  const detail = objectValue(value, path); exactKeys(detail, ["id", "object_key", "status", "formula_version", "row_count", "byte_size", "sha256", "expires_at", "version"], path);
  if (detail.object_key !== "foundation.sample" || detail.formula_version !== "foundation.sample.export.v1") return fail(path, "a foundation.sample export detail");
  const status = stringValue(detail.status, `${path}.status`);
  if (!["queued", "running", "completed", "failed", "cancelled", "expired"].includes(status)) return fail(`${path}.status`, "a known export status");
  const sha256 = stringValue(detail.sha256, `${path}.sha256`); if (!/^[a-f0-9]{64}$/.test(sha256)) return fail(`${path}.sha256`, "a lowercase SHA-256 digest");
  return { id: stringValue(detail.id, `${path}.id`), object_key: "foundation.sample", status: status as DataJobExportDetailV1["status"], formula_version: "foundation.sample.export.v1", row_count: nonnegativeInteger(detail.row_count, `${path}.row_count`), byte_size: nonnegativeInteger(detail.byte_size, `${path}.byte_size`), sha256, expires_at: isoDateTime(detail.expires_at, `${path}.expires_at`), version: nonnegativeInteger(detail.version, `${path}.version`) };
};

export function arrayOf<T>(validator: RuntimeValidator<T>): RuntimeValidator<T[]> {
  return (value, path = "value") => {
    if (!Array.isArray(value)) return fail(path, "an array");
    return value.map((item, index) => validator(item, `${path}[${index}]`));
  };
}

export function validateApiResult<T>(
  value: unknown,
  validateData: RuntimeValidator<T>
): ApiResult<T> {
  const result = objectValue(value, "response");
  if (!("data" in result)) return fail("response.data", "present");

  const meta = result.meta === undefined
    ? undefined
    : objectValue(result.meta, "response.meta");

  for (const key of ["limit", "offset", "total"] as const) {
    const entry = meta?.[key];
    if (entry !== undefined && (!Number.isInteger(entry) || (entry as number) < 0)) {
      return fail(`response.meta.${key}`, "a finite nonnegative integer");
    }
  }
  for (const key of ["page", "pageSize", "totalPages"] as const) {
    const entry = meta?.[key];
    if (entry !== undefined && (!Number.isInteger(entry) || (entry as number) < 1)) {
      return fail(`response.meta.${key}`, "a finite positive integer");
    }
  }

  const validatedMeta: NonNullable<ApiResult<T>["meta"]> = {};
  for (const key of ["page", "pageSize", "limit", "offset", "total", "totalPages"] as const) {
    const entry = meta?.[key];
    if (typeof entry === "number") validatedMeta[key] = entry;
  }
  for (const key of ["requestId", "cartToken", "providerRefundId"] as const) {
    const entry = meta?.[key];
    if (entry !== undefined && (typeof entry !== "string" || !entry.trim())) {
      return fail(`response.meta.${key}`, "a non-empty string");
    }
    if (typeof entry === "string") validatedMeta[key] = entry;
  }
  for (const key of ["replayed", "paymentInitializing"] as const) {
    const entry = meta?.[key];
    if (entry !== undefined && typeof entry !== "boolean") {
      return fail(`response.meta.${key}`, "a boolean");
    }
    if (typeof entry === "boolean") validatedMeta[key] = entry;
  }
  if (meta?.payment !== undefined) {
    const payment = objectValue(meta.payment, "response.meta.payment");
    const provider = stringValue(payment.provider, "response.meta.payment.provider");
    if (provider !== "manual" && provider !== "moneris" && provider !== "demo") {
      return fail("response.meta.payment.provider", "manual, moneris or demo");
    }
    validatedMeta.payment = {
      provider,
      ...(payment.paymentUrl === undefined
        ? {}
        : { paymentUrl: stringValue(payment.paymentUrl, "response.meta.payment.paymentUrl") }),
      ...(payment.ticket === undefined
        ? {}
        : { ticket: stringValue(payment.ticket, "response.meta.payment.ticket") }),
      ...(payment.providerRef === undefined
        ? {}
        : { providerRef: stringValue(payment.providerRef, "response.meta.payment.providerRef") })
    };
  }

  return {
    data: validateData(result.data, "response.data"),
    ...(meta === undefined ? {} : { meta: validatedMeta })
  };
}

export const validateDashboardFoundation: RuntimeValidator<DashboardFoundation> = (value, path = "foundation") => {
  const foundation = objectValue(value, path);
  const actor = objectValue(foundation.actor, `${path}.actor`);
  const visibility = objectValue(foundation.visibility, `${path}.visibility`);
  const shell = objectValue(foundation.shell, `${path}.shell`);
  const contractVersion = stringValue(foundation.contractVersion, `${path}.contractVersion`);
  const scope = stringValue(visibility.scope, `${path}.visibility.scope`);
  const fields = stringValue(visibility.fields, `${path}.visibility.fields`);
  const flag = stringValue(shell.flag, `${path}.shell.flag`);
  const mode = stringValue(shell.mode, `${path}.shell.mode`);
  const shellCode = stringValue(shell.code, `${path}.shell.code`);
  const readiness = stringValue(foundation.readiness, `${path}.readiness`);

  if (contractVersion !== "dashboard-foundation.v1.1") return fail(`${path}.contractVersion`, "dashboard-foundation.v1.1");
  if (scope !== "unavailable") return fail(`${path}.visibility.scope`, "unavailable");
  if (fields !== "permission-only") return fail(`${path}.visibility.fields`, "permission-only");
  if (flag !== "dashboard.shell.v2") return fail(`${path}.shell.flag`, "dashboard.shell.v2");
  if (mode !== "disabled" && mode !== "internal") return fail(`${path}.shell.mode`, "disabled or internal");
  if (!["DASHBOARD_SHELL_DISABLED", "DASHBOARD_SHELL_ACTOR_NOT_ALLOWED", "DASHBOARD_SHELL_READY"].includes(shellCode)) {
    return fail(`${path}.shell.code`, "a supported Dashboard shell code");
  }
  if (shell.readOnly !== true) return fail(`${path}.shell.readOnly`, "true");
  if (readiness !== "disabled" && readiness !== "ready") return fail(`${path}.readiness`, "disabled or ready");

  // Strict v1.1 module projection: every entry must match the shared
  // mechanical registry (status, label, group, route, selector summary)
  // byte-for-byte, must be unique, and the projection must carry the full
  // 22-module set. The status/reason/readAllowed matrix is enforced per
  // module: coming_soon always projects readAllowed=false with reason
  // "coming_soon"; available modules omit reason when allowed and carry
  // "permission_required" when denied. Anything else fails closed.
  const modules = arrayOf((moduleValue, modulePath = "module") => {
    const module = objectValue(moduleValue, modulePath);
    const moduleName = stringValue(module.module, `${modulePath}.module`);
    if (!(moduleName in DASHBOARD_FOUNDATION_MODULE_ROUTES)) return fail(`${modulePath}.module`, "a known Dashboard module");
    const knownModule = moduleName as keyof typeof DASHBOARD_FOUNDATION_MODULE_ROUTES;
    const state = DASHBOARD_FOUNDATION_MODULE_STATE.find((entry) => entry.module === knownModule);
    if (!state) return fail(`${modulePath}.module`, "a known Dashboard module");
    const route = stringValue(module.route, `${modulePath}.route`);
    if (route !== DASHBOARD_FOUNDATION_MODULE_ROUTES[knownModule]) return fail(`${modulePath}.route`, DASHBOARD_FOUNDATION_MODULE_ROUTES[knownModule]);
    const label = stringValue(module.label, `${modulePath}.label`);
    if (label !== state.label) return fail(`${modulePath}.label`, state.label);
    const group = stringValue(module.group, `${modulePath}.group`);
    if (group !== state.group) return fail(`${modulePath}.group`, state.group);
    const status = stringValue(module.status, `${modulePath}.status`);
    if (status !== state.status) return fail(`${modulePath}.status`, state.status);
    const selectors = arrayOf((selectorValue, selectorPath = "selector") => {
      const selector = objectValue(selectorValue, selectorPath);
      const kind = stringValue(selector.kind, `${selectorPath}.kind`);
      if (kind !== "path_exact" && kind !== "path_prefix" && kind !== "query_value" && kind !== "legacy_tab") {
        return fail(`${selectorPath}.kind`, "a known Dashboard selector kind");
      }
      const selectorPathname = stringValue(selector.pathname, `${selectorPath}.pathname`);
      if (!selectorPathname.startsWith("/")) return fail(`${selectorPath}.pathname`, "a site-relative pathname");
      if (kind === "query_value" || kind === "legacy_tab") {
        return {
          kind: kind as DashboardModuleSelectorSummary["kind"],
          pathname: selectorPathname,
          key: stringValue(selector.key, `${selectorPath}.key`),
          value: stringValue(selector.value, `${selectorPath}.value`)
        };
      }
      if (selector.key !== undefined || selector.value !== undefined) {
        return fail(selectorPath, "a path selector without key or value");
      }
      return { kind: kind as DashboardModuleSelectorSummary["kind"], pathname: selectorPathname };
    })(module.selectors, `${modulePath}.selectors`);
    const canonicalSelectors = selectors
      .map((selector) => `${selector.kind}|${selector.pathname}|${"key" in selector ? selector.key : ""}|${"value" in selector ? selector.value : ""}`)
      .join(";");
    const expectedSelectors = state.selectors
      .map((selector) => `${selector.kind}|${selector.pathname}|${selector.key ?? ""}|${selector.value ?? ""}`)
      .join(";");
    if (canonicalSelectors !== expectedSelectors) return fail(`${modulePath}.selectors`, "the registry selector summary");
    const readAllowed = booleanValue(module.readAllowed, `${modulePath}.readAllowed`);
    const reason = module.reason === undefined ? undefined : stringValue(module.reason, `${modulePath}.reason`);
    if (status === "coming_soon") {
      if (readAllowed !== false || reason !== "coming_soon") {
        return fail(`${modulePath}.reason`, "coming_soon for a coming-soon module");
      }
    } else if (readAllowed) {
      if (reason !== undefined) return fail(`${modulePath}.reason`, "omitted");
    } else if (reason !== "permission_required") {
      return fail(`${modulePath}.reason`, "permission_required");
    }
    return {
      module: knownModule,
      label,
      group,
      status: status as DashboardFoundation["modules"][number]["status"],
      readAllowed,
      route: DASHBOARD_FOUNDATION_MODULE_ROUTES[knownModule],
      selectors,
      ...(reason === undefined ? {} : { reason: reason as DashboardFoundation["modules"][number]["reason"] })
    };
  })(foundation.modules, `${path}.modules`);
  if (new Set(modules.map((module) => module.module)).size !== modules.length) {
    return fail(`${path}.modules`, "unique module keys");
  }
  if (
    modules.length !== DASHBOARD_FOUNDATION_MODULE_STATE.length
    || DASHBOARD_FOUNDATION_MODULE_STATE.some((entry) => !modules.some((module) => module.module === entry.module))
  ) {
    return fail(`${path}.modules`, `the full ${DASHBOARD_FOUNDATION_MODULE_STATE.length}-module projection`);
  }

  const enabled = booleanValue(shell.enabled, `${path}.shell.enabled`);
  const shellState = `${mode},${enabled},${shellCode},${readiness}`;
  if (![
    "disabled,false,DASHBOARD_SHELL_DISABLED,disabled",
    "internal,false,DASHBOARD_SHELL_ACTOR_NOT_ALLOWED,disabled",
    "internal,true,DASHBOARD_SHELL_READY,ready"
  ].includes(shellState)) {
    return fail(`${path}.shell`, "a valid Dashboard shell state");
  }

  return {
    contractVersion,
    actor: {
      id: stringValue(actor.id, `${path}.actor.id`),
      displayLabel: stringValue(actor.displayLabel, `${path}.actor.displayLabel`),
      roleLabels: arrayOf(stringValue)(actor.roleLabels, `${path}.actor.roleLabels`)
    },
    modules,
    visibility: { scope, fields },
    shell: {
      flag,
      mode,
      enabled,
      code: shellCode as DashboardFoundation["shell"]["code"],
      readOnly: true
    },
    readiness,
    requestId: stringValue(foundation.requestId, `${path}.requestId`)
  };
};

export const validateDashboardAuthorization: RuntimeValidator<DashboardAuthorization> = (value, path = "authorization") => {
  const record = objectValue(value, path);
  if (stringValue(record.contractVersion, `${path}.contractVersion`) !== "dashboard-authorization.v1") return fail(`${path}.contractVersion`, "dashboard-authorization.v1");
  const status = stringValue(record.status, `${path}.status`);
  if (!["ready", "degraded", "unavailable"].includes(status)) return fail(`${path}.status`, "ready, degraded or unavailable");
  const issuedAt = stringValue(record.issuedAt, `${path}.issuedAt`);
  const expiresAt = stringValue(record.expiresAt, `${path}.expiresAt`);
  if (!Number.isFinite(Date.parse(issuedAt)) || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.parse(issuedAt)) return fail(`${path}.expiresAt`, "after issuedAt");
  const actor = objectValue(record.actor, `${path}.actor`);
  if (actor.principalType !== "user" || actor.kind !== "admin" || actor.status !== "active") return fail(`${path}.actor`, "an active admin user");
  const roleKeys = arrayOf(stringValue)(actor.roleKeys, `${path}.actor.roleKeys`);
  if (new Set(roleKeys).size !== roleKeys.length) return fail(`${path}.actor.roleKeys`, "unique");
  const modules = arrayOf((entry, modulePath = "module") => {
    const module = objectValue(entry, modulePath);
    const moduleName = stringValue(module.module, `${modulePath}.module`);
    if (!(moduleName in DASHBOARD_FOUNDATION_MODULE_ROUTES)) return fail(`${modulePath}.module`, "known");
    const known = moduleName as keyof typeof DASHBOARD_FOUNDATION_MODULE_ROUTES;
    if (module.route !== DASHBOARD_FOUNDATION_MODULE_ROUTES[known]) return fail(`${modulePath}.route`, DASHBOARD_FOUNDATION_MODULE_ROUTES[known]);
    const moduleStatus = stringValue(module.status, `${modulePath}.status`);
    if (!["allowed", "denied", "degraded"].includes(moduleStatus)) return fail(`${modulePath}.status`, "known");
    const actions = arrayOf((actionValue, actionPath = "action") => {
      const action = objectValue(actionValue, actionPath);
      const name = stringValue(action.action, `${actionPath}.action`);
      if (!["read", "create", "update", "delete", "assign", "retry", "manage", "execute", "export", "sensitive"].includes(name)) return fail(`${actionPath}.action`, "known");
      const permissionKey = stringValue(action.permissionKey, `${actionPath}.permissionKey`);
      if (!(DASHBOARD_FOUNDATION_MODULE_PERMISSIONS[known] as readonly string[]).includes(permissionKey)) return fail(`${actionPath}.permissionKey`, "configured for module");
      const decision = stringValue(action.decision, `${actionPath}.decision`);
      if (decision !== "allow" && decision !== "deny") return fail(`${actionPath}.decision`, "allow or deny");
      const reason = stringValue(action.reason, `${actionPath}.reason`);
      if ((decision === "allow") !== (reason === "granted_by_persisted_permission")) return fail(`${actionPath}.reason`, "consistent with decision");
      const actionScope = objectValue(action.scope, `${actionPath}.scope`);
      const actionScopeKind = stringValue(actionScope.kind, `${actionPath}.scope.kind`);
      if (!["global", "dealer", "location", "unavailable"].includes(actionScopeKind)) return fail(`${actionPath}.scope.kind`, "known");
      if ((decision === "allow") !== (actionScopeKind !== "unavailable")) return fail(`${actionPath}.scope`, "consistent with decision");
      let normalizedScope: DashboardAuthorization["modules"][number]["actions"][number]["scope"];
      if (actionScopeKind === "global") normalizedScope = { kind: "global" };
      else if (actionScopeKind === "unavailable") normalizedScope = { kind: "unavailable" };
      else {
        const dealerIds = arrayOf(stringValue)(actionScope.dealerIds, `${actionPath}.scope.dealerIds`);
        const locationIds = arrayOf(stringValue)(actionScope.locationIds, `${actionPath}.scope.locationIds`);
        if (new Set(dealerIds).size !== dealerIds.length) return fail(`${actionPath}.scope.dealerIds`, "unique");
        if (new Set(locationIds).size !== locationIds.length) return fail(`${actionPath}.scope.locationIds`, "unique");
        if (!dealerIds.length) return fail(`${actionPath}.scope.dealerIds`, "non-empty");
        if (actionScopeKind === "dealer" && locationIds.length) return fail(`${actionPath}.scope.locationIds`, "empty for dealer scope");
        if (actionScopeKind === "location" && !locationIds.length) return fail(`${actionPath}.scope.locationIds`, "non-empty for location scope");
        normalizedScope = { kind: actionScopeKind as "dealer" | "location", dealerIds, locationIds };
      }
      return { action: name as DashboardAuthorization["modules"][number]["actions"][number]["action"], permissionKey, decision: decision as "allow" | "deny", reason: reason as DashboardAuthorization["modules"][number]["actions"][number]["reason"], scope: normalizedScope };
    })(module.actions, `${modulePath}.actions`);
    return { module: known, route: DASHBOARD_FOUNDATION_MODULE_ROUTES[known], status: moduleStatus as "allowed" | "denied" | "degraded", actions };
  })(record.modules, `${path}.modules`);
  if (new Set(modules.map((module) => module.module)).size !== modules.length) return fail(`${path}.modules`, "unique");
  const scope = objectValue(record.scope, `${path}.scope`);
  const scopeKind = stringValue(scope.kind, `${path}.scope.kind`);
  if (!["global", "mixed", "dealer", "location", "unavailable"].includes(scopeKind)) return fail(`${path}.scope.kind`, "known");
  let normalizedSummaryScope: DashboardAuthorization["scope"];
  if (scopeKind === "unavailable") {
    normalizedSummaryScope = scope.source === "not_configured"
      ? { kind: "unavailable", source: "not_configured" }
      : fail(`${path}.scope.source`, "not_configured");
  } else if (scopeKind === "global" || scopeKind === "mixed") {
    normalizedSummaryScope = scope.source === "persisted_grants"
      ? { kind: scopeKind, source: "persisted_grants" }
      : fail(`${path}.scope.source`, "persisted_grants");
  } else if (scope.source === "persisted_grants") {
    const dealerIds = arrayOf(stringValue)(scope.dealerIds, `${path}.scope.dealerIds`);
    const locationIds = arrayOf(stringValue)(scope.locationIds, `${path}.scope.locationIds`);
    if (!dealerIds.length || new Set(dealerIds).size !== dealerIds.length) return fail(`${path}.scope.dealerIds`, "non-empty and unique");
    if (new Set(locationIds).size !== locationIds.length) return fail(`${path}.scope.locationIds`, "unique");
    if (scopeKind === "dealer" && locationIds.length) return fail(`${path}.scope.locationIds`, "empty for dealer scope");
    if (scopeKind === "location" && !locationIds.length) return fail(`${path}.scope.locationIds`, "non-empty for location scope");
    normalizedSummaryScope = { kind: scopeKind as "dealer" | "location", source: "persisted_grants", dealerIds, locationIds };
  } else {
    normalizedSummaryScope = fail(`${path}.scope.source`, "persisted_grants");
  }
  return {
    contractVersion: "dashboard-authorization.v1",
    status: status as DashboardAuthorization["status"],
    requestId: stringValue(record.requestId, `${path}.requestId`),
    issuedAt,
    expiresAt,
    contextRevision: stringValue(record.contextRevision, `${path}.contextRevision`),
    actor: { principalType: "user", id: stringValue(actor.id, `${path}.actor.id`), kind: "admin", status: "active", roleKeys },
    effectiveRoles: arrayOf((entry, rolePath = "role") => {
      const role = objectValue(entry, rolePath);
      const roleScope = stringValue(role.scope, `${rolePath}.scope`);
      if (roleScope !== "global" && roleScope !== "dealer") return fail(`${rolePath}.scope`, "global or dealer");
      return { roleKey: stringValue(role.roleKey, `${rolePath}.roleKey`), scope: roleScope as "global" | "dealer" };
    })(record.effectiveRoles, `${path}.effectiveRoles`),
    modules,
    scope: normalizedSummaryScope,
    fieldVisibility: arrayOf((entry, fieldPath = "field") => { const field = objectValue(entry, fieldPath); return { resourceType: stringValue(field.resourceType, `${fieldPath}.resourceType`), profileId: stringValue(field.profileId, `${fieldPath}.profileId`) }; })(record.fieldVisibility, `${path}.fieldVisibility`),
    commonQueryV1: (() => {
      const value = objectValue(record.commonQueryV1, `${path}.commonQueryV1`);
      const products = objectValue(value.products, `${path}.commonQueryV1.products`);
      const dealers = objectValue(value.dealers, `${path}.commonQueryV1.dealers`);
      if (typeof products.enabled !== "boolean") return fail(`${path}.commonQueryV1.products.enabled`, "boolean");
      if (typeof dealers.enabled !== "boolean") return fail(`${path}.commonQueryV1.dealers.enabled`, "boolean");
      return { products: { enabled: products.enabled }, dealers: { enabled: dealers.enabled } };
    })(),
    auditFoundationV1: (() => {
      const value = objectValue(record.auditFoundationV1, `${path}.auditFoundationV1`);
      const sensitive = objectValue(value.sensitive, `${path}.auditFoundationV1.sensitive`);
      if (typeof value.enabled !== "boolean" || typeof sensitive.enabled !== "boolean") return fail(`${path}.auditFoundationV1.enabled`, "boolean");
      if (value.queryProfile !== "dashboard.audit-events.v1" || value.eventVersion !== "audit-event.v1") return fail(`${path}.auditFoundationV1`, "known audit foundation contract");
      return { enabled: value.enabled, queryProfile: value.queryProfile, eventVersion: value.eventVersion, sensitive: { enabled: sensitive.enabled } };
    })(),
    workQueueFoundationV1: (() => {
      const disabled = { enabled: false, contractVersion: "work-queue-item.v1" as const, queryProfile: "dashboard.work-queue.v1" as const, registryVersion: "work-queue-registry.v1" as const, sensitive: { enabled: false }, actions: { assign: false, acknowledge: false, resolve: false, dismiss: false, reopen: false }, notifications: { enabled: false, contractVersion: "in-app-notification.v1" as const, queryProfile: "dashboard.in-app-notifications.v1" as const, markRead: false, externalDelivery: false as const } };
      try {
        const value = objectValue(record.workQueueFoundationV1, `${path}.workQueueFoundationV1`), sensitive = objectValue(value.sensitive, `${path}.workQueueFoundationV1.sensitive`), actions = objectValue(value.actions, `${path}.workQueueFoundationV1.actions`), notifications = objectValue(value.notifications, `${path}.workQueueFoundationV1.notifications`);
        if (value.contractVersion !== "work-queue-item.v1" || value.queryProfile !== "dashboard.work-queue.v1" || value.registryVersion !== "work-queue-registry.v1" || notifications.contractVersion !== "in-app-notification.v1" || notifications.queryProfile !== "dashboard.in-app-notifications.v1" || notifications.externalDelivery !== false) return disabled;
        if ([value.enabled, sensitive.enabled, actions.assign, actions.acknowledge, actions.resolve, actions.dismiss, actions.reopen, notifications.enabled, notifications.markRead].some(entry => typeof entry !== "boolean")) return disabled;
        return { enabled: value.enabled as boolean, contractVersion: value.contractVersion, queryProfile: value.queryProfile, registryVersion: value.registryVersion, sensitive: { enabled: sensitive.enabled as boolean }, actions: { assign: actions.assign as boolean, acknowledge: actions.acknowledge as boolean, resolve: actions.resolve as boolean, dismiss: actions.dismiss as boolean, reopen: actions.reopen as boolean }, notifications: { enabled: notifications.enabled as boolean, contractVersion: notifications.contractVersion, queryProfile: notifications.queryProfile, markRead: notifications.markRead as boolean, externalDelivery: false as const } };
      } catch { return disabled; }
    })(),
    asyncJobFoundationV1: (() => {
      const disabled = { enabled: false, contractVersion: "async-job.v1" as const, queryProfile: "dashboard.async-jobs.v1" as const, registryVersion: "async-job-registry.v1" as const, sensitive: { enabled: false }, mutations: { create: false, cancel: false, retry: false }, artifacts: { metadata: false, download: false as const } };
      try {
        const value = objectValue(record.asyncJobFoundationV1, `${path}.asyncJobFoundationV1`);
        const sensitive = objectValue(value.sensitive, `${path}.asyncJobFoundationV1.sensitive`);
        const mutations = objectValue(value.mutations, `${path}.asyncJobFoundationV1.mutations`);
        const artifacts = objectValue(value.artifacts, `${path}.asyncJobFoundationV1.artifacts`);
        if (typeof value.enabled !== "boolean" || typeof sensitive.enabled !== "boolean" || typeof mutations.create !== "boolean" || typeof mutations.cancel !== "boolean" || typeof mutations.retry !== "boolean" || typeof artifacts.metadata !== "boolean" || artifacts.download !== false) return disabled;
        if (value.contractVersion !== "async-job.v1" || value.queryProfile !== "dashboard.async-jobs.v1" || value.registryVersion !== "async-job-registry.v1") return disabled;
        return { enabled: value.enabled, contractVersion: value.contractVersion, queryProfile: value.queryProfile, registryVersion: value.registryVersion, sensitive: { enabled: sensitive.enabled }, mutations: { create: mutations.create, cancel: mutations.cancel, retry: mutations.retry }, artifacts: { metadata: artifacts.metadata, download: false as const } };
      } catch { return disabled; }
    })(),
    dataJobFoundationV1: (() => {
      const disabled = { enabled: false, contractVersion: "dashboard.data-jobs.v1" as const, registryVersion: "dashboard.data-jobs.registry.v1" as const, objectKey: "foundation.sample" as const, imports: { read: false, create: false, commit: false }, exports: { read: false, create: false, download: false }, upload: { controlled: true as const, directAuthenticatedApi: true as const }, download: { controlled: true as const, directAuthenticatedApi: true as const }, tenantPartition: false as const };
      try {
        const value = objectValue(record.dataJobFoundationV1, `${path}.dataJobFoundationV1`);
        const imports = objectValue(value.imports, `${path}.dataJobFoundationV1.imports`);
        const exports = objectValue(value.exports, `${path}.dataJobFoundationV1.exports`);
        const upload = objectValue(value.upload, `${path}.dataJobFoundationV1.upload`);
        const download = objectValue(value.download, `${path}.dataJobFoundationV1.download`);
        exactKeys(value, ["enabled", "contractVersion", "registryVersion", "objectKey", "imports", "exports", "upload", "download", "tenantPartition"], `${path}.dataJobFoundationV1`);
        exactKeys(imports, ["read", "create", "commit"], `${path}.dataJobFoundationV1.imports`);
        exactKeys(exports, ["read", "create", "download"], `${path}.dataJobFoundationV1.exports`);
        exactKeys(upload, ["controlled", "directAuthenticatedApi"], `${path}.dataJobFoundationV1.upload`);
        exactKeys(download, ["controlled", "directAuthenticatedApi"], `${path}.dataJobFoundationV1.download`);
        if (value.contractVersion !== "dashboard.data-jobs.v1" || value.registryVersion !== "dashboard.data-jobs.registry.v1" || value.objectKey !== "foundation.sample" || value.tenantPartition !== false || upload.controlled !== true || upload.directAuthenticatedApi !== true || download.controlled !== true || download.directAuthenticatedApi !== true) return disabled;
        if ([value.enabled, imports.read, imports.create, imports.commit, exports.read, exports.create, exports.download].some((entry) => typeof entry !== "boolean")) return disabled;
        return value as DashboardAuthorization["dataJobFoundationV1"];
      } catch { return disabled; }
    })(),
    mediaFoundationV1: (() => {
      const disabled = { enabled: false, contractVersion: "media-asset.v1" as const, queryProfile: "dashboard.media-assets.v1" as const, registryVersion: "media-registry.v1" as const, safeProfile: "dashboard.media-assets.safe.v1" as const, sensitiveProfile: { enabled: false, profileId: "dashboard.media-assets.sensitive.v1" as const }, actions: { create: false, update: false, archive: false, restore: false, downloadOriginal: false, manageVariants: false }, upload: { enabled: false, image: false, pdf: false, maxBytes: { image: 10_485_760 as const, pdf: 26_214_400 as const }, intentLifetimeSeconds: 600 as const, directControlledApi: true as const }, preview: { controlled: true as const, pdfInline: false as const }, legacyAdapters: { enabled: true as const, partial: true as const }, externalDelivery: false as const, ai: false as const, bulkImportExport: false as const };
      try {
        const value = objectValue(record.mediaFoundationV1, `${path}.mediaFoundationV1`), sensitive = objectValue(value.sensitiveProfile, `${path}.mediaFoundationV1.sensitiveProfile`), actions = objectValue(value.actions, `${path}.mediaFoundationV1.actions`), upload = objectValue(value.upload, `${path}.mediaFoundationV1.upload`), maxBytes = objectValue(upload.maxBytes, `${path}.mediaFoundationV1.upload.maxBytes`), preview = objectValue(value.preview, `${path}.mediaFoundationV1.preview`), adapters = objectValue(value.legacyAdapters, `${path}.mediaFoundationV1.legacyAdapters`);
        const booleans = [value.enabled, sensitive.enabled, actions.create, actions.update, actions.archive, actions.restore, actions.downloadOriginal, actions.manageVariants, upload.enabled, upload.image, upload.pdf];
        if (booleans.some(entry => typeof entry !== "boolean") || value.contractVersion !== "media-asset.v1" || value.queryProfile !== "dashboard.media-assets.v1" || value.registryVersion !== "media-registry.v1" || value.safeProfile !== "dashboard.media-assets.safe.v1" || sensitive.profileId !== "dashboard.media-assets.sensitive.v1" || maxBytes.image !== 10_485_760 || maxBytes.pdf !== 26_214_400 || upload.intentLifetimeSeconds !== 600 || upload.directControlledApi !== true || preview.controlled !== true || preview.pdfInline !== false || adapters.enabled !== true || adapters.partial !== true || value.externalDelivery !== false || value.ai !== false || value.bulkImportExport !== false) return disabled;
        return value as DashboardAuthorization["mediaFoundationV1"];
      } catch { return disabled; }
    })(),
    settingsCenterV1: (() => {
      const disabled: SettingsCenterCapability = { enabled: false, contractVersion: "settings-center.v1", registryVersion: "settings-registry.v1", coreDescriptorKey: "settings.core.overview_refresh_seconds", actions: { read: false, createDraft: false, updateDraft: false, validate: false, publish: false, rollback: false }, history: { read: false }, readiness: { read: false }, audit: { integrated: true }, secrets: false, externalSideEffects: false, partialPublish: false };
      try {
        const capability = validateSettingsCenterCapability(record.settingsCenterV1, `${path}.settingsCenterV1`);
        const read = modules.find((module) => module.module === "settings")?.actions.find((action) => action.action === "read" && action.permissionKey === "settings.read");
        return status !== "unavailable" && read?.decision === "allow" && read.scope.kind === "global" ? capability : disabled;
      } catch { return disabled; }
    })(),
    serviceAccountsV1: (() => {
      const disabled = { enabled: false, manage: false };
      try {
        const value = objectValue(record.serviceAccountsV1, `${path}.serviceAccountsV1`);
        if (typeof value.enabled !== "boolean" || typeof value.manage !== "boolean" || value.manage && !value.enabled) return disabled;
        return { enabled: value.enabled, manage: value.manage };
      } catch { return disabled; }
    })()
  };
};

function validateMoney(value: unknown, path = "money"): Money {
  const money = objectValue(value, path);
  const currencyValue = stringValue(money.currency, `${path}.currency`);
  if (currencyValue !== "CAD" && currencyValue !== "USD") {
    return fail(`${path}.currency`, "CAD or USD");
  }
  const currency: CurrencyCode = currencyValue;
  const amount = numberValue(money.amount, `${path}.amount`);
  if (amount < 0) return fail(`${path}.amount`, "a nonnegative number");
  const amountCents = money.amountCents === undefined
    ? undefined
    : numberValue(money.amountCents, `${path}.amountCents`);
  if (amountCents !== undefined && (!Number.isInteger(amountCents) || amountCents < 0)) {
    return fail(`${path}.amountCents`, "a nonnegative integer");
  }
  return { amount, ...(amountCents === undefined ? {} : { amountCents }), currency };
}

function validateShippingAddress(value: unknown, path = "shippingAddress"): ShippingAddress {
  const address = objectValue(value, path);
  return {
    addressLine1: stringValue(address.addressLine1, `${path}.addressLine1`),
    ...(address.addressLine2 === undefined
      ? {}
      : { addressLine2: stringValue(address.addressLine2, `${path}.addressLine2`) }),
    city: stringValue(address.city, `${path}.city`),
    province: stringValue(address.province, `${path}.province`),
    postalCode: stringValue(address.postalCode, `${path}.postalCode`),
    country: stringValue(address.country, `${path}.country`)
  };
}

function validateImage(value: unknown, path = "image") {
  const image = objectValue(value, path);
  return {
    url: stringValue(image.url, `${path}.url`),
    alt: stringValue(image.alt, `${path}.alt`),
    ...(typeof image.width === "number" ? { width: image.width } : {}),
    ...(typeof image.height === "number" ? { height: image.height } : {})
  };
}

function validateCartProduct(value: unknown, path = "product") {
  const product = objectValue(value, path);
  const images = arrayOf(validateImage)(product.images, `${path}.images`);
  if (images.length === 0) return fail(`${path}.images`, "a non-empty image array");
  return {
    id: stringValue(product.id, `${path}.id`),
    slug: stringValue(product.slug, `${path}.slug`),
    sku: stringValue(product.sku, `${path}.sku`),
    name: stringValue(product.name, `${path}.name`),
    ...(typeof product.category === "string" && product.category.trim()
      ? { category: product.category }
      : {}),
    unit: stringValue(product.unit, `${path}.unit`),
    dimensions: typeof product.dimensions === "string" ? product.dimensions : "",
    images,
    inStock: booleanValue(product.inStock, `${path}.inStock`)
  };
}

export const validateCart: RuntimeValidator<Cart> = (value, path = "cart") => {
  const cart = objectValue(value, path);
  const subtotal = validateMoney(cart.subtotal, `${path}.subtotal`);
  const items = arrayOf((itemValue, itemPath = "item") => {
    const item = objectValue(itemValue, itemPath);
    const quantity = numberValue(item.quantity, `${itemPath}.quantity`);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return fail(`${itemPath}.quantity`, "a positive integer");
    }
    const unitPrice = validateMoney(item.unitPrice, `${itemPath}.unitPrice`);
    const lineTotal = validateMoney(item.lineTotal, `${itemPath}.lineTotal`);
    if (unitPrice.currency !== lineTotal.currency) {
      return fail(`${itemPath}.lineTotal.currency`, `${unitPrice.currency} to match unitPrice`);
    }
    if (lineTotal.currency !== subtotal.currency) {
      return fail(`${itemPath}.lineTotal.currency`, `${subtotal.currency} to match subtotal`);
    }
    return {
      id: stringValue(item.id, `${itemPath}.id`),
      skuId: stringValue(item.skuId, `${itemPath}.skuId`),
      product: validateCartProduct(item.product, `${itemPath}.product`),
      quantity,
      unitPrice,
      lineTotal
    };
  })(cart.items, `${path}.items`);
  return {
    id: stringValue(cart.id, `${path}.id`),
    items,
    subtotal
  };
};

export const validateCategorySummary: RuntimeValidator<CategorySummary> = (value, path = "category") => {
  const category = objectValue(value, path);
  return {
    id: stringValue(category.id, `${path}.id`),
    slug: stringValue(category.slug, `${path}.slug`),
    name: stringValue(category.name, `${path}.name`),
    ...(typeof category.description === "string" ? { description: category.description } : {}),
    ...(typeof category.parentId === "string" ? { parentId: category.parentId } : {})
  };
};

export const validateProductSummary: RuntimeValidator<ProductSummary> = (
  value,
  path = "product"
) => {
  const product = objectValue(value, path);
  const images = arrayOf(validateImage)(product.images, `${path}.images`);
  if (images.length === 0) return fail(`${path}.images`, "a non-empty image array");
  return {
    id: stringValue(product.id, `${path}.id`),
    slug: stringValue(product.slug, `${path}.slug`),
    sku: stringValue(product.sku, `${path}.sku`),
    name: stringValue(product.name, `${path}.name`),
    category: stringValue(product.category, `${path}.category`),
    price: validateMoney(product.price, `${path}.price`),
    unit: stringValue(product.unit, `${path}.unit`),
    dimensions: typeof product.dimensions === "string" ? product.dimensions : "",
    images,
    inStock: booleanValue(product.inStock, `${path}.inStock`)
  };
};

export const validateFavoriteItem: RuntimeValidator<FavoriteItem> = (
  value,
  path = "favorite"
) => {
  const favorite = objectValue(value, path);
  return {
    id: stringValue(favorite.id, `${path}.id`),
    product: validateProductSummary(favorite.product, `${path}.product`)
  };
};

function validateFinishOption(value: unknown, path = "finishOption"): ProductFinishOption {
  const option = objectValue(value, path);
  return {
    name: stringValue(option.name, `${path}.name`),
    ...(typeof option.sku === "string" ? { sku: option.sku } : {}),
    ...(typeof option.manufacturerPartNumber === "string"
      ? { manufacturerPartNumber: option.manufacturerPartNumber }
      : {}),
    ...(option.configuration === "cabinet-only" || option.configuration === "with-top"
      ? { configuration: option.configuration }
      : {}),
    ...(typeof option.colorName === "string" ? { colorName: option.colorName } : {}),
    ...(typeof option.colorHex === "string" ? { colorHex: option.colorHex } : {}),
    ...(option.image === undefined || option.image === null
      ? {}
      : { image: validateImage(option.image, `${path}.image`) }),
    ...(Array.isArray(option.images)
      ? { images: arrayOf(validateImage)(option.images, `${path}.images`) }
      : {}),
    ...(option.price === undefined || option.price === null
      ? {}
      : { price: validateMoney(option.price, `${path}.price`) }),
    ...(typeof option.dimensions === "string" ? { dimensions: option.dimensions } : {}),
    ...(typeof option.description === "string" ? { description: option.description } : {}),
    ...(Array.isArray(option.productHighlights)
      ? { productHighlights: arrayOf(stringValue)(option.productHighlights, `${path}.productHighlights`) }
      : {}),
    ...(option.specifications === undefined || option.specifications === null || typeof option.specifications !== "object"
      ? {}
      : {
          specifications: Object.fromEntries(
            Object.entries(objectValue(option.specifications, `${path}.specifications`)).map(([key, entry]) => [
              key,
              stringValue(entry, `${path}.specifications.${key}`)
            ])
          )
        }),
    ...(typeof option.active === "boolean" ? { active: option.active } : {})
  };
}

export const validateWebsiteApiProduct: RuntimeValidator<WebsiteApiProduct> = (
  value,
  path = "product"
) => {
  const product = objectValue(value, path);
  const category = product.category == null || typeof product.category === "string"
    ? product.category
    : objectValue(product.category, `${path}.category`);
  const primarySku = product.primarySku == null
    ? null
    : objectValue(product.primarySku, `${path}.primarySku`);
  const price = product.price == null
    ? null
    : objectValue(product.price, `${path}.price`);
  const assets = product.assets === undefined
    ? undefined
    : arrayOf((assetValue, assetPath = "asset") => {
        const asset = objectValue(assetValue, assetPath);
        const sortOrder = numberValue(asset.sortOrder, `${assetPath}.sortOrder`);
        if (!Number.isInteger(sortOrder)) return fail(`${assetPath}.sortOrder`, "an integer");
        return {
          id: stringValue(asset.id, `${assetPath}.id`),
          url: stringValue(asset.url, `${assetPath}.url`),
          ...(asset.altText === null
            ? { altText: null }
            : typeof asset.altText === "string"
              ? { altText: asset.altText }
              : {}),
          kind: stringValue(asset.kind, `${assetPath}.kind`),
          sortOrder
        };
      })(product.assets, `${path}.assets`);
  const specifications = product.specifications === undefined
    ? undefined
    : Array.isArray(product.specifications)
      ? arrayOf((specificationValue, specificationPath = "specification") => {
          const specification = objectValue(specificationValue, specificationPath);
          return {
            key: stringValue(specification.key, `${specificationPath}.key`),
            value: stringValue(specification.value, `${specificationPath}.value`)
          };
        })(product.specifications, `${path}.specifications`)
      : Object.fromEntries(
          Object.entries(objectValue(product.specifications, `${path}.specifications`)).map(([key, entry]) => [
            key,
            stringValue(entry, `${path}.specifications.${key}`)
          ])
        );
  const ratingSummary = product.ratingSummary === undefined
    ? undefined
    : (() => {
        const rating = objectValue(product.ratingSummary, `${path}.ratingSummary`);
        const average = numberValue(rating.average, `${path}.ratingSummary.average`);
        const count = numberValue(rating.count, `${path}.ratingSummary.count`);
        if (average < 0 || average > 5) return fail(`${path}.ratingSummary.average`, "between 0 and 5");
        if (!Number.isInteger(count) || count < 0) return fail(`${path}.ratingSummary.count`, "a nonnegative integer");
        return {
          average,
          count,
          ...(rating.sourceLabel === undefined
            ? {}
            : { sourceLabel: stringValue(rating.sourceLabel, `${path}.ratingSummary.sourceLabel`) }),
          ...(rating.writeReviewEnabled === undefined
            ? {}
            : { writeReviewEnabled: booleanValue(rating.writeReviewEnabled, `${path}.ratingSummary.writeReviewEnabled`) })
        };
      })();
  const reviews = product.reviews === undefined
    ? undefined
    : arrayOf((reviewValue, reviewPath = "review") => {
        const review = objectValue(reviewValue, reviewPath);
        const rating = review.rating === undefined
          ? undefined
          : numberValue(review.rating, `${reviewPath}.rating`);
        if (rating !== undefined && (rating < 0 || rating > 5)) {
          return fail(`${reviewPath}.rating`, "between 0 and 5");
        }
        return {
          id: stringValue(review.id, `${reviewPath}.id`),
          name: stringValue(review.name, `${reviewPath}.name`),
          ...(review.title === null
            ? { title: null }
            : review.title === undefined
              ? {}
              : { title: stringValue(review.title, `${reviewPath}.title`) }),
          body: stringValue(review.body, `${reviewPath}.body`),
          ...(rating === undefined ? {} : { rating }),
          ...(review.createdAt === undefined
            ? {}
            : { createdAt: stringValue(review.createdAt, `${reviewPath}.createdAt`) }),
          ...(review.verifiedBuyer === undefined
            ? {}
            : { verifiedBuyer: booleanValue(review.verifiedBuyer, `${reviewPath}.verifiedBuyer`) })
        };
      })(product.reviews, `${path}.reviews`);
  const variantSkus = product.variantSkus === undefined
    ? undefined
    : arrayOf((skuValue, skuPath = "variantSku") => {
        const variantSku = objectValue(skuValue, skuPath);
        return {
          skuCode: stringValue(variantSku.skuCode, `${skuPath}.skuCode`),
          ...(variantSku.manufacturerPartNumber === undefined || variantSku.manufacturerPartNumber === null || typeof variantSku.manufacturerPartNumber === "string"
            ? { manufacturerPartNumber: variantSku.manufacturerPartNumber ?? null }
            : {})
        };
      })(product.variantSkus, `${path}.variantSkus`);

  return {
    id: stringValue(product.id, `${path}.id`),
    slug: stringValue(product.slug, `${path}.slug`),
    name: stringValue(product.name, `${path}.name`),
    ...(product.shortDescription === null
      ? { shortDescription: null }
      : typeof product.shortDescription === "string"
        ? { shortDescription: product.shortDescription }
        : {}),
    ...(product.description === null
      ? { description: null }
      : typeof product.description === "string"
        ? { description: product.description }
        : {}),
    category: typeof category === "string"
      ? stringValue(category, `${path}.category`)
      : category
        ? {
            id: stringValue(category.id, `${path}.category.id`),
            slug: stringValue(category.slug, `${path}.category.slug`),
            name: stringValue(category.name, `${path}.category.name`)
          }
        : null,
    primarySku: primarySku
      ? {
          id: stringValue(primarySku.id, `${path}.primarySku.id`),
          skuCode: stringValue(primarySku.skuCode, `${path}.primarySku.skuCode`),
          name: stringValue(primarySku.name, `${path}.primarySku.name`),
          ...(primarySku.attributes === undefined ? {} : { attributes: primarySku.attributes })
        }
      : null,
    price: price
      ? (() => {
          const amount = numberValue(price.amount, `${path}.price.amount`);
          const amountCents = numberValue(price.amountCents, `${path}.price.amountCents`);
          if (amount < 0) return fail(`${path}.price.amount`, "a nonnegative number");
          if (!Number.isInteger(amountCents) || amountCents < 0) {
            return fail(`${path}.price.amountCents`, "a nonnegative integer");
          }
          return {
            amount,
            amountCents,
            currency: stringValue(price.currency, `${path}.price.currency`)
          };
        })()
      : null,
    ...(assets === undefined ? {} : { assets }),
    ...(specifications === undefined ? {} : { specifications }),
    ...(product.dimensions === undefined || product.dimensions === null || typeof product.dimensions === "string"
      ? { dimensions: product.dimensions ?? null }
      : {}),
    ...(product.finishOptions === undefined
      ? {}
      : { finishOptions: arrayOf(validateFinishOption)(product.finishOptions, `${path}.finishOptions`) }),
    ...(product.manufacturerPartNumber === undefined || product.manufacturerPartNumber === null || typeof product.manufacturerPartNumber === "string"
      ? { manufacturerPartNumber: product.manufacturerPartNumber ?? null }
      : {}),
    ...(variantSkus === undefined ? {} : { variantSkus }),
    ...(ratingSummary === undefined ? {} : { ratingSummary }),
    ...(reviews === undefined ? {} : { reviews })
  };
};

export const validateCheckoutSession: RuntimeValidator<CheckoutSession> = (
  value,
  path = "checkoutSession"
) => {
  const session = objectValue(value, path);
  const status = stringValue(session.status, `${path}.status`);
  if (!CHECKOUT_SESSION_STATUSES.some((candidate) => candidate === status)) {
    return fail(`${path}.status`, "a supported checkout status");
  }
  const paymentMethod = stringValue(session.paymentMethod, `${path}.paymentMethod`);
  if (!["card", "pos", "cash"].includes(paymentMethod)) {
    return fail(`${path}.paymentMethod`, "a supported payment method");
  }
  const fulfillment = stringValue(session.fulfillment, `${path}.fulfillment`);
  if (fulfillment !== "pickup" && fulfillment !== "delivery") {
    return fail(`${path}.fulfillment`, "pickup or delivery");
  }
  const expiresAt = stringValue(session.expiresAt, `${path}.expiresAt`);
  if (Number.isNaN(Date.parse(expiresAt))) {
    return fail(`${path}.expiresAt`, "an ISO date-time string");
  }
  const subtotal = validateMoney(session.subtotal, `${path}.subtotal`);
  const tax = validateMoney(session.tax, `${path}.tax`);
  const shipping = validateMoney(session.shipping, `${path}.shipping`);
  const total = validateMoney(session.total, `${path}.total`);
  for (const [key, money] of [["tax", tax], ["shipping", shipping], ["total", total]] as const) {
    if (money.currency !== subtotal.currency) {
      return fail(`${path}.${key}.currency`, `${subtotal.currency} to match subtotal`);
    }
  }
  return {
    id: stringValue(session.id, `${path}.id`),
    status: status as CheckoutSession["status"],
    fulfillment: fulfillment as CheckoutSession["fulfillment"],
    paymentMethod: paymentMethod as CheckoutSession["paymentMethod"],
    expiresAt,
    subtotal,
    tax,
    shipping,
    total,
    ...(session.guestOrderToken === undefined
      ? {}
      : { guestOrderToken: stringValue(session.guestOrderToken, `${path}.guestOrderToken`) }),
    ...(session.orderId === undefined
      ? {}
      : { orderId: stringValue(session.orderId, `${path}.orderId`) }),
    ...(session.shippingAddress === undefined
      ? {}
      : { shippingAddress: validateShippingAddress(session.shippingAddress, `${path}.shippingAddress`) })
  };
};

export const validateCustomerAccount: RuntimeValidator<CustomerAccount> = (
  value,
  path = "customerAccount"
) => {
  const account = objectValue(value, path);
  return {
    id: stringValue(account.id, `${path}.id`),
    email: stringValue(account.email, `${path}.email`),
    ...(typeof account.firstName === "string" ? { firstName: account.firstName } : {}),
    ...(typeof account.lastName === "string" ? { lastName: account.lastName } : {}),
    ...(typeof account.phone === "string" ? { phone: account.phone } : {})
  };
};

export const validateCustomerAddress: RuntimeValidator<CustomerAddress> = (
  value,
  path = "customerAddress"
) => {
  const address = objectValue(value, path);
  return {
    id: stringValue(address.id, `${path}.id`),
    ...(address.label === null
      ? { label: null }
      : typeof address.label === "string"
        ? { label: address.label }
        : {}),
    firstName: stringValue(address.firstName, `${path}.firstName`),
    lastName: stringValue(address.lastName, `${path}.lastName`),
    ...(address.phone === null
      ? { phone: null }
      : typeof address.phone === "string"
        ? { phone: address.phone }
        : {}),
    addressLine1: stringValue(address.addressLine1, `${path}.addressLine1`),
    ...(address.addressLine2 === null
      ? { addressLine2: null }
      : typeof address.addressLine2 === "string"
        ? { addressLine2: address.addressLine2 }
        : {}),
    city: stringValue(address.city, `${path}.city`),
    province: stringValue(address.province, `${path}.province`),
    postalCode: stringValue(address.postalCode, `${path}.postalCode`),
    country: stringValue(address.country, `${path}.country`),
    isDefault: booleanValue(address.isDefault, `${path}.isDefault`)
  };
};

export const validateAccountOrder: RuntimeValidator<AccountOrder> = (
  value,
  path = "accountOrder"
) => {
  const order = objectValue(value, path);
  const createdAt = stringValue(order.createdAt, `${path}.createdAt`);
  if (Number.isNaN(Date.parse(createdAt))) return fail(`${path}.createdAt`, "an ISO date-time string");
  const items = arrayOf((itemValue, itemPath = "item") => {
    const item = objectValue(itemValue, itemPath);
    const quantity = numberValue(item.quantity, `${itemPath}.quantity`);
    if (!Number.isInteger(quantity) || quantity < 1) return fail(`${itemPath}.quantity`, "a positive integer");
    return {
      skuCode: stringValue(item.skuCode, `${itemPath}.skuCode`),
      productName: stringValue(item.productName, `${itemPath}.productName`),
      quantity,
      ...(item.unitPrice === undefined ? {} : { unitPrice: validateMoney(item.unitPrice, `${itemPath}.unitPrice`) }),
      ...(item.lineTotal === undefined ? {} : { lineTotal: validateMoney(item.lineTotal, `${itemPath}.lineTotal`) })
    };
  })(order.items, `${path}.items`);
  const statusEvents = order.statusEvents === undefined
    ? undefined
    : arrayOf((eventValue, eventPath = "statusEvent") => {
        const event = objectValue(eventValue, eventPath);
        const eventCreatedAt = stringValue(event.createdAt, `${eventPath}.createdAt`);
        if (Number.isNaN(Date.parse(eventCreatedAt))) return fail(`${eventPath}.createdAt`, "an ISO date-time string");
        return {
          id: stringValue(event.id, `${eventPath}.id`),
          status: stringValue(event.status, `${eventPath}.status`),
          source: stringValue(event.source, `${eventPath}.source`),
          ...(event.payload === undefined ? {} : { payload: event.payload }),
          createdAt: eventCreatedAt
        };
      })(order.statusEvents, `${path}.statusEvents`);
  const shipment = order.shipment === undefined
    ? undefined
    : (() => {
        const entry = objectValue(order.shipment, `${path}.shipment`);
        const updatedAt = stringValue(entry.updatedAt, `${path}.shipment.updatedAt`);
        if (Number.isNaN(Date.parse(updatedAt))) return fail(`${path}.shipment.updatedAt`, "an ISO date-time string");
        return {
          ...(entry.shipmentId === undefined ? {} : { shipmentId: stringValue(entry.shipmentId, `${path}.shipment.shipmentId`) }),
          ...(entry.trackingNumber === undefined ? {} : { trackingNumber: stringValue(entry.trackingNumber, `${path}.shipment.trackingNumber`) }),
          status: stringValue(entry.status, `${path}.shipment.status`),
          updatedAt
        };
      })();
  return {
    id: stringValue(order.id, `${path}.id`),
    status: stringValue(order.status, `${path}.status`),
    fulfillment: stringValue(order.fulfillment, `${path}.fulfillment`),
    ...(order.paymentMethod === undefined ? {} : { paymentMethod: stringValue(order.paymentMethod, `${path}.paymentMethod`) }),
    total: validateMoney(order.total, `${path}.total`),
    ...(order.subtotal === undefined ? {} : { subtotal: validateMoney(order.subtotal, `${path}.subtotal`) }),
    ...(order.tax === undefined ? {} : { tax: validateMoney(order.tax, `${path}.tax`) }),
    ...(order.shipping === undefined ? {} : { shipping: validateMoney(order.shipping, `${path}.shipping`) }),
    createdAt,
    ...(order.shippingAddress === undefined ? {} : { shippingAddress: validateShippingAddress(order.shippingAddress, `${path}.shippingAddress`) }),
    ...(shipment === undefined ? {} : { shipment }),
    ...(statusEvents === undefined ? {} : { statusEvents }),
    items
  };
};

export const validateAuthSession: RuntimeValidator<AuthSession> = (
  value,
  path = "authSession"
) => {
  const session = objectValue(value, path);
  const user = objectValue(session.user, `${path}.user`);
  return {
    user: {
      id: stringValue(user.id, `${path}.user.id`),
      email: stringValue(user.email, `${path}.user.email`),
      ...(typeof user.firstName === "string" ? { firstName: user.firstName } : {}),
      ...(typeof user.lastName === "string" ? { lastName: user.lastName } : {}),
      ...(user.role === "customer" || user.role === "dealer" || user.role === "admin"
        ? { role: user.role }
        : {})
    },
    ...(typeof session.accessToken === "string" ? { accessToken: session.accessToken } : {})
  };
};


export const validateStorefrontDealerSummary: RuntimeValidator<StorefrontDealerSummary> = (value, path = "dealer") => {
  const dealer = objectValue(value, path);
  const dealerId = stringValue(dealer.id, `${path}.id`);
  const dealerName = stringValue(dealer.name, `${path}.name`);
  const dealerPhone = typeof dealer.phone === "string" ? dealer.phone : undefined;
  const dealerEmail = typeof dealer.email === "string" ? dealer.email : undefined;
  const dealerWebsite = typeof dealer.website === "string" ? dealer.website : undefined;
  const rawLocations = Array.isArray(dealer.locations) ? dealer.locations : [];

  const locations = rawLocations.map((location, index) => {
    const loc = objectValue(location, `${path}.locations[${index}]`);
    const locationId = stringValue(loc.id, `${path}.locations[${index}].id`);
    const locationName = typeof loc.name === "string" ? loc.name : undefined;
    return {
      id: locationId,
      dealerId: typeof loc.dealerId === "string" ? loc.dealerId : dealerId,
      dealerLocationId: locationId,
      code: typeof loc.code === "string" ? loc.code : undefined,
      name: locationName && rawLocations.length > 1 ? `${dealerName} — ${locationName}` : dealerName,
      address: typeof loc.addressLine1 === "string" ? loc.addressLine1 : "Address pending",
      city: typeof loc.city === "string" ? loc.city : "",
      province: typeof loc.province === "string" ? loc.province : "",
      postalCode: typeof loc.postalCode === "string" ? loc.postalCode : "",
      phone: dealerPhone ?? "",
      email: dealerEmail,
      website: dealerWebsite,
      latitude: typeof loc.latitude === "number" ? loc.latitude : undefined,
      longitude: typeof loc.longitude === "number" ? loc.longitude : undefined,
      availableForPickup: booleanValue(loc.pickupAvailable, `${path}.locations[${index}].pickupAvailable`),
      availableForDelivery: typeof loc.deliveryAvailable === "boolean" ? loc.deliveryAvailable : undefined
    };
  });

  return {
    id: dealerId,
    code: typeof dealer.code === "string" ? dealer.code : undefined,
    name: dealerName,
    status: typeof dealer.status === "string" ? dealer.status : "active",
    phone: dealerPhone,
    email: dealerEmail,
    website: dealerWebsite,
    locations
  };
};

export function validateOk(value: unknown, path = "result") {
  const result = objectValue(value, path);
  if (result.ok !== true) return fail(`${path}.ok`, "true");
  return { ok: true as const };
}

export function validateIdStatus(value: unknown, path = "result") {
  const result = objectValue(value, path);
  const idEntry = ["leadId", "applicationId", "reviewId"].find(
    (key) => typeof result[key] === "string" && Boolean((result[key] as string).trim())
  );
  if (!idEntry) return fail(path, "an identified submission result");
  return {
    [idEntry]: result[idEntry],
    status: stringValue(result.status, `${path}.status`)
  } as Record<string, string>;
}

export function validateContactLeadResult(
  value: unknown,
  path = "result"
): { leadId: string; status: "new" | "routed" } {
  const result = objectValue(value, path);
  const status = stringValue(result.status, `${path}.status`);
  if (status !== "new" && status !== "routed") {
    return fail(`${path}.status`, "new or routed");
  }
  return {
    leadId: stringValue(result.leadId, `${path}.leadId`),
    status
  };
}

export function validateDealerApplicationResult(
  value: unknown,
  path = "result"
): { applicationId: string; status: "submitted" | "under_review" } {
  const result = objectValue(value, path);
  const status = stringValue(result.status, `${path}.status`);
  if (status !== "submitted" && status !== "under_review") {
    return fail(`${path}.status`, "submitted or under_review");
  }
  return {
    applicationId: stringValue(result.applicationId, `${path}.applicationId`),
    status
  };
}
