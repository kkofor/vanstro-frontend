/**
 * GET /api/quotes — quotes for this dealer's store (all staff at the store).
 * POST /api/quotes — create a quote from dealer checkout. Does not create an order or push POS.
 */
import { quoteCreateSchema, quotes, publicQuote } from "@/lib/quotes"
import { assertStore, requireDealer, resolveQuoteAddress } from "./_shared"
import { ensureDealers, getDealer, snapshotDealer } from "@/lib/dealers"
import { getItem, UnknownSkuError } from "@/lib/catalogue"
import { promoStatus, quoteCheckout } from "@/lib/checkout"
import { assertStock } from "@/lib/stock"
import { toStockDealerId } from "@/lib/dealer/dealer-stock-id"
import { firstNameOf } from "@/lib/orders"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { isEmailBlocked } from "@/lib/risk"

const quoteCreates = new Map<string, Promise<string>>()

export async function GET(req: Request) {
  const gate = await requireDealer(req)
  if (!gate.ok) return gate.response
  const list = await quotes.listByDealer(gate.session.dealerId)
  return Response.json({ quotes: list.map(publicQuote) }, { headers: { "cache-control": "no-store" } })
}

export async function POST(req: Request) {
  const gate = await requireDealer(req)
  if (!gate.ok) return gate.response
  const session = gate.session
  const ip = clientIp(req)
  if (!rateLimit(`quote:${ip}`, 20, 3600)) return Response.json({ error: "rate_limited" }, { status: 429 })

  const parsed = quoteCreateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  const body = parsed.data
  if (await isEmailBlocked(body.contact.email)) {
    return Response.json({ error: "email_blocked" }, { status: 403 })
  }

  await ensureDealers()
  const dealer = getDealer(session.dealerId)
  if (!dealer) return Response.json({ error: "dealer_not_found" }, { status: 400 })

  const shipping = resolveQuoteAddress(body.shipping)
  if (!shipping) return Response.json({ error: "address_not_found" }, { status: 400 })
  let billing = shipping
  if (!("sameAsShipping" in body.billing && body.billing.sameAsShipping)) {
    const next = "address" in body.billing
      ? resolveQuoteAddress({ address: body.billing.address })
      : resolveQuoteAddress({ addressId: body.billing.addressId })
    if (!next) return Response.json({ error: "billing_address_not_found" }, { status: 400 })
    billing = next
  }
  if (body.deliveryMethod === "pickup" && !dealer.services.includes("pickup")) {
    return Response.json({ error: "pickup_unavailable" }, { status: 400 })
  }
  if (body.promo) {
    const st = promoStatus(body.promo)
    if (st !== "ok") return Response.json({ error: st === "expired" ? "promo_expired" : "promo_invalid" }, { status: 400 })
  }

  let items
  try {
    items = await Promise.all(body.cart.map(async i => {
      const c = await getItem(i.sku)
      return { sku: c.sku, name: c.name, variant: c.variant, qty: i.qty, unitCents: c.unitCents }
    }))
  } catch (e) {
    if (e instanceof UnknownSkuError) return Response.json({ error: "unknown_sku", sku: e.sku }, { status: 400 })
    throw e
  }

  // Server-side stock re-check (never trust the client). An ERP outage (assertStock ok:true
  // with reason unavailable) must never block quote creation. The session dealer id is mapped
  // through the same ERP-snapshot mapping the PDP uses (toStockDealerId) so the on-account
  // checkout asserts against the same stock the storefront showed — never an unmapped id that
  // would fail closed as dealer_no_stock.
  for (const item of items) {
    const stock = await assertStock(item.sku, toStockDealerId(dealer), item.qty)
    if (!stock.ok) return Response.json({ error: stock.reason, sku: item.sku }, { status: 409 })
  }

  const taxProvince = body.deliveryMethod === "pickup" ? dealer.province : shipping.province
  const priced = quoteCheckout(taxProvince, items, body.deliveryMethod, body.promo)

  if (body.checkoutIdempotencyKey) {
    const lockKey = `${session.dealerId}:${body.checkoutIdempotencyKey}`
    const inflight = quoteCreates.get(lockKey)
    if (inflight) {
      const quoteNo = await inflight
      const existing = await quotes.get(quoteNo)
      if (existing) {
        const mismatch = assertStore(session.dealerId, existing.dealerId)
        if (mismatch) return mismatch
        return Response.json({ quote: publicQuote(existing) }, { status: 201 })
      }
    }
    const hit = await quotes.findByIdempotency(session.dealerId, body.checkoutIdempotencyKey)
    if (hit) return Response.json({ quote: publicQuote(hit) }, { status: 201 })
  }

  const at = new Date().toISOString()
  const kinds = ["terms", "privacy"]
  if (body.consents.marketing) kinds.push("marketing")
  if (body.consents.smsReceipt) kinds.push("sms_receipt")
  kinds.push("dealer_role")

  const project = (body.project || "").trim() || firstNameOf(shipping.name, body.contact.email) || items[0]?.name || "Quote"
  const input = {
    dealerId: session.dealerId,
    createdByUserId: session.userId,
    createdByName: session.name,
    customer: { email: body.contact.email.trim().toLowerCase(), phone: body.contact.phone || null, name: shipping.name },
    project,
    locale: body.locale,
    items,
    deliveryMethod: body.deliveryMethod,
    notes: body.notes?.trim() || null,
    shipping,
    billing,
    dealer: snapshotDealer(dealer),
    quote: priced,
    promo: body.promo,
    consents: kinds.map(kind => ({ kind, at, ip })),
    smsReceipt: body.consents.smsReceipt,
    checkoutIdempotencyKey: body.checkoutIdempotencyKey || null,
  }

  const lockKey = body.checkoutIdempotencyKey ? `${session.dealerId}:${body.checkoutIdempotencyKey}` : null
  if (lockKey) {
    const pending = quotes.create(input).then(q => q.quoteNo)
    quoteCreates.set(lockKey, pending)
    try {
      const quoteNo = await pending
      const q = await quotes.get(quoteNo)
      if (!q) throw new Error("quote_missing")
      return Response.json({ quote: publicQuote(q) }, { status: 201 })
    } catch (e) {
      quoteCreates.delete(lockKey)
      throw e
    }
  }
  const q = await quotes.create(input)
  return Response.json({ quote: publicQuote(q) }, { status: 201 })
}
