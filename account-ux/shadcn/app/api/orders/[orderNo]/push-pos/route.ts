/**
 * POST /api/orders/:orderNo/push-pos
 * Dealer account › Pay. Pushes the unpaid order to that dealer's Vanstro Moneris Go.
 * Does not use Hosted Tokenization. Mock mode marks the order paid immediately (terminal simulated).
 */
import { auth } from "@/lib/auth"
import { orders, publicOrder, type PaymentRecord } from "@/lib/orders"
import { pushPurchase } from "@/lib/go-cloud"
import { notifyPaidOrder } from "@/lib/order-notify"
import { paymentMode } from "@/lib/payments"
import { goPostbackUrl, linkSecret } from "@/lib/signed-links"

const POS_RETRY_MS = 10 * 60 * 1000

export async function POST(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  if (session.role !== "dealer") return Response.json({ error: "pos_dealer_only" }, { status: 403 })

  const { orderNo } = await params
  const existing = await orders.get(orderNo)
  if (!existing || existing.userId !== session.userId) return Response.json({ error: "order_not_found" }, { status: 404 })
  if (existing.paymentMethod !== "pos") return Response.json({ error: "wrong_channel" }, { status: 409 })
  if (existing.status === "paid") {
    const notify = await notifyPaidOrder(existing)
    return Response.json({ ok: true, alreadyPaid: true, order: publicOrder((await orders.get(orderNo)) ?? existing), notifications: notify })
  }
  if (!existing.dealer?.id || session.dealerId !== existing.dealer.id) {
    return Response.json({ error: "pos_store_mismatch" }, { status: 403 })
  }
  if (!existing.posTerminalId) return Response.json({ error: "pos_terminal_unbound" }, { status: 502 })

  const postBackUrl = goPostbackUrl(existing.orderNo)
  if (paymentMode() !== "mock" && (!postBackUrl || !linkSecret())) {
    return Response.json({ error: "pos_not_configured", message: "VANSTRO_LINK_SECRET is required for live Go postback." }, { status: 502 })
  }

  const claimed = await orders.claimPosPush(orderNo, POS_RETRY_MS)
  if (!claimed.ok) return Response.json({ error: claimed.error }, { status: claimed.status })
  const order = claimed.order
  if (order.status === "paid") {
    const notify = await notifyPaidOrder(order)
    return Response.json({ ok: true, alreadyPaid: true, order: publicOrder(order), notifications: notify })
  }

  const idempotencyKey = order.pos!.idempotencyKey!
  const pushed = await pushPurchase({
    orderNo: order.orderNo,
    totalCents: order.quote.totalCents,
    terminalId: order.posTerminalId!,
    postBackUrl: postBackUrl || "",
    idempotencyKey,
  })
  if (!pushed.ok) {
    await orders.setPosPush(orderNo, { status: pushed.code === "pos_busy" ? "busy" : "failed", error: pushed.message, idempotencyKey })
    const status = pushed.code === "pos_busy" ? 409 : 502
    return Response.json({ error: pushed.code, message: pushed.message }, { status })
  }

  if (pushed.mock) {
    const payment: PaymentRecord = {
      provider: "moneris_go",
      method: "pos",
      brand: "POS",
      last4: "Go",
      authCode: "MOCKGO",
      referenceNo: pushed.cloudTicket,
      responseCode: "027",
      amountCents: order.quote.totalCents,
      paidAt: new Date().toISOString(),
    }
    const paid = await orders.markPaid(orderNo, payment)
    await orders.setPosPush(orderNo, { status: "idle", cloudTicket: pushed.cloudTicket, pushedAt: new Date().toISOString(), idempotencyKey })
    const notify = await notifyPaidOrder(paid)
    const fresh = (await orders.get(orderNo)) ?? paid
    return Response.json({ ok: true, mock: true, order: publicOrder(fresh), notifications: notify })
  }

  await orders.setPosPush(orderNo, { status: "pushed", cloudTicket: pushed.cloudTicket, receiptUrl: pushed.receiptUrl, pushedAt: new Date().toISOString(), idempotencyKey })
  return Response.json({
    ok: true,
    mock: false,
    pushed: true,
    mode: paymentMode(),
    order: publicOrder((await orders.get(orderNo))!),
  })
}
