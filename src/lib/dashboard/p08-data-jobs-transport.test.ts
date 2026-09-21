import assert from "node:assert/strict";
import test from "node:test";
import { authorizeDataJobOperation, executeDataJobOperation } from "./p08-data-jobs-transport.ts";
import type { DataJobPermissionGates, ExportRequest, ImportBatch, ImportUploadIntent } from "./p08-data-jobs.ts";

const actorKey = "actor:revision", gates: DataJobPermissionGates = { importRead: true, importCreate: true, importCommit: true, exportRead: true, exportCreate: true, exportDownload: true };
const capabilities = { read: true, create: true, commit: true, cancel: true, download: true };
const resource: ImportBatch = { id: "imp_example", object_key: "foundation.sample", status: "preview_ready", original_filename: "sample.csv", content_type: "text/csv", byte_size: 10, summary: { row_count: 2, valid_row_count: 1, invalid_row_count: 1, committed_row_count: 0, failed_commit_row_count: 0 }, created_at: "2026-08-03T10:00:00Z", previewed_at: "2026-08-03T10:01:00Z", preview_expires_at: "2026-08-10T10:00:00Z", expires_at: "2026-08-10T10:00:00Z", version: 2, request_id: "req", capabilities };
const exported: ExportRequest = { id: "exp_example", object_key: "foundation.sample", status: "completed", formula_version: "foundation.sample.export.v1", requested_format: "csv", row_count: 2, byte_size: 180, sha256: "a".repeat(64), created_at: "2026-08-03T10:00:00Z", completed_at: "2026-08-03T10:01:00Z", expires_at: "2099-08-10T10:00:00Z", version: 3, request_id: "req", capabilities };
const intent: ImportUploadIntent = { id: "imp_example", object_key: "foundation.sample", status: "awaiting_upload", upload: { method: "PUT", endpoint: "/dashboard/data-jobs/imports/imp_example/content", token: "opaque-token-1234567890", expires_at: "2026-08-03T12:00:00Z" }, version: 1 };
const shared = { actorKey, expectedActorKey: actorKey };

test("P08 constructs exact operation-aware canonical routes and DTOs", () => {
  const create = authorizeDataJobOperation({ ...shared, kind: "createImport", filename: "sample.csv", byteSize: 10, contentType: "text/csv", idempotencyKey: "import-key-1" }, gates);
  assert.equal(create.path, "/dashboard/data-jobs/imports"); assert.equal(create.init.method, "POST"); assert.deepEqual(JSON.parse(String(create.init.body)), { object_key: "foundation.sample", filename: "sample.csv", content_type: "text/csv", byte_size: 10 });
  const commit = authorizeDataJobOperation({ ...shared, kind: "commitImport", resource, importId: resource.id, capabilities, expectedVersion: 2, confirmation: { validRows: 1, invalidRows: 1, acknowledgedPartialOutcome: true }, idempotencyKey: "commit-key-1" }, gates);
  assert.equal(commit.path, "/dashboard/data-jobs/imports/imp_example/commit"); assert.deepEqual(JSON.parse(String(commit.init.body)), { mode: "valid_rows", expected_version: 2 });
  const exportCreate = authorizeDataJobOperation({ ...shared, kind: "createExport", sort: "external_key:asc", idempotencyKey: "export-key-1" }, gates);
  assert.equal(exportCreate.path, "/dashboard/data-jobs/exports"); assert.deepEqual(JSON.parse(String(exportCreate.init.body)), { object_key: "foundation.sample", format: "csv", query: { filters: [], sort: ["external_key:asc"] } });
});

test("P08 controlled bytes reject caller URL method redirects and identity mismatch", () => {
  const upload = authorizeDataJobOperation({ ...shared, kind: "uploadContent", intent, importId: intent.id, file: new Blob(["a"], { type: "text/csv" }), expectedVersion: intent.version, idempotencyKey: "upload-key-1" }, gates);
  assert.equal(upload.path, intent.upload.endpoint); assert.equal(upload.init.method, "PUT"); assert.equal(upload.init.redirect, "error");
  const download = authorizeDataJobOperation({ ...shared, kind: "downloadExport", resource: exported, exportId: exported.id, capabilities }, gates);
  assert.equal(download.path, "/dashboard/data-jobs/exports/exp_example/download"); assert.equal(download.init.method, "GET"); assert.equal(download.init.redirect, "error"); assert.equal(download.response, "bytes");
  assert.throws(() => authorizeDataJobOperation({ ...shared, expectedActorKey: "other", kind: "downloadExport", resource: exported, exportId: exported.id, capabilities }, gates));
  assert.throws(() => authorizeDataJobOperation({ ...shared, kind: "uploadContent", intent: { ...intent, upload: { ...intent.upload, endpoint: "https://storage.invalid/file" } }, importId: intent.id, file: new Blob(["a"], { type: "text/csv" }), expectedVersion: intent.version, idempotencyKey: "upload-key-1" }, gates));
});

test("P08 applies top-level plus resource capability double gates", () => {
  assert.throws(() => authorizeDataJobOperation({ ...shared, kind: "commitImport", resource, importId: resource.id, capabilities, expectedVersion: 2, confirmation: { validRows: 1, invalidRows: 1, acknowledgedPartialOutcome: true }, idempotencyKey: "commit-key-1" }, { ...gates, importCommit: false }));
  const denied = { ...capabilities, commit: false }, deniedResource = { ...resource, capabilities: denied };
  assert.throws(() => authorizeDataJobOperation({ ...shared, kind: "commitImport", resource: deniedResource, importId: resource.id, capabilities: denied, expectedVersion: 2, confirmation: { validRows: 1, invalidRows: 1, acknowledgedPartialOutcome: true }, idempotencyKey: "commit-key-1" }, gates));
  assert.throws(() => authorizeDataJobOperation({ ...shared, kind: "commitImport", resource, importId: resource.id, capabilities, expectedVersion: 2, confirmation: { validRows: 2, invalidRows: 0, acknowledgedPartialOutcome: true }, idempotencyKey: "commit-key-1" }, gates));
});

test("P08 exposes only frozen status-bound cancellation", () => {
  const queued = { ...resource, status: "commit_queued" as const };
  assert.equal(authorizeDataJobOperation({ ...shared, kind: "cancelImport", resource: queued, importId: queued.id, capabilities, expectedVersion: 2, idempotencyKey: "cancel-key-1" }, gates).path, "/dashboard/data-jobs/imports/imp_example/cancel");
  assert.throws(() => authorizeDataJobOperation({ ...shared, kind: "cancelImport", resource, importId: resource.id, capabilities, expectedVersion: 2, idempotencyKey: "cancel-key-1" }, gates));
});

test("P08 fences every response after await and body consumption", async () => {
  let current = actorKey;
  const operation = { ...shared, kind: "downloadExport" as const, resource: exported, exportId: exported.id, capabilities };
  await assert.rejects(executeDataJobOperation(operation, gates, async () => { current = "actor-b:revision"; return new Response("csv"); }, () => undefined, () => current), { name: "AbortError" });
  current = actorKey;
  const response = new Response("csv"), originalBlob = response.blob.bind(response);
  response.blob = async () => { const blob = await originalBlob(); current = "actor-b:revision"; return blob; };
  await assert.rejects(executeDataJobOperation(operation, gates, async () => response, () => undefined, () => current), { name: "AbortError" });
});
