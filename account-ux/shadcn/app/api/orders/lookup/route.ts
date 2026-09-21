/**
 * POST /api/orders/lookup  { orderNo, email }
 * Public "track my order" for guests who lost the confirmation email link: the order number
 * plus the email it was placed with unlock the same access token POST /api/orders returned.
 *
 * Enumeration-safe: any mismatch (unknown order, wrong email) answers 404 not_found after the
 * same work. Limits: 5 / 15 min / IP, 3 / hour / order, 5 / hour / IP+email. New order numbers
 * carry a 4-hex suffix so sequential guessing is not practical.
 * Signed-in customers do not need this — their orders are in account › Orders.
 */
import { z } from "zod"
import { orders, publicOrder, ORDER_NO_RE } from "@/lib/orders"
import { orderAccessToken } from "@/lib/order-access"
import { clientIp, rateLimit } from "@/lib/rate-limit"

const bodySchema = z.object({
  orderNo: z.string().trim().toUpperCase().regex(ORDER_NO_RE),
  email: z.string().trim().toLowerCase().email(),
})

export async function POST(req: Request) {
  if (!rateLimit(`order-lookup:${clientIp(req)}`, 5, 15 * 60)) return Response.json({ error: "rate_limited" }, { status: 429 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  const { orderNo, email } = parsed.data

  if (!rateLimit(`order-lookup:${orderNo}`, 3, 3600)) return Response.json({ error: "rate_limited" }, { status: 429 })
  if (!rateLimit(`order-lookup-email:${clientIp(req)}:${email}`, 5, 3600)) return Response.json({ error: "rate_limited" }, { status: 429 })

  const order = await orders.get(orderNo)
  if (!order || order.email.trim().toLowerCase() !== email) return Response.json({ error: "not_found" }, { status: 404 })

  const accessToken = orderAccessToken(orderNo)
  if (!accessToken) return Response.json({ error: "lookup_unavailable", detail: "VANSTRO_LINK_SECRET is not set." }, { status: 502 })
  return Response.json({ order: publicOrder(order), accessToken }, { headers: { "cache-control": "no-store" } })
}
