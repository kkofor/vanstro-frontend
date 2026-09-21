import { prisma } from "@vanstro/db";
import type { Context, Next } from "hono";
import { getRequestIp } from "../auth/session.js";
import { publicError } from "../public-errors.js";

type RateLimitPolicy = { key: string; limit: number; windowMs: number };

const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_LOCAL_BUCKETS = 10_000;

async function distributedCount(key: string, windowMs: number) {
  const window = Math.floor(Date.now() / windowMs);
  const bucket = await prisma.rateLimitBucket.upsert({
    where: { key_window: { key, window } },
    update: { count: { increment: 1 } },
    create: { key, window, count: 1, expiresAt: new Date((window + 1) * windowMs) }
  });
  return bucket.count;
}

function policyFor(context: Context): RateLimitPolicy | undefined {
  const path = new URL(context.req.url).pathname.replace(/^\/api\/v1/, "");

  if (
    path === "/auth/login" ||
    path === "/auth/customer/register" ||
    path === "/auth/password/forgot" ||
    path === "/auth/password/reset"
  ) {
    return { key: "auth", limit: 10, windowMs: 15 * 60 * 1000 };
  }
  if (
    path === "/checkout/session" ||
    path === "/inventory/reservations" ||
    path.startsWith("/inventory/reservations/") ||
    path === "/payments/callback" ||
    path === "/address/autocomplete" ||
    path === "/cart" ||
    path.startsWith("/cart/") ||
    path === "/support/ai-chat"
  ) {
    return { key: "commerce", limit: 60, windowMs: 15 * 60 * 1000 };
  }
  if (
    path === "/contact/leads" ||
    path === "/dealer-applications" ||
    path === "/support/handoffs" ||
    path.startsWith("/products/") && path.endsWith("/reviews") ||
    path === "/privacy/consent-events"
  ) {
    return { key: "public-write", limit: 30, windowMs: 60 * 60 * 1000 };
  }
  if (path === "/analytics/pageviews") {
    return { key: "analytics", limit: 120, windowMs: 15 * 60 * 1000 };
  }
}

function incrementLocalBucket(key: string, policy: RateLimitPolicy, now: number) {
  if (buckets.size >= MAX_LOCAL_BUCKETS) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
    if (buckets.size >= MAX_LOCAL_BUCKETS) buckets.delete(buckets.keys().next().value as string);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + policy.windowMs });
    return { count: 1, resetAt: now + policy.windowMs };
  }
  bucket.count += 1;
  return bucket;
}

function supportSessionKey(context: Context) {
  const value = (context.req.header("x-support-session-id") ?? context.req.header("x-session-id"))?.trim();
  return value && value.length <= 128 ? value : undefined;
}

export async function rateLimitPublicWrites(context: Context, next: Next) {
  const policy = policyFor(context);

  if (!policy) return next();

  const now = Date.now();
  const keys = [`${policy.key}:ip:${getRequestIp(context) ?? "unknown"}`];
  const supportSession = supportSessionKey(context);
  if (supportSession && policy.key === "commerce") keys.push(`${policy.key}:session:${supportSession}`);
  if (process.env.VANSTRO_RUNTIME_MODE === "deployment") {
    const counts = await Promise.all(keys.map((key) => distributedCount(key, policy.windowMs)));
    const count = Math.max(...counts);
    const resetAt = (Math.floor(now / policy.windowMs) + 1) * policy.windowMs;
    context.header("X-RateLimit-Limit", String(policy.limit));
    context.header("X-RateLimit-Remaining", String(Math.max(0, policy.limit - count)));
    if (count > policy.limit) {
      context.header("Retry-After", String(Math.ceil((resetAt - now) / 1000)));
      return publicError(context, 429, "RATE_LIMITED", "Too many requests. Please try again later.");
    }
    return next();
  }
  const bucketsForRequest = keys.map((key) => ({ key, bucket: incrementLocalBucket(key, policy, now) }));
  const exceeded = bucketsForRequest.find(({ bucket }) => bucket.count > policy.limit);
  if (exceeded) {
    context.header("Retry-After", String(Math.ceil((exceeded.bucket.resetAt - now) / 1000)));
    context.header("X-RateLimit-Limit", String(policy.limit));
    context.header("X-RateLimit-Remaining", "0");
    return publicError(context, 429, "RATE_LIMITED", "Too many requests. Please try again later.");
  }

  const count = Math.max(...bucketsForRequest.map(({ bucket }) => bucket.count));
  context.header("X-RateLimit-Limit", String(policy.limit));
  context.header("X-RateLimit-Remaining", String(Math.max(0, policy.limit - count)));
  return next();
}
