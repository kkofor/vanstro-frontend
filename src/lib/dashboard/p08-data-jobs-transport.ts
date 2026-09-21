import { DATA_JOB_OBJECT, DATA_JOB_PREFIX, type DataJobPermissionGates, type DataJobResourceCapabilities, type ExportRequest, type ImportBatch, type ImportUploadIntent } from "./p08-data-jobs.ts";

const IMPORT_ID = /^imp_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const EXPORT_ID = /^exp_[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const IDEMPOTENCY = /^[A-Za-z0-9._:-]{8,128}$/;
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

type Shared = { actorKey: string; expectedActorKey: string; signal?: AbortSignal };
type ImportBound = Shared & { resource: ImportBatch; importId: string; capabilities: DataJobResourceCapabilities };
type ExportBound = Shared & { resource: ExportRequest; exportId: string; capabilities: DataJobResourceCapabilities };
export type DataJobOperation =
  | (Shared & { kind: "createImport"; filename: string; byteSize: number; contentType: "text/csv"; idempotencyKey: string })
  | (Shared & { kind: "uploadContent"; intent: ImportUploadIntent; importId: string; file: Blob; expectedVersion: number; idempotencyKey: string })
  | (ImportBound & { kind: "commitImport"; expectedVersion: number; confirmation: { validRows: number; invalidRows: number; acknowledgedPartialOutcome: true }; idempotencyKey: string })
  | (ImportBound & { kind: "cancelImport"; expectedVersion: number; idempotencyKey: string })
  | (Shared & { kind: "createExport"; state?: "active" | "inactive"; effectiveDateFrom?: string; effectiveDateTo?: string; sort: "external_key:asc" | "external_key:desc" | "label:asc" | "label:desc" | "state:asc" | "state:desc" | "effective_date:asc" | "effective_date:desc"; idempotencyKey: string })
  | (ExportBound & { kind: "cancelExport"; expectedVersion: number; idempotencyKey: string })
  | (ExportBound & { kind: "downloadExport" });
export type AuthorizedDataJobRequest = { path: string; init: RequestInit; response: "json" | "bytes" };

function json(body: unknown, idempotencyKey?: string, signal?: AbortSignal): RequestInit { return { body: JSON.stringify(body), signal, headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) } }; }
function key(value: string) { if (!IDEMPOTENCY.test(value)) throw new TypeError("数据任务幂等键无效。"); return value; }
function actor(operation: Shared) { if (!operation.actorKey || operation.actorKey !== operation.expectedActorKey) throw new TypeError("数据任务操作上下文已过期。"); }
function version(value: number) { if (!Number.isSafeInteger(value) || value < 1) throw new TypeError("数据任务版本无效。"); }
function importBound(operation: ImportBound, gate: keyof DataJobPermissionGates, capability: keyof DataJobResourceCapabilities, gates: DataJobPermissionGates) { if (!IMPORT_ID.test(operation.importId) || operation.resource.id !== operation.importId || operation.resource.object_key !== DATA_JOB_OBJECT || operation.capabilities !== operation.resource.capabilities || !gates[gate] || !operation.capabilities[capability]) throw new TypeError("导入操作双重授权失败。"); }
function exportBound(operation: ExportBound, gate: keyof DataJobPermissionGates, capability: keyof DataJobResourceCapabilities, gates: DataJobPermissionGates) { if (!EXPORT_ID.test(operation.exportId) || operation.resource.id !== operation.exportId || operation.resource.object_key !== DATA_JOB_OBJECT || operation.capabilities !== operation.resource.capabilities || !gates[gate] || !operation.capabilities[capability]) throw new TypeError("导出操作双重授权失败。"); }
function mutation(path: string, body: unknown, idempotencyKey: string, signal?: AbortSignal): AuthorizedDataJobRequest { return { path, init: { method: "POST", ...json(body, key(idempotencyKey), signal) }, response: "json" }; }

export function authorizeDataJobOperation(operation: DataJobOperation, gates: DataJobPermissionGates): AuthorizedDataJobRequest {
  actor(operation);
  switch (operation.kind) {
    case "createImport":
      if (!gates.importCreate || !operation.filename || operation.filename.length > 255 || operation.contentType !== "text/csv" || !Number.isSafeInteger(operation.byteSize) || operation.byteSize < 1) throw new TypeError("导入创建输入无效。");
      return mutation(`${DATA_JOB_PREFIX}/imports`, { object_key: DATA_JOB_OBJECT, filename: operation.filename, content_type: "text/csv", byte_size: operation.byteSize }, operation.idempotencyKey, operation.signal);
    case "uploadContent":
      if (!gates.importCreate || operation.intent.id !== operation.importId || !IMPORT_ID.test(operation.importId) || operation.intent.upload.method !== "PUT" || operation.intent.upload.endpoint !== `${DATA_JOB_PREFIX}/imports/${operation.importId}/content` || !(operation.file instanceof Blob) || operation.file.size < 1 || operation.file.type !== "text/csv") throw new TypeError("受控上传绑定无效。");
      version(operation.expectedVersion); if (operation.expectedVersion !== operation.intent.version) throw new TypeError("上传版本绑定无效。");
      return { path: operation.intent.upload.endpoint, init: { method: "PUT", body: operation.file, signal: operation.signal, redirect: "error", headers: { "Content-Type": "text/csv", "Content-Length": String(operation.file.size), "If-Match": String(operation.expectedVersion), "Idempotency-Key": key(operation.idempotencyKey), "X-Data-Job-Upload-Token": operation.intent.upload.token } }, response: "json" };
    case "commitImport":
      importBound(operation, "importCommit", "commit", gates); version(operation.expectedVersion);
      if (operation.expectedVersion !== operation.resource.version || operation.resource.status !== "preview_ready" || operation.confirmation.acknowledgedPartialOutcome !== true || operation.confirmation.validRows !== operation.resource.summary.valid_row_count || operation.confirmation.invalidRows !== operation.resource.summary.invalid_row_count) throw new TypeError("导入提交确认与当前预览不一致。");
      return mutation(`${DATA_JOB_PREFIX}/imports/${operation.importId}/commit`, { mode: "valid_rows", expected_version: operation.expectedVersion }, operation.idempotencyKey, operation.signal);
    case "cancelImport":
      importBound(operation, "importCreate", "cancel", gates); version(operation.expectedVersion); if (operation.expectedVersion !== operation.resource.version || !["uploaded", "parsing", "commit_queued", "committing"].includes(operation.resource.status)) throw new TypeError("当前导入不可取消。");
      return mutation(`${DATA_JOB_PREFIX}/imports/${operation.importId}/cancel`, { expected_version: operation.expectedVersion }, operation.idempotencyKey, operation.signal);
    case "createExport": {
      if (!gates.exportCreate || !["external_key:asc", "external_key:desc", "label:asc", "label:desc", "state:asc", "state:desc", "effective_date:asc", "effective_date:desc"].includes(operation.sort) || operation.state !== undefined && operation.state !== "active" && operation.state !== "inactive") throw new TypeError("导出查询无效。");
      if (Boolean(operation.effectiveDateFrom) !== Boolean(operation.effectiveDateTo) || operation.effectiveDateFrom && (!/^\d{4}-\d{2}-\d{2}$/.test(operation.effectiveDateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(operation.effectiveDateTo!) || operation.effectiveDateFrom > operation.effectiveDateTo!)) throw new TypeError("导出日期范围无效。");
      const filters = [...(operation.state ? [{ field: "state", operator: "eq", value: operation.state }] : []), ...(operation.effectiveDateFrom ? [{ field: "effective_date", operator: "range", from: operation.effectiveDateFrom, to: operation.effectiveDateTo }] : [])];
      return mutation(`${DATA_JOB_PREFIX}/exports`, { object_key: DATA_JOB_OBJECT, format: "csv", query: { filters, sort: [operation.sort] } }, operation.idempotencyKey, operation.signal);
    }
    case "cancelExport":
      exportBound(operation, "exportCreate", "cancel", gates); version(operation.expectedVersion); if (operation.expectedVersion !== operation.resource.version || !["queued", "running"].includes(operation.resource.status)) throw new TypeError("当前导出不可取消。");
      return mutation(`${DATA_JOB_PREFIX}/exports/${operation.exportId}/cancel`, { expected_version: operation.expectedVersion }, operation.idempotencyKey, operation.signal);
    case "downloadExport":
      exportBound(operation, "exportDownload", "download", gates);
      if (operation.resource.status !== "completed" || !operation.resource.sha256 || !operation.resource.byte_size || !RFC3339.test(operation.resource.expires_at) || Date.parse(operation.resource.expires_at) <= Date.now()) throw new TypeError("导出尚不可下载或已经过期。");
      return { path: `${DATA_JOB_PREFIX}/exports/${operation.exportId}/download`, init: { method: "GET", signal: operation.signal, redirect: "error", cache: "no-store", headers: { Accept: "text/csv" } }, response: "bytes" };
  }
}

export async function executeDataJobOperation(operation: DataJobOperation, gates: DataJobPermissionGates, fetcher: (path: string, init: RequestInit) => Promise<Response>, onUnauthorized: () => void, currentActorKey: () => string) {
  const authorized = authorizeDataJobOperation(operation, gates);
  const assertCurrentActor = () => {
    if (currentActorKey() !== operation.expectedActorKey) throw new DOMException("数据任务操作因操作员身份变化而中止。", "AbortError");
  };
  const response = await fetcher(authorized.path, authorized.init);
  assertCurrentActor();
  if (response.status >= 300 && response.status < 400) throw new TypeError("受控文件传输禁止重定向。");
  if (response.status === 401) onUnauthorized();
  const payload = authorized.response === "bytes" ? await response.blob() : await response.json().catch(() => null);
  assertCurrentActor();
  return { response, responseKind: authorized.response, payload };
}
