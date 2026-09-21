import {
  API_ENDPOINTS,
  SETTINGS_CORE_DESCRIPTOR_KEY,
  type SettingsCenterCapability,
  type SettingsCreateDraftRequest,
  type SettingsCreateRollbackDraftRequest,
  type SettingsDraftCommandRequest,
  type SettingsDraft,
  type SettingsHistoryEntry,
  type SettingsUpdateDraftRequest
} from "../api/api-contract.ts";
import {
  validateSettingsCreateDraftRequest,
  validateSettingsCreateRollbackDraftRequest,
  validateSettingsDraftCommandRequest,
  validateSettingsUpdateDraftRequest
} from "../api/runtime-validation.ts";

type Shared = {
  actorKey: string;
  expectedActorKey: string;
  capability: SettingsCenterCapability;
  signal?: AbortSignal;
};

export type SettingsOperation =
  | (Shared & { kind: "createDraft"; input: SettingsCreateDraftRequest })
  | (Shared & { kind: "updateDraft"; draftId: string; status: SettingsDraft["status"]; input: SettingsUpdateDraftRequest })
  | (Shared & { kind: "validateDraft"; draftId: string; status: SettingsDraft["status"]; input: SettingsDraftCommandRequest })
  | (Shared & { kind: "publishDraft"; draftId: string; status: SettingsDraft["status"]; input: SettingsDraftCommandRequest })
  | (Shared & { kind: "createRollbackDraft"; publicationId: string; sourceStatus: SettingsHistoryEntry["status"]; input: SettingsCreateRollbackDraftRequest });

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;

function assertContext(operation: Shared) {
  if (!operation.actorKey || operation.actorKey !== operation.expectedActorKey) throw new TypeError("设置操作上下文已过期。");
  if (!operation.capability.enabled || !operation.capability.actions.read) throw new TypeError("设置中心读取能力不可用。");
}

function request(path: string, body: unknown, signal?: AbortSignal, method: "POST" | "PATCH" = "POST") {
  if (!path.startsWith("/dashboard/settings/") || path.startsWith("//") || path.includes("://")) throw new TypeError("设置操作端点无效。");
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

export function authorizeSettingsOperation(operation: SettingsOperation) {
  assertContext(operation);
  switch (operation.kind) {
    case "createDraft": {
      if (!operation.capability.actions.createDraft) throw new TypeError("当前操作员不能创建设置草稿。");
      const input = validateSettingsCreateDraftRequest(operation.input);
      if (input.descriptorKey !== SETTINGS_CORE_DESCRIPTOR_KEY) throw new TypeError("仅核心刷新间隔可创建草稿。");
      return request(API_ENDPOINTS.dashboardSettingsDrafts, input, operation.signal);
    }
    case "updateDraft": {
      if (!operation.capability.actions.updateDraft || !idPattern.test(operation.draftId) || !["draft", "invalid", "activation_failed", "rollback_draft"].includes(operation.status)) throw new TypeError("当前设置草稿不能编辑。");
      return request(API_ENDPOINTS.dashboardSettingsDraft(operation.draftId), validateSettingsUpdateDraftRequest(operation.input), operation.signal, "PATCH");
    }
    case "validateDraft": {
      if (!operation.capability.actions.validate || !idPattern.test(operation.draftId) || !["draft", "invalid", "validated", "activation_failed", "rollback_draft"].includes(operation.status)) throw new TypeError("当前设置草稿不能验证。");
      return request(API_ENDPOINTS.dashboardSettingsDraftValidate(operation.draftId), validateSettingsDraftCommandRequest(operation.input), operation.signal);
    }
    case "publishDraft": {
      if (!operation.capability.actions.publish || !idPattern.test(operation.draftId) || operation.status !== "validated") throw new TypeError("当前设置草稿不能发布。");
      return request(API_ENDPOINTS.dashboardSettingsDraftPublish(operation.draftId), validateSettingsDraftCommandRequest(operation.input), operation.signal);
    }
    case "createRollbackDraft": {
      if (!operation.capability.actions.rollback || !idPattern.test(operation.publicationId) || !["published", "superseded"].includes(operation.sourceStatus)) throw new TypeError("当前发布不能创建回滚草稿。");
      return request(API_ENDPOINTS.dashboardSettingsRollbackDraft(operation.publicationId), validateSettingsCreateRollbackDraftRequest(operation.input), operation.signal);
    }
  }
}
