import type { Context, Next } from "hono";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export async function requestIdMiddleware(context: Context, next: Next) {
  const candidate = context.req.header("x-request-id")?.trim();
  const requestId = candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : crypto.randomUUID();
  const startedAt = performance.now();
  context.header("X-Request-Id", requestId);
  await next();
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    service: "vanstro-api",
    level: "info",
    requestId,
    method: context.req.method,
    path: context.req.path,
    status: context.res.status,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100
  }));
}
