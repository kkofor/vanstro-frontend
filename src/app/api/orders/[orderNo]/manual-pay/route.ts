/**
 * POST /api/orders/:orderNo/manual-pay
 * Dealer records an offline collection. Partial amounts append to payments[];
 * only a running total equal to quote.totalCents calls markPaid.
 */
import { z } from "zod"
import { auth } from "@/lib/auth"
import { orders, publicOrder, OrderMoneyError } from "@/lib/orders"
import { notifyPaidOrder, sendPaymentReceived } from "@/lib/order-notify"
import { rateLimit } from "@/lib/rate-limit"

const bodySchema = z.object({
  amountCents: z.number().int().positive(),
  channel: z.enum(["cash", "e_transfer", "other"]),
  note: z.string().trim().max(140).optional(),
  confirm: z.literal(true),
  idempotencyKey: z.string().trim().min(8).max(80),
})

export async function POST(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  if (session.role !== "dealer") return Response.json({ error: "dealer_only" }, { status: 403 })
  if (!session.dealerId) return Response.json({ error: "dealer_account_incomplete" }, { status: 403 })

  const { orderNo } = await params
  const existing = await orders.get(orderNo)
  if (!existing) return Response.json({ error: "order_not_found" }, { status: 404 })
  if (!existing.dealer?.id || existing.dealer.id !== session.dealerId) {
    return Response.json({ error: "pos_store_mismatch" }, { status: 403 })
  }

  if (!rateLimit(`manual-pay-dealer:${session.dealerId}`, 20, 3600) || !rateLimit(`manual-pay-order:${orderNo}`, 20, 3600)) {
    return Response.json({ error: "rate_limited" }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })

  try {
    const result = await orders.recordManualPayment(orderNo, {
      amountCents: parsed.data.amountCents,
      channel: parsed.data.channel,
      note: parsed.data.note,
      byUserId: session.userId,
      idempotencyKey: parsed.data.idempotencyKey,
    })
    if (!result.replay && !result.completed) {
      try { await sendPaymentReceived(result.order, result.entry) } catch { /* receipt must not roll back the ledger */ }
    }
    if (!result.replay && result.completed) {
      await notifyPaidOrder(result.order)
    }
    const fresh = (await orders.get(orderNo)) ?? result.order
    return Response.json({
      ok: true,
      replay: result.replay,
      completed: result.completed,
      entry: { id: result.entry.id, amountCents: result.entry.amountCents, channel: result.entry.channel },
      order: publicOrder(fresh),
    })
  } catch (e) {
    if (e instanceof OrderMoneyError) {
      const status = e.code === "overpay" ? 400 : 409
      return Response.json({ error: e.code }, { status })
    }
    throw e
  }
}
