import { createHash } from "node:crypto";
import { parseCursorKeyset, type CursorKeyset } from "./dashboard/common-query.js";
import { parseJobKeyset, parseMediaKeyset, type JobKeyset, type MediaKeyset } from "@vanstro/db";

let validatedDashboardCursorKeyset: CursorKeyset | undefined;
let dashboardProductsQueryReady = false;
let dashboardDealersQueryReady = false;
let dashboardAuditQueryReady = false;
let dashboardAsyncJobReady = false;
let validatedJobKeyset: JobKeyset | undefined;
let validatedRuntimeMode: RuntimeMode = "deployment";
let dashboardWorkQueueReady=false;
let validatedWorkQueueKeyset: JobKeyset|undefined;
let validatedMediaUploadKeyset:MediaKeyset|undefined,validatedMediaRetryKeyset:MediaKeyset|undefined,mediaPrivateRoot:string|undefined,mediaDeploymentEnvironmentId:string|undefined,mediaExpectedImageDigest:string|undefined,mediaExpectedPdfDigest:string|undefined,mediaExpectedSandboxDigest:string|undefined,mediaExpectedParserDigest:string|undefined,mediaExpectedSecurityDigest:string|undefined;
export function dashboardCommonQueryReadiness() {
  const generationHash = validatedDashboardCursorKeyset
    ? createHash("sha256").update("vanstro:cq:keyset-generation:v1\0", "ascii").update(JSON.stringify({ activeKid: validatedDashboardCursorKeyset.activeKid, keys: [...validatedDashboardCursorKeyset.keys].sort((a,b)=>a.kid.localeCompare(b.kid)).map(({ kid, key, mode }) => ({ kid, mode, keyFingerprint: createHash("sha256").update("vanstro:cq:key:v1\0", "ascii").update(key).digest("base64url") })) })).digest("base64url")
    : undefined;
  return { products: dashboardProductsQueryReady, dealers: dashboardDealersQueryReady && validatedDashboardCursorKeyset !== undefined, audit: dashboardAuditQueryReady && validatedDashboardCursorKeyset !== undefined, keyset: validatedDashboardCursorKeyset, activeKid: validatedDashboardCursorKeyset?.activeKid, generationHash } as const;
}
export function asyncJobReadiness(){return{enabled:dashboardAsyncJobReady&&validatedDashboardCursorKeyset!==undefined&&validatedJobKeyset!==undefined,keyset:validatedJobKeyset,runtimeMode:validatedRuntimeMode,registryVersion:"async-job-registry.v1" as const}}
export function workQueueReadiness(){return{enabled:dashboardWorkQueueReady&&validatedDashboardCursorKeyset!==undefined&&validatedWorkQueueKeyset!==undefined,keyset:validatedWorkQueueKeyset,runtimeMode:validatedRuntimeMode,registryVersion:"work-queue-registry.v1" as const}}
export function mediaConfig(){return{queryReady:validatedDashboardCursorKeyset!==undefined,uploadKeyset:validatedMediaUploadKeyset,retryKeyset:validatedMediaRetryKeyset,privateRoot:mediaPrivateRoot,deploymentEnvironmentId:mediaDeploymentEnvironmentId,expectedDigests:{image:mediaExpectedImageDigest??"",pdf:mediaExpectedPdfDigest??"",sandbox:mediaExpectedSandboxDigest??"",parser:mediaExpectedParserDigest??"",security:mediaExpectedSecurityDigest??""},runtimeMode:validatedRuntimeMode,registryVersion:"media-registry.v1" as const}}

export type ApiConfig = {
  runtimeMode: RuntimeMode;
  hostname: string;
  port: number;
  trustProxyHeaders: boolean;
  inventorySnapshotTtlMs: number;
  inventorySourceMode: "manual" | "erp";
  paymentCallbackSecret: string;
  erpWebhookSecret?: string;
  deliveryFlatFeeCents: number;
  enablePaymentSimulation: boolean;
  dashboardQueryCursorKeys?: string;
  dashboardCommonQueryProductsReady?: boolean;
  dashboardCommonQueryDealersReady?: boolean;
  dashboardAuditFoundationReady?: boolean;
  dashboardAsyncJobFoundationReady?: boolean;
  asyncJobIdempotencyKeys?: string;
  dashboardWorkQueueFoundationReady?: boolean;
  workQueueDedupKeys?: string;
  mediaUploadCapabilityKeys?:string;
  mediaRetryCommandKeys?:string;
  mediaPrivateRoot?:string;
  mediaDeploymentEnvironmentId?:string;
};

type RuntimeMode = "development" | "test" | "deployment";

function runtimeMode(value: string | undefined): RuntimeMode {
  if (!value) return "deployment";
  if (value === "development" || value === "test" || value === "deployment") return value;
  throw new Error("VANSTRO_RUNTIME_MODE must be development, test or deployment.");
}

function required(name: string, value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required.`);
  return normalized;
}

function integer(name: string, value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = value === undefined || value.trim() === "" ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

export function trustProxyHeaders(env: NodeJS.ProcessEnv = process.env) {
  const value = env.TRUST_PROXY_HEADERS?.trim().toLowerCase();
  if (!value || value === "false") return false;
  if (value === "true") return true;
  throw new Error("TRUST_PROXY_HEADERS must be either true or false.");
}

function deploymentSecret(name: string, value: string | undefined, mode: RuntimeMode) {
  const secret = required(name, value);
  if (mode === "deployment" && (secret.length < 32 || secret.toLowerCase().includes("replace-with"))) {
    throw new Error(`${name} must be a non-placeholder secret of at least 32 characters in deployment mode.`);
  }
  return secret;
}

function inventorySourceMode(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "erp";
  if (normalized === "manual" || normalized === "erp") return normalized;
  throw new Error("INVENTORY_SOURCE_MODE must be manual or erp.");
}

function emailEncryptionKey(value: string | undefined, mode: RuntimeMode) {
  const key = required("EMAIL_SETTINGS_ENCRYPTION_KEY", value);
  if (mode === "deployment" && Buffer.from(key, "base64").length !== 32) {
    throw new Error("EMAIL_SETTINGS_ENCRYPTION_KEY must be a base64-encoded 32-byte key in deployment mode.");
  }
  return key;
}

function exactBoolean(name: string, value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "false") return false;
  if (normalized === "true") return true;
  throw new Error(`${name} must be either true or false.`);
}

function cursorKeyset(value: string | undefined, requiredInDeployment: boolean, mode: RuntimeMode) {
  const normalized = value?.trim();
  if (!normalized) {
    validatedDashboardCursorKeyset = undefined;
    if (requiredInDeployment && mode === "deployment") throw new Error("DASHBOARD_QUERY_CURSOR_KEYS is required in deployment mode.");
    return undefined;
  }
  // Startup validates the complete keyset without exposing its secret values.
  try { validatedDashboardCursorKeyset = parseCursorKeyset(normalized); }
  catch { validatedDashboardCursorKeyset = undefined; throw new Error("DASHBOARD_QUERY_CURSOR_KEYS must be a valid cursor keyset."); }
  return normalized;
}

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const mode = runtimeMode(env.VANSTRO_RUNTIME_MODE);
  validatedRuntimeMode = mode;
  required("DATABASE_URL", env.DATABASE_URL);
  const enablePaymentSimulation = env.ENABLE_PAYMENT_SIMULATION?.trim().toLowerCase() === "true";
  const demoIntegrations = env.ENABLE_DEMO_INTEGRATIONS?.trim().toLowerCase() === "true";
  if (mode === "deployment" && demoIntegrations) {
    throw new Error("ENABLE_DEMO_INTEGRATIONS must be false in deployment mode.");
  }
  if (mode === "deployment" && enablePaymentSimulation) {
    throw new Error("ENABLE_PAYMENT_SIMULATION must be false in deployment mode.");
  }
  if (mode === "deployment") {
    emailEncryptionKey(env.EMAIL_SETTINGS_ENCRYPTION_KEY, mode);
  }
  dashboardProductsQueryReady = exactBoolean("DASHBOARD_COMMON_QUERY_PRODUCTS_READY", env.DASHBOARD_COMMON_QUERY_PRODUCTS_READY);
  dashboardDealersQueryReady = exactBoolean("DASHBOARD_COMMON_QUERY_DEALERS_READY", env.DASHBOARD_COMMON_QUERY_DEALERS_READY);
  dashboardAuditQueryReady = exactBoolean("DASHBOARD_AUDIT_FOUNDATION_READY", env.DASHBOARD_AUDIT_FOUNDATION_READY);
  dashboardAsyncJobReady = exactBoolean("DASHBOARD_ASYNC_JOB_FOUNDATION_READY", env.DASHBOARD_ASYNC_JOB_FOUNDATION_READY);
  const dashboardQueryCursorKeys = cursorKeyset(env.DASHBOARD_QUERY_CURSOR_KEYS, dashboardDealersQueryReady || dashboardAuditQueryReady || dashboardAsyncJobReady, mode);
  const asyncJobIdempotencyKeys = env.ASYNC_JOB_IDEMPOTENCY_KEYS?.trim();
  try { validatedJobKeyset = asyncJobIdempotencyKeys ? parseJobKeyset(asyncJobIdempotencyKeys) : undefined; }
  catch { validatedJobKeyset = undefined; throw new Error("ASYNC_JOB_IDEMPOTENCY_KEYS must be a valid Job keyset."); }
  if (dashboardAsyncJobReady && !validatedJobKeyset) throw new Error("ASYNC_JOB_IDEMPOTENCY_KEYS is required when the Async Job foundation is ready.");
  dashboardWorkQueueReady=exactBoolean("DASHBOARD_WORK_QUEUE_FOUNDATION_READY",env.DASHBOARD_WORK_QUEUE_FOUNDATION_READY);
  const workQueueDedupKeys=env.WORK_QUEUE_DEDUP_KEYS?.trim();try{validatedWorkQueueKeyset=workQueueDedupKeys?parseJobKeyset(workQueueDedupKeys):undefined}catch{validatedWorkQueueKeyset=undefined;throw new Error("WORK_QUEUE_DEDUP_KEYS must be a valid keyset.")}if(dashboardWorkQueueReady&&(!validatedWorkQueueKeyset||!validatedDashboardCursorKeyset))throw new Error("Work Queue keysets are required when ready.");
  const mediaUploadCapabilityKeys=env.MEDIA_UPLOAD_CAPABILITY_KEYS?.trim(),mediaRetryCommandKeys=env.MEDIA_RETRY_COMMAND_KEYS?.trim();try{validatedMediaUploadKeyset=mediaUploadCapabilityKeys?parseMediaKeyset(mediaUploadCapabilityKeys):undefined;validatedMediaRetryKeyset=mediaRetryCommandKeys?parseMediaKeyset(mediaRetryCommandKeys):undefined}catch{validatedMediaUploadKeyset=validatedMediaRetryKeyset=undefined;throw new Error("Media HMAC keysets must be valid.")}mediaPrivateRoot=env.MEDIA_PRIVATE_ROOT?.trim();mediaDeploymentEnvironmentId=env.MEDIA_DEPLOYMENT_ENVIRONMENT_ID?.trim();mediaExpectedImageDigest=env.MEDIA_IMAGE_CONFIG_DIGEST?.trim();mediaExpectedPdfDigest=env.MEDIA_PDF_CONFIG_DIGEST?.trim();mediaExpectedSandboxDigest=env.MEDIA_SANDBOX_IMAGE_DIGEST?.trim();mediaExpectedParserDigest=env.MEDIA_PARSER_DIGEST?.trim();mediaExpectedSecurityDigest=env.MEDIA_SECURITY_POLICY_DIGEST?.trim();

  return {
    runtimeMode: mode,
    hostname: required("API_HOST", env.API_HOST ?? "0.0.0.0"),
    port: integer("API_PORT", env.API_PORT, 4000, 1, 65535),
    trustProxyHeaders: trustProxyHeaders(env),
    inventorySnapshotTtlMs: integer("INVENTORY_SNAPSHOT_TTL_MS", env.INVENTORY_SNAPSHOT_TTL_MS, 5 * 60 * 1000, 1000, 24 * 60 * 60 * 1000),
    inventorySourceMode: inventorySourceMode(env.INVENTORY_SOURCE_MODE),
    paymentCallbackSecret: deploymentSecret("PAYMENT_CALLBACK_SECRET", env.PAYMENT_CALLBACK_SECRET, mode),
    erpWebhookSecret: mode === "deployment"
      ? deploymentSecret("ERP_WEBHOOK_SECRET", env.ERP_WEBHOOK_SECRET, mode)
      : env.ERP_WEBHOOK_SECRET?.trim() || undefined,
    deliveryFlatFeeCents: integer("DELIVERY_FLAT_FEE_CENTS", env.DELIVERY_FLAT_FEE_CENTS, 1500, 0, 100000000),
    enablePaymentSimulation,
    dashboardQueryCursorKeys,
    dashboardCommonQueryProductsReady: dashboardProductsQueryReady,
    dashboardCommonQueryDealersReady: dashboardDealersQueryReady,
    dashboardAuditFoundationReady: dashboardAuditQueryReady,
    dashboardAsyncJobFoundationReady: dashboardAsyncJobReady,
    asyncJobIdempotencyKeys,
    dashboardWorkQueueFoundationReady: dashboardWorkQueueReady,
    workQueueDedupKeys,
    mediaUploadCapabilityKeys,
    mediaRetryCommandKeys,
    mediaPrivateRoot,
    mediaDeploymentEnvironmentId
  };
}
