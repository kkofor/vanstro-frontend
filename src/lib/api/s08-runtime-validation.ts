import type {
  ApiServiceAccountsValueV1,
  InvocationErrorClass,
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
} from "./api-contract.ts";
import { arrayOf, booleanValue, numberValue, objectValue, stringValue, type RuntimeValidator } from "./runtime-validation.ts";

const FAIL = (path: string, expected: string): never => { throw new TypeError(`${path} must be ${expected}.`); };
function exact(record: Record<string, unknown>, keys: readonly string[], path: string) { const actual = Object.keys(record).sort(), wanted = [...keys].sort(); if (actual.length !== wanted.length || actual.some((key, i) => key !== wanted[i])) FAIL(path, `an exact object with keys ${wanted.join(", ")}`); }
function integer(value: unknown, path: string, min = 0, max = 2147483647) { const n = numberValue(value,path); if (!Number.isSafeInteger(n) || n < min || n > max) FAIL(path, `an integer from ${min} through ${max}`); return n; }
function iso(value: unknown, path: string) { const text = stringValue(value,path); if (!Number.isFinite(Date.parse(text))) FAIL(path,"an ISO date-time"); return text; }
function uuid(value: unknown, path: string) { const text=stringValue(value,path); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) FAIL(path,"a UUID"); return text; }
function uniqueStrings(value: unknown, path: string, max: number, nonEmpty = true) {
  const items = arrayOf((entry, p = "item") => { const text = stringValue(entry, p); if (nonEmpty && !text.trim()) FAIL(p, "a non-empty string"); return text; })(value, path);
  if (items.length > max || new Set(items).size !== items.length) FAIL(path, `up to ${max} unique strings`);
  return items;
}
const environments = { production:true,staging:true,development:true,test:true } as const;
const scopeModes = { global:true,dealer:true,location:true } as const;
const rateLimitModes = { "per-token":true,"per-account":true } as const;
const redactionModes = { strict:true,standard:true } as const;
const consumerIds = { "token-lifecycle":true,"rotate-overlap":true,"machine-scope-enforcement":true,"rate-limit":true,"audit-invocation-read-model":true,"erp-product-api-machine":true } as const;
const families = { tokenLifecyclePolicy:true,machineScopePolicy:true,rateLimitPolicy:true,auditInvocationPolicy:true } as const;
const errorClasses = { RATE_LIMITED:true,AUTH_INVALID:true,AUTH_REQUIRED:true,FORBIDDEN:true,TOOL_NOT_FOUND:true,INPUT_INVALID:true,DEPENDENCY_UNAVAILABLE:true,INTERNAL:true } as const;
const invocationStatuses = { succeeded:true,failed:true,rate_limited:true,denied:true } as const;
const serviceAccountStatuses = { active:true,disabled:true } as const;
const tokenStatuses = { active:true,expired:true,revoked:true,rotated:true } as const;

/** Frozen schema settings.api-service-account.v1: exactly four policy
 *  families with typed bounds. Secret-like keys (oneTimeRevealEnabled, token,
 *  tokenHash, secret, Authorization, Cookie) are rejected by the exact-key
 *  checks and never surface in any Settings value. */
export const validateApiServiceAccountsValueV1: RuntimeValidator<ApiServiceAccountsValueV1> = (value, path = "apiServiceAccountsValue") => {
  const v = objectValue(value, path), token = objectValue(v.tokenLifecyclePolicy, `${path}.tokenLifecyclePolicy`), machine = objectValue(v.machineScopePolicy, `${path}.machineScopePolicy`), rate = objectValue(v.rateLimitPolicy, `${path}.rateLimitPolicy`), audit = objectValue(v.auditInvocationPolicy, `${path}.auditInvocationPolicy`);
  exact(v, ["tokenLifecyclePolicy", "machineScopePolicy", "rateLimitPolicy", "auditInvocationPolicy"], path);
  exact(token, ["defaultTtlDays", "maximumTtlDays", "rotationOverlapMinutes", "maximumActiveTokensPerAccount", "requireExpiry"], `${path}.tokenLifecyclePolicy`);
  exact(machine, ["allowedRoleKeys", "allowedPermissionFamilies", "environment", "dealerLocationScopeMode", "denySensitivePermissionsByDefault"], `${path}.machineScopePolicy`);
  exact(rate, ["requestsPerMinute", "burst", "mode", "retryAfterSemantics"], `${path}.rateLimitPolicy`);
  exact(audit, ["invocationRetentionDays", "metadataRedactionMode", "lastUsedTrackingEnabled", "failedAuthenticationAuditEnabled"], `${path}.auditInvocationPolicy`);
  const allowedRoleKeys = uniqueStrings(machine.allowedRoleKeys, `${path}.machineScopePolicy.allowedRoleKeys`, 64);
  const allowedPermissionFamilies = uniqueStrings(machine.allowedPermissionFamilies, `${path}.machineScopePolicy.allowedPermissionFamilies`, 64);
  const environmentRaw = stringValue(machine.environment, `${path}.machineScopePolicy.environment`); if (!(environmentRaw in environments)) FAIL(`${path}.machineScopePolicy.environment`, "a machine-scope environment");
  const dealerLocationScopeModeRaw = stringValue(machine.dealerLocationScopeMode, `${path}.machineScopePolicy.dealerLocationScopeMode`); if (!(dealerLocationScopeModeRaw in scopeModes)) FAIL(`${path}.machineScopePolicy.dealerLocationScopeMode`, "a scope mode");
  const modeRaw = stringValue(rate.mode, `${path}.rateLimitPolicy.mode`); if (!(modeRaw in rateLimitModes)) FAIL(`${path}.rateLimitPolicy.mode`, "per-token or per-account");
  if (rate.retryAfterSemantics !== "seconds") FAIL(`${path}.rateLimitPolicy.retryAfterSemantics`, "seconds");
  const metadataRedactionModeRaw = stringValue(audit.metadataRedactionMode, `${path}.auditInvocationPolicy.metadataRedactionMode`); if (!(metadataRedactionModeRaw in redactionModes)) FAIL(`${path}.auditInvocationPolicy.metadataRedactionMode`, "strict or standard");
  return {
    tokenLifecyclePolicy: { defaultTtlDays: integer(token.defaultTtlDays, `${path}.tokenLifecyclePolicy.defaultTtlDays`, 1, 365), maximumTtlDays: integer(token.maximumTtlDays, `${path}.tokenLifecyclePolicy.maximumTtlDays`, 1, 365), rotationOverlapMinutes: integer(token.rotationOverlapMinutes, `${path}.tokenLifecyclePolicy.rotationOverlapMinutes`, 0, 1440), maximumActiveTokensPerAccount: integer(token.maximumActiveTokensPerAccount, `${path}.tokenLifecyclePolicy.maximumActiveTokensPerAccount`, 1, 100), requireExpiry: booleanValue(token.requireExpiry, `${path}.tokenLifecyclePolicy.requireExpiry`) },
    machineScopePolicy: { allowedRoleKeys, allowedPermissionFamilies, environment: environmentRaw as ApiServiceAccountsValueV1["machineScopePolicy"]["environment"], dealerLocationScopeMode: dealerLocationScopeModeRaw as ApiServiceAccountsValueV1["machineScopePolicy"]["dealerLocationScopeMode"], denySensitivePermissionsByDefault: booleanValue(machine.denySensitivePermissionsByDefault, `${path}.machineScopePolicy.denySensitivePermissionsByDefault`) },
    rateLimitPolicy: { requestsPerMinute: integer(rate.requestsPerMinute, `${path}.rateLimitPolicy.requestsPerMinute`, 1, 100000), burst: integer(rate.burst, `${path}.rateLimitPolicy.burst`, 0, 10000), mode: modeRaw as ApiServiceAccountsValueV1["rateLimitPolicy"]["mode"], retryAfterSemantics: "seconds" },
    auditInvocationPolicy: { invocationRetentionDays: integer(audit.invocationRetentionDays, `${path}.auditInvocationPolicy.invocationRetentionDays`, 1, 7300), metadataRedactionMode: metadataRedactionModeRaw as ApiServiceAccountsValueV1["auditInvocationPolicy"]["metadataRedactionMode"], lastUsedTrackingEnabled: booleanValue(audit.lastUsedTrackingEnabled, `${path}.auditInvocationPolicy.lastUsedTrackingEnabled`), failedAuthenticationAuditEnabled: booleanValue(audit.failedAuthenticationAuditEnabled, `${path}.auditInvocationPolicy.failedAuthenticationAuditEnabled`) }
  };
};
function consumer(value: unknown, path = "consumer") {
  const c = objectValue(value, path); exact(c, ["id", "state", "generation", "reasonCode"], path);
  const id = stringValue(c.id, `${path}.id`), state = stringValue(c.state, `${path}.state`);
  if (!(id in consumerIds) || !["implemented_ready", "implemented_degraded", "future_obligation"].includes(state)) FAIL(path, "an S08 consumer state");
  const generation = c.generation === null ? null : integer(c.generation, `${path}.generation`), reasonCode = c.reasonCode === null ? null : stringValue(c.reasonCode, `${path}.reasonCode`);
  if (state === "implemented_ready" && (generation === null || reasonCode !== null)) FAIL(path, "ready with generation and no reason");
  return { id: id as S08ConsumerId, state: state as S08Readiness["consumers"][number]["state"], generation, reasonCode };
}
function readiness(value: unknown, path = "s08Readiness", publication = false) {
  const r = objectValue(value, path);
  exact(r, publication ? ["state", "reasonCode", "observedAt", "publishedGeneration", "publicationVersion", "consumerGeneration", "projectionState", "consumers"] : ["state", "reasonCode", "observedAt", "publishedGeneration", "publicationVersion", "publicationCas", "consumerGeneration", "projectionState", "consumers"], path);
  const state = stringValue(r.state, `${path}.state`), projectionState = stringValue(r.projectionState, `${path}.projectionState`);
  if (!["ready", "degraded"].includes(state) || !["compiled_default", "published", "activation_failed"].includes(projectionState)) FAIL(path, "S08 readiness");
  const publishedGeneration = integer(r.publishedGeneration, `${path}.publishedGeneration`), consumers = arrayOf(consumer)(r.consumers, `${path}.consumers`);
  if (consumers.length !== 6 || new Set(consumers.map(x => x.id)).size !== 6 || consumers.some(x => x.state === "implemented_ready" && x.generation !== publishedGeneration) || (state === "ready") !== consumers.every(x => x.state === "implemented_ready" && x.generation === publishedGeneration)) FAIL(path, "an exact-generation consumer matrix");
  return { state: state as S08Readiness["state"], reasonCode: r.reasonCode === null ? null : stringValue(r.reasonCode, `${path}.reasonCode`), observedAt: iso(r.observedAt, `${path}.observedAt`), publishedGeneration, publicationVersion: r.publicationVersion === null ? null : integer(r.publicationVersion, `${path}.publicationVersion`, 1), publicationCas: publication ? null : r.publicationCas === null ? null : integer(r.publicationCas, `${path}.publicationCas`), consumerGeneration: r.consumerGeneration === null ? null : integer(r.consumerGeneration, `${path}.consumerGeneration`), projectionState: projectionState as S08Readiness["projectionState"], consumers };
}
export const validateS08Readiness: RuntimeValidator<S08Readiness> = (value, path = "s08Readiness") => readiness(value, path) as S08Readiness;
export const validateS08Draft: RuntimeValidator<S08Draft> = (value, path = "s08Draft") => {
  const d = objectValue(value, path); exact(d, ["id", "descriptorKey", "status", "value", "basePublicationVersion", "version", "changeReason", "createdAt", "updatedAt", "validationRevision", "rollbackOfPublicationId"], path);
  const status = stringValue(d.status, `${path}.status`);
  if (d.descriptorKey !== "settings.api-service-account" || !["draft", "validated", "invalid", "publishing", "activation_failed", "rollback_draft"].includes(status)) FAIL(path, "an S08 draft");
  return { id: uuid(d.id, `${path}.id`), descriptorKey: "settings.api-service-account", status: status as S08Draft["status"], value: validateApiServiceAccountsValueV1(d.value, `${path}.value`), basePublicationVersion: integer(d.basePublicationVersion, `${path}.basePublicationVersion`), version: integer(d.version, `${path}.version`), changeReason: stringValue(d.changeReason, `${path}.changeReason`), createdAt: iso(d.createdAt, `${path}.createdAt`), updatedAt: iso(d.updatedAt, `${path}.updatedAt`), validationRevision: d.validationRevision === null ? null : integer(d.validationRevision, `${path}.validationRevision`), rollbackOfPublicationId: d.rollbackOfPublicationId === null ? null : uuid(d.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`) };
};
export const validateS08ValidationResult: RuntimeValidator<S08ValidationResult> = (value, path = "s08Validation") => {
  const r = objectValue(value, path); exact(r, ["draftId", "draftVersion", "validationRevision", "status", "issues", "validatedAt"], path);
  const status = stringValue(r.status, `${path}.status`), issues = arrayOf((v, p = "issue") => { const x = objectValue(v, p); exact(x, ["code", "severity", "field", "message"], p); const severity = stringValue(x.severity, `${p}.severity`); if (!["blocker", "warning", "info"].includes(severity)) FAIL(p, "a validation issue"); return { code: stringValue(x.code, `${p}.code`), severity: severity as S08ValidationResult["issues"][number]["severity"], field: stringValue(x.field, `${p}.field`), message: stringValue(x.message, `${p}.message`) }; })(r.issues, `${path}.issues`);
  if ((status === "invalid") !== issues.some(x => x.severity === "blocker")) FAIL(path, "status consistent with blockers");
  return { draftId: uuid(r.draftId, `${path}.draftId`), draftVersion: integer(r.draftVersion, `${path}.draftVersion`), validationRevision: integer(r.validationRevision, `${path}.validationRevision`, 1), status: status as "validated" | "invalid", issues, validatedAt: iso(r.validatedAt, `${path}.validatedAt`) };
};
export const validateS08SafeDiff: RuntimeValidator<S08SafeDiff> = (value, path = "s08Diff") => {
  const d = objectValue(value, path); exact(d, ["draftId", "draftVersion", "descriptorKey", "changes", "secretChangeCount", "restartRequired", "affectedServices"], path);
  const services = arrayOf(stringValue)(d.affectedServices, `${path}.affectedServices`);
  if (d.descriptorKey !== "settings.api-service-account" || d.secretChangeCount !== 0 || d.restartRequired !== false || services.length !== 1 || services[0] !== "api-service-accounts") FAIL(path, "an S08 public safe diff");
  const changes = arrayOf((v, p = "change") => { const x = objectValue(v, p); exact(x, ["field", "before", "after", "sensitivity"], p); if (x.sensitivity !== "public") FAIL(p, "a public change"); return { field: stringValue(x.field, `${p}.field`), before: x.before ?? null, after: x.after ?? null, sensitivity: "public" as const }; })(d.changes, `${path}.changes`);
  return { draftId: uuid(d.draftId, `${path}.draftId`), draftVersion: integer(d.draftVersion, `${path}.draftVersion`), descriptorKey: "settings.api-service-account", changes, secretChangeCount: 0, restartRequired: false, affectedServices: ["api-service-accounts"] };
};
export const validateS08Publication: RuntimeValidator<S08Publication> = (value, path = "s08Publication") => {
  const p = objectValue(value, path); exact(p, ["id", "generation", "version", "sourceDraftId", "sourceDraftVersion", "status", "publishedAt", "rollbackOfPublicationId", "readiness"], path);
  const status = stringValue(p.status, `${path}.status`);
  if (!["published", "superseded", "activation_failed", "rolled_back"].includes(status)) FAIL(`${path}.status`, "publication status");
  const ready = readiness(p.readiness, `${path}.readiness`, true);
  return { id: uuid(p.id, `${path}.id`), generation: stringValue(p.generation, `${path}.generation`), version: integer(p.version, `${path}.version`, 1), sourceDraftId: uuid(p.sourceDraftId, `${path}.sourceDraftId`), sourceDraftVersion: integer(p.sourceDraftVersion, `${path}.sourceDraftVersion`), status: status as S08Publication["status"], publishedAt: iso(p.publishedAt, `${path}.publishedAt`), rollbackOfPublicationId: p.rollbackOfPublicationId === null ? null : uuid(p.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`), readiness: { ...ready, publicationCas: undefined } as S08Publication["readiness"] };
};
export const validateS08HistoryEntry: RuntimeValidator<S08HistoryEntry> = (value, path = "s08History") => {
  const e = objectValue(value, path); exact(e, ["publicationId", "generation", "version", "status", "descriptorKeys", "changeReason", "publishedAt", "rollbackOfPublicationId", "auditEventId"], path);
  const keys = arrayOf(stringValue)(e.descriptorKeys, `${path}.descriptorKeys`), status = stringValue(e.status, `${path}.status`);
  if (keys.length !== 1 || keys[0] !== "settings.api-service-account" || !["published", "superseded", "activation_failed", "rolled_back"].includes(status)) FAIL(path, "S08 history");
  return { publicationId: uuid(e.publicationId, `${path}.publicationId`), generation: stringValue(e.generation, `${path}.generation`), version: integer(e.version, `${path}.version`, 1), status: status as S08HistoryEntry["status"], descriptorKeys: ["settings.api-service-account"], changeReason: stringValue(e.changeReason, `${path}.changeReason`), publishedAt: iso(e.publishedAt, `${path}.publishedAt`), rollbackOfPublicationId: e.rollbackOfPublicationId === null ? null : uuid(e.rollbackOfPublicationId, `${path}.rollbackOfPublicationId`), auditEventId: uuid(e.auditEventId, `${path}.auditEventId`) };
};
export const validateS08Overview: RuntimeValidator<S08Overview> = (value, path = "s08Overview") => {
  const o = objectValue(value, path); exact(o, ["descriptorKey", "schemaVersion", "projectionState", "publishedGeneration", "publication", "effective", "consumerMatrix"], path);
  const projectionState = stringValue(o.projectionState, `${path}.projectionState`), consumerMatrix = arrayOf(consumer)(o.consumerMatrix, `${path}.consumerMatrix`);
  if (o.descriptorKey !== "settings.api-service-account" || o.schemaVersion !== "settings.api-service-account.v1" || !["compiled_default", "published", "activation_failed"].includes(projectionState) || consumerMatrix.length !== 6) FAIL(path, "S08 overview");
  const publication = o.publication === null ? null : (() => { const p = objectValue(o.publication, `${path}.publication`); exact(p, ["version", "cas", "publishedAt", "changeReason"], `${path}.publication`); return { version: integer(p.version, `${path}.publication.version`, 1), cas: p.cas === null ? null : integer(p.cas, `${path}.publication.cas`), publishedAt: iso(p.publishedAt, `${path}.publication.publishedAt`), changeReason: stringValue(p.changeReason, `${path}.publication.changeReason`) }; })();
  return { descriptorKey: "settings.api-service-account", schemaVersion: "settings.api-service-account.v1", projectionState: projectionState as S08Overview["projectionState"], publishedGeneration: integer(o.publishedGeneration, `${path}.publishedGeneration`), publication, effective: validateApiServiceAccountsValueV1(o.effective, `${path}.effective`), consumerMatrix };
};
function reason(v: unknown, p: string) { const x = stringValue(v, p).trim(); if (x.length < 8 || x.length > 500) FAIL(p, "8 through 500 characters"); return x; }
function key(v: unknown, p: string) { const x = stringValue(v, p); if (x.length < 8 || x.length > 128) FAIL(p, "an idempotency key"); return x; }
export const validateS08CreateDraftRequest: RuntimeValidator<S08CreateDraftRequest> = (value, path = "s08CreateDraft") => {
  const r = objectValue(value, path); exact(r, ["descriptorKey", "expectedPublishedVersion", "value", "changeReason", "idempotencyKey"], path);
  if (r.descriptorKey !== "settings.api-service-account") FAIL(`${path}.descriptorKey`, "settings.api-service-account");
  return { descriptorKey: "settings.api-service-account", expectedPublishedVersion: integer(r.expectedPublishedVersion, `${path}.expectedPublishedVersion`), value: validateApiServiceAccountsValueV1(r.value, `${path}.value`), changeReason: reason(r.changeReason, `${path}.changeReason`), idempotencyKey: key(r.idempotencyKey, `${path}.idempotencyKey`) };
};
export const validateS08UpdateDraftRequest: RuntimeValidator<S08UpdateDraftRequest> = (value, path = "s08UpdateDraft") => {
  const r = objectValue(value, path); exact(r, ["expectedVersion", "value", "changeReason", "idempotencyKey"], path);
  return { expectedVersion: integer(r.expectedVersion, `${path}.expectedVersion`), value: validateApiServiceAccountsValueV1(r.value, `${path}.value`), changeReason: reason(r.changeReason, `${path}.changeReason`), idempotencyKey: key(r.idempotencyKey, `${path}.idempotencyKey`) };
};
export const validateS08ImpactPreviewResult: RuntimeValidator<S08ImpactPreviewResult> = (value, path = "s08Preview") => {
  const r = objectValue(value, path), q = objectValue(r.policyImpact, `${path}.policyImpact`);
  exact(r, ["candidateAccepted", "affectedFamilies", "policyImpact", "warnings", "contextRevision"], path);
  exact(q, ["defaultTtlDays", "maximumTtlDays", "rotationOverlapMinutes", "maximumActiveTokensPerAccount", "requireExpiry", "environment", "dealerLocationScopeMode", "allowedRoleKeyCount", "allowedPermissionFamilyCount", "denySensitivePermissionsByDefault", "requestsPerMinute", "burst", "rateLimitMode", "invocationRetentionDays", "metadataRedactionMode", "lastUsedTrackingEnabled", "failedAuthenticationAuditEnabled", "serviceAccountCount", "activeTokenCount"], `${path}.policyImpact`);
  const affectedFamilies = arrayOf((v, p = "family") => { const x = stringValue(v, p); if (!(x in families)) FAIL(p, "an S08 family"); return x as S08ImpactPreviewResult["affectedFamilies"][number]; })(r.affectedFamilies, `${path}.affectedFamilies`);
  const environmentRaw = stringValue(q.environment, `${path}.policyImpact.environment`), dealerLocationScopeModeRaw = stringValue(q.dealerLocationScopeMode, `${path}.policyImpact.dealerLocationScopeMode`), rateLimitModeRaw = stringValue(q.rateLimitMode, `${path}.policyImpact.rateLimitMode`), metadataRedactionModeRaw = stringValue(q.metadataRedactionMode, `${path}.policyImpact.metadataRedactionMode`);
  if (!(environmentRaw in environments) || !(dealerLocationScopeModeRaw in scopeModes) || !(rateLimitModeRaw in rateLimitModes) || !(metadataRedactionModeRaw in redactionModes)) FAIL(path, "aggregate policy impact");
  if (affectedFamilies.length !== 4 || new Set(affectedFamilies).size !== 4) FAIL(`${path}.affectedFamilies`, "the four S08 families");
  return { candidateAccepted: booleanValue(r.candidateAccepted, `${path}.candidateAccepted`), affectedFamilies, policyImpact: { defaultTtlDays: integer(q.defaultTtlDays, `${path}.policyImpact.defaultTtlDays`, 1, 365), maximumTtlDays: integer(q.maximumTtlDays, `${path}.policyImpact.maximumTtlDays`, 1, 365), rotationOverlapMinutes: integer(q.rotationOverlapMinutes, `${path}.policyImpact.rotationOverlapMinutes`, 0, 1440), maximumActiveTokensPerAccount: integer(q.maximumActiveTokensPerAccount, `${path}.policyImpact.maximumActiveTokensPerAccount`, 1, 100), requireExpiry: booleanValue(q.requireExpiry, `${path}.policyImpact.requireExpiry`), environment: environmentRaw as S08ImpactPreviewResult["policyImpact"]["environment"], dealerLocationScopeMode: dealerLocationScopeModeRaw as S08ImpactPreviewResult["policyImpact"]["dealerLocationScopeMode"], allowedRoleKeyCount: integer(q.allowedRoleKeyCount, `${path}.policyImpact.allowedRoleKeyCount`, 0, 64), allowedPermissionFamilyCount: integer(q.allowedPermissionFamilyCount, `${path}.policyImpact.allowedPermissionFamilyCount`, 0, 64), denySensitivePermissionsByDefault: booleanValue(q.denySensitivePermissionsByDefault, `${path}.policyImpact.denySensitivePermissionsByDefault`), requestsPerMinute: integer(q.requestsPerMinute, `${path}.policyImpact.requestsPerMinute`, 1, 100000), burst: integer(q.burst, `${path}.policyImpact.burst`, 0, 10000), rateLimitMode: rateLimitModeRaw as S08ImpactPreviewResult["policyImpact"]["rateLimitMode"], invocationRetentionDays: integer(q.invocationRetentionDays, `${path}.policyImpact.invocationRetentionDays`, 1, 7300), metadataRedactionMode: metadataRedactionModeRaw as S08ImpactPreviewResult["policyImpact"]["metadataRedactionMode"], lastUsedTrackingEnabled: booleanValue(q.lastUsedTrackingEnabled, `${path}.policyImpact.lastUsedTrackingEnabled`), failedAuthenticationAuditEnabled: booleanValue(q.failedAuthenticationAuditEnabled, `${path}.policyImpact.failedAuthenticationAuditEnabled`), serviceAccountCount: integer(q.serviceAccountCount, `${path}.policyImpact.serviceAccountCount`), activeTokenCount: integer(q.activeTokenCount, `${path}.policyImpact.activeTokenCount`) }, warnings: arrayOf(stringValue)(r.warnings, `${path}.warnings`), contextRevision: stringValue(r.contextRevision, `${path}.contextRevision`) };
};
export const validateServiceAccountSummary: RuntimeValidator<ServiceAccountSummary> = (value, path = "serviceAccount") => {
  const s = objectValue(value, path); exact(s, ["id", "key", "name", "status", "roles", "environment", "createdAt"], path);
  const statusRaw = stringValue(s.status, `${path}.status`), environmentRaw = stringValue(s.environment, `${path}.environment`);
  if (!(statusRaw in serviceAccountStatuses) || !(environmentRaw in environments)) FAIL(path, "a service account summary");
  return { id: uuid(s.id, `${path}.id`), key: stringValue(s.key, `${path}.key`), name: stringValue(s.name, `${path}.name`), status: statusRaw as ServiceAccountSummary["status"], roles: uniqueStrings(s.roles, `${path}.roles`, 64), environment: environmentRaw as ServiceAccountSummary["environment"], createdAt: iso(s.createdAt, `${path}.createdAt`) };
};
export const validateTokenMetadata: RuntimeValidator<TokenMetadata> = (value, path = "tokenMetadata") => {
  const t = objectValue(value, path); exact(t, ["id", "name", "status", "lastUsedAt", "expiresAt", "revokedAt", "createdAt"], path);
  const statusRaw = stringValue(t.status, `${path}.status`);
  if (!(statusRaw in tokenStatuses)) FAIL(path, "a token metadata");
  const name = t.name === null ? null : stringValue(t.name, `${path}.name`);
  if (name !== null && name.trim().length === 0) FAIL(`${path}.name`, "null or a non-empty string");
  return { id: uuid(t.id, `${path}.id`), name, status: statusRaw as TokenMetadata["status"], lastUsedAt: t.lastUsedAt === null ? null : iso(t.lastUsedAt, `${path}.lastUsedAt`), expiresAt: t.expiresAt === null ? null : iso(t.expiresAt, `${path}.expiresAt`), revokedAt: t.revokedAt === null ? null : iso(t.revokedAt, `${path}.revokedAt`), createdAt: iso(t.createdAt, `${path}.createdAt`) };
};
export const validateTokenCreateResult: RuntimeValidator<TokenCreateResult> = (value, path = "tokenCreate") => {
  const r = objectValue(value, path); exact(r, ["id", "name", "expiresAt", "createdAt", "plaintext", "plaintextAvailable", "replayed"], path);
  const plaintextAvailable = booleanValue(r.plaintextAvailable, `${path}.plaintextAvailable`);
  const replayed = booleanValue(r.replayed, `${path}.replayed`);
  if (plaintextAvailable !== (r.plaintext !== null)) FAIL(path, "plaintext only when plaintextAvailable");
  if (replayed && plaintextAvailable) FAIL(path, "replayed tokens never return plaintext");
  const name = r.name === null ? null : stringValue(r.name, `${path}.name`);
  return { id: uuid(r.id, `${path}.id`), name, expiresAt: r.expiresAt === null ? null : iso(r.expiresAt, `${path}.expiresAt`), createdAt: iso(r.createdAt, `${path}.createdAt`), plaintext: plaintextAvailable ? stringValue(r.plaintext, `${path}.plaintext`) : null, plaintextAvailable, replayed };
};
export const validateTokenRotateResult: RuntimeValidator<TokenRotateResult> = (value, path = "tokenRotate") => {
  const r = objectValue(value, path); exact(r, ["id", "status", "expiresAt", "overlapUntil", "plaintext", "plaintextAvailable"], path);
  if (r.status !== "active") FAIL(`${path}.status`, "active");
  const plaintextAvailable = booleanValue(r.plaintextAvailable, `${path}.plaintextAvailable`);
  if (plaintextAvailable !== (r.plaintext !== null)) FAIL(path, "plaintext only when plaintextAvailable");
  return { id: uuid(r.id, `${path}.id`), status: "active", expiresAt: r.expiresAt === null ? null : iso(r.expiresAt, `${path}.expiresAt`), overlapUntil: iso(r.overlapUntil, `${path}.overlapUntil`), plaintext: plaintextAvailable ? stringValue(r.plaintext, `${path}.plaintext`) : null, plaintextAvailable };
};
export const validateInvocationSummary: RuntimeValidator<InvocationSummary> = (value, path = "invocation") => {
  const x = objectValue(value, path); exact(x, ["id", "serviceAccount", "toolKey", "status", "createdAt", "errorClass"], path);
  const account = objectValue(x.serviceAccount, `${path}.serviceAccount`); exact(account, ["id", "key", "name"], `${path}.serviceAccount`);
  const statusRaw = stringValue(x.status, `${path}.status`);
  if (!(statusRaw in invocationStatuses)) FAIL(path, "an invocation status");
  const errorClass = x.errorClass === null ? null : stringValue(x.errorClass, `${path}.errorClass`);
  if (errorClass !== null && !(errorClass in errorClasses)) FAIL(`${path}.errorClass`, "a whitelisted error class");
  return { id: uuid(x.id, `${path}.id`), serviceAccount: { id: uuid(account.id, `${path}.serviceAccount.id`), key: stringValue(account.key, `${path}.serviceAccount.key`), name: stringValue(account.name, `${path}.serviceAccount.name`) }, toolKey: stringValue(x.toolKey, `${path}.toolKey`), status: statusRaw as InvocationSummary["status"], createdAt: iso(x.createdAt, `${path}.createdAt`), errorClass: errorClass as InvocationErrorClass | null };
};
export const validateServiceAccountSummaryList: RuntimeValidator<ServiceAccountSummary[]> = arrayOf(validateServiceAccountSummary);
export const validateTokenMetadataList: RuntimeValidator<TokenMetadata[]> = arrayOf(validateTokenMetadata);
export const validateInvocationSummaryList: RuntimeValidator<InvocationSummary[]> = arrayOf(validateInvocationSummary);
