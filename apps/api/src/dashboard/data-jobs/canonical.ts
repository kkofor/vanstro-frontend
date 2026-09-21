import { createHash } from "node:crypto";
import { DataJobError } from "./errors.js";


function canonicalJsonValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON does not support non-finite numbers.");
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJsonValue).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJsonValue(item)}`).join(",")}}`;
  }
  throw new TypeError(`Canonical JSON does not support ${typeof value}.`);
}

export function canonicalJson(value: unknown): string {
  return canonicalJsonValue(value);
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashCanonicalRequest(value: unknown): string {
  return sha256Hex(`dashboard.data-jobs.request.v1\n${canonicalJson(value)}`);
}

export interface CanonicalPreviewRow {
  readonly rowNumber: number;
  readonly normalizedPayload: Readonly<Record<string, string | number | null>>;
  readonly validationStatus: "valid" | "invalid";
  readonly validationErrors: readonly Readonly<{ code: string; field?: string }>[];
}

export function hashNormalizedPreviewRows(rows: readonly CanonicalPreviewRow[]): string {
  const canonicalRows = rows.map((row) => ({
    row_number: row.rowNumber,
    normalized_payload: row.normalizedPayload,
    validation_status: row.validationStatus,
    validation_errors: [...row.validationErrors]
      .map((error) => ({ code: error.code, ...(error.field ? { field: error.field } : {}) }))
      .sort((left, right) => `${left.field ?? ""}\0${left.code}`.localeCompare(`${right.field ?? ""}\0${right.code}`, "en")),
  }));
  return sha256Hex(`foundation.sample.normalized-rows.v1\n${canonicalJson(canonicalRows)}`);
}

export interface PreviewBinding {
  readonly sourceArtifactId: string;
  readonly sourceSha256: string;
  readonly registryVersion: string;
  readonly schemaVersion: string;
  readonly parserVersion: string;
  readonly securityPolicyVersion: string;
  readonly normalizedRowsSha256: string;
  readonly objectKey: string;
  readonly actorId: string;
  readonly authorizationScopeKind: string;
  readonly dealerIds: readonly string[];
  readonly locationIds: readonly string[];
  readonly contextRevision: string;
  readonly scopeFingerprint: string;
  readonly previewCreatedAt: Date;
  readonly previewExpiresAt: Date;
  readonly fieldVisibilityFingerprint: string;
}

export function canonicalizeScopeIds(ids: readonly string[]): readonly string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

export function previewBindingFingerprint(binding: PreviewBinding): string {
  return sha256Hex(`dashboard.data-jobs.preview-binding.v1\n${canonicalJson({
    ...binding,
    dealerIds: canonicalizeScopeIds(binding.dealerIds),
    locationIds: canonicalizeScopeIds(binding.locationIds),
    previewCreatedAt: binding.previewCreatedAt.toISOString(),
    previewExpiresAt: binding.previewExpiresAt.toISOString(),
  })}`);
}

export type PreviewBindingExpectation = Omit<
  PreviewBinding,
  "previewCreatedAt" | "previewExpiresAt"
>;

export function assertPreviewCommitBinding(
  binding: PreviewBinding,
  expectation: PreviewBindingExpectation,
  now: Date,
): void {
  if (binding.previewExpiresAt.getTime() <= now.getTime()) {
    throw new DataJobError("IMPORT_EXPIRED", "The import preview has expired.");
  }
  const actualComparable = {
    sourceArtifactId: binding.sourceArtifactId,
    sourceSha256: binding.sourceSha256,
    registryVersion: binding.registryVersion,
    schemaVersion: binding.schemaVersion,
    parserVersion: binding.parserVersion,
    securityPolicyVersion: binding.securityPolicyVersion,
    normalizedRowsSha256: binding.normalizedRowsSha256,
    objectKey: binding.objectKey,
    actorId: binding.actorId,
    authorizationScopeKind: binding.authorizationScopeKind,
    dealerIds: canonicalizeScopeIds(binding.dealerIds),
    locationIds: canonicalizeScopeIds(binding.locationIds),
    contextRevision: binding.contextRevision,
    scopeFingerprint: binding.scopeFingerprint,
    fieldVisibilityFingerprint: binding.fieldVisibilityFingerprint,
  };
  const expectedComparable = {
    ...expectation,
    dealerIds: canonicalizeScopeIds(expectation.dealerIds),
    locationIds: canonicalizeScopeIds(expectation.locationIds),
  };
  if (canonicalJson(actualComparable) !== canonicalJson(expectedComparable)) {
    throw new DataJobError("IMPORT_PREVIEW_STALE", "The import preview binding does not match.");
  }
}
