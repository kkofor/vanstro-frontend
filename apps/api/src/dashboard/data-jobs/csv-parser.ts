import { DataJobError } from "./errors.js";
import { FOUNDATION_SAMPLE_FIELDS, type FoundationSampleField } from "./registry.js";

export const DATA_JOB_PARSER_VERSION = "foundation.sample.csv-parser.v1";
export const DATA_JOB_SECURITY_POLICY_VERSION = "foundation.sample.import-security.v1";

export interface CsvParserLimits {
  readonly maxBytes: number;
  readonly maxRows: number;
  readonly maxFieldBytes: number;
  readonly maxErrorsPerRow: number;
}

export const DEFAULT_CSV_PARSER_LIMITS: CsvParserLimits = {
  maxBytes: 10 * 1024 * 1024,
  maxRows: 10_000,
  maxFieldBytes: 64 * 1024,
  maxErrorsPerRow: 16,
};

export type FoundationSampleNormalizedRow = {
  external_key: string;
  label: string;
  state: "active" | "inactive" | string;
  quantity: number | string;
  effective_date: string | null;
  note: string | null;
};

export interface FoundationSampleValidationError {
  readonly code: "FIELD_REQUIRED" | "FIELD_INVALID_TYPE" | "FIELD_INVALID_ENUM" | "FIELD_TOO_LONG" | "FIELD_OUT_OF_RANGE";
  readonly field: FoundationSampleField;
}

export interface ParsedFoundationSampleRow {
  readonly rowNumber: number;
  readonly rawPayload: Readonly<Record<FoundationSampleField, string>>;
  readonly normalizedPayload: Readonly<FoundationSampleNormalizedRow>;
  readonly validationStatus: "valid" | "invalid";
  readonly validationErrors: readonly FoundationSampleValidationError[];
}

export interface FoundationSampleCsvPreview {
  readonly headers: readonly FoundationSampleField[];
  readonly rows: readonly ParsedFoundationSampleRow[];
  readonly rowCount: number;
  readonly validRowCount: number;
  readonly invalidRowCount: number;
  readonly byteSize: number;
}

const requiredFields = new Set<FoundationSampleField>(["external_key", "label", "state", "quantity"]);
const allowedFields = new Set<string>(FOUNDATION_SAMPLE_FIELDS);
const prohibitedHeader = /(?:^|_)(?:order(?:_id)?|payment(?:_id)?|card_number|cvv|email|phone|first_name|last_name|full_name|address|ssn|sin|passport(?:_number)?|government_id|national_id|tax_id|driver_licen[cs]e)(?:_|$)/i;
const bidiControl = /[؜‎‏‪-‮⁦-⁩]/u;
const disallowedControl = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u;
const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;

function csvError(code: DataJobError["code"], message: string): never {
  throw new DataJobError(code, message);
}

function normalizedCell(value: string): string {
  return value.normalize("NFC").replace(/\r\n?|\n/g, "\n").trim();
}

function validateDate(value: string): boolean {
  const match = isoDate.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateRow(
  rowNumber: number,
  headers: readonly FoundationSampleField[],
  cells: readonly string[],
  maxErrors: number,
): ParsedFoundationSampleRow {
  const raw = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])) as Record<FoundationSampleField, string>;
  const values = Object.fromEntries(FOUNDATION_SAMPLE_FIELDS.map((field) => [field, normalizedCell(raw[field] ?? "")])) as Record<FoundationSampleField, string>;
  const errors: FoundationSampleValidationError[] = [];
  const add = (code: FoundationSampleValidationError["code"], field: FoundationSampleField) => {
    if (errors.length < maxErrors) errors.push({ code, field });
  };

  for (const field of requiredFields) if (values[field].length === 0) add("FIELD_REQUIRED", field);
  if (values.external_key.length > 64) add("FIELD_TOO_LONG", "external_key");
  if (values.label.length > 120) add("FIELD_TOO_LONG", "label");
  if (values.note.length > 500) add("FIELD_TOO_LONG", "note");
  if (values.state && values.state !== "active" && values.state !== "inactive") add("FIELD_INVALID_ENUM", "state");

  let quantity: number | string = values.quantity;
  if (values.quantity && !/^(?:0|[1-9]\d*)$/.test(values.quantity)) {
    add("FIELD_INVALID_TYPE", "quantity");
  } else if (values.quantity) {
    quantity = Number(values.quantity);
    if (!Number.isSafeInteger(quantity) || quantity > 1_000_000) add("FIELD_OUT_OF_RANGE", "quantity");
  }
  if (values.effective_date && !validateDate(values.effective_date)) add("FIELD_INVALID_TYPE", "effective_date");

  return {
    rowNumber,
    rawPayload: raw,
    normalizedPayload: {
      external_key: values.external_key,
      label: values.label,
      state: values.state,
      quantity,
      effective_date: values.effective_date || null,
      note: values.note || null,
    },
    validationStatus: errors.length === 0 ? "valid" : "invalid",
    validationErrors: errors,
  };
}

function validateHeaders(cells: readonly string[]): readonly FoundationSampleField[] {
  const normalized = cells.map((header, index) => {
    const value = header.replace(index === 0 ? /^﻿/u : /$^/u, "").trim().normalize("NFC");
    if (bidiControl.test(value)) csvError("CSV_PROHIBITED_HEADER", "The CSV header contains prohibited control characters.");
    return value;
  });
  if (new Set(normalized).size !== normalized.length) csvError("CSV_DUPLICATE_HEADER", "The CSV contains duplicate headers.");
  if (normalized.some((header) => prohibitedHeader.test(header.toLowerCase().replace(/[\s-]+/g, "_")))) {
    csvError("CSV_PROHIBITED_HEADER", "The CSV contains a prohibited header.");
  }
  const missing = [...requiredFields].filter((field) => !normalized.includes(field));
  if (missing.length) csvError("CSV_MISSING_HEADER", "The CSV is missing required headers.");
  if (normalized.some((header) => !allowedFields.has(header))) csvError("CSV_UNKNOWN_HEADER", "The CSV contains unknown headers.");
  return normalized as FoundationSampleField[];
}

function safeLimits(limits: CsvParserLimits): CsvParserLimits {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive safe integer.`);
  }
  return limits;
}

export async function parseFoundationSampleCsv(
  input: AsyncIterable<Uint8Array>,
  configuredLimits: CsvParserLimits = DEFAULT_CSV_PARSER_LIMITS,
): Promise<FoundationSampleCsvPreview> {
  const limits = safeLimits(configuredLimits);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const rows: ParsedFoundationSampleRow[] = [];
  let headers: readonly FoundationSampleField[] | undefined;
  let cells: string[] = [];
  let field = "";
  let fieldBytes = 0;
  let quoted = false;
  let afterQuote = false;
  let pendingCr = false;
  let byteSize = 0;

  const append = (character: string) => {
    field += character;
    fieldBytes += Buffer.byteLength(character, "utf8");
    if (fieldBytes > limits.maxFieldBytes) csvError("CSV_MALFORMED", "A CSV field exceeds the configured limit.");
  };
  const endField = () => { cells.push(field); field = ""; fieldBytes = 0; afterQuote = false; };
  const endRow = () => {
    endField();
    if (!headers) {
      headers = validateHeaders(cells);
    } else {
      if (cells.length !== headers.length) csvError("CSV_MALFORMED", "A CSV row has an invalid column count.");
      if (rows.length >= limits.maxRows) csvError("CSV_ROW_LIMIT_EXCEEDED", "The CSV exceeds the configured row limit.");
      rows.push(validateRow(rows.length + 2, headers, cells, limits.maxErrorsPerRow));
    }
    cells = [];
  };
  const consume = (text: string) => {
    for (const character of text) {
      if (disallowedControl.test(character)) csvError("CSV_MALFORMED", "The CSV contains prohibited control characters.");
      if (pendingCr) { pendingCr = false; if (character === "\n") continue; }
      if (quoted) {
        if (afterQuote) {
          if (character === '"') { append('"'); afterQuote = false; continue; }
          quoted = false;
          if (character === ",") { endField(); continue; }
          if (character === "\r" || character === "\n") { endRow(); pendingCr = character === "\r"; continue; }
          csvError("CSV_MALFORMED", "The CSV contains trailing characters after a closing quote.");
        }
        if (character === '"') { afterQuote = true; continue; }
        append(character);
        continue;
      }
      if (character === '"') {
        if (field.length !== 0) csvError("CSV_MALFORMED", "The CSV contains a misplaced quote.");
        quoted = true;
      } else if (character === ",") endField();
      else if (character === "\r" || character === "\n") { endRow(); pendingCr = character === "\r"; }
      else append(character);
    }
  };

  try {
    for await (const chunk of input) {
      byteSize += chunk.byteLength;
      if (byteSize > limits.maxBytes) csvError("CSV_BYTE_LIMIT_EXCEEDED", "The CSV exceeds the configured byte limit.");
      consume(decoder.decode(chunk, { stream: true }));
    }
    consume(decoder.decode());
  } catch (error) {
    if (error instanceof DataJobError) throw error;
    if (error instanceof TypeError) csvError("CSV_INVALID_ENCODING", "The CSV must use valid UTF-8 encoding.");
    throw error;
  }
  if (quoted && !afterQuote) csvError("CSV_MALFORMED", "The CSV contains an unterminated quoted field.");
  if (!headers && cells.length === 0 && field.length === 0) csvError("CSV_MALFORMED", "The CSV is empty.");
  if (cells.length > 0 || field.length > 0 || afterQuote) endRow();
  if (!headers) csvError("CSV_MALFORMED", "The CSV requires a header row.");
  const validRowCount = rows.filter((row) => row.validationStatus === "valid").length;
  return {
    headers,
    rows,
    rowCount: rows.length,
    validRowCount,
    invalidRowCount: rows.length - validRowCount,
    byteSize,
  };
}

export async function* csvBytes(value: string, chunkSize = value.length || 1): AsyncGenerator<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  for (let offset = 0; offset < bytes.length; offset += chunkSize) yield bytes.slice(offset, offset + chunkSize);
}
