import type { Context, Next } from "hono";

export async function requestIdMiddleware(context: Context, next: Next) {
  const requestId = context.req.header("x-request-id")?.trim() || crypto.randomUUID();
  context.header("X-Request-Id", requestId);
  await next();
}
