/**
 * POST /api/checkout/moneris/go/postback
 * Moneris Go Cloud async result. Marks the POS-channel order paid. HT /payments is unused here.
 * Authenticated with HMAC on ?t= (VANSTRO_LINK_SECRET). responseCode is required; never defaulted.
 */
import { orders, publicOrder, type PaymentRecord } from "@/lib/orders"
import { notifyPaidOrder } from "@/lib/order-notify"
import { linkSecret, verifyLink } from "@/lib/signed-links"

function amountMatches(data: Record<string, unknown>, expectedCents: number): boolean {
  const raw = data.approvedAmount ?? data.totalAmount ?? data.total_amount ?? data.amount ?? data.txnTotal
  if (raw == null || String(raw).trim() === "") return false
  const s = String(raw).trim().replace(/[$,CAD]/gi, "").trim()
  const n = Number(s)
  if (!Number.isFinite(n)) return false
  const cents = s.includes(".") ? Math.round(n * 100) : n
  return cents === expectedCents
}

export async function POST(req: Request) {
  if (!linkSecret()) return Response.json({ error: "postback_unconfigured" }, { status: 401 })

  const url = new URL(req.url)
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const data = ((body?.receipt as { data?: { response?: Array<Record<string, unknown>> } } | undefined)?.data?.response?.[0]
    ?? body) as Record<string, unknown> | null
  if (!data) return Response.json({ error: "invalid_postback" }, { status: 400 })

  const orderNo = url.searchParams.get("o") || String(data.orderId || data.orderNo || "")
  const token = url.searchParams.get("t") || (typeof data.t === "string" ? data.t : null)
  if (!verifyLink("go-postback", orderNo, token)) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const code = String(data.responseCode ?? data.response_code ?? "")
  if (!code) return Response.json({ error: "missing_response_code" }, { status: 400 })

  const completed = String(data.completed ?? "") === "true"
  const order = await orders.get(orderNo)
  if (!order) return Response.json({ error: "order_not_found" }, { status: 404 })
  if (order.paymentMethod !== "pos") return Response.json({ error: "wrong_channel" }, { status: 409 })
  if (order.status === "paid") {
    await notifyPaidOrder(order)
    return Response.json({ ok: true, alreadyPaid: true })
  }

  const approved = completed && /^(00[0-9]|0[0-4][0-9]|027)$/.test(code)
  if (!completed) return Response.json({ ok: true, pending: true })

  if (!approved) {
    await orders.setPosPush(orderNo, { status: "failed", cloudTicket: data.cloudTicket ? String(data.cloudTicket) : undefined, error: String(data.status || data.message || "") })
    await orders.markDeclined(orderNo, code)
    return Response.json({ ok: true, declined: true })
  }

  if (!amountMatches(data, order.quote.totalCents)) {
    await orders.setPosPush(orderNo, { status: "failed", error: "amount_mismatch" })
    return Response.json({ error: "amount_mismatch" }, { status: 409 })
  }

  const payment: PaymentRecord = {
    provider: "moneris_go",
    method: "pos",
    brand: String(data.cardType || data.brand || "POS"),
    last4: String(data.last4 || data.lastFour || "Go").slice(-4),
    authCode: data.authCode ? String(data.authCode) : data.authorizationCode ? String(data.authorizationCode) : undefined,
    referenceNo: data.cloudTicket ? String(data.cloudTicket) : data.referenceNum ? String(data.referenceNum) : undefined,
    responseCode: code,
    amountCents: order.quote.totalCents,
    paidAt: new Date().toISOString(),
  }
  const paid = await orders.markPaid(orderNo, payment)
  await orders.setPosPush(orderNo, { status: "idle", cloudTicket: payment.referenceNo, pushedAt: new Date().toISOString() })
  await notifyPaidOrder(paid)
  return Response.json({ ok: true, order: publicOrder((await orders.get(orderNo))!) })
}

export async function GET() {
  return new Response("ok", { status: 200 })
}
