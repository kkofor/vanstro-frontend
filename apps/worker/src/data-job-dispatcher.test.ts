import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { dispatchP08Jobs, FOUNDATION_SAMPLE_EXPORT_FORMULA, neutralizeFoundationSampleCell, renderFoundationSampleExport, type P08Claim, type P08JobPort, type P08JobType } from "./data-job-dispatcher.js";

function harness(claim: P08Claim, overrides: Record<string, unknown> = {}) {
  const events: Array<[string, unknown]> = [], files = new Map<string, Buffer>(), fixture = new Map<string, unknown>();
  let claimed = false, token = claim.lease.fencingToken, version = claim.lease.version;
  const jobs: P08JobPort = {
    async recover() { events.push(["recover", null]); },
    async claim(type) { if (claimed || type !== claim.type) return null; claimed = true; return claim; },
    async checkpoint(lease, progress) { if (lease.fencingToken !== token || lease.version !== version) throw new Error("JOB_LEASE_LOST"); events.push(["progress", progress]); version += 1; return { lease: { ...lease, version }, cancelled: Boolean(overrides.cancelAt && events.filter((e) => e[0] === "progress").length === overrides.cancelAt) }; },
    async complete(lease, result) { if (lease.fencingToken !== token || lease.version !== version) throw new Error("JOB_LEASE_LOST"); if (events.some((e) => e[0] === "complete")) throw new Error("JOB_STATE_CONFLICT"); events.push(["complete", result]); },
    async fail(_lease, failure) { events.push(["fail", failure]); },
  };
  const store = {
    async source() { return overrides.missing ? null : { key: "p08/source.csv", checksum: createHash("sha256").update(files.get("p08/source.csv")!).digest("hex") }; },
    async persistPreview(input: unknown) { events.push(["preview", input]); },
    async commitRows(input: { checkpoint(current: number, total: number): Promise<void> }): Promise<{ committed: number; failed: number; skipped: number }> { await input.checkpoint(1, 2); await input.checkpoint(2, 2); return (overrides.commitOutcome as { committed: number; failed: number; skipped: number } | undefined) ?? { committed: 1, failed: 1, skipped: 1 }; },
    async *exportRows() { yield { external_key: "k1", label: " =SUM(A1)", state: "active" as const, quantity: 7, effective_date: "2026-08-03", note: "x,y" }; },
    async publishExport(input: { fencingToken: number }) { if (overrides.stalePublish) { token += 1; throw new Error("JOB_LEASE_LOST"); } events.push(["publish", input]); },
    async expiryTarget() { return { key: "p08/expired.csv" }; },
    async markExpired(input: unknown) { events.push(["expired", input]); },
    async indexAttention(input: unknown) { events.push(["attention", input]); },
  };
  const storage = {
    async read(key: string) { const value = files.get(key); if (!value) throw Object.assign(new Error("missing"), { code: "ENOENT" }); return value; },
    async put(key: string, data: Buffer) { files.set(key, data); return { bytes: data.length, checksum: createHash("sha256").update(data).digest("hex") }; },
    async delete(key: string) { files.delete(key); events.push(["delete", key]); },
  };
  files.set("p08/source.csv", Buffer.from("external_key,label,state,quantity,effective_date,note\r\nk1,L,active,1,,\r\n"));
  files.set("p08/expired.csv", Buffer.from("old"));
  const parser = { async *parse() { yield { rowNumber: 2, row: { external_key: "k1", label: "L", state: "active" as const, quantity: 1, effective_date: null, note: null }, errorCodes: [] }; yield { rowNumber: 3, errorCodes: ["ROW_INVALID"] }; } };
  return { jobs, store, storage, parser, events, files, fixture };
}
function claim(type: P08JobType, payload: Record<string, unknown>): P08Claim { return { type, lease: { jobId: "job", owner: "worker", fencingToken: 3, version: 1 }, payload }; }

const expected = Buffer.from("external_key,label,state,quantity,effective_date,note\r\nk1,' =SUM(A1),active,7,2026-08-03,\"x,y\"\r\n");
test("P08 export formula produces exact neutralized bytes and hash", async () => {
  const rendered = await renderFoundationSampleExport([{ external_key: "k1", label: " =SUM(A1)", state: "active", quantity: 7, effective_date: "2026-08-03", note: "x,y" }]);
  assert.deepEqual(rendered.bytes, expected);
  assert.equal(rendered.checksum, createHash("sha256").update(expected).digest("hex"));
  assert.equal(neutralizeFoundationSampleCell("'=x"), "'=x");
});

test("P08 dispatcher is test-runtime only", async () => {
  const h = harness(claim("dashboard.import.parse", {}));
  assert.deepEqual(await dispatchP08Jobs({ runtimeMode: "deployment", workerId: "w", ...h }), { claimed: 0, ready: false });
  assert.equal(h.events.length, 0);
});

test("P08 parses source and persists partial preview", async () => {
  const h = harness(claim("dashboard.import.parse", { importId: "i", artifactId: "a", expectedVersion: 1 }));
  const result = await dispatchP08Jobs({ runtimeMode: "test", workerId: "w", ...h });
  assert.equal(result.completed, true); assert.equal(h.events.some((e) => e[0] === "preview"), true);
  assert.deepEqual((h.events.find((e) => e[0] === "complete")![1] as object), { rows: 2, invalid: 1 });
});

test("P08 commits valid rows with durable partial outcome checkpoints", async () => {
  const h = harness(claim("dashboard.import.commit", { importId: "i", expectedVersion: 2, commitMode: "valid_rows", totalRows: 2 }));
  await dispatchP08Jobs({ runtimeMode: "test", workerId: "w", ...h });
  assert.deepEqual(h.events.find((e) => e[0] === "complete")![1], { committed: 1, failed: 1, skipped: 1, partial: true });
});

test("P08 export publishes exact artifact once", async () => {
  const h = harness(claim("dashboard.export.generate", { exportId: "e", expectedVersion: 4, totalRows: 1, formulaVersion: FOUNDATION_SAMPLE_EXPORT_FORMULA }));
  await dispatchP08Jobs({ runtimeMode: "test", workerId: "w", ...h });
  const published = h.events.find((e) => e[0] === "publish")![1] as { checksum: string; bytes: number };
  assert.equal(published.checksum, createHash("sha256").update(expected).digest("hex")); assert.equal(published.bytes, expected.length);
  assert.equal(h.events.filter((e) => e[0] === "complete").length, 1);
});

test("P08 cancellation checkpoint prevents commit and completion", async () => {
  const h = harness(claim("dashboard.import.commit", { importId: "i", expectedVersion: 2, commitMode: "valid_rows", totalRows: 2 }), { cancelAt: 1 });
  const result = await dispatchP08Jobs({ runtimeMode: "test", workerId: "w", ...h });
  assert.equal(result.cancelled, true); assert.equal(h.events.some((e) => e[0] === "complete"), false);
});

test("P08 stale export fence cleans unpublished bytes and cannot complete", async () => {
  const h = harness(claim("dashboard.export.generate", { exportId: "e", expectedVersion: 4, totalRows: 1, formulaVersion: FOUNDATION_SAMPLE_EXPORT_FORMULA }), { stalePublish: true });
  const result = await dispatchP08Jobs({ runtimeMode: "test", workerId: "w", ...h });
  assert.equal(result.failed, true); assert.equal(h.events.some((e) => e[0] === "delete"), true); assert.equal(h.events.some((e) => e[0] === "complete"), false);
});

test("P08 missing source artifact is permanent and non-retryable", async () => {
  const h = harness(claim("dashboard.import.parse", { importId: "i", artifactId: "a", expectedVersion: 1 }), { missing: true });
  const result = await dispatchP08Jobs({ runtimeMode: "test", workerId: "w", ...h });
  assert.equal(result.code, "SOURCE_ARTIFACT_MISSING"); assert.deepEqual(h.events.find((e) => e[0] === "fail")![1], { failureClass: "permanent", code: "SOURCE_ARTIFACT_MISSING", retryable: false });
});

test("P08 expiry tolerates missing bytes and completes once", async () => {
  const h = harness(claim("dashboard.artifact.expire", { artifactId: "a", expectedRetentionState: "available" }));
  h.files.delete("p08/expired.csv");
  await dispatchP08Jobs({ runtimeMode: "test", workerId: "w", ...h });
  assert.equal(h.events.filter((e) => e[0] === "expired").length, 1); assert.equal(h.events.filter((e) => e[0] === "complete").length, 1);
});
