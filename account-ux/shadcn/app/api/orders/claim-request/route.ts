/**
 * POST /api/orders/claim-request  (signed in)
 * Step 1 of email-confirm claim. Never attaches the order here.
 * Missing / email mismatch / already owned all return the same 200 body.
 */
import { z } from "zod"
import { auth } from "@/lib/auth"
import { orders, ORDER_NO_RE } from "@/lib/orders"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { db } from "@/lib/users"
import { buildLink, issueToken } from "@/lib/tokens"
import { sendMail } from "@/lib/mail"
import { claimOrder } from "@/emails"

export const CLAIM_REQUEST_MESSAGE =
  "If this order exists and belongs to you, we sent a confirmation email."

const bodySchema = z.object({
  orderNo: z.string().trim().min(1).max(40),
  email: z.string().trim().min(1).max(200),
})

function ok() {
  return Response.json(
    { ok: true, message: CLAIM_REQUEST_MESSAGE },
    { headers: { "cache-control": "no-store" } },
  )
}

export async function POST(req: Request) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  const ip = clientIp(req)
  if (!rateLimit(`claim-request:${session.userId}`, 5, 3600) || !rateLimit(`claim-request-ip:${ip}`, 8, 3600)) {
    return Response.json({ error: "rate_limited" }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return ok()

  const orderNo = parsed.data.orderNo.trim().toUpperCase()
  const email = parsed.data.email.trim().toLowerCase()
  if (!ORDER_NO_RE.test(orderNo)) return ok()

  const order = await orders.get(orderNo)
  if (!order) return ok()
  if (order.email.trim().toLowerCase() !== email) return ok()
  if (order.userId !== null) return ok()

  const token = issueToken("claim-order")
  await db.tokens.upsert({
    userId: session.userId,
    purpose: "claim-order",
    hash: token.hash,
    expiresAt: token.expiresAt.toISOString(),
    usedAt: null,
    orderNo: order.orderNo,
  })
  const mail = claimOrder({
    locale: order.locale,
    orderNo: order.orderNo,
    accountEmail: session.email,
    link: buildLink("/claim-order", token.raw),
  })
  try {
    await sendMail({ to: order.email, channel: "account", tag: `claim:${order.orderNo}`, ...mail })
  } catch {
    /* still return the same body — do not leak send failure */
  }
  return ok()
}
