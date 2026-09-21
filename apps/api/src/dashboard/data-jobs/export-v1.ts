import { createHash } from "node:crypto";
import { FOUNDATION_SAMPLE_FIELDS } from "./registry.js";

export const FOUNDATION_SAMPLE_EXPORT_FORMULA = "foundation.sample.export.v1" as const;
export const FOUNDATION_SAMPLE_EXPORT_COLUMNS = FOUNDATION_SAMPLE_FIELDS;

export interface FoundationSampleExportRow {
  readonly external_key: string;
  readonly label: string;
  readonly state: "active" | "inactive";
  readonly quantity: number;
  readonly effective_date: string | null;
  readonly note: string | null;
}

const dangerousPrefix = /^[\p{White_Space}\p{Cf}\x00-\x1f\x7f]*[=+\-@]/u;

export function neutralizeSpreadsheetString(value: string): string {
  const normalized = value.normalize("NFC").replace(/\r\n?|\n/g, "\n");
  return dangerousPrefix.test(normalized) ? `'${normalized}` : normalized;
}

export function encodeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function serializeRow(row: FoundationSampleExportRow): string {
  if (!Number.isSafeInteger(row.quantity) || row.quantity < 0 || row.quantity > 1_000_000) {
    throw new RangeError("Export quantity is outside the foundation.sample range.");
  }
  const stringValues = [row.external_key, row.label, row.state, row.effective_date ?? "", row.note ?? ""]
    .map((value) => encodeCsvCell(neutralizeSpreadsheetString(value)));
  return [stringValues[0], stringValues[1], stringValues[2], String(row.quantity), stringValues[3], stringValues[4]].join(",");
}

export async function* serializeFoundationSampleCsv(
  rows: AsyncIterable<FoundationSampleExportRow> | Iterable<FoundationSampleExportRow>,
): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder();
  yield encoder.encode(`${FOUNDATION_SAMPLE_EXPORT_COLUMNS.join(",")}\r\n`);
  for await (const row of rows) yield encoder.encode(`${serializeRow(row)}\r\n`);
}

export async function collectFoundationSampleCsv(
  rows: AsyncIterable<FoundationSampleExportRow> | Iterable<FoundationSampleExportRow>,
): Promise<{ bytes: Uint8Array; byteSize: number; sha256: string }> {
  const chunks: Uint8Array[] = [];
  const hash = createHash("sha256");
  let byteSize = 0;
  for await (const chunk of serializeFoundationSampleCsv(rows)) {
    chunks.push(chunk);
    hash.update(chunk);
    byteSize += chunk.byteLength;
  }
  const bytes = new Uint8Array(byteSize);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { bytes, byteSize, sha256: hash.digest("hex") };
}
