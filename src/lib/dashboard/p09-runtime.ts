import { DASHBOARD_F1_PHASE_B_ROUTES } from "./f1-phase-b-contract.ts";

export const P09_PREFIX = "/dashboard/runtime" as const;
export const P09_CONFIG_ROUTE = DASHBOARD_F1_PHASE_B_ROUTES.runtimeConfig;
export const P09_FLAGS_ROUTE = DASHBOARD_F1_PHASE_B_ROUTES.runtimeFlags;
export const P09_CONFIG_KEYS = ["foundation.runtime.refresh_interval_seconds", "foundation.runtime.display_mode", "foundation.runtime.safe_origin"] as const;
export const P09_FLAG_KEYS = ["foundation.runtime.sample_flag"] as const;
export type P09View = "config" | "flags" | "readiness";
export type P09Location = { kind: "not-runtime" } | { kind: "invalid"; message: string; clearHref: string } | { kind: "valid"; view: P09View; key?: string; canonicalHref: string };
export type P09Scope = { kind: "global" | "dealer" | "location"; dealerIds: string[]; locationIds: string[] };
export type P09ConfigState = { configKey: string; desiredValue: unknown; effectiveValue: unknown; desiredSource: string; effectiveSource?: string; validationStatus: string; activationStatus: string; version: number; generation: number; failureReasonCode?: string; createdAt?: string; activatedAt?: string };
export type P09ConfigListRow = { configKey: string; schemaVersion: string; activeVersion: number; safeValue: unknown; updatedAt: string };
export type P09FlagState = { flagKey: string; desiredState: string; effectiveState?: string; validationStatus?: string; activationStatus: string; version: number; generation: number; failureReasonCode?: string };
export type P09FlagListRow = { flagKey: string; schemaVersion: string; activeState: string; version: number; updatedAt: string };
export type P09Readiness = { readinessState: string; reasonCode: string; activeCount: string; staleCount: string; totalCapacity: string; observedAt: string; secondaryReasons?: string[]; detail: boolean };

const keyPattern = /^[a-z][a-z0-9_.]{1,127}$/;
function object(value: unknown, label: string) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} 无效。`); return value as Record<string, unknown>; }
function exact(row: Record<string, unknown>, allowed: string[], label: string) { if (Object.keys(row).some(key => !allowed.includes(key))) throw new TypeError(`${label} 包含未知字段。`); }
function integer(value: unknown, label: string) { if (!Number.isSafeInteger(value) || Number(value) < 0) throw new TypeError(`${label} 无效。`); return Number(value); }
function text(value: unknown, label: string) { if (typeof value !== "string" || !value || value.length > 256) throw new TypeError(`${label} 无效。`); return value; }

export function parseP09Location(pathname: string, search: string): P09Location {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path !== "/dashboard/runtime" && path !== "/fr/dashboard/runtime") return { kind: "not-runtime" };
  const clearHref = `${path}?view=config`;
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    for (const key of params.keys()) if (!new Set(["view", "key"]).has(key) || params.getAll(key).length !== 1) throw new TypeError("运行时页面参数无效。");
    const view = params.get("view") as P09View;
    if (!new Set(["config", "flags", "readiness"]).has(view)) throw new TypeError("必须选择配置、功能开关或就绪状态。");
    const key = params.get("key") ?? undefined;
    if (key && (!keyPattern.test(key) || view === "config" && !P09_CONFIG_KEYS.includes(key as never) || view === "flags" && !P09_FLAG_KEYS.includes(key as never) || view === "readiness")) throw new TypeError("运行时资源键无效。");
    const query = new URLSearchParams({ view }); if (key) query.set("key", key);
    return { kind: "valid", view, ...(key ? { key } : {}), canonicalHref: `${path}?${query}` };
  } catch (error) { return { kind: "invalid", message: error instanceof Error ? error.message : "运行时页面参数无效。", clearHref }; }
}
export function p09Href(pathname: string, view: P09View, key?: string) { const query = new URLSearchParams({ view }); if (key) query.set("key", key); return `${pathname.replace(/\/+$/, "")}?${query}`; }
export function p09ScopeQuery(scope: P09Scope) { const query = new URLSearchParams({ scopeKind: scope.kind }); scope.dealerIds.forEach(id => query.append("dealerId", id)); scope.locationIds.forEach(id => query.append("locationId", id)); return query.toString(); }

export function validateConfigList(value: unknown): P09ConfigListRow[] {
  const envelope = object(value, "配置响应"); exact(envelope,["data"],"配置响应");
  if (!Array.isArray(envelope.data)) throw new TypeError("配置集合无效。");
  return envelope.data.map((item) => {
    const row = object(item, "配置行"); exact(row,["configKey","schemaVersion","activeVersion","safeValue","updatedAt"],"配置行");
    if (!P09_CONFIG_KEYS.includes(row.configKey as never) || typeof row.schemaVersion !== "string" || !row.schemaVersion || !Number.isFinite(Date.parse(String(row.updatedAt)))) throw new TypeError("配置行无效。");
    const serialized = JSON.stringify(row.safeValue); if (/password|token|credentialValue|secretValue|DATABASE_URL|postgresql:\/\//i.test(serialized)) throw new TypeError("配置安全值无效。");
    return { configKey: row.configKey as string, schemaVersion: row.schemaVersion, activeVersion: integer(row.activeVersion,"配置版本"), safeValue: row.safeValue, updatedAt: String(row.updatedAt) };
  });
}
export function validateConfigDetail(value: unknown) { const envelope=object(value,"配置详情"),data=object(envelope.data,"配置详情数据");exact(envelope,["data"],"配置详情");exact(data,["contractVersion","descriptor","state","contextRevision","scope"],"配置详情数据");const descriptor=object(data.descriptor,"配置描述符"),state=object(data.state,"配置状态");if(typeof descriptor.key!=="string"||!P09_CONFIG_KEYS.includes(descriptor.key as never))throw new TypeError("配置键无效。");return{descriptor,state:validateConfigState(state),contextRevision:text(data.contextRevision,"上下文版本"),scope:data.scope as P09Scope};}
export function validateConfigState(value: unknown):P09ConfigState{const row=object(value,"配置状态");const key=String(row.configKey??"");if(key&&!P09_CONFIG_KEYS.includes(key as never))throw new TypeError("配置键无效。");if(!["draft","active","activation_failed"].includes(String(row.activationStatus))||!["validated","validation_failed"].includes(String(row.validationStatus))||typeof row.desiredSource!=="string")throw new TypeError("配置状态无效。");return{configKey:key,desiredValue:row.desiredValue,effectiveValue:row.effectiveValue,desiredSource:String(row.desiredSource),...(row.effectiveSource?{effectiveSource:String(row.effectiveSource)}:{}),validationStatus:String(row.validationStatus),activationStatus:String(row.activationStatus),version:integer(row.version,"配置版本"),generation:integer(row.generation,"配置代次"),...(row.failureReasonCode?{failureReasonCode:String(row.failureReasonCode)}:{}),...(row.createdAt?{createdAt:String(row.createdAt)}:{}),...(row.activatedAt?{activatedAt:String(row.activatedAt)}:{})};}
export function validateFlagList(value:unknown):P09FlagListRow[]{const envelope=object(value,"开关响应");exact(envelope,["data"],"开关响应");if(!Array.isArray(envelope.data))throw new TypeError("开关集合无效。");return envelope.data.map(item=>{const row=object(item,"开关行");exact(row,["flagKey","schemaVersion","activeState","version","updatedAt"],"开关行");if(!P09_FLAG_KEYS.includes(row.flagKey as never)||typeof row.schemaVersion!=="string"||!row.schemaVersion||!new Set(["disabled","internal","read_only","limited","enabled","killed"]).has(row.activeState as never)||!Number.isFinite(Date.parse(String(row.updatedAt))))throw new TypeError("开关行无效。");return{flagKey:row.flagKey as string,schemaVersion:row.schemaVersion,activeState:row.activeState as string,version:integer(row.version,"开关版本"),updatedAt:String(row.updatedAt)};});}
export function validateFlagDetail(value:unknown){const envelope=object(value,"开关详情"),data=object(envelope.data,"开关详情数据");exact(envelope,["data"],"开关详情");exact(data,["descriptor","state","evaluation","contextRevision","scope"],"开关详情数据");return{descriptor:data.descriptor as Record<string,unknown>,state:validateFlagState(data.state),evaluation:data.evaluation as Record<string,unknown>,contextRevision:text(data.contextRevision,"上下文版本"),scope:data.scope as P09Scope};}
export function validateFlagState(value:unknown):P09FlagState{const row=object(value,"开关状态");const key=String(row.flagKey??"");if(key&&!P09_FLAG_KEYS.includes(key as never)||!new Set(["disabled","internal","read_only","limited","enabled","killed",undefined]).has(row.effectiveState as never)||!new Set(["disabled","internal","read_only","limited","enabled","killed"]).has(row.desiredState as never))throw new TypeError("开关状态无效。");return{flagKey:key,desiredState:String(row.desiredState),...(row.effectiveState?{effectiveState:String(row.effectiveState)}:{}),...(row.validationStatus?{validationStatus:String(row.validationStatus)}:{}),activationStatus:String(row.activationStatus),version:integer(row.version,"开关版本"),generation:integer(row.generation,"开关代次"),...(row.failureReasonCode?{failureReasonCode:String(row.failureReasonCode)}:{})};}
function bigintText(value:unknown,label:string){if(typeof value==="bigint"){if(value<BigInt(0))throw new TypeError(`${label}无效。`);return value.toString();}if(typeof value==="number"){if(!Number.isSafeInteger(value)||value<0)throw new TypeError(`${label}无效。`);return String(value);}if(typeof value==="string"&&/^(0|[1-9]\d*)$/.test(value))return value;throw new TypeError(`${label}无效。`);}
export function validateReadiness(value:unknown,detail:boolean):P09Readiness{const envelope=object(value,"就绪响应"),data=object(envelope.data,"就绪数据"),keys=detail?["readinessState","reasonCode","activeCount","staleCount","totalCapacity","observedAt","secondaryReasons"]:["readinessState","reasonCode","activeCount","staleCount","totalCapacity","observedAt"];exact(envelope,["data"],"就绪响应");exact(data,keys,"就绪数据");if(typeof data.readinessState!=="string"||!data.readinessState||typeof data.reasonCode!=="string"||!data.reasonCode||!Number.isFinite(Date.parse(String(data.observedAt))))throw new TypeError("就绪状态无效。");let secondaryReasons:string[]|undefined;if(detail){if(!Array.isArray(data.secondaryReasons)||data.secondaryReasons.some(reason=>typeof reason!=="string"||!reason||reason.length>128))throw new TypeError("就绪次要原因无效。");secondaryReasons=data.secondaryReasons as string[];}const serialized=JSON.stringify(data);if(/postgresql:\/\/|password|token|stack|filesystem|DATABASE_URL|instanceId|host|pid|providerAccount|credential/i.test(serialized))throw new TypeError("就绪响应包含敏感数据。");return{readinessState:data.readinessState,reasonCode:data.reasonCode,activeCount:bigintText(data.activeCount,"活跃实例数"),staleCount:bigintText(data.staleCount,"过期实例数"),totalCapacity:bigintText(data.totalCapacity,"总容量"),observedAt:String(data.observedAt),...(secondaryReasons?{secondaryReasons}:{}),detail};}
