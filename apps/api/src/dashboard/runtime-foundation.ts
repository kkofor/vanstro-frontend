import { createHash } from "node:crypto";
import {
  p09ConfigActivate,
  p09ConfigList,
  p09ConfigPropose,
  p09ConfigRollback,
  p09FlagActivate,
  p09FlagList,
  p09FlagPropose,
  prisma,
  Prisma,
  type P09Binding,
  type P09Scope
} from "@vanstro/db";
import { Hono } from "hono";
import type { DashboardEnv } from "./access.js";
import { resolveDashboardAuthorization, permissionGrant } from "./authorization.js";
import { publicError } from "../public-errors.js";
import { readBody } from "./request.js";
import { collectRuntimeReadiness } from "../readiness.js";

export const P09_CONTRACT_VERSION = "runtime-foundation.v1" as const;
export const P09_REGISTRY_VERSION = "runtime-foundation-registry.v1" as const;

const CONFIG_REGISTRY = {
  "foundation.runtime.refresh_interval_seconds": { type: "bounded_integer", defaultValue: 30, scopes: ["global", "dealer", "location"], minimum: 5, maximum: 300, label: "刷新间隔", owner: "P09" },
  "foundation.runtime.display_mode": { type: "enum", defaultValue: "standard", scopes: ["global", "dealer", "location"], values: ["standard", "compact"], label: "显示模式", owner: "P09" },
  "foundation.runtime.safe_origin": { type: "origin", defaultValue: "https://vanstro.ca", scopes: ["global"], label: "安全来源", owner: "P09" }
} as const;
const FLAG_REGISTRY = {
  "foundation.runtime.sample_flag": { defaultState: "disabled", scopes: ["global", "dealer", "location"], owner: "P09", reviewAt: "2026-09-03" }
} as const;
const PROTECTED_DESCRIPTORS = [
  "database.connection", "auth.session_signing", "payment.credentials", "storage.credentials", "email.encryption", "smtp.credentials", "erp.credentials", "runtime.roles", "production.safety_lock"
] as const;

function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function requestId(context: any) { return context.res.headers.get("X-Request-Id") ?? "p09-request"; }
function parseScope(url: string): P09Scope | undefined {
  const query = new URL(url).searchParams;
  const kind = query.get("scopeKind") ?? "global";
  const dealerIds = [...new Set(query.getAll("dealerId"))].sort();
  const locationIds = [...new Set(query.getAll("locationId"))].sort();
  if (kind === "global" && !dealerIds.length && !locationIds.length) return { kind, dealerIds, locationIds };
  if (kind === "dealer" && dealerIds.length && !locationIds.length) return { kind, dealerIds, locationIds };
  if (kind === "location" && dealerIds.length && locationIds.length) return { kind, dealerIds, locationIds };
  return undefined;
}
function binding(context: any, permission: string, scope: P09Scope | undefined): P09Binding | undefined {
  if (!scope) return undefined;
  const authorization = context.get("p02Authorization");
  const grant = permissionGrant(authorization, permission);
  if (!grant) return undefined;
  const exact = grant.global ? scope.kind === "global" && !scope.dealerIds.length && !scope.locationIds.length
    : JSON.stringify([...grant.dealerIds].sort()) === JSON.stringify(scope.dealerIds)
      && JSON.stringify([...grant.locationIds].sort()) === JSON.stringify(scope.locationIds)
      && scope.kind === (scope.locationIds.length ? "location" : "dealer");
  if (!exact) return undefined;
  return {
    actorId: authorization.actorId,
    sessionTokenHash: context.get("actorSessionTokenHash"),
    contextRevision: authorization.contextRevision,
    scopeFingerprint: hash(scope),
    fieldVisibilityFingerprint: hash({ profile: "p09-safe.v1", permission }),
    scope
  };
}
function safeRow(row: Record<string, any>) {
  const clean = { ...row };
  delete clean.idempotencyKeyHash; delete clean.requestHash; delete clean.createdBy;
  if (typeof clean.generation === "bigint") clean.generation = Number(clean.generation);
  if (typeof clean.version === "bigint") clean.version = Number(clean.version);
  if (clean.createdAt instanceof Date) clean.createdAt = clean.createdAt.toISOString();
  return clean;
}
function configRow(row: Record<string, any>) {
  return {
    configKey: String(row.configKey ?? row.config_key),
    schemaVersion: String(row.schemaVersion ?? row.schema_version),
    activeVersion: row.activeVersion ?? row.active_version ?? null,
    safeValue: row.safeValue ?? row.safe_value ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ? new Date(row.updatedAt ?? row.updated_at).toISOString() : null,
  };
}
function flagRow(row: Record<string, any>) {
  return {
    flagKey: String(row.flagKey ?? row.flag_key),
    schemaVersion: String(row.schemaVersion ?? row.schema_version),
    activeState: row.activeState ?? row.active_state ?? null,
    version: Number(row.version),
    updatedAt: row.updatedAt ?? row.updated_at ? new Date(row.updatedAt ?? row.updated_at).toISOString() : null,
  };
}
function readinessRow(row: Record<string, any>, detail = false) {
  return {
    readinessState: String(row.readinessState ?? row.readiness_state),
    reasonCode: String(row.reasonCode ?? row.reason_code),
    activeCount: String(row.activeCount ?? row.active_count),
    staleCount: String(row.staleCount ?? row.stale_count),
    totalCapacity: String(row.totalCapacity ?? row.total_capacity),
    observedAt: new Date(row.observedAt ?? row.observed_at).toISOString(),
    ...(detail ? { secondaryReasons: row.secondaryReasons ?? row.secondary_reasons ?? [] } : {}),
  };
}
function desiredValueValid(key: keyof typeof CONFIG_REGISTRY, value: unknown) {
  if (key === "foundation.runtime.refresh_interval_seconds") return Number.isInteger(value) && Number(value) >= 5 && Number(value) <= 300;
  if (key === "foundation.runtime.display_mode") return value === "standard" || value === "compact";
  if (key === "foundation.runtime.safe_origin") {
    if (typeof value !== "string" || value.length > 253) return false;
    try { const url = new URL(value); return url.protocol === "https:" && url.origin === value && !url.username && !url.password; } catch { return false; }
  }
  return false;
}
function bodyKeys(body: Record<string, unknown>, allowed: string[]) { return Object.keys(body).every((key) => allowed.includes(key)); }
function mapError(context: any, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("P09_VERSION_CONFLICT")) return publicError(context, 409, "VERSION_CONFLICT", "The current version changed.");
  if (message.includes("P09_IDEMPOTENCY_CONFLICT")) return publicError(context, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key conflicts with another request.");
  if (message.includes("P09_REQUEST_INVALID")) return publicError(context, 400, "CONFIG_VALUE_INVALID", "The requested runtime change is invalid.");
  if (message.includes("P09_RESOURCE_UNAVAILABLE")) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "The requested runtime resource is unavailable.");
  throw error;
}

function descriptorState(env: NodeJS.ProcessEnv) {
  return PROTECTED_DESCRIPTORS.map((key) => ({
    key, sensitivity: "secret", mutability: "immutable_deployment", activationMode: "restart_or_redeploy",
    runtimeOverrideAllowed: false, state: key === "database.connection" ? (env.DATABASE_URL ? "configured" : "missing") : "unknown"
  }));
}

export function legacyRuntimeReadinessSnapshot(env: NodeJS.ProcessEnv = process.env) {
  const now = new Date();
  const observedAt = now.toISOString();
  const staleAfter = new Date(now.getTime() + 15_000).toISOString();
  const registryValid = Object.keys(CONFIG_REGISTRY).length === 3 && Object.keys(FLAG_REGISTRY).length === 1;
  const dependencies = [
    { key: "database", required: true, state: env.DATABASE_URL ? "ready" : "not_configured", reasonCode: env.DATABASE_URL ? "configured" : "missing" },
    { key: "auth_session", required: true, state: "ready", reasonCode: "registry_valid" },
    { key: "p02_rbac", required: true, state: "ready", reasonCode: "registry_valid" },
    { key: "p04_audit", required: true, state: "ready", reasonCode: "registry_valid" },
    { key: "p05_job_registry", required: false, state: "ready", reasonCode: "registry_valid" },
    { key: "smtp", required: false, state: env.SMTP_HOST ? "ready" : "not_configured", reasonCode: env.SMTP_HOST ? "configured" : "missing" },
    { key: "erp", required: false, state: env.ERP_API_BASE_URL ? "ready" : "not_configured", reasonCode: env.ERP_API_BASE_URL ? "configured" : "missing" },
    { key: "payment", required: false, state: env.MONERIS_STORE_ID ? "ready" : "not_configured", reasonCode: env.MONERIS_STORE_ID ? "configured" : "missing" }
  ] as const;
  const criticalReady = registryValid && dependencies.filter((dependency) => dependency.required).every((dependency) => dependency.state === "ready");
  const degraded = dependencies.some((dependency) => !dependency.required && dependency.state !== "ready");
  return { contractVersion: P09_CONTRACT_VERSION, registryVersion: P09_REGISTRY_VERSION, state: criticalReady ? (degraded ? "degraded" : "ready") : "not_ready", reasonCode: criticalReady ? (degraded ? "optional_dependency_unavailable" : "ready") : "required_dependency_unavailable", observedAt, staleAfter, generation: hash({ registry: P09_REGISTRY_VERSION, criticalReady, degraded }), dependencies };
}

export function createDashboardRuntimeFoundationRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/runtime/config", async (context) => {
    if (new URL(context.req.url).search) return publicError(context, 400, "DASHBOARD_INVALID", "Collection scope query parameters are not accepted.");
    const scope: P09Scope = { kind: "global", dealerIds: [], locationIds: [] };
    const bound = binding(context, "config.read", scope);
    if (!bound) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "The requested runtime resource is unavailable.");
    const rows = await p09ConfigList(prisma, bound);
    return context.json({ data: rows.map(configRow) });
  });
  routes.get("/dashboard/runtime/config/:key", async (context) => {
    const key = context.req.param("key"); if (!(key in CONFIG_REGISTRY)) return publicError(context, 404, "CONFIG_KEY_UNSUPPORTED", "The requested runtime resource is unavailable.");
    if (new URL(context.req.url).search) return publicError(context, 400, "DASHBOARD_INVALID", "Detail scope query parameters are not accepted.");
    const scope: P09Scope = { kind: "global", dealerIds: [], locationIds: [] }; const bound = binding(context, "config.read", scope);
    if (!bound) return publicError(context, 404, "DASHBOARD_NOT_FOUND", "The requested runtime resource is unavailable.");
    const rows = await p09ConfigList(prisma, bound); const state = rows.map(configRow).find((row) => row.configKey === key);
    return context.json({ data: { contractVersion: P09_CONTRACT_VERSION, descriptor: { key, ...CONFIG_REGISTRY[key as keyof typeof CONFIG_REGISTRY] }, state: state ?? { desiredValue: CONFIG_REGISTRY[key as keyof typeof CONFIG_REGISTRY].defaultValue, effectiveValue: CONFIG_REGISTRY[key as keyof typeof CONFIG_REGISTRY].defaultValue, desiredSource: "compiled_default", effectiveSource: "compiled_default", version: 0, generation: 0, validationStatus: "validated", activationStatus: "active" }, contextRevision: bound.contextRevision, scope: bound.scope } });
  });
  routes.post("/dashboard/runtime/config/:key/versions", async (context) => {
    const key = context.req.param("key") as keyof typeof CONFIG_REGISTRY; const body = await readBody(context);
    if (!(key in CONFIG_REGISTRY)) return publicError(context, 404, "CONFIG_KEY_UNSUPPORTED", "The requested runtime resource is unavailable.");
    if (!body || !bodyKeys(body,["schemaVersion","desiredValue","expectedVersion"]) || body.schemaVersion !== "runtime-config-schema.v1" || !desiredValueValid(key,body.desiredValue) || !Number.isInteger(body.expectedVersion)) return publicError(context,400,"CONFIG_VALUE_INVALID","The requested runtime value is invalid.");
    const scope=parseScope(context.req.url); const bound=scope&&binding(context,"config.manage",scope); const idempotency=context.req.header("Idempotency-Key");
    if(!bound||!idempotency)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");
    const canonical={key,scope,body}; try { const rows=await p09ConfigPropose(prisma,{...bound,key,schemaVersion:String(body.schemaVersion),desiredValue:body.desiredValue as Prisma.InputJsonValue,expectedVersion:Number(body.expectedVersion),idempotencyHash:hash(idempotency),requestHash:hash(canonical),requestId:requestId(context)}); return context.json({data:safeRow(rows[0]!)},201); } catch(error){return mapError(context,error);}
  });
  routes.post("/dashboard/runtime/config/:key/activate", async (context) => {
    const key=context.req.param("key"); const body=await readBody(context); if(!(key in CONFIG_REGISTRY)||!body||!bodyKeys(body,["expectedVersion","simulateFailure"])||!Number.isInteger(body.expectedVersion)||(body.simulateFailure!==undefined&&typeof body.simulateFailure!=="boolean"))return publicError(context,400,"CONFIG_VALUE_INVALID","The activation request is invalid.");
    const scope=parseScope(context.req.url);const bound=scope&&binding(context,"config.activate",scope);const idempotency=context.req.header("Idempotency-Key");if(!bound||!idempotency)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");
    try{const rows=await p09ConfigActivate(prisma,{...bound,key,expectedVersion:Number(body.expectedVersion),idempotencyHash:hash(idempotency),requestHash:hash({key,scope,body}),requestId:requestId(context),simulateFailure:body.simulateFailure===true});const row=safeRow(rows[0]!);if(row.activationStatus==="activation_failed")return context.json({error:"The desired value was saved but activation failed.",code:"CONFIG_ACTIVATION_FAILED",data:row,requestId:requestId(context)},503);return context.json({data:row});}catch(error){return mapError(context,error);}
  });
  routes.post("/dashboard/runtime/config/:key/retry", async (context) => {
    const key=context.req.param("key");const body=await readBody(context);if(!(key in CONFIG_REGISTRY)||!body||!bodyKeys(body,["expectedVersion"])||!Number.isInteger(body.expectedVersion))return publicError(context,400,"CONFIG_VALUE_INVALID","The retry request is invalid.");const scope=parseScope(context.req.url);const bound=scope&&binding(context,"config.activate",scope);const idempotency=context.req.header("Idempotency-Key");if(!bound||!idempotency)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");try{const rows=await p09ConfigActivate(prisma,{...bound,key,expectedVersion:Number(body.expectedVersion),idempotencyHash:hash(idempotency),requestHash:hash({key,scope,body,retry:true}),requestId:requestId(context),simulateFailure:false});return context.json({data:safeRow(rows[0]!)});}catch(error){return mapError(context,error);}
  });
  routes.post("/dashboard/runtime/config/:key/rollback", async (context) => {
    const key=context.req.param("key");const body=await readBody(context);if(!(key in CONFIG_REGISTRY)||!body||!bodyKeys(body,["expectedVersion","rollbackVersion"])||!Number.isInteger(body.expectedVersion)||!Number.isInteger(body.rollbackVersion))return publicError(context,400,"CONFIG_VALUE_INVALID","The rollback request is invalid.");const scope=parseScope(context.req.url);const manage=binding(context,"config.manage",scope);const activate=binding(context,"config.activate",scope);const idempotency=context.req.header("Idempotency-Key");if(!scope||!manage||!activate||!idempotency)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");try{const rows=await p09ConfigRollback(prisma,{...activate,key,expectedVersion:Number(body.expectedVersion),rollbackVersion:Number(body.rollbackVersion),idempotencyHash:hash(idempotency),requestHash:hash({key,scope,body}),requestId:requestId(context)});return context.json({data:safeRow(rows[0]!)});}catch(error){return mapError(context,error);}
  });

  routes.get("/dashboard/runtime/flags", async (context) => {const scope=parseScope(context.req.url);const bound=scope&&binding(context,"flags.read",scope);if(!bound)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");const rows=await p09FlagList(prisma,bound);return context.json({data:rows.map(flagRow)});});
  routes.get("/dashboard/runtime/flags/:key", async (context) => {const key=context.req.param("key");if(!(key in FLAG_REGISTRY))return publicError(context,404,"FLAG_KEY_UNSUPPORTED","The requested runtime resource is unavailable.");const scope=parseScope(context.req.url);const bound=scope&&binding(context,"flags.read",scope);if(!bound)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");const rows=await p09FlagList(prisma,bound);const state=rows.map(flagRow).find(row=>row.flagKey===key)??{flagKey:key,schemaVersion:"runtime-flag-schema.v1",activeState:"disabled",version:0,updatedAt:null};return context.json({data:{descriptor:{key,...FLAG_REGISTRY[key as keyof typeof FLAG_REGISTRY]},state,evaluation:{enabled:false,state:state.activeState??"disabled",reasonCode:state.activeState==="killed"?"killed":"safe_default"},contextRevision:bound.contextRevision,scope:bound.scope}});});
  routes.post("/dashboard/runtime/flags/:key/versions",async(context)=>{const key=context.req.param("key");const body=await readBody(context);const allowed=["disabled","internal","read_only","limited","enabled"];if(!(key in FLAG_REGISTRY)||!body||!bodyKeys(body,["desiredState","expectedVersion"])||!allowed.includes(String(body.desiredState))||!Number.isInteger(body.expectedVersion))return publicError(context,400,"FLAG_STATE_INVALID","The flag state is invalid.");const scope=parseScope(context.req.url);const bound=scope&&binding(context,"flags.manage",scope);const idempotency=context.req.header("Idempotency-Key");if(!bound||!idempotency)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");try{const rows=await p09FlagPropose(prisma,{...bound,key,desiredState:String(body.desiredState),expectedVersion:Number(body.expectedVersion),idempotencyHash:hash(idempotency),requestHash:hash({key,scope,body}),requestId:requestId(context)});return context.json({data:safeRow(rows[0]!)},201);}catch(error){return mapError(context,error);}});
  routes.post("/dashboard/runtime/flags/:key/activate",async(context)=>{const key=context.req.param("key");const body=await readBody(context);if(!(key in FLAG_REGISTRY)||!body||!bodyKeys(body,["expectedVersion"])||!Number.isInteger(body.expectedVersion))return publicError(context,400,"FLAG_STATE_INVALID","The activation request is invalid.");const scope=parseScope(context.req.url);const bound=scope&&binding(context,"flags.manage",scope);if(!bound)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");try{const rows=await p09FlagActivate(prisma,{...bound,key,expectedVersion:Number(body.expectedVersion),kill:false,requestId:requestId(context)});return context.json({data:safeRow(rows[0]!)});}catch(error){return mapError(context,error);}});
  routes.post("/dashboard/runtime/flags/:key/kill",async(context)=>{const key=context.req.param("key");const body=await readBody(context);if(!(key in FLAG_REGISTRY)||!body||!bodyKeys(body,["expectedVersion","confirmation"])||!Number.isInteger(body.expectedVersion)||body.confirmation!=="KILL")return publicError(context,400,"FLAG_KILL_CONFIRMATION_REQUIRED","Exact kill confirmation is required.");const scope=parseScope(context.req.url);const bound=scope&&binding(context,"flags.kill_switch",scope);if(!bound)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");try{const rows=await p09FlagActivate(prisma,{...bound,key,expectedVersion:Number(body.expectedVersion),kill:true,confirmation:"KILL",requestId:requestId(context)});return context.json({data:safeRow(rows[0]!)});}catch(error){return mapError(context,error);}});
  routes.post("/dashboard/runtime/flags/:key/evaluate",async(context)=>{const key=context.req.param("key");const body=await readBody(context);if(!(key in FLAG_REGISTRY)||!body||Object.keys(body).length)return publicError(context,400,"FLAG_STATE_INVALID","Client targeting rules are not accepted.");const scope=parseScope(context.req.url);const bound=scope&&binding(context,"flags.read",scope);if(!bound)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");const rows=await p09FlagList(prisma,bound);const state=rows.map(flagRow).find(row=>row.flagKey===key);const effective=String(state?.activeState??"disabled");return context.json({data:{key,state:effective,enabled:effective==="enabled",reasonCode:effective==="killed"?"killed":state?"effective_state":"safe_default",contextRevision:bound.contextRevision,generation:state?.version??0}});});
  routes.get("/dashboard/runtime/readiness/summary",async(context)=>{const scope=parseScope(context.req.url);const summary=scope&&binding(context,"readiness.read_summary",scope);if(!summary)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");const rows=await prisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT * FROM public.p09_readiness_summary_v2(${summary.sessionTokenHash},'p09_readiness_summary',${summary.contextRevision},0::bigint)`);return context.json({data:rows[0]?readinessRow(rows[0]):null})});routes.get("/dashboard/runtime/readiness/detail",async(context)=>{const scope=parseScope(context.req.url);const detail=scope&&binding(context,"readiness.read_detail",scope);if(!detail)return publicError(context,404,"DASHBOARD_NOT_FOUND","The requested runtime resource is unavailable.");const rows=await prisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT * FROM public.p09_readiness_detail_v2(${detail.sessionTokenHash},'p09_readiness_detail',${detail.contextRevision},0::bigint)`);return context.json({data:rows[0]?readinessRow(rows[0],true):null})});
  return routes;
}
