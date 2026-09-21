/**
 * POST /api/orders/claim   (signed in)
 * Attaches guest orders whose access tokens the caller already holds. Email match alone is
 * not enough — otherwise a forged x-vs-user header with the victim's email would steal every
 * guest order for that address. Body: { tokens: { [orderNo]: accessToken } }.
 */
import { z } from "zod"
import { auth } from "@/lib/auth"
import { orders, ORDER_NO_RE } from "@/lib/orders"
import { verifyOrderAccessToken } from "@/lib/order-access"
import { rateLimit } from "@/lib/rate-limit"

const bodySchema = z.object({
  tokens: z.record(z.string(), z.string()).optional(),
})

export async function POST(req: Request) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  if (!rateLimit(`order-claim:${session.userId}`, 20, 3600)) {
    return Response.json({ error: "rate_limited" }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })

  const proven: string[] = []
  for (const [orderNo, token] of Object.entries(parsed.data.tokens || {})) {
    const no = orderNo.trim().toUpperCase()
    if (!ORDER_NO_RE.test(no)) continue
    if (verifyOrderAccessToken(no, token)) proven.push(no)
  }
  if (!proven.length) return Response.json({ error: "claim_proof_required" }, { status: 403 })

  const claimed = await orders.claimByEmail(session.email, session.userId, proven)
  return Response.json({ ok: true, claimed }, { headers: { "cache-control": "no-store" } })
}
