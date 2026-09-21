import {
  API_ENDPOINTS,
  API_SERVICE_ACCOUNT_DESCRIPTOR_KEY,
  type S08CreateDraftRequest,
  type S08Draft,
  type S08ImpactPreviewRequest,
  type S08UpdateDraftRequest,
  type SettingsCenterCapability
} from "../api/api-contract.ts";
import { validateApiServiceAccountsValueV1, validateS08CreateDraftRequest, validateS08UpdateDraftRequest } from "../api/runtime-validation.ts";

type Shared = {
  actorKey: string;
  expectedActorKey: string;
  capability: SettingsCenterCapability;
  /** Service Account/Token business actions gate on service_accounts.manage
   *  (P02 ceiling); policy lifecycle stays on settings.read/settings.write. */
  serviceAccountsManage: boolean;
  signal?: AbortSignal;
};

export type S08Operation =
  | (Shared & { kind: "createDraft"; input: S08CreateDraftRequest })
  | (Shared & { kind: "updateDraft"; draftId: string; status: S08Draft["status"]; input: S08UpdateDraftRequest })
  | (Shared & { kind: "validateDraft"; draftId: string; status: S08Draft["status"]; input: { expectedVersion: number; idempotencyKey: string } })
  | (Shared & { kind: "publishDraft"; draftId: string; status: S08Draft["status"]; input: { expectedVersion: number; idempotencyKey: string } })
  | (Shared & { kind: "createRollbackDraft"; publicationId: string; sourceStatus: "published" | "superseded" | "activation_failed" | "rolled_back"; input: { expectedPublishedVersion: number; changeReason: string; idempotencyKey: string } })
  | (Shared & { kind: "impactPreview"; input: S08ImpactPreviewRequest })
  | (Shared & { kind: "createToken"; accountId: string; input: { name: string; ttlDays?: number; idempotencyKey: string } })
  | (Shared & { kind: "rotateToken"; accountId: string; tokenId: string; input: { idempotencyKey: string } })
  | (Shared & { kind: "revokeToken"; accountId: string; tokenId: string; input: { reason: string; idempotencyKey: string } });

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function request(path: string, body: unknown, signal?: AbortSignal, method: "POST" | "PATCH" | "DELETE" = "POST") {
  if ((!path.startsWith("/dashboard/settings/s08-") && !path.startsWith("/dashboard/mcp/")) || path.startsWith("//") || path.includes("://")) throw new TypeError("S08 设置/服务账号操作端点无效。");
  return { path, init: { method, signal, credentials: "include" as const, cache: "no-store" as const, redirect: "error" as const, headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) } };
}

export function authorizeS08Operation(operation: S08Operation) {
  if (!operation.actorKey || operation.actorKey !== operation.expectedActorKey) throw new TypeError("S08 设置操作上下文已过期。");
  if (!operation.capability.enabled || !operation.capability.actions.read) throw new TypeError("设置中心读取能力不可用。");
  switch (operation.kind) {
    case "createDraft":
      if (!operation.capability.actions.createDraft) throw new TypeError("当前操作员不能创建 S08 草稿。");
      { const input = validateS08CreateDraftRequest(operation.input); if (input.descriptorKey !== API_SERVICE_ACCOUNT_DESCRIPTOR_KEY) throw new TypeError("仅 API 服务账号设置可创建草稿。"); return request(API_ENDPOINTS.dashboardS08SettingsDrafts, input, operation.signal); }
    case "updateDraft":
      if (!operation.capability.actions.updateDraft || !uuid.test(operation.draftId) || !["draft", "invalid", "activation_failed", "rollback_draft"].includes(operation.status)) throw new TypeError("当前 S08 草稿不能编辑。");
      return request(API_ENDPOINTS.dashboardS08SettingsDraft(operation.draftId), validateS08UpdateDraftRequest(operation.input), operation.signal, "PATCH");
    case "validateDraft":
      if (!operation.capability.actions.validate || !uuid.test(operation.draftId) || !["draft", "invalid", "validated", "activation_failed", "rollback_draft"].includes(operation.status)) throw new TypeError("当前 S08 草稿不能验证。");
      return request(API_ENDPOINTS.dashboardS08SettingsDraftValidate(operation.draftId), operation.input, operation.signal);
    case "publishDraft":
      if (!operation.capability.actions.publish || !uuid.test(operation.draftId) || operation.status !== "validated") throw new TypeError("当前 S08 草稿不能发布。");
      return request(API_ENDPOINTS.dashboardS08SettingsDraftPublish(operation.draftId), operation.input, operation.signal);
    case "createRollbackDraft":
      if (!operation.capability.actions.rollback || !uuid.test(operation.publicationId) || !["published", "superseded"].includes(operation.sourceStatus)) throw new TypeError("当前 S08 发布不能创建回滚草稿。");
      return request(API_ENDPOINTS.dashboardS08SettingsRollbackDraft(operation.publicationId), operation.input, operation.signal);
    case "impactPreview":
      validateApiServiceAccountsValueV1(operation.input.candidate);
      return request(API_ENDPOINTS.dashboardS08SettingsImpactPreview, operation.input, operation.signal);
    case "createToken":
      if (!operation.serviceAccountsManage || !uuid.test(operation.accountId)) throw new TypeError("需要 service_accounts.manage 能力创建服务账号令牌。");
      { const name = operation.input.name.trim(); if (name.length < 1 || name.length > 80) throw new TypeError("令牌名称需为 1–80 个字符。"); if (operation.input.ttlDays !== undefined && (!Number.isSafeInteger(operation.input.ttlDays) || operation.input.ttlDays < 1 || operation.input.ttlDays > 365)) throw new TypeError("令牌 TTL 需为 1–365 天。"); return request(API_ENDPOINTS.dashboardS08ServiceAccountTokens(operation.accountId), { name, ...(operation.input.ttlDays !== undefined ? { ttlDays: operation.input.ttlDays } : {}), idempotencyKey: operation.input.idempotencyKey }, operation.signal); }
    case "rotateToken":
      if (!operation.serviceAccountsManage || !uuid.test(operation.accountId) || !uuid.test(operation.tokenId)) throw new TypeError("需要 service_accounts.manage 能力轮换服务账号令牌。");
      return request(API_ENDPOINTS.dashboardS08ServiceAccountTokenRotate(operation.accountId, operation.tokenId), { idempotencyKey: operation.input.idempotencyKey }, operation.signal);
    case "revokeToken": {
      if (!operation.serviceAccountsManage || !uuid.test(operation.accountId) || !uuid.test(operation.tokenId)) throw new TypeError("需要 service_accounts.manage 能力撤销服务账号令牌。");
      const reason = operation.input.reason.trim(); if (reason.length < 8 || reason.length > 500) throw new TypeError("撤销原因需为 8–500 个字符。");
      return request(`${API_ENDPOINTS.dashboardS08ServiceAccountTokens(operation.accountId)}/${operation.tokenId}`, { reason, idempotencyKey: operation.input.idempotencyKey }, operation.signal, "DELETE");
    }
  }
}
