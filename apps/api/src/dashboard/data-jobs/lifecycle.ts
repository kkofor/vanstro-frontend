export const IMPORT_STATUSES = [
  "uploaded", "parsing", "preview_ready", "preview_failed", "commit_queued", "committing",
  "completed", "completed_with_errors", "failed", "cancelled", "expired",
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const EXPORT_STATUSES = ["queued", "running", "completed", "failed", "cancelled", "expired"] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];

const importTransitions: Readonly<Record<ImportStatus, readonly ImportStatus[]>> = {
  uploaded: ["parsing", "cancelled", "expired"],
  parsing: ["preview_ready", "preview_failed", "cancelled", "expired"],
  preview_ready: ["commit_queued", "cancelled", "expired"],
  preview_failed: ["expired"],
  commit_queued: ["committing", "cancelled", "expired"],
  committing: ["completed", "completed_with_errors", "failed"],
  completed: [], completed_with_errors: [], failed: [], cancelled: [], expired: [],
};

const exportTransitions: Readonly<Record<ExportStatus, readonly ExportStatus[]>> = {
  queued: ["running", "cancelled", "expired"],
  running: ["completed", "failed", "cancelled", "expired"],
  completed: ["expired"],
  failed: [], cancelled: [], expired: [],
};

export function isImportStatus(value: string): value is ImportStatus {
  return (IMPORT_STATUSES as readonly string[]).includes(value);
}
export function isExportStatus(value: string): value is ExportStatus {
  return (EXPORT_STATUSES as readonly string[]).includes(value);
}
export function canTransitionImport(from: ImportStatus, to: ImportStatus): boolean {
  return importTransitions[from].includes(to);
}
export function canTransitionExport(from: ExportStatus, to: ExportStatus): boolean {
  return exportTransitions[from].includes(to);
}
