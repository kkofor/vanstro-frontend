export type ApiConfig = {
  runtimeMode: RuntimeMode;
  hostname: string;
  port: number;
  trustProxyHeaders: boolean;
  inventorySnapshotTtlMs: number;
  paymentCallbackSecret: string;
  erpWebhookSecret?: string;
  deliveryFlatFeeCents: number;
  enablePaymentSimulation: boolean;
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

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const mode = runtimeMode(env.VANSTRO_RUNTIME_MODE);
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
    required("EMAIL_SETTINGS_ENCRYPTION_KEY", env.EMAIL_SETTINGS_ENCRYPTION_KEY);
  }

  return {
    runtimeMode: mode,
    hostname: required("API_HOST", env.API_HOST ?? "0.0.0.0"),
    port: integer("API_PORT", env.API_PORT, 4000, 1, 65535),
    trustProxyHeaders: trustProxyHeaders(env),
    inventorySnapshotTtlMs: integer("INVENTORY_SNAPSHOT_TTL_MS", env.INVENTORY_SNAPSHOT_TTL_MS, 5 * 60 * 1000, 1000, 24 * 60 * 60 * 1000),
    paymentCallbackSecret: deploymentSecret("PAYMENT_CALLBACK_SECRET", env.PAYMENT_CALLBACK_SECRET, mode),
    erpWebhookSecret: mode === "deployment"
      ? deploymentSecret("ERP_WEBHOOK_SECRET", env.ERP_WEBHOOK_SECRET, mode)
      : env.ERP_WEBHOOK_SECRET?.trim() || undefined,
    deliveryFlatFeeCents: integer("DELIVERY_FLAT_FEE_CENTS", env.DELIVERY_FLAT_FEE_CENTS, 1500, 0, 100000000),
    enablePaymentSimulation
  };
}
