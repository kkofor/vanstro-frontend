import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPreviewCommitBinding, canonicalJson, hashCanonicalRequest,
  hashNormalizedPreviewRows, previewBindingFingerprint,
} from "./canonical.js";
import { csvBytes, parseFoundationSampleCsv } from "./csv-parser.js";
import { DataJobError } from "./errors.js";
import {
  collectFoundationSampleCsv, FOUNDATION_SAMPLE_EXPORT_COLUMNS, FOUNDATION_SAMPLE_EXPORT_FORMULA,
  neutralizeSpreadsheetString,
} from "./export-v1.js";
import {
  canTransitionExport, canTransitionImport, isExportStatus, isImportStatus,
} from "./lifecycle.js";
import {
  FOUNDATION_SAMPLE_OBJECT_KEY, listEnabledDataJobObjects, resolveDataJobObject,
} from "./registry.js";
import { calculateDataJobExpiry, isExpired } from "./retention.js";

async function expectCsvCode(csv: string | Uint8Array, code: string, limits?: Parameters<typeof parseFoundationSampleCsv>[1]) {
  const input = typeof csv === "string" ? csvBytes(csv, 3) : (async function* () { yield csv; })();
  await assert.rejects(() => parseFoundationSampleCsv(input, limits), (error: unknown) => {
    assert.ok(error instanceof DataJobError);
    assert.equal(error.code, code);
    assert.doesNotMatch(error.message, /secret|4111|person@/i);
    return true;
  });
}

const header = "external_key,label,state,quantity,effective_date,note";

test("registry enables only exact foundation.sample and fails closed", () => {
  assert.equal(resolveDataJobObject(FOUNDATION_SAMPLE_OBJECT_KEY, "import").schemaVersion, "foundation.sample.schema.v1");
  assert.equal(resolveDataJobObject(FOUNDATION_SAMPLE_OBJECT_KEY, "export").key, FOUNDATION_SAMPLE_OBJECT_KEY);
  assert.deepEqual(listEnabledDataJobObjects().map(({ key }) => key), [FOUNDATION_SAMPLE_OBJECT_KEY]);
  for (const key of ["category", "product_metadata", "media_metadata"]) {
    assert.throws(() => resolveDataJobObject(key, "import"), (error: unknown) => error instanceof DataJobError && error.code === "OBJECT_DISABLED");
  }
  for (const key of ["Foundation.Sample", "foundation_sample", "*", "order", "payment", "unknown"]) {
    assert.throws(() => resolveDataJobObject(key, "export"), (error: unknown) => error instanceof DataJobError && error.code === "OBJECT_NOT_SUPPORTED");
  }
});

test("streaming parser accepts BOM, chunk boundaries, quotes, CRLF and formula text inertly", async () => {
  const csv = `﻿ ${header.split(",").join(" , ")}\r\nkey-1,"Label, One",active,42,2026-08-03," =1+1"\r\n`;
  const preview = await parseFoundationSampleCsv(csvBytes(csv, 1));
  assert.equal(preview.rowCount, 1);
  assert.equal(preview.validRowCount, 1);
  assert.deepEqual(preview.headers, FOUNDATION_SAMPLE_EXPORT_COLUMNS);
  assert.deepEqual(preview.rows[0]?.normalizedPayload, {
    external_key: "key-1", label: "Label, One", state: "active", quantity: 42,
    effective_date: "2026-08-03", note: "=1+1",
  });
  assert.equal(preview.rows[0]?.rowNumber, 2);
});

test("header-only CSV previews with zero rows", async () => {
  const preview = await parseFoundationSampleCsv(csvBytes(`${header}\n`, 2));
  assert.deepEqual({ rows: preview.rowCount, valid: preview.validRowCount, invalid: preview.invalidRowCount }, { rows: 0, valid: 0, invalid: 0 });
});

test("parser rejects empty, malformed, duplicate, missing, unknown and aliases", async () => {
  await expectCsvCode("", "CSV_MALFORMED");
  await expectCsvCode(`${header}\n"unterminated`, "CSV_MALFORMED");
  await expectCsvCode(`${header}\na,"b"tail,active,1,,`, "CSV_MALFORMED");
  await expectCsvCode("external_key,label,state,quantity,note,note", "CSV_DUPLICATE_HEADER");
  await expectCsvCode("external_key,label,state,note", "CSV_MISSING_HEADER");
  await expectCsvCode(`${header},extra`, "CSV_UNKNOWN_HEADER");
  await expectCsvCode(`${header},External Key`, "CSV_UNKNOWN_HEADER");
  await expectCsvCode(`${header}\na,b,active,1`, "CSV_MALFORMED");
});

test("parser rejects prohibited order, payment, credential, PII and identity headers case-insensitively", async () => {
  for (const prohibited of [
    "order", "ORDER_ID", "payment", "Payment-ID", "card_number", "cvv", "email", "phone",
    "first_name", "last_name", "full_name", "address", "ssn", "sin", "passport_number",
    "government_id", "national_id", "tax_id", "driver_licence",
  ]) await expectCsvCode(`${header},${prohibited}`, "CSV_PROHIBITED_HEADER");
  await expectCsvCode(`${header},‮email`, "CSV_PROHIBITED_HEADER");
});

test("parser rejects invalid encoding, NUL and disallowed controls", async () => {
  await expectCsvCode(new Uint8Array([0xff, 0xfe]), "CSV_INVALID_ENCODING");
  await expectCsvCode(`${header}\na,b,active,1,,x\0y`, "CSV_MALFORMED");
  await expectCsvCode(`${header}\na,b,active,1,,xy`, "CSV_MALFORMED");
});

test("parser enforces byte, row, field and bounded error limits", async () => {
  const limits = { maxBytes: 8, maxRows: 1, maxFieldBytes: 4, maxErrorsPerRow: 2 };
  await expectCsvCode(header, "CSV_BYTE_LIMIT_EXCEEDED", { ...limits, maxFieldBytes: 100 });
  await expectCsvCode(`${header}\na,b,active,1,,\nc,d,inactive,2,,`, "CSV_ROW_LIMIT_EXCEEDED", { ...limits, maxBytes: 1_000, maxFieldBytes: 100 });
  await expectCsvCode(`${header}\nabcde,b,active,1,,`, "CSV_MALFORMED", { ...limits, maxBytes: 1_000 });
  const preview = await parseFoundationSampleCsv(csvBytes(`${header}\n,,,bad,2026-99-99,${"x".repeat(501)}`), { maxBytes: 10_000, maxRows: 2, maxFieldBytes: 1_000, maxErrorsPerRow: 2 });
  assert.equal(preview.rows[0]?.validationErrors.length, 2);
});

test("all foundation.sample field validators and mixed outcomes are deterministic", async () => {
  const csv = [header,
    "good,Good,active,0,2024-02-29,ok",
    ",,ACTIVE,-1,2023-02-29,x",
    `${"k".repeat(65)},${"l".repeat(121)},inactive,1000001,,${"n".repeat(501)}`,
    "max,Max,inactive,1000000,,",
    "comma,Comma,active,1,0000-01-01,",
    "leading,Leading,active,01,,",
  ].join("\n");
  const result = await parseFoundationSampleCsv(csvBytes(csv, 7));
  assert.deepEqual([result.rowCount, result.validRowCount, result.invalidRowCount], [6, 2, 4]);
  assert.deepEqual(result.rows[1]?.validationErrors.map(({ code, field }) => `${field}:${code}`), [
    "external_key:FIELD_REQUIRED", "label:FIELD_REQUIRED", "state:FIELD_INVALID_ENUM",
    "quantity:FIELD_INVALID_TYPE", "effective_date:FIELD_INVALID_TYPE",
  ]);
  assert.deepEqual(result.rows[2]?.validationErrors.map(({ code, field }) => `${field}:${code}`), [
    "external_key:FIELD_TOO_LONG", "label:FIELD_TOO_LONG", "note:FIELD_TOO_LONG", "quantity:FIELD_OUT_OF_RANGE",
  ]);
});

test("request and preview hashes are canonical, versioned and content-sensitive", () => {
  assert.equal(canonicalJson({ b: 2, a: [true, null] }), '{"a":[true,null],"b":2}');
  assert.equal(hashCanonicalRequest({ b: 2, a: 1 }), hashCanonicalRequest({ a: 1, b: 2 }));
  assert.notEqual(hashCanonicalRequest({ a: 1 }), hashCanonicalRequest({ a: 2 }));
  assert.notEqual(hashCanonicalRequest({ a: 1 }), hashNormalizedPreviewRows([]));
  const rows = [{ rowNumber: 2, normalizedPayload: { label: "x", external_key: "k" }, validationStatus: "valid" as const, validationErrors: [] }];
  assert.equal(hashNormalizedPreviewRows(rows), hashNormalizedPreviewRows([{ ...rows[0], normalizedPayload: { external_key: "k", label: "x" } }]));
  assert.notEqual(hashNormalizedPreviewRows(rows), hashNormalizedPreviewRows([{ ...rows[0], rowNumber: 3 }]));
  assert.throws(() => canonicalJson(Number.NaN));
  assert.throws(() => canonicalJson(BigInt(1)));
});

test("preview binding canonicalizes exact scope and field visibility without a nonce", () => {
  const binding = {
    sourceArtifactId: "artifact-1", sourceSha256: "a".repeat(64), registryVersion: "r1", schemaVersion: "s1",
    parserVersion: "p1", securityPolicyVersion: "sp1", normalizedRowsSha256: "b".repeat(64), objectKey: "foundation.sample",
    actorId: "actor-1", authorizationScopeKind: "dealer", dealerIds: ["d2", "d1", "d1"], locationIds: ["l1"],
    contextRevision: "revision-1", scopeFingerprint: "c".repeat(64), fieldVisibilityFingerprint: "e".repeat(64),
    previewCreatedAt: new Date("2026-08-03T00:00:00Z"), previewExpiresAt: new Date("2026-08-10T00:00:00Z"),
  };
  assert.equal(previewBindingFingerprint(binding), previewBindingFingerprint({ ...binding, dealerIds: ["d1", "d2"] }));
  assert.notEqual(previewBindingFingerprint(binding), previewBindingFingerprint({ ...binding, actorId: "actor-2" }));
  const { previewCreatedAt: _created, previewExpiresAt: _expires, ...expected } = binding;
  assert.doesNotThrow(() => assertPreviewCommitBinding(binding, { ...expected, dealerIds: ["d1", "d2"] }, new Date("2026-08-04T00:00:00Z")));
  for (const stale of [
    { ...binding, sourceSha256: "d".repeat(64) },
    { ...binding, parserVersion: "p2" },
    { ...binding, actorId: "actor-2" },
    { ...binding, contextRevision: "revision-2" },
    { ...binding, scopeFingerprint: "d".repeat(64) },
    { ...binding, fieldVisibilityFingerprint: "f".repeat(64) },
  ]) assert.throws(() => assertPreviewCommitBinding(stale, expected, new Date("2026-08-04T00:00:00Z")), (error: unknown) => error instanceof DataJobError && error.code === "IMPORT_PREVIEW_STALE");
  assert.throws(() => assertPreviewCommitBinding(binding, expected, binding.previewExpiresAt), (error: unknown) => error instanceof DataJobError && error.code === "IMPORT_EXPIRED");
});

test("export v1 uses exact columns, CRLF, quoting, neutralization and final-byte hash", async () => {
  assert.equal(FOUNDATION_SAMPLE_EXPORT_FORMULA, "foundation.sample.export.v1");
  assert.deepEqual(FOUNDATION_SAMPLE_EXPORT_COLUMNS, ["external_key", "label", "state", "quantity", "effective_date", "note"]);
  for (const dangerous of ["=1+1", "+cmd", "-2+3", "@sum", " \t=1", " +1", "​@x"]) {
    assert.equal(neutralizeSpreadsheetString(dangerous), `'${dangerous}`);
  }
  assert.equal(neutralizeSpreadsheetString("'=1+1"), "'=1+1");
  assert.equal(neutralizeSpreadsheetString("safe"), "safe");
  const output = await collectFoundationSampleCsv([{
    external_key: "=key", label: "Label, \"quoted\"", state: "active", quantity: 1_000_000,
    effective_date: null, note: "line1\nline2",
  }]);
  const text = new TextDecoder().decode(output.bytes);
  assert.equal(text, `${header}\r\n'=key,"Label, ""quoted""",active,1000000,,"line1\nline2"\r\n`);
  assert.equal(output.byteSize, output.bytes.byteLength);
  assert.match(output.sha256, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(text, /sep=|HYPERLINK|https?:/i);
  await assert.rejects(() => collectFoundationSampleCsv([{ external_key: "x", label: "x", state: "active", quantity: -1, effective_date: null, note: null }]));
});

test("status validators reject unknowns and transitions are terminal-safe", () => {
  assert.equal(isImportStatus("preview_ready"), true);
  assert.equal(isImportStatus("unknown"), false);
  assert.equal(isExportStatus("running"), true);
  assert.equal(isExportStatus("done"), false);
  assert.equal(canTransitionImport("uploaded", "parsing"), true);
  assert.equal(canTransitionImport("preview_ready", "commit_queued"), true);
  assert.equal(canTransitionImport("completed", "parsing"), false);
  assert.equal(canTransitionImport("cancelled", "uploaded"), false);
  assert.equal(canTransitionExport("queued", "running"), true);
  assert.equal(canTransitionExport("completed", "expired"), true);
  assert.equal(canTransitionExport("failed", "running"), false);
});

test("retention defaults to seven days and expiry is inclusive", () => {
  const start = new Date("2026-08-03T12:00:00.000Z");
  const expiry = calculateDataJobExpiry(start);
  assert.equal(expiry.toISOString(), "2026-08-10T12:00:00.000Z");
  assert.equal(isExpired(expiry, new Date(expiry.getTime() - 1)), false);
  assert.equal(isExpired(expiry, expiry), true);
  assert.throws(() => calculateDataJobExpiry(start, 0));
  assert.throws(() => calculateDataJobExpiry(start, Number.MAX_VALUE));
});
