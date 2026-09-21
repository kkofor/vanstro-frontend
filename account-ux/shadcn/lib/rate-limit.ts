/**
 * lib/rate-limit.ts — in-memory sliding window shared by the unauthenticated routes
 * (guest order creation, order lookup, receipt resend). Production replaces the Map with
 * the shared limiter (Redis) behind the same signature.
 */
const hits = new Map<string, number[]>()

/** Returns false when `key` has been seen more than `max` times in the last `windowSec`. */
export function rateLimit(key: string, max: number, windowSec: number): boolean {
  const now = Date.now()
  const arr = (hits.get(key) ?? []).filter(t => now - t < windowSec * 1000)
  if (arr.length >= max) { hits.set(key, arr); return false }
  arr.push(now)
  hits.set(key, arr)
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowSec * 1000) hits.delete(k)
  return true
}

export function clientIp(req: Request): string {
  /* Only honour X-Forwarded-For when the process sits behind a proxy that overwrites the header.
     Otherwise a client can spoof the IP and reset the guest-order / lookup windows.
     When TRUST_PROXY is unset, use the socket address the HTTP server stamped (x-vs-remote-addr). */
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    if (forwarded) return forwarded
  }
  return req.headers.get("x-vs-remote-addr")?.trim() || "local"
}
