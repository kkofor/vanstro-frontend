import { prisma } from "@vanstro/db";
import { isStructurallyValidValue, S08_COMPILED_VALUE, type ApiServiceAccountSettingsValueV1 } from "./s08-settings.js";

/** Load the published settings.api-service-account policy, or the compiled
 *  default when no policy is published yet. Consumers (token lifecycle, rotate
 *  overlap, machine scope enforcement, persisted rate limit, invocation read
 *  model) resolve this at their request boundary. */
export async function loadPublishedApiServiceAccountPolicy(): Promise<ApiServiceAccountSettingsValueV1> {
  const row = await prisma.runtimeConfigVersion.findFirst({
    where: { configKey: "settings.api-service-account", settingsLifecycleStatus: "published" },
    orderBy: { settingsRevision: "desc" }
  });
  const candidate = row?.effectiveValue;
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate) && isStructurallyValidValue(candidate)) {
    return candidate as ApiServiceAccountSettingsValueV1;
  }
  return S08_COMPILED_VALUE;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Default TTL in milliseconds for newly created tokens (policy defaultTtlDays). */
export function defaultTokenTtlMs(policy: ApiServiceAccountSettingsValueV1) {
  return policy.tokenLifecyclePolicy.defaultTtlDays * DAY_MS;
}

/** Hard TTL ceiling in milliseconds (policy maximumTtlDays, shape-capped at 365). */
export function maximumTokenTtlMs(policy: ApiServiceAccountSettingsValueV1) {
  return policy.tokenLifecyclePolicy.maximumTtlDays * DAY_MS;
}

/** Overlap window end (now + rotationOverlapMinutes) for a rotate operation. */
export function rotateOverlapUntil(now: Date, policy: ApiServiceAccountSettingsValueV1) {
  return new Date(now.getTime() + policy.tokenLifecyclePolicy.rotationOverlapMinutes * 60 * 1000);
}

/** Resolve the replacement token expiry: explicit future date (capped at the
 *  configured maximum), else default TTL; requireExpiry forces an explicit
 *  expiry. Returns null when the request is invalid (message describes why). */
export function resolveReplacementExpiry(now: Date, requested: Date | undefined, policy: ApiServiceAccountSettingsValueV1): { expiresAt: Date } | { error: string } {
  const tokenPolicy = policy.tokenLifecyclePolicy;
  if (requested) {
    if (requested.getTime() > now.getTime() + maximumTokenTtlMs(policy)) {
      return { error: `expiresAt cannot exceed ${tokenPolicy.maximumTtlDays} days.` };
    }
    return { expiresAt: requested };
  }
  if (tokenPolicy.requireExpiry) return { error: "expiresAt is required when requireExpiry is enabled." };
  return { expiresAt: new Date(now.getTime() + defaultTokenTtlMs(policy)) };
}

/** True when the account is at the maximumActiveTokensPerAccount ceiling.
 *  A ceiling of 0 is the "no active policy" sentinel and never blocks. */
export function activeTokenCeilingReached(activeCount: number, policy: ApiServiceAccountSettingsValueV1) {
  const ceiling = policy.tokenLifecyclePolicy.maximumActiveTokensPerAccount;
  return ceiling > 0 && activeCount >= ceiling;
}

const SENSITIVE_PERMISSION_RULES: ReadonlyArray<(permission: string) => boolean> = [
  (permission) => permission.startsWith("payment"),
  (permission) => permission.startsWith("customers.pii"),
  (permission) => permission === "erp.orders.pii",
  (permission) => permission === "users.manage",
  (permission) => permission === "settings.write",
  (permission) => permission === "audit.read_sensitive",
  (permission) => permission === "jobs.read_sensitive",
  (permission) => permission === "media.read_sensitive",
  (permission) => permission === "work_queue.read_sensitive"
];

export function isSensitiveMachinePermission(permission: string) {
  return SENSITIVE_PERMISSION_RULES.some((rule) => rule(permission));
}

/** Machine scope enforcement at the request boundary. Returns a short public
 *  denial reason, or null when the request is allowed by the policy. */
export function machineScopeDenial(principal: { roles: string[]; environment: string }, requiredPermission: string, policy: ApiServiceAccountSettingsValueV1): string | null {
  const scope = policy.machineScopePolicy;
  if (scope.denySensitivePermissionsByDefault && isSensitiveMachinePermission(requiredPermission)) {
    return "Sensitive permission is denied by default.";
  }
  if (scope.allowedPermissionFamilies.length > 0) {
    const family = requiredPermission.split(".")[0] ?? requiredPermission;
    if (!scope.allowedPermissionFamilies.includes(family)) {
      return "The permission family is not allowed for this service account.";
    }
  }
  if (scope.allowedRoleKeys.length > 0 && !principal.roles.some((role) => scope.allowedRoleKeys.includes(role))) {
    return "The service account role is not allowed.";
  }
  if (scope.environment !== "production" && principal.environment !== scope.environment) {
    return "The service account environment does not match the policy environment.";
  }
  return null;
}
