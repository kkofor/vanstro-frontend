/**
 * POST /api/erp/hooks/order-status
 * ERP (or middleware) can push status / tracking. Polling stays the fallback.
 *
 * Auth: header `x-erp-webhook-secret` or `token` or Bearer = ERP_WEBHOOK_SECRET.
 * If ERP_WEBHOOK_SECRET is unset, reject every request and write nothing.
 */
import { timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { applyFulfillment, findOrderByAnyNo, fulfillmentFromErp, shouldAdvance } from "@/lib/fulfillment"
import { publicOrder } from "@/lib/orders"
import { clientIp, rateLimit } from "@/lib/rate-limit"

const bodySchema = z.object({
  order_no: z.string().trim().min(1).max(80),
  order_status: z.coerce.number().int().min(1).max(9).optional(),
  tracking_no: z.string().trim().min(1).max(80).optional(),
  carrier: z.string().trim().max(40).optional(),
  tracking_url: z.string().trim().max(300).optional(),
})

function hookSecret() {
  return (process.env.ERP_WEBHOOK_SECRET || "").trim()
}

function presentedSecret(req: Request) {
  const header = req.headers.get("x-erp-webhook-secret")?.trim()
  if (header) return header
  const token = req.headers.get("token")?.trim()
  if (token) return token
  const auth = req.headers.get("authorization")
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim()
  return ""
}

function secretsEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (!left.length || left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export async function POST(req: Request) {
  const expected = hookSecret()
  if (!expected) return Response.json({ error: "webhook_unconfigured" }, { status: 503 })
  if (!rateLimit(`erp-hook:${clientIp(req)}`, 60, 60)) {
    return Response.json({ error: "rate_limited" }, { status: 429 })
  }
  if (!secretsEqual(presentedSecret(req), expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  const d = parsed.data
  const order = await findOrderByAnyNo(d.order_no)
  if (!order) return Response.json({ error: "not_found" }, { status: 404 })
  if (order.status !== "paid") return Response.json({ error: "order_not_paid" }, { status: 409 })

  const tracking = d.tracking_no
    ? { carrier: d.carrier, trackingNo: d.tracking_no, trackingUrl: d.tracking_url }
    : undefined
  const mapped = d.order_status != null ? fulfillmentFromErp(order.deliveryMethod, d.order_status) : null
  const current = order.fulfillment ?? "unfulfilled"
  const next = mapped && shouldAdvance(current, mapped) ? mapped : null

  if (!next && !tracking) {
    return Response.json({ ok: true, unchanged: true, order: publicOrder(order) }, { headers: { "cache-control": "no-store" } })
  }

  try {
    const fresh = await applyFulfillment(order, next ?? current, { tracking, notify: next ? undefined : false })
    return Response.json({ ok: true, order: publicOrder(fresh) }, { headers: { "cache-control": "no-store" } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error"
    if (msg === "fulfillment_on_hold" && tracking) {
      const held = await applyFulfillment(order, current, { tracking, notify: false }).catch(() => order)
      return Response.json({ ok: true, held: true, order: publicOrder(held) }, { headers: { "cache-control": "no-store" } })
    }
    if (msg === "fulfillment_on_hold" || msg === "fulfillment_requires_paid") {
      return Response.json({ error: msg }, { status: 409 })
    }
    throw e
  }
}
