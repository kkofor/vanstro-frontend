/**
 * POST /api/orders/:orderNo/receipt/resend  { email?, kind? }
 * Re-sends the order confirmation (default) or the tax invoice (with PDF attached),
 * optionally to a corrected address. Rate-limited (3 / hour / order) and restricted
 * to the order's owner or a guest holding the order-access token. Guests may not change
 * the address (that would let a token holder redirect the receipt); the correction path is
 * support. Uses receipts@mail.vanstro.ca.
 */
import { z } from "zod"
import { auth } from "@/lib/auth"
import { orderAccess } from "@/lib/order-access"
import { orders } from "@/lib/orders"
import { sendOrderConfirmation, sendInvoice } from "@/lib/order-notify"
import { rateLimit } from "@/lib/rate-limit"

const bodySchema = z.object({
  email: z.string().email().optional(),
  kind: z.enum(["confirmation", "invoice"]).default("confirmation"),
  confirm: z.boolean().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params

  const order = await orders.get(orderNo)
  if (!order) return Response.json({ error: "not_found" }, { status: 404 })
  const session = await auth(req)
  const access = await orderAccess(req, order)
  const dealerStore = !!(session && session.role === "dealer" && session.dealerId && order.dealer?.id === session.dealerId)
  if (!access && !dealerStore) return Response.json({ error: "not_found" }, { status: 404 })
  if (order.status !== "paid") return Response.json({ error: "order_not_paid", status: order.status }, { status: 409 })

  if (!rateLimit(`receipt-resend:${orderNo}`, 3, 3600)) {
    return Response.json({ error: "rate_limited" }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 })

  const wanted = parsed.data.email?.trim().toLowerCase()
  if (wanted && wanted !== order.email && access?.viaToken) {
    return Response.json({ error: "guest_email_locked", detail: "Guest receipts can only be resent to the order email. Contact support to correct it." }, { status: 403 })
  }
  const to = wanted ?? order.email
  if (wanted && wanted !== order.email && parsed.data.confirm !== true) {
    return Response.json({ error: "confirm_required" }, { status: 400 })
  }
  const target = (!dealerStore && to !== order.email) ? await orders.updateEmail(orderNo, to) : order

  if (parsed.data.kind === "invoice") {
    const { sentAt, invoiceNo } = await sendInvoice(target, to)
    return Response.json({ ok: true, to, sentAt, kind: "invoice", invoiceNo })
  }
  const { sentAt } = await sendOrderConfirmation(target, to)
  return Response.json({ ok: true, to, sentAt, kind: "confirmation" })
}
