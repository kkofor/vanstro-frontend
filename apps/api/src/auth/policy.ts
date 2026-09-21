import { prisma, s09SettingsEffectivePolicy, type EffectiveAuthPolicy } from "@vanstro/db";

/**
 * Compiled defaults mirror the frozen S09 authority facts
 * (SESSION_TTL_MS 7d, PASSWORD_RESET_TTL_MS 30m, minimum 12) and are used
 * whenever no valid S09 publication exists or the resolver is unavailable.
 * They are also the SQL s09_settings_effective_policy_v1 defaults, so API and
 * DB can never disagree on the fallback.
 */
const COMPILED_DEFAULTS: EffectiveAuthPolicy = {
  projectionState: "compiled_default",
  publishedGeneration: 0,
  passwordPolicy: { minimumLength: 12, resetTokenTtlMinutes: 30 },
  sessionPolicy: { sessionLifetimeMinutes: 10080 }
};

function isEffectivePolicy(value: unknown): value is EffectiveAuthPolicy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const pp = candidate.passwordPolicy as Record<string, unknown> | undefined;
  const sp = candidate.sessionPolicy as Record<string, unknown> | undefined;
  if (!pp || typeof pp !== "object" || typeof pp.minimumLength !== "number" || typeof pp.resetTokenTtlMinutes !== "number") return false;
  if (!sp || typeof sp !== "object" || typeof sp.sessionLifetimeMinutes !== "number") return false;
  return true;
}

/**
 * Resolves the effective Auth/RBAC settings policy once per auth operation.
 * The projection is read directly from the published row, so the consumer can
 * never lag the Settings projection; existing sessions are never retroactively
 * changed. Any resolver failure falls back to compiled defaults (fail-open;
 * auth must never be blocked by a Settings projection problem).
 */
export async function resolveEffectiveAuthPolicy(): Promise<EffectiveAuthPolicy> {
  try {
    const rows = await s09SettingsEffectivePolicy(prisma);
    const raw = rows[0]?.s09_settings_effective_policy_v1;
    if (!raw) return COMPILED_DEFAULTS;
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return isEffectivePolicy(data) ? data : COMPILED_DEFAULTS;
  } catch {
    return COMPILED_DEFAULTS;
  }
}
