/**
 * POST /api/checkout/moneris/pay  { orderNo, temporaryToken, cardholderName?, saveCard?, hint? }
 * Called by the browser after the Hosted Tokenization frame returned a temporary token (or the
 * mock card box produced `mock:<Brand>:<last4>`). This is the only place an order becomes paid:
 * the server charges Moneris (POST /payments) and the response is the receipt.
 *
 * Success → order paid, invoice number issued, then (in parallel, each logged on the order):
 *   · order confirmation email → customer
 *   · tax invoice email + PDF   → customer
 *   · order sheet               → selected independent local dealer (first contact after payment)
 * Decline → 402 with the Moneris response code; nothing was charged, the customer can retry with
 * the same order (a fresh token is needed — temporary tokens are single use; each new token is a
 * new Moneris orderId/idempotencyKey, see lib/payments.ts).
 * Provider unreachable / 5xx → 502 payment_unavailable (order stays payable).
 * PROCESSING / un-captured AUTHORIZED → 202 payment_pending (order stays pending; ops reconciles).
 *
 * `hint` is only honoured in MONERIS_MOCK mode (wallet the prototype showed).
 */
import { z } from "zod"
import { declineMessage } from "@/lib/checkout"
import { orderAccess } from "@/lib/order-access"
import { orders, publicOrder, PaymentUnresolvedError, ORDER_NO_RE } from "@/lib/orders"
import { chargeOrder, paymentMode } from "@/lib/payments"
import { notifyPaidOrder } from "@/lib/order-notify"

const bodySchema = z.object({
  orderNo: z.string().regex(ORDER_NO_RE),
  temporaryToken: z.string().min(6).max(200),
  cardholderName: z.string().trim().min(2).max(60).optional(),
  saveCard: z.boolean().optional(),
  hint: z.object({ wallet: z.enum(["Apple Pay", "Google Pay"]).optional() }).optional(),
})

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  const { orderNo, temporaryToken, cardholderName, hint } = parsed.data

  // Owner session, or the guest access token issued by POST /api/orders (x-vs-order-token).
  const order = await orders.get(orderNo)
  if (!order) return Response.json({ error: "order_not_found" }, { status: 404 })
  const access = await orderAccess(req, order)
  if (!access) return Response.json({ error: "order_not_found" }, { status: 404 })
  // Guests cannot vault a card (no account to attach it to).
  const saveCard = order.userId === null ? false : parsed.data.saveCard
  if (order.status === "paid") {
    const notify = await notifyPaidOrder(order)
    return Response.json({ ok: true, alreadyPaid: true, order: publicOrder((await orders.get(orderNo)) ?? order), notifications: notify })
  }
  if (order.status === "expired") return Response.json({ error: "order_expired", orderNo }, { status: 410 })
  if (order.status === "cancelled") return Response.json({ error: "order_cancelled", orderNo }, { status: 409 })
  if (order.paymentMethod === "pos") {
    return Response.json({ error: "wrong_channel", detail: "This order is paid from My account → Pay (Moneris Go). Hosted Tokenization was not used." }, { status: 409 })
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined
  let result
  try {
    result = await chargeOrder(order, { temporaryToken, cardholderName, saveCard, ip, wallet: paymentMode() === "mock" ? hint?.wallet : undefined })
  } catch (e) {
    if (e instanceof PaymentUnresolvedError) {
      return Response.json({ error: "payment_unresolved", message: e.message, orderNo }, { status: 409 })
    }
    throw e
  }

  if (!result.ok) {
    if ("unavailable" in result) {
      // Provider problem, not the card: order stays payable, client shows "try again" (moneris-client.js expects { error, message }).
      return Response.json({ ok: false, error: "payment_unavailable", orderNo, code: result.code, message: declineMessage(result.code, order.locale), detail: result.message }, { status: 502 })
    }
    if ("pending" in result) {
      // Not final: keep the order pending_payment so the sweep/reconciliation sees it; tell the customer not to retry.
      return Response.json({ ok: false, error: "payment_pending", orderNo, code: result.code, referenceNo: result.referenceNo, message: declineMessage(result.code, order.locale) }, { status: 202 })
    }
    await orders.markDeclined(orderNo, result.code)
    return Response.json(
      { ok: false, orderNo, code: result.code, message: declineMessage(result.code, order.locale), detail: result.message },
      { status: 402 }
    )
  }

  if (result.payment.amountCents !== order.quote.totalCents) {
    console.warn(`[pay] ${orderNo}: Moneris approved ${result.payment.amountCents}¢ but order total is ${order.quote.totalCents}¢ — invoice held`)
  }

  const paid = await orders.markPaid(orderNo, result.payment)
  const notify = await notifyPaidOrder(paid)
  const fresh = (await orders.get(orderNo)) ?? paid

  return Response.json({ ok: true, order: publicOrder(fresh), notifications: notify })
}
