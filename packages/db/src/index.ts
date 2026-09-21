import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  vanstroPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.vanstroPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.vanstroPrisma = prisma;
}

export * from "@prisma/client";
export { derivePasswordHash, hashPassword, verifyPassword } from "./password.js";
export { bootstrapDashboardRbac, type RbacBootstrapSummary } from "./rbac-bootstrap.js";
export * from "./async-jobs.js";
export * from "./p08-controlled.js";
export * from "./p09-controlled.js";
export * from "./settings-controlled.js";
export * from "./s02-settings-controlled.js";
export * from "./s09-settings-controlled.js";
export * from "./s10-settings-controlled.js";
export * from "./s03-settings-controlled.js";
export * from "./s08-settings-controlled.js";
export * from "./p02-p04-runtime-controlled.js";
export * from "./audit-resource-registry.js";
export * from "./worker-lifecycle.js";
export * from "./generated/source-latest-migration.js";
export * from "./work-queue.js";
export * from "./media.js";
export { decryptSecret, encryptSecret } from "./secret-encryption.js";
export { applyDataRetention, DATA_RETENTION_DAYS } from "./data-retention.js";
export {
  CONSENT_RECORD_RETENTION_MONTHS,
  consentRetentionCutoff,
  deleteExpiredConsentEvents
} from "./privacy-retention.js";
