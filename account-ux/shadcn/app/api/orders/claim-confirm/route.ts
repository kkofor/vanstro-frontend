/**
 * POST /api/orders/claim-confirm
 * Step 2: consume the one-time email token and attach the guest order to the user
 * recorded on the token (not whoever is clicking).
 */
import { z } from "zod"
import { orders } from "@/lib/orders"
import { db } from "@/lib/users"
import { hashToken, isExpired } from "@/lib/tokens"

const bodySchema = z.object({
  token: z.string().min(20).max(200),
})

function gone() {
  return Response.json({ error: "token_invalid" }, { status: 410 })
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return gone()

  const row = await db.tokens.findByHash("claim-order", hashToken(parsed.data.token))
  if (!row || row.usedAt) return gone()
  if (isExpired(new Date(row.expiresAt))) return gone()
  if (!row.orderNo) return gone()

  const now = new Date()
  const result = await orders.attachUser(row.orderNo, row.userId, {
    kind: "claim",
    to: row.userId,
    sentAt: now.toISOString(),
  })
  await db.tokens.markUsed(row.hash, now)
  if (result === "missing" || result === "taken") return gone()
  return Response.json(
    { ok: true, orderNo: row.orderNo, already: result === "self" },
    { headers: { "cache-control": "no-store" } },
  )
}
