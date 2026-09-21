/**
 * POST /api/orders
 * Creates a pending order and returns what the browser needs to render the card inputs:
 * the Moneris Hosted Tokenization frame (profile id + URL) or, with MONERIS_MOCK=1, the
 * instruction to use the stand-in card box. Nothing is charged here.
 *
 * Server is the source of truth for money: cart prices come from the catalogue, tax is
 * recomputed with lib/tax.ts, and the amount sent to Moneris at pay time is that total. The
 * client never supplies an amount. Consent timestamps are recorded on the order (PIPEDA express consent,
 * CASL opt-in, dealer-role acknowledgment) together with the request IP.
 *
 * Dealer: the order snapshots the selected independent local dealer (or null when the
 * province has none). Vanstro Global Supply Inc. is always the Seller; the dealer is the
 * customer's first contact for pickup / delivery coordination / returns and is notified
 * once payment is approved (see /api/checkout/moneris/pay).
 *
 * Anything we cannot take payment for is refused *before* the order is persisted, so no stray
 * pending orders: saved cards (Vault purchase, payments workstream → 501), wallets in live
 * mode (need wallet SDK tokens → 501), live mode without an HT profile (→ 502).
 *
 * Guest checkout: no session is required. A guest order must carry inline shipping/billing
 * addresses (no address book), pays with a new card only (no Vault / POS), is rate-limited per
 * IP, and is stored with userId = null. The response includes `accessToken`, the HMAC the
 * browser must present (x-vs-order-token or ?t=) to pay, read or resend that order. Registering
 * later with the same email claims the order (POST /api/orders/claim).
 *
 * GET /api/orders → the signed-in user's orders (account › Orders).
 */
import { orderCreateSchema, promoStatus, quoteCheckout } from "@/lib/checkout"
import { dealersFor, ensureDealers, getDealer, snapshotDealer } from "@/lib/dealers"
import { getItem, UnknownSkuError } from "@/lib/catalogue"
import { assertStock } from "@/lib/stock"
import { auth } from "@/lib/auth"
import { orders, firstNameOf, publicOrder, type StoredAddress, type Order } from "@/lib/orders"
import { paymentMode, paymentSession } from "@/lib/payments"
import { hostedTokenization } from "@/lib/moneris"
import { terminalIdForDealer } from "@/lib/terminals"
import { orderAccessToken } from "@/lib/order-access"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { isEmailBlocked } from "@/lib/risk"
import type { Address } from "@/lib/validators"

/** In-process lock so a double POST /api/orders with the same checkout key cannot open two POS orders. */
const posCheckoutCreates = new Map<string, Promise<string>>()

function orderCreateResponse(order: Order, guest: boolean) {
  const accessToken = guest ? orderAccessToken(order.orderNo) : null
  if (guest && !accessToken) {
    return Response.json({ error: "guest_checkout_unavailable", detail: "VANSTRO_LINK_SECRET is not set; guest orders cannot be authorised." }, { status: 502 })
  }
  return Response.json({ orderNo: order.orderNo, guest, accessToken, txnTotalCents: order.quote.totalCents, quote: order.quote, dealer: order.dealer, payment: paymentSession(order) })
}

/** Saved addresses would come from the address book; the prototype ships two demo entries. */
const DEMO_ADDRESSES: Record<string, StoredAddress> = {
  "1": { name: "Guannan Zhang", street: "88 Waterfront Dr", unit: "Unit 1204", city: "Winnipeg", province: "MB", postalCode: "R3B 0T3" },
  "2": { name: "Guannan Zhang", company: "Northline Renovations Ltd.", street: "410 Adelaide St W", city: "Toronto", province: "ON", postalCode: "M5V 1S8" },
}
async function resolveAddress(userId: string | null, ref: { addressId: string } | { address: Address }): Promise<StoredAddress | null> {
  if ("address" in ref) {
    const a = ref.address
    return { name: a.name, company: a.company || undefined, street: a.street, unit: a.unit || undefined, city: a.city, province: a.province, postalCode: a.postalCode, phone: a.phone || undefined }
  }
  if (userId === null) return null // guests have no address book
  void userId // production: db.addresses.get(userId, ref.addressId)
  return DEMO_ADDRESSES[ref.addressId] ?? null
}

export async function GET(req: Request) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  const list = await orders.listByUser(session.userId)
  const dealerPos = session.role === "dealer" && !!session.dealerId
  return Response.json({
    orders: list.map(o => {
      const pub = publicOrder(o)
      return { ...pub, canPushPos: dealerPos && pub.canPushPos }
    }),
  }, { headers: { "cache-control": "no-store" } })
}

export async function POST(req: Request) {
  const session = await auth(req)
  const guest = !session
  const userId = session?.userId ?? null

  // Guests are anonymous: cap order creation per IP so the endpoint cannot be used to mass-create
  // pending orders (they expire after 30 min anyway).
  if (guest && !rateLimit(`guest-order:${clientIp(req)}`, 20, 3600)) {
    return Response.json({ error: "rate_limited" }, { status: 429 })
  }

  await ensureDealers()
  const parsed = orderCreateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  }
  const body = parsed.data
  if (await isEmailBlocked(body.contact.email)) {
    return Response.json({ error: "email_blocked", detail: "This email cannot place new orders. Contact support." }, { status: 403 })
  }

  if (guest) {
    if (!("address" in body.shipping)) return Response.json({ error: "guest_address_required", detail: "Guest checkout needs a full shipping address (no address book)." }, { status: 400 })
    if (!body.billing.sameAsShipping && !("address" in body.billing)) return Response.json({ error: "guest_address_required", detail: "Guest checkout needs a full billing address." }, { status: 400 })
    if (body.payment.method === "pos") return Response.json({ error: "pos_dealer_only" }, { status: 403 })
    if (body.payment.method === "saved") return Response.json({ error: "saved_card_not_available" }, { status: 501 })
  }

  // 1. Resolve shipping + billing addresses — shipping province is the place of supply.
  const shipping = await resolveAddress(userId, body.shipping)
  if (!shipping) return Response.json({ error: "address_not_found" }, { status: 400 })
  const billing = body.billing.sameAsShipping ? shipping : await resolveAddress(userId, body.billing)
  if (!billing) return Response.json({ error: "billing_address_not_found" }, { status: 400 })

  // 1b. Resolve the dealer.
  //     Customer: any participating dealer. Checkout defaults to the shipping-province
  //     store; the customer may switch. Null only when that province has none.
  //     Dealer placing for a customer: always the signed-in store.
  const placedByDealer = session?.role === "dealer" && !!session.dealerId
  const wantedDealerId = placedByDealer ? session.dealerId : body.dealer.dealerId
  const dealer = wantedDealerId ? getDealer(wantedDealerId) : null
  if (wantedDealerId && !dealer) return Response.json({ error: "dealer_not_found" }, { status: 400 })
  if (!placedByDealer && !dealer && dealersFor(shipping.province).length) {
    return Response.json({ error: "dealer_required" }, { status: 400 })
  }
  if (body.deliveryMethod === "pickup" && !(dealer && dealer.services.includes("pickup"))) return Response.json({ error: "pickup_unavailable" }, { status: 400 })

  // 2. Re-price the cart from the catalogue; never trust client unit prices.
  let items
  try {
    items = await Promise.all(body.cart.map(async (i) => {
      const c = await getItem(i.sku)
      return { sku: c.sku, name: c.name, variant: c.variant, qty: i.qty, unitCents: c.unitCents }
    }))
  } catch (e) {
    if (e instanceof UnknownSkuError) return Response.json({ error: "unknown_sku", sku: e.sku }, { status: 400 })
    throw e
  }
  // 2b. Promo: validated and priced here; the client only sends the code. An unusable code is a
  //     hard error so the customer never pays a total that differs from what cart.html showed.
  if (body.promo) {
    const st = promoStatus(body.promo)
    if (st !== "ok") return Response.json({ error: st === "expired" ? "promo_expired" : "promo_invalid", promo: body.promo }, { status: 400 })
  }

  // 2c. Server-side stock re-check (never trust the client): only when a dealer is assigned —
  //     a province with no participating dealer has no stock context to check against. An ERP
  //     outage (assertStock ok:true with unavailable) must never block the order.
  if (dealer) {
    for (const item of items) {
      const stock = await assertStock(item.sku, dealer.id, item.qty)
      if (!stock.ok) return Response.json({ error: stock.reason, sku: item.sku }, { status: 409 })
    }
  }
  // Pickup is taxed where the goods change hands (the dealer's province). Freight / white-glove
  // follow the customer's shipping province — including when a dealer places for an out-of-province customer.
  const taxProvince = body.deliveryMethod === "pickup" && dealer ? dealer.province : shipping.province
  const quote = quoteCheckout(taxProvince, items, body.deliveryMethod, body.promo)

  // 3. Consents with timestamp + IP (proof of agreement; CASL requires it for marketing).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  const at = new Date().toISOString()
  const kinds = ["terms", "privacy"]
  if (body.consents.marketing) kinds.push("marketing")
  if (body.consents.smsReceipt) kinds.push("sms_receipt")
  if (dealer) kinds.push("dealer_role") // schema guarantees consents.dealerRole === true when a dealer is set

  // 4. Refuse before persisting anything we cannot take payment for (no stray pending orders).
  if (body.payment.method === "pos") {
    if (!session || session.role !== "dealer") return Response.json({ error: "pos_dealer_only" }, { status: 403 })
    if (!session.dealerId) {
      return Response.json({ error: "dealer_account_incomplete", detail: "This dealer account is not linked to a store. Use the Vanstro invite to register." }, { status: 403 })
    }
    if (!dealer || session.dealerId !== dealer.id) {
      return Response.json({ error: "pos_store_mismatch", detail: "POS orders must use the store on this dealer account." }, { status: 403 })
    }
    if (!terminalIdForDealer(dealer.id)) {
      return Response.json({ error: "pos_terminal_unbound", detail: "This dealer account has no Moneris Go terminalId." }, { status: 502 })
    }
  } else {
    if (body.payment.method === "saved") {
      return Response.json({ error: "saved_card_not_available" }, { status: 501 })
    }
    if (body.payment.method !== "new" && paymentMode() === "live") {
      return Response.json({ error: "wallet_not_available" }, { status: 501 })
    }
    if (paymentMode() === "live" && !hostedTokenization().profileId) {
      return Response.json({ error: "payment_unavailable", detail: "MONERIS_HT_PROFILE_ID is not set (MRC → Admin → Hosted Tokenization)." }, { status: 502 })
    }
  }

  // 5. Persist the pending order with the server-side quote.
  const posIdemKey = body.payment.method === "pos" && session?.userId && body.checkoutIdempotencyKey
    ? `${session.userId}:${body.checkoutIdempotencyKey}`
    : null
  if (posIdemKey) {
    const inflight = posCheckoutCreates.get(posIdemKey)
    if (inflight) {
      const orderNo = await inflight
      const existing = await orders.get(orderNo)
      if (existing) return orderCreateResponse(existing, false)
    }
    const hit = (await orders.listByUser(session!.userId)).find(o =>
      o.checkoutIdempotencyKey === body.checkoutIdempotencyKey && o.paymentMethod === "pos" && o.status !== "cancelled" && o.status !== "expired")
    if (hit) return orderCreateResponse(hit, false)
  }

  const createInput = {
    userId,
    locale: body.locale,
    email: body.contact.email.trim().toLowerCase(),
    phone: body.contact.phone || null,
    firstName: firstNameOf(shipping.name, body.contact.email),
    items,
    deliveryMethod: body.deliveryMethod,
    notes: body.notes?.trim() || null,
    shipping,
    billing,
    seller: "Vanstro Global Supply Inc." as const,
    dealer: dealer ? snapshotDealer(dealer) : null,
    quote,
    consents: kinds.map(kind => ({ kind, at, ip })),
    smsReceipt: body.consents.smsReceipt,
    paymentMethod: body.payment.method,
    saveCard: body.payment.method === "new" ? body.payment.saveCard : false,
    posTerminalId: body.payment.method === "pos" ? terminalIdForDealer(dealer!.id) : null,
    checkoutIdempotencyKey: body.checkoutIdempotencyKey || null,
  }

  let order
  if (posIdemKey) {
    const pending = (async () => {
      const created = await orders.create(createInput)
      return created.orderNo
    })()
    posCheckoutCreates.set(posIdemKey, pending)
    try {
      const orderNo = await pending
      order = await orders.get(orderNo)
      if (!order) throw new Error("pos_idem_missing")
    } catch (error) {
      posCheckoutCreates.delete(posIdemKey)
      throw error
    }
  } else {
    order = await orders.create(createInput)
  }

  // 6. Tell the browser how to render the card inputs (Hosted Tokenization frame, or the mock box).
  //    Guests also get the access token they need for /pay, the confirmation page and the invoice.
  return orderCreateResponse(order, guest)
}
