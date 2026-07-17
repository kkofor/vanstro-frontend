import type { Context, Next } from "hono";
import { getRequestIp } from "../auth/session.js";

type RateLimitPolicy = { key: string; limit: number; windowMs: number };

const buckets = new Map<string, { count: number; resetAt: number }>();

function policyFor(context: Context): RateLimitPolicy | undefined {
  const path = new URL(context.req.url).pathname.replace(/^\/api\/v1/, "");

  if (path === "/auth/login" || path === "/auth/customer/register") {
    return { key: "auth", limit: 10, windowMs: 15 * 60 * 1000 };
  }
  if (
    path === "/contact/leads" ||
    path === "/dealer-applications" ||
    path.startsWith("/products/") && path.endsWith("/reviews") ||
    path === "/privacy/consent-events"
  ) {
    return { key: "public-write", limit: 30, windowMs: 60 * 60 * 1000 };
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
    return context.json({ error: "Too many requests. Please try again later." }, 429);
  }

  bucket.count += 1;
  return next();
}
