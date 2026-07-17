export type WorkerConfig = {
  databaseUrl: string;
  pollIntervalMs: number;
  emailLockTtlMs: number;
  maxEmailAttempts: number;
  smtp?: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
  };
  erp?: {
    baseUrl: string;
    serviceToken: string;
    lockTtlMs: number;
    maxAttempts: number;
  };
};

type RuntimeMode = "development" | "deployment";

function runtimeMode(value: string | undefined): RuntimeMode {
  if (!value) return "deployment";
  if (value === "development" || value === "deployment") return value;
  throw new Error("VANSTRO_RUNTIME_MODE must be either development or deployment.");
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

function configuredGroup(env: NodeJS.ProcessEnv, names: string[], requiredInDeployment: boolean, mode: RuntimeMode) {
  const configured = names.filter((name) => Boolean(env[name]?.trim()));
  if (configured.length === 0 && !requiredInDeployment) return false;
  if (configured.length !== names.length) {
    const missing = names.filter((name) => !env[name]?.trim());
    const reason = requiredInDeployment ? "in deployment mode" : "when this integration is enabled";
    throw new Error(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required ${reason}.`);
  }
  if (mode === "deployment") {
    for (const name of names.filter((candidate) => candidate.includes("PASSWORD") || candidate.includes("TOKEN"))) {
      const secret = env[name]?.trim() ?? "";
      if (secret.length < 32 || secret.toLowerCase().includes("replace-with")) {
        throw new Error(`${name} must be a non-placeholder secret of at least 32 characters in deployment mode.`);
      }
    }
  }
  return true;
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const mode = runtimeMode(env.VANSTRO_RUNTIME_MODE);
  const databaseUrl = required("DATABASE_URL", env.DATABASE_URL);
  const smtpNames = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"];
  const erpNames = ["ERP_API_BASE_URL", "ERP_SERVICE_TOKEN"];
  const smtpEnabled = configuredGroup(env, smtpNames, mode === "deployment", mode);
  const erpEnabled = configuredGroup(env, erpNames, mode === "deployment", mode);
  const config: WorkerConfig = {
    databaseUrl,
    pollIntervalMs: integer("WORKER_POLL_INTERVAL_MS", env.WORKER_POLL_INTERVAL_MS, 30000, 1000, 60 * 60 * 1000),
    emailLockTtlMs: integer("EMAIL_LOCK_TTL_MS", env.EMAIL_LOCK_TTL_MS, 15 * 60 * 1000, 1000, 24 * 60 * 60 * 1000),
    maxEmailAttempts: integer("EMAIL_MAX_ATTEMPTS", env.EMAIL_MAX_ATTEMPTS, 5, 1, 100)
  };

  if (smtpEnabled) {
    config.smtp = {
      host: required("SMTP_HOST", env.SMTP_HOST),
      port: integer("SMTP_PORT", env.SMTP_PORT, 587, 1, 65535),
      user: required("SMTP_USER", env.SMTP_USER),
      password: required("SMTP_PASSWORD", env.SMTP_PASSWORD),
      from: required("SMTP_FROM", env.SMTP_FROM)
    };
  }

  if (erpEnabled) {
    const baseUrl = required("ERP_API_BASE_URL", env.ERP_API_BASE_URL).replace(/\/$/, "");
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
      if (mode === "deployment" && parsed.protocol !== "https:") {
        throw new Error("ERP_API_BASE_URL must use HTTPS in deployment mode.");
      }
    } catch {
      throw new Error(
        mode === "deployment"
          ? "ERP_API_BASE_URL must be a valid HTTPS URL in deployment mode."
          : "ERP_API_BASE_URL must be a valid HTTP or HTTPS URL."
      );
    }
    config.erp = {
      baseUrl,
      serviceToken: required("ERP_SERVICE_TOKEN", env.ERP_SERVICE_TOKEN),
      lockTtlMs: integer("ERP_LOCK_TTL_MS", env.ERP_LOCK_TTL_MS, 15 * 60 * 1000, 1000, 24 * 60 * 60 * 1000),
      maxAttempts: integer("ERP_MAX_ATTEMPTS", env.ERP_MAX_ATTEMPTS, 5, 1, 100)
    };
  }

  return config;
}
