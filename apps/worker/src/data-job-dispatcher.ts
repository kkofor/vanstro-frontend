import { createHash, randomUUID } from "node:crypto";
import { PrivateFilesystemMediaStorage } from "@vanstro/db";

export const P08_JOB_TYPES = [
  "dashboard.import.parse",
  "dashboard.import.commit",
  "dashboard.export.generate",
  "dashboard.artifact.expire",
] as const;
export type P08JobType = (typeof P08_JOB_TYPES)[number];
export const FOUNDATION_SAMPLE_EXPORT_FORMULA = "foundation.sample.export.v1" as const;
export const FOUNDATION_SAMPLE_COLUMNS = ["external_key", "label", "state", "quantity", "effective_date", "note"] as const;

export type FoundationSampleRow = {
  external_key: string;
  label: string;
  state: "active" | "inactive";
  quantity: number;
  effective_date: string | null;
  note: string | null;
};
export type P08Lease = { jobId: string; owner: string; fencingToken: number; version: number };
export type P08Claim = { type: P08JobType; lease: P08Lease; payload: Record<string, unknown> };
export type P08Progress = { stage: "parse" | "commit" | "export" | "expire"; current: number; total: number };
export type ParsedFoundationSample = { rowNumber: number; row?: FoundationSampleRow; errorCodes: string[] };

export interface P08JobPort {
  recover(): Promise<void>;
  claim(type: P08JobType): Promise<P08Claim | null>;
  checkpoint(lease: P08Lease, progress: P08Progress): Promise<{ lease: P08Lease; cancelled: boolean }>;
  complete(lease: P08Lease, result: Record<string, string | number | boolean>): Promise<void>;
  fail(lease: P08Lease, failure: { failureClass: "validation" | "permanent" | "internal"; code: string; retryable: boolean }): Promise<void>;
}

export interface P08FoundationStore {
  source(importId: string, artifactId: string, expectedVersion: number): Promise<{ key: string; checksum: string } | null>;
  persistPreview(input: { importId: string; expectedVersion: number; fencingToken: number; sourceChecksum: string; rows: ParsedFoundationSample[] }): Promise<void>;
  commitRows(input: { importId: string; expectedVersion: number; fencingToken: number; mode: "valid_rows"; checkpoint: (current: number, total: number) => Promise<void> }): Promise<{ committed: number; failed: number; skipped: number }>;
  exportRows(input: { exportId: string; expectedVersion: number; fencingToken: number; formulaVersion: typeof FOUNDATION_SAMPLE_EXPORT_FORMULA }): AsyncIterable<FoundationSampleRow>;
  publishExport(input: { exportId: string; expectedVersion: number; fencingToken: number; key: string; bytes: number; checksum: string; rowCount: number }): Promise<void>;
  expiryTarget(input: { artifactId: string; expectedRetentionState: string; fencingToken: number }): Promise<{ key: string } | null>;
  markExpired(input: { artifactId: string; expectedRetentionState: string; fencingToken: number }): Promise<void>;
  indexAttention?(input: { jobId: string; jobType: P08JobType; safeCode: string; fencingToken: number }): Promise<void>;
}

export interface P08Parser {
  parse(bytes: Uint8Array): AsyncIterable<ParsedFoundationSample>;
}

export interface P08Storage {
  read(key: string): Promise<Buffer>;
  put(key: string, data: Buffer, expectedBytes: number): Promise<{ bytes: number; checksum: string }>;
  delete(key: string): Promise<void>;
}

const dangerousPrefix = /^[\p{White_Space}\p{Cf}\x00-\x1f\x7f]*[=+\-@]/u;
export function neutralizeFoundationSampleCell(value: string): string {
  const normalized = value.normalize("NFC").replace(/\r\n?|\n/g, "\n");
  return dangerousPrefix.test(normalized) ? `'${normalized}` : normalized;
}
function csvCell(value: string): string {
  const safe = neutralizeFoundationSampleCell(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
function exportLine(row: FoundationSampleRow): string {
  if (!Number.isSafeInteger(row.quantity) || row.quantity < 0 || row.quantity > 1_000_000) throw new Error("EXPORT_ROW_INVALID");
  return [row.external_key, row.label, row.state, String(row.quantity), row.effective_date ?? "", row.note ?? ""].map(csvCell).join(",");
}
export async function renderFoundationSampleExport(rows: AsyncIterable<FoundationSampleRow> | Iterable<FoundationSampleRow>) {
  const chunks = [Buffer.from(`${FOUNDATION_SAMPLE_COLUMNS.join(",")}\r\n`, "utf8")];
  let rowCount = 0;
  for await (const row of rows) { chunks.push(Buffer.from(`${exportLine(row)}\r\n`, "utf8")); rowCount += 1; }
  const bytes = Buffer.concat(chunks);
  return { bytes, rowCount, checksum: createHash("sha256").update(bytes).digest("hex") };
}

function text(value: unknown, name: string) { if (typeof value !== "string" || !value) throw new Error(`P08_${name}_INVALID`); return value; }
function integer(value: unknown, name: string) { if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error(`P08_${name}_INVALID`); return Number(value); }

async function checkpoint(port: P08JobPort, lease: P08Lease, progress: P08Progress) {
  const result = await port.checkpoint(lease, progress);
  if (result.cancelled) throw Object.assign(new Error("P08_CANCELLED"), { cancelled: true });
  return result.lease;
}

export async function dispatchP08Jobs(input: { runtimeMode: string; workerId: string; jobs: P08JobPort; store: P08FoundationStore; parser: P08Parser; storage: P08Storage }) {
  if (input.runtimeMode !== "test") return { claimed: 0, ready: false } as const;
  await input.jobs.recover();
  for (const type of P08_JOB_TYPES) {
    const claim = await input.jobs.claim(type);
    if (!claim) continue;
    let lease = claim.lease;
    try {
      if (type === "dashboard.import.parse") {
        const importId = text(claim.payload.importId, "IMPORT_ID"), artifactId = text(claim.payload.artifactId, "ARTIFACT_ID"), expectedVersion = integer(claim.payload.expectedVersion, "VERSION");
        const source = await input.store.source(importId, artifactId, expectedVersion);
        if (!source) throw new Error("SOURCE_ARTIFACT_MISSING");
        const bytes = await input.storage.read(source.key).catch(() => { throw new Error("SOURCE_ARTIFACT_MISSING"); });
        if (createHash("sha256").update(bytes).digest("hex") !== source.checksum) throw new Error("SOURCE_ARTIFACT_MISSING");
        lease = await checkpoint(input.jobs, lease, { stage: "parse", current: 0, total: bytes.length });
        const rows: ParsedFoundationSample[] = [];
        for await (const row of input.parser.parse(bytes)) {
          rows.push(row);
          lease = await checkpoint(input.jobs, lease, { stage: "parse", current: Math.min(bytes.length, rows.length), total: bytes.length });
        }
        await input.store.persistPreview({ importId, expectedVersion, fencingToken: lease.fencingToken, sourceChecksum: source.checksum, rows });
        await input.jobs.complete(lease, { rows: rows.length, invalid: rows.filter((row) => row.errorCodes.length > 0).length });
      } else if (type === "dashboard.import.commit") {
        const importId = text(claim.payload.importId, "IMPORT_ID"), expectedVersion = integer(claim.payload.expectedVersion, "VERSION");
        if (claim.payload.commitMode !== "valid_rows") throw new Error("IMPORT_COMMIT_MODE_INVALID");
        lease = await checkpoint(input.jobs, lease, { stage: "commit", current: 0, total: integer(claim.payload.totalRows, "TOTAL_ROWS") });
        const outcome = await input.store.commitRows({ importId, expectedVersion, fencingToken: lease.fencingToken, mode: "valid_rows", checkpoint: async (current, total) => { lease = await checkpoint(input.jobs, lease, { stage: "commit", current, total }); } });
        await input.jobs.complete(lease, { committed: outcome.committed, failed: outcome.failed, skipped: outcome.skipped, partial: outcome.committed > 0 && outcome.failed > 0 });
      } else if (type === "dashboard.export.generate") {
        const exportId = text(claim.payload.exportId, "EXPORT_ID"), expectedVersion = integer(claim.payload.expectedVersion, "VERSION");
        if (claim.payload.formulaVersion !== FOUNDATION_SAMPLE_EXPORT_FORMULA) throw new Error("EXPORT_FORMULA_UNSUPPORTED");
        lease = await checkpoint(input.jobs, lease, { stage: "export", current: 0, total: integer(claim.payload.totalRows, "TOTAL_ROWS") });
        const rendered = await renderFoundationSampleExport(input.store.exportRows({ exportId, expectedVersion, fencingToken: lease.fencingToken, formulaVersion: FOUNDATION_SAMPLE_EXPORT_FORMULA }));
        lease = await checkpoint(input.jobs, lease, { stage: "export", current: rendered.rowCount, total: integer(claim.payload.totalRows, "TOTAL_ROWS") });
        const key = `p08/exports/${exportId}/${lease.fencingToken}-${randomUUID()}.csv`;
        const written = await input.storage.put(key, rendered.bytes, rendered.bytes.length);
        if (written.checksum !== rendered.checksum || written.bytes !== rendered.bytes.length) throw new Error("EXPORT_ARTIFACT_WRITE_FAILED");
        try { await input.store.publishExport({ exportId, expectedVersion, fencingToken: lease.fencingToken, key, bytes: written.bytes, checksum: written.checksum, rowCount: rendered.rowCount }); }
        catch (error) { await input.storage.delete(key).catch(() => undefined); throw error; }
        await input.jobs.complete(lease, { rows: rendered.rowCount, bytes: rendered.bytes.length, checksum: rendered.checksum, formulaVersion: FOUNDATION_SAMPLE_EXPORT_FORMULA });
      } else {
        const artifactId = text(claim.payload.artifactId, "ARTIFACT_ID"), expectedRetentionState = text(claim.payload.expectedRetentionState, "RETENTION_STATE");
        lease = await checkpoint(input.jobs, lease, { stage: "expire", current: 0, total: 1 });
        const target = await input.store.expiryTarget({ artifactId, expectedRetentionState, fencingToken: lease.fencingToken });
        if (target) await input.storage.delete(target.key).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
        await input.store.markExpired({ artifactId, expectedRetentionState, fencingToken: lease.fencingToken });
        lease = await checkpoint(input.jobs, lease, { stage: "expire", current: 1, total: 1 });
        await input.jobs.complete(lease, { expired: true });
      }
      return { claimed: 1, completed: true, type } as const;
    } catch (error) {
      if ((error as { cancelled?: boolean }).cancelled) return { claimed: 1, cancelled: true, type } as const;
      const code = error instanceof Error ? error.message : "P08_WORKER_FAILED";
      const validation = /INVALID|UNSUPPORTED/.test(code);
      if (input.store.indexAttention && code !== "P08_CANCELLED") await input.store.indexAttention({ jobId: lease.jobId, jobType: type, safeCode: code, fencingToken: lease.fencingToken }).catch(() => undefined);
      await input.jobs.fail(lease, { failureClass: validation ? "validation" : code === "SOURCE_ARTIFACT_MISSING" ? "permanent" : "internal", code, retryable: !validation && code !== "SOURCE_ARTIFACT_MISSING" }).catch(() => undefined);
      return { claimed: 1, failed: true, type, code } as const;
    }
  }
  return { claimed: 0, ready: true } as const;
}

export function p08PrivateFilesystem(root: string): P08Storage { return new PrivateFilesystemMediaStorage(root); }

type P08RuntimeFixture = Omit<Parameters<typeof dispatchP08Jobs>[0], "runtimeMode" | "workerId">;
let testRuntimeFixture: P08RuntimeFixture | undefined;
export function installP08TestRuntimeFixture(runtimeMode: string, fixture: P08RuntimeFixture | undefined) {
  if (runtimeMode !== "test") throw new Error("P08_TEST_RUNTIME_ONLY");
  testRuntimeFixture = fixture;
}
export async function dispatchConfiguredP08Jobs(input: { runtimeMode: string; workerId: string }) {
  if (input.runtimeMode !== "test" || !testRuntimeFixture) return { claimed: 0, ready: false } as const;
  return dispatchP08Jobs({ ...input, ...testRuntimeFixture });
}
