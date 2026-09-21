/**
 * POST /api/quotes/:id/place
 * Turns an approved quote into a pending POS order. Does not push the terminal.
 */
import { quotes, publicQuote } from "@/lib/quotes"
import { assertStore, requireDealer } from "../../_shared"
import { orders, firstNameOf } from "@/lib/orders"
import { quoteCheckout } from "@/lib/checkout"
import { assertStock } from "@/lib/stock"
import { toStockDealerId } from "@/lib/dealer/dealer-stock-id"
import { terminalIdForDealer } from "@/lib/terminals"
import { ensureDealers, getDealer } from "@/lib/dealers"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireDealer(req)
  if (!gate.ok) return gate.response
  const session = gate.session
  const { id } = await params
  const existing = await quotes.get(id)
  if (!existing) return Response.json({ error: "quote_not_found" }, { status: 404 })
  const mismatch = assertStore(session.dealerId, existing.dealerId)
  if (mismatch) return mismatch
  if (existing.status === "expired") return Response.json({ error: "quote_expired" }, { status: 409 })
  if (existing.status === "ordered" && existing.orderNo) {
    return Response.json({ quote: publicQuote(existing), orderNo: existing.orderNo, alreadyPlaced: true })
  }
  if (existing.status !== "approved") return Response.json({ error: "quote_not_approved" }, { status: 409 })

  await ensureDealers()
  const dealer = getDealer(session.dealerId)
  if (!dealer || dealer.id !== existing.dealerId) {
    return Response.json({ error: "pos_store_mismatch" }, { status: 403 })
  }

  const taxProvince = existing.deliveryMethod === "pickup" ? dealer.province : existing.shipping.province
  const replay = existing.dealerDiscountCents != null
    ? quoteCheckout(taxProvince, existing.items, existing.deliveryMethod, existing.promo, existing.dealerDiscountCents)
    : quoteCheckout(taxProvince, existing.items, existing.deliveryMethod, existing.promo)
  if (replay.totalCents !== existing.quote.totalCents || replay.discountCents !== existing.quote.discountCents) {
    return Response.json({ error: "quote_snapshot_mismatch", detail: "Frozen quote totals no longer replay. Create a new quote." }, { status: 409 })
  }
  if (!terminalIdForDealer(dealer.id)) {
    return Response.json({ error: "pos_terminal_unbound", detail: "This store is not bound to a POS terminal." }, { status: 502 })
  }

  // Server-side stock re-check at place time (never trust the frozen quote's stock context;
  // ERP outage must never block placing an already-approved quote). The dealer id is mapped
  // through the same ERP-snapshot mapping the PDP uses (toStockDealerId) so the on-account
  // checkout asserts against the same stock the storefront showed.
  for (const item of existing.items) {
    const stock = await assertStock(item.sku, toStockDealerId(dealer), item.qty)
    if (!stock.ok) return Response.json({ error: stock.reason, sku: item.sku }, { status: 409 })
  }

  const order = await orders.create({
    userId: session.userId,
    locale: existing.locale,
    email: existing.customer.email,
    phone: existing.customer.phone,
    firstName: firstNameOf(existing.shipping.name, existing.customer.email),
    items: existing.items,
    deliveryMethod: existing.deliveryMethod,
    notes: existing.notes,
    shipping: existing.shipping,
    billing: existing.billing,
    seller: "Vanstro Global Supply Inc.",
    dealer: existing.dealer,
    quote: existing.quote,
    consents: existing.consents,
    smsReceipt: existing.smsReceipt,
    paymentMethod: "pos",
    saveCard: false,
    posTerminalId: terminalIdForDealer(dealer.id),
  })

  const q = await quotes.update(id, row => {
    row.status = "ordered"
    row.orderNo = order.orderNo
    row.orderedAt = new Date().toISOString()
  })
  return Response.json({ quote: q ? publicQuote(q) : publicQuote(existing), orderNo: order.orderNo })
}
