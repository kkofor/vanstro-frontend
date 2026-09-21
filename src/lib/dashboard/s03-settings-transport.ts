import { API_ENDPOINTS, COMMERCE_SETTINGS_DESCRIPTOR_KEY, type S03CreateDraftRequest, type S03Draft, type S03ImpactPreviewRequest, type S03UpdateDraftRequest, type SettingsCenterCapability } from "../api/api-contract.ts";
import { validateCommerceSettingsValueV1, validateS03CreateDraftRequest, validateS03UpdateDraftRequest } from "../api/runtime-validation.ts";

type Shared={actorKey:string;expectedActorKey:string;capability:SettingsCenterCapability;signal?:AbortSignal};
export type S03Operation=
|(Shared&{kind:"createDraft";input:S03CreateDraftRequest})
|(Shared&{kind:"updateDraft";draftId:string;status:S03Draft["status"];input:S03UpdateDraftRequest})
|(Shared&{kind:"validateDraft";draftId:string;status:S03Draft["status"];input:{expectedVersion:number;idempotencyKey:string}})
|(Shared&{kind:"publishDraft";draftId:string;status:S03Draft["status"];input:{expectedVersion:number;idempotencyKey:string}})
|(Shared&{kind:"createRollbackDraft";publicationId:string;sourceStatus:"published"|"superseded"|"activation_failed"|"rolled_back";input:{expectedPublishedVersion:number;changeReason:string;idempotencyKey:string}})
|(Shared&{kind:"impactPreview";input:S03ImpactPreviewRequest});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function request(path:string,body:unknown,signal?:AbortSignal,method:"POST"|"PATCH"="POST"){if(!path.startsWith("/dashboard/settings/s03-")||path.startsWith("//")||path.includes("://"))throw new TypeError("S03 设置操作端点无效。");return{path,init:{method,signal,credentials:"include" as const,cache:"no-store" as const,redirect:"error" as const,headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify(body)}};}
export function authorizeS03Operation(operation:S03Operation){
 if(!operation.actorKey||operation.actorKey!==operation.expectedActorKey)throw new TypeError("S03 设置操作上下文已过期。");if(!operation.capability.enabled||!operation.capability.actions.read)throw new TypeError("设置中心读取能力不可用。");
 switch(operation.kind){
  case"createDraft":if(!operation.capability.actions.createDraft)throw new TypeError("当前操作员不能创建 S03 草稿。");{const input=validateS03CreateDraftRequest(operation.input);if(input.descriptorKey!==COMMERCE_SETTINGS_DESCRIPTOR_KEY)throw new TypeError("仅 Commerce 设置可创建草稿。");return request(API_ENDPOINTS.dashboardS03SettingsDrafts,input,operation.signal);}
  case"updateDraft":if(!operation.capability.actions.updateDraft||!uuid.test(operation.draftId)||!["draft","invalid","activation_failed","rollback_draft"].includes(operation.status))throw new TypeError("当前 S03 草稿不能编辑。");return request(API_ENDPOINTS.dashboardS03SettingsDraft(operation.draftId),validateS03UpdateDraftRequest(operation.input),operation.signal,"PATCH");
  case"validateDraft":if(!operation.capability.actions.validate||!uuid.test(operation.draftId)||!["draft","invalid","validated","activation_failed","rollback_draft"].includes(operation.status))throw new TypeError("当前 S03 草稿不能验证。");return request(API_ENDPOINTS.dashboardS03SettingsDraftValidate(operation.draftId),operation.input,operation.signal);
  case"publishDraft":if(!operation.capability.actions.publish||!uuid.test(operation.draftId)||operation.status!=="validated")throw new TypeError("当前 S03 草稿不能发布。");return request(API_ENDPOINTS.dashboardS03SettingsDraftPublish(operation.draftId),operation.input,operation.signal);
  case"createRollbackDraft":if(!operation.capability.actions.rollback||!uuid.test(operation.publicationId)||!["published","superseded"].includes(operation.sourceStatus))throw new TypeError("当前 S03 发布不能创建回滚草稿。");return request(API_ENDPOINTS.dashboardS03SettingsRollbackDraft(operation.publicationId),operation.input,operation.signal);
  case"impactPreview":validateCommerceSettingsValueV1(operation.input.candidate);return request(API_ENDPOINTS.dashboardS03SettingsImpactPreview,operation.input,operation.signal);
 }
}
