import type { Context, Next } from "hono";
import { getRequestIp } from "../auth/session.js";
import { publicError } from "../public-errors.js";

type RateLimitPolicy = { key: string; limit: number; windowMs: number };

const buckets = new Map<string, { count: number; resetAt: number }>();

function policyFor(context: Context): RateLimitPolicy | undefined {
  const path = new URL(context.req.url).pathname.replace(/^\/api\/v1/, "");

  if (path === "/auth/login" || path === "/auth/customer/register") {
    return { key: "auth", limit: 10, windowMs: 15 * 60 * 1000 };
  }
  if (
    path === "/checkout/session" ||
    path === "/payments/callback" ||
    path === "/address/autocomplete" ||
    path === "/cart" ||
    path.startsWith("/cart/")
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

export async function rateLimitPublicWrites(context: Context, next: Next) {
  const policy = policyFor(context);

  if (!policy) return next();

  const now = Date.now();
  const bucketKey = `${policy.key}:${getRequestIp(context) ?? "unknown"}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + policy.windowMs });
    return next();
  }

  if (bucket.count >= policy.limit) {
    context.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    context.header("X-RateLimit-Limit", String(policy.limit));
    context.header("X-RateLimit-Remaining", "0");
    return publicError(context, 429, "RATE_LIMITED", "Too many requests. Please try again later.");
  }

  bucket.count += 1;
  context.header("X-RateLimit-Limit", String(policy.limit));
  context.header("X-RateLimit-Remaining", String(Math.max(0, policy.limit - bucket.count)));
  return next();
}
