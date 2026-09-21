export type DataJobErrorCode =
  | "OBJECT_DISABLED"
  | "OBJECT_NOT_SUPPORTED"
  | "IMPORT_PREVIEW_STALE"
  | "IMPORT_EXPIRED"
  | "CSV_INVALID_ENCODING"
  | "CSV_MALFORMED"
  | "CSV_DUPLICATE_HEADER"
  | "CSV_MISSING_HEADER"
  | "CSV_UNKNOWN_HEADER"
  | "CSV_PROHIBITED_HEADER"
  | "CSV_ROW_LIMIT_EXCEEDED"
  | "CSV_BYTE_LIMIT_EXCEEDED";

export class DataJobError extends Error {
  constructor(
    readonly code: DataJobErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DataJobError";
  }
}
