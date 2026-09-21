/**
 * POST /api/admin/orders/:orderNo/resend  { email?, kind? }
 * Staff may redirect the receipt (support email-correction path). Same mailers as customer resend.
 */
import { z } from "zod"
import { requireStaff } from "@/lib/staff"
import { orders, ORDER_NO_RE } from "@/lib/orders"
import { sendOrderConfirmation, sendInvoice, sendFulfillmentReady } from "@/lib/order-notify"
import { rateLimit } from "@/lib/rate-limit"

const bodySchema = z.object({
  email: z.string().email().optional(),
  kind: z.enum(["confirmation", "invoice", "fulfillment"]).default("confirmation"),
})

export async function POST(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const { orderNo } = await params
  if (!ORDER_NO_RE.test(orderNo)) return Response.json({ error: "not_found" }, { status: 404 })

  const order = await orders.get(orderNo)
  if (!order) return Response.json({ error: "not_found" }, { status: 404 })
  if (order.status !== "paid") return Response.json({ error: "order_not_paid", status: order.status }, { status: 409 })
  if (!rateLimit(`admin-resend:${orderNo}`, 10, 3600)) return Response.json({ error: "rate_limited" }, { status: 429 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 })

  const to = (parsed.data.email?.trim().toLowerCase() || order.email)
  const target = to !== order.email ? await orders.updateEmail(orderNo, to) : order
  await orders.patchAdmin(orderNo, { by: staff.email, note: `Resent ${parsed.data.kind} to ${to}` })

  try {
    if (parsed.data.kind === "invoice") {
      const { sentAt, invoiceNo } = await sendInvoice(target, to)
      return Response.json({ ok: true, to, sentAt, kind: "invoice", invoiceNo })
    }
    if (parsed.data.kind === "fulfillment") {
      const { sentAt } = await sendFulfillmentReady(target, to, { force: true })
      return Response.json({ ok: true, to, sentAt, kind: "fulfillment" })
    }
    const { sentAt } = await sendOrderConfirmation(target, to)
    return Response.json({ ok: true, to, sentAt, kind: "confirmation" })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send_failed"
    if (msg.startsWith("invoice_")) return Response.json({ error: msg }, { status: 409 })
    throw e
  }
}
