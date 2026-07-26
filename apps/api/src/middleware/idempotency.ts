import type { Context, Next } from "hono";
import { publicError } from "../public-errors.js";

const idempotencyCache = new Map<string, { status: number; body: unknown }>();

export async function checkoutIdempotency(context: Context, next: Next) {
  const path = new URL(context.req.url).pathname.replace(/^\/api\/v1/, "");
  if (path !== "/checkout/session" || context.req.method !== "POST") {
    return next();
  }

  const key = context.req.header("idempotency-key")?.trim();
  if (!key) return next();

  const cacheKey = `checkout:${key}`;
  const cached = idempotencyCache.get(cacheKey);
  if (cached) {
    return context.json(cached.body, cached.status as 200 | 201 | 400 | 409);
  }

  await next();

  if (context.res.status >= 200 && context.res.status < 300) {
    const cloned = context.res.clone();
    const body = await cloned.json().catch(() => null);
    if (body) {
      idempotencyCache.set(cacheKey, { status: context.res.status, body });
    }
  }
}

export function clearCheckoutIdempotencyForTests() {
  idempotencyCache.clear();
}

export function idempotencyKeyRequired(context: Context) {
  return publicError(context, 400, "CHECKOUT_INVALID", "Idempotency-Key header is required for this request.");
}
