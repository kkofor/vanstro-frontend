import {
  API_ENDPOINTS,
  AUTH_RBAC_DESCRIPTOR_KEY,
  type S09CreateDraftRequest,
  type S09Draft,
  type S09UpdateDraftRequest,
  type SettingsCenterCapability
} from "../api/api-contract.ts";
import {
  validateS09CreateDraftRequest,
  validateS09UpdateDraftRequest
} from "../api/runtime-validation.ts";

type Shared = {
  actorKey: string;
  expectedActorKey: string;
  capability: SettingsCenterCapability;
  signal?: AbortSignal;
};

export type S09Operation =
  | (Shared & { kind: "createDraft"; input: S09CreateDraftRequest })
  | (Shared & { kind: "updateDraft"; draftId: string; status: S09Draft["status"]; input: S09UpdateDraftRequest })
  | (Shared & { kind: "validateDraft"; draftId: string; status: S09Draft["status"]; input: { expectedVersion: number; idempotencyKey: string } })
  | (Shared & { kind: "publishDraft"; draftId: string; status: S09Draft["status"]; input: { expectedVersion: number; idempotencyKey: string } })
  | (Shared & { kind: "createRollbackDraft"; publicationId: string; sourceStatus: "published" | "superseded" | "activation_failed" | "rolled_back"; input: { expectedPublishedVersion: number; changeReason: string; idempotencyKey: string } });

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertContext(operation: Shared) {
  if (!operation.actorKey || operation.actorKey !== operation.expectedActorKey) throw new TypeError("S09 设置操作上下文已过期。");
  if (!operation.capability.enabled || !operation.capability.actions.read) throw new TypeError("设置中心读取能力不可用。");
}

function request(path: string, body: unknown, signal?: AbortSignal, method: "POST" | "PATCH" = "POST") {
  if (!path.startsWith("/dashboard/settings/s09-") || path.startsWith("//") || path.includes("://")) throw new TypeError("S09 设置操作端点无效。");
  return {
    path,
    init: {
      method,
      signal,
      credentials: "include" as const,
      cache: "no-store" as const,
      redirect: "error" as const,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  };
}

export function authorizeS09Operation(operation: S09Operation) {
  assertContext(operation);
  switch (operation.kind) {
    case "createDraft": {
      if (!operation.capability.actions.createDraft) throw new TypeError("当前操作员不能创建 S09 设置草稿。");
      const input = validateS09CreateDraftRequest(operation.input);
      if (input.descriptorKey !== AUTH_RBAC_DESCRIPTOR_KEY) throw new TypeError("仅认证/RBAC 设置可创建草稿。");
      return request(API_ENDPOINTS.dashboardS09SettingsDrafts, input, operation.signal);
    }
    case "updateDraft": {
      if (!operation.capability.actions.updateDraft || !uuidPattern.test(operation.draftId) || !["draft", "invalid", "activation_failed", "rollback_draft"].includes(operation.status)) throw new TypeError("当前 S09 设置草稿不能编辑。");
      return request(API_ENDPOINTS.dashboardS09SettingsDraft(operation.draftId), validateS09UpdateDraftRequest(operation.input), operation.signal, "PATCH");
    }
    case "validateDraft": {
      if (!operation.capability.actions.validate || !uuidPattern.test(operation.draftId) || !["draft", "invalid", "validated", "activation_failed", "rollback_draft"].includes(operation.status)) throw new TypeError("当前 S09 设置草稿不能验证。");
      return request(API_ENDPOINTS.dashboardS09SettingsDraftValidate(operation.draftId), operation.input, operation.signal);
    }
    case "publishDraft": {
      if (!operation.capability.actions.publish || !uuidPattern.test(operation.draftId) || operation.status !== "validated") throw new TypeError("当前 S09 设置草稿不能发布。");
      return request(API_ENDPOINTS.dashboardS09SettingsDraftPublish(operation.draftId), operation.input, operation.signal);
    }
    case "createRollbackDraft": {
      if (!operation.capability.actions.rollback || !uuidPattern.test(operation.publicationId) || !["published", "superseded"].includes(operation.sourceStatus)) throw new TypeError("当前 S09 发布不能创建回滚草稿。");
      return request(API_ENDPOINTS.dashboardS09SettingsRollbackDraft(operation.publicationId), operation.input, operation.signal);
    }
  }
}
