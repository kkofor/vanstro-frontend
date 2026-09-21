/**
 * PATCH /api/orders/:orderNo/fulfillment
 * Dealer counter: mark ready / packed / picked up / delivered on that store's paid orders.
 * This route never writes ERP.
 */
import { z } from "zod"
import { auth } from "@/lib/auth"
import { applyFulfillment, dealerAllowedFulfillment } from "@/lib/fulfillment"
import { orders, publicOrder } from "@/lib/orders"

const bodySchema = z.object({
  fulfillment: z.enum(["ready", "in_transit", "delivered"]),
  tracking: z.object({
    carrier: z.string().trim().max(40).optional(),
    trackingNo: z.string().trim().min(1).max(80),
    trackingUrl: z.string().trim().max(300).optional(),
  }).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  if (session.role !== "dealer" || !session.dealerId) {
    return Response.json({ error: "dealer_only" }, { status: 403 })
  }
  const { orderNo } = await params
  const order = await orders.get(orderNo)
  if (!order || order.dealer?.id !== session.dealerId) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  const allowed = dealerAllowedFulfillment(order)
  if (!allowed.includes(parsed.data.fulfillment)) {
    return Response.json({ error: "fulfillment_not_allowed", allowed }, { status: 409 })
  }
  try {
    const fresh = await applyFulfillment(order, parsed.data.fulfillment, { tracking: parsed.data.tracking })
    return Response.json({
      order: {
        ...publicOrder(fresh),
        dealerActions: dealerAllowedFulfillment(fresh),
        storeOrder: true,
      },
    }, { headers: { "cache-control": "no-store" } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error"
    if (msg === "fulfillment_on_hold" || msg === "fulfillment_requires_paid") {
      return Response.json({ error: msg }, { status: 409 })
    }
    throw e
  }
}
