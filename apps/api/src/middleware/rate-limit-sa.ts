import { prisma } from "@vanstro/db";
import type { Context, Next } from "hono";
import type { MachineEnv } from "../auth/service-account-access.js";
import { loadPublishedApiServiceAccountPolicy } from "../dashboard/s08-settings-policy.js";
import { publicError } from "../public-errors.js";

/**
 * S08 persisted service-account rate limit (rateLimitPolicy).
 *
 * - Fixed 1-minute window reusing the existing distributed RateLimitBucket
 *   (key, window, count, unique(key,window)) interface.
 * - Keys use only authenticated principal ids: `sa-token:<tokenId>` (per-token
 *   mode) and `sa-account:<accountId>` (account-level safety ceiling, ALWAYS
 *   applied). Plaintext tokens are never part of a key.
 * - requestsPerMinute is the hard ceiling; over it we return a stable public
 *   429 with Retry-After = seconds until the window reset.
 * - burst stays coverage_limited: it is NOT enforced here because the persisted
 *   distributed bucket cannot safely express a burst budget across instances.
 *   This honest degradation blocks ERP Limited Release, not S08.
 * - Runs only AFTER machine authentication, so unauthenticated requests keep
 *   the existing IP/auth behavior and nothing ever reveals whether a token
 *   exists.
 * - In non-deployment runtime modes the persisted bucket is still the source
 *   of truth when a database is present; a small in-memory fallback exists only
 *   for database-less local/test processes and never masquerades as
 *   multi-instance consistency (VANSTRO_RUNTIME_MODE=deployment always uses
 *   the distributed bucket).
 */
const SA_RATE_LIMIT_WINDOW_MS = 60_000;

const localBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_LOCAL_BUCKETS = 10_000;

async function incrementBucket(key: string, now: number): Promise<{ count: number; resetAt: number }> {
  const window = Math.floor(now / SA_RATE_LIMIT_WINDOW_MS);
  const resetAt = (window + 1) * SA_RATE_LIMIT_WINDOW_MS;
  if (process.env.VANSTRO_RUNTIME_MODE === "deployment") {
    const bucket = await prisma.rateLimitBucket.upsert({
      where: { key_window: { key, window } },
      update: { count: { increment: 1 } },
      create: { key, window, count: 1, expiresAt: new Date(resetAt) }
    });
    return { count: bucket.count, resetAt };
  }
  if (localBuckets.size >= MAX_LOCAL_BUCKETS) {
    for (const [entryKey, entry] of localBuckets) {
      if (entry.resetAt <= now) localBuckets.delete(entryKey);
    }
    if (localBuckets.size >= MAX_LOCAL_BUCKETS) localBuckets.delete(localBuckets.keys().next().value as string);
  }
  const bucket = localBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt });
    return { count: 1, resetAt };
  }
  bucket.count += 1;
  return { count: bucket.count, resetAt };
}

function rateLimited(context: Context<MachineEnv>, resetAt: number, now: number) {
  context.header("Retry-After", String(Math.ceil((resetAt - now) / 1000)));
  return publicError(context, 429, "RATE_LIMITED", "Too many requests. Please try again later.");
}

export async function rateLimitServiceAccount(context: Context<MachineEnv>, next: Next) {
  // Placed explicitly on each machine route AFTER requireMachineAccess (see
  // routes/mcp.ts, routes/cli.ts, routes/erp-integration.ts) — never as an
  // app-wide `use("*")` that depends on Hono sub-app hoisting. Only
  // machine-authenticated requests (principal set by requireMachineAccess)
  // are rate limited; everything else falls through untouched so
  // unauthenticated traffic keeps the existing IP/auth behavior and nothing
  // reveals whether a token exists.
  const account = context.get("serviceAccount");
  if (!account) return next();
  const tokenId = context.get("serviceAccountTokenId");
  const policy = context.get("machineScopePolicy") ?? (await loadPublishedApiServiceAccountPolicy());
  const ceiling = policy.rateLimitPolicy.requestsPerMinute;
  const now = Date.now();

  // Account-level safety ceiling always applies: in per-account mode all tokens
  // of the account share this bucket; in per-token mode it caps the total.
  const accountBucket = await incrementBucket(`sa-account:${account.id}`, now);
  if (accountBucket.count > ceiling) return rateLimited(context, accountBucket.resetAt, now);

  if (policy.rateLimitPolicy.mode === "per-token") {
    // Per-token bucket: during rotate overlap the predecessor and replacement
    // tokens each get their own bucket while the account ceiling above still
    // applies.
    const tokenBucket = await incrementBucket(`sa-token:${tokenId}`, now);
    if (tokenBucket.count > ceiling) return rateLimited(context, tokenBucket.resetAt, now);
  }

  await next();
}
