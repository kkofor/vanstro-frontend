import assert from "node:assert/strict";
import test from "node:test";
import { DATA_JOB_OBJECT, dataJobsHref, deriveDataJobPermissionGates, emptyDataJobFilters, listApiPath, parseDataJobsLocation, validateExportDetail, validateImportDetail, validatePreview, validateUploadIntent } from "./p08-data-jobs.ts";

const capabilities = { read: true, create: true, commit: true, cancel: true, download: true };
const summary = { row_count: 2, valid_row_count: 1, invalid_row_count: 1, committed_row_count: 0, failed_commit_row_count: 0 };
const baseImport = { id: "imp_example", object_key: DATA_JOB_OBJECT, status: "preview_ready", original_filename: "sample.csv", content_type: "text/csv", byte_size: 100, summary, created_at: "2026-08-03T10:00:00Z", previewed_at: "2026-08-03T10:01:00Z", preview_expires_at: "2026-08-10T10:01:00Z", expires_at: "2026-08-10T10:00:00Z", version: 2, request_id: "req-1", capabilities };
const baseExport = { id: "exp_example", object_key: DATA_JOB_OBJECT, status: "completed", formula_version: "foundation.sample.export.v1", requested_format: "csv", row_count: 2, byte_size: 180, sha256: "a".repeat(64), created_at: "2026-08-03T10:00:00Z", completed_at: "2026-08-03T10:02:00Z", expires_at: "2026-08-10T10:02:00Z", version: 3, request_id: "req-2", capabilities };

test("P08 canonical route owns exact view filters and detail identity", () => {
  const parsed = parseDataJobsLocation("/dashboard/data-jobs", "view=imports&objectKey=foundation.sample&status=preview_ready&importId=imp_example", Date.parse("2026-08-03T12:00:00Z"));
  assert.equal(parsed.kind, "valid");
  if (parsed.kind !== "valid") return;
  assert.equal(parsed.canonicalHref, "/dashboard/data-jobs?view=imports&objectKey=foundation.sample&status=preview_ready&importId=imp_example");
  assert.equal(parseDataJobsLocation("/dashboard/data-jobs", "view=imports&objectKey=category").kind, "invalid");
  assert.equal(parseDataJobsLocation("/dashboard/data-jobs", "view=imports&exportId=exp_example").kind, "invalid");
  assert.equal(parseDataJobsLocation("/dashboard/data-jobs", "view=imports&future=x").kind, "invalid");
  assert.match(listApiPath("imports", parsed.filters, "opaque"), /^\/dashboard\/data-jobs\/imports\?/);
  assert.doesNotMatch(listApiPath("imports", parsed.filters), /scope|dealer|location|contextRevision/i);
  assert.equal(dataJobsHref("/fr/dashboard/data-jobs", "exports", emptyDataJobFilters()), "/fr/dashboard/data-jobs?view=exports&objectKey=foundation.sample");
});

test("P08 exact DTOs reject future fields registries and inconsistent outcomes", () => {
  assert.equal(validateImportDetail({ data: baseImport }).data.status, "preview_ready");
  assert.equal(validateExportDetail({ data: baseExport }).data.formula_version, "foundation.sample.export.v1");
  assert.throws(() => validateImportDetail({ data: { ...baseImport, future: true } }));
  assert.throws(() => validateExportDetail({ data: { ...baseExport, object_key: "category" } }));
  assert.throws(() => validateExportDetail({ data: { ...baseExport, sha256: "ABC" } }));
  assert.throws(() => validateImportDetail({ data: { ...baseImport, summary: { ...summary, valid_row_count: 3 } } }));
});

test("P08 preview exposes only normalized safe row values and stable errors", () => {
  const result = validatePreview({ data: { id: "imp_example", status: "preview_ready", summary, version: 2, capabilities, rows: [{ row_number: 2, normalized: { external_key: "sample-1", label: "Sample 1", state: "active", quantity: 2 }, validation_status: "valid", validation_errors: [], commit_status: "pending", commit_errors: [] }, { row_number: 3, normalized: { external_key: "sample-2" }, validation_status: "invalid", validation_errors: [{ code: "FIELD_REQUIRED", field: "label" }], commit_status: "skipped", commit_errors: [] }] }, page: { limit: 50, next_cursor: null } });
  assert.equal(result.data.rows[1]?.validation_errors[0]?.code, "FIELD_REQUIRED");
  assert.throws(() => validatePreview({ data: { ...result.data, rows: [{ ...result.data.rows[0], normalized: { email: "hidden@example.invalid" } }] }, page: result.page }));
  assert.throws(() => validatePreview({ data: { ...result.data, rows: [{ ...result.data.rows[0], validation_errors: [{ code: "FUTURE" }] }] }, page: result.page }));
  assert.throws(() => validatePreview({ data: { ...result.data, rows: [{ ...result.data.rows[0], normalized: { quantity: 1_000_001 } }] }, page: result.page }));
  assert.throws(() => validatePreview({ data: { ...result.data, rows: [{ ...result.data.rows[0], normalized: { effective_date: "2026-99-99" } }] }, page: result.page }));
  const committed = validatePreview({ data: { ...result.data, status: "completed_with_errors", rows: [{ ...result.data.rows[0], commit_status: "failed", commit_errors: [{ code: "VERSION_CONFLICT", field: "external_key" }] }] }, page: result.page });
  assert.equal(committed.data.rows[0]?.commit_errors[0]?.field, "external_key");
});

test("P08 upload intent permits only relative canonical controlled PUT", () => {
  const valid = { data: { id: "imp_example", object_key: DATA_JOB_OBJECT, status: "awaiting_upload", upload: { method: "PUT", endpoint: "/dashboard/data-jobs/imports/imp_example/content", token: "opaque-token-1234567890", expires_at: "2026-08-03T12:05:00Z" }, version: 1 } };
  assert.equal(validateUploadIntent(valid).data.upload.method, "PUT");
  assert.throws(() => validateUploadIntent({ data: { ...valid.data, upload: { ...valid.data.upload, endpoint: "https://storage.invalid/file" } } }));
  assert.throws(() => validateUploadIntent({ data: { ...valid.data, upload: { ...valid.data.upload, method: "POST" } } }));
});

test("P08 derives six distinct permission gates without generic jobs shortcut", () => {
  const actions = Object.values({ importRead: "dashboard.import.foundation_sample.read", importCreate: "dashboard.import.foundation_sample.create", importCommit: "dashboard.import.foundation_sample.commit", exportRead: "dashboard.export.foundation_sample.read", exportCreate: "dashboard.export.foundation_sample.create", exportDownload: "dashboard.export.foundation_sample.download" }).map(permissionKey => ({ permissionKey, decision: "allow" }));
  assert.deepEqual(deriveDataJobPermissionGates(actions), { importRead: true, importCreate: true, importCommit: true, exportRead: true, exportCreate: true, exportDownload: true });
  assert.equal(deriveDataJobPermissionGates([{ permissionKey: "jobs.read", decision: "allow" }]).importRead, false);
});
