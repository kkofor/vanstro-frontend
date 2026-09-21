/**
 * GET /api/dealers/invite?code=
 * Resolves a Vanstro-issued dealer invite to that store. Does not list codes.
 * Invite codes are long-lived (no expiry). Never write a real code into any frontend asset.
 * Rate limits (10/60s and 30/3600s per IP) are the enumeration control — do not loosen.
 */
import { dealerByInviteCode, ensureDealers } from "@/lib/dealers"
import { clientIp, rateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const ip = clientIp(req)
  if (!rateLimit(`invite:${ip}`, 10, 60) || !rateLimit(`invite-hour:${ip}`, 30, 3600)) {
    return Response.json({ error: "rate_limited" }, { status: 429 })
  }
  await ensureDealers()
  const code = new URL(req.url).searchParams.get("code") || ""
  const d = dealerByInviteCode(code)
  if (!d) return Response.json({ error: "unknown_invite" }, { status: 404 })
  return Response.json({ id: d.id, name: d.name, city: d.city })
}
