import { z } from "zod"
import { quotes, publicQuote, dealerDiscountLimitCents } from "@/lib/quotes"
import { quoteCheckout } from "@/lib/checkout"
import { assertStore, requireDealer } from "../../_shared"

const bodySchema = z.object({
  discountCents: z.number().int().optional(),
  /** Ignored. Server always recomputes totals from the frozen line snapshot. */ 
  totalCents: z.unknown().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireDealer(req)
  if (!gate.ok) return gate.response
  const { id } = await params
  const existing = await quotes.get(id)
  if (!existing) return Response.json({ error: "quote_not_found" }, { status: 404 })
  const mismatch = assertStore(gate.session.dealerId, existing.dealerId)
  if (mismatch) return mismatch
  if (existing.status === "expired") return Response.json({ error: "quote_expired", detail: "Void this quote and open a new one." }, { status: 409 })
  if (existing.status !== "awaiting") {
    return Response.json({ error: "quote_not_awaiting", detail: "Discount can only be set while the quote is awaiting approval. Void it and open a new quote." }, { status: 409 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })

  let priced = existing.quote
  let dealerDiscountCents: number | undefined
  if (parsed.data.discountCents !== undefined) {
    const discountCents = parsed.data.discountCents
    if (discountCents < 0) {
      return Response.json({ error: "discount_negative", detail: "Discount cannot be negative." }, { status: 400 })
    }
    const subtotalCents = existing.quote.subtotalCents
    const limitCents = dealerDiscountLimitCents(subtotalCents)
    if (discountCents > limitCents) {
      return Response.json({
        error: "discount_exceeds_limit",
        subtotalCents,
        limitCents,
        detail: `Discount cannot exceed 50% of the product subtotal (CAD ${(limitCents / 100).toFixed(2)}).`,
      }, { status: 400 })
    }
    const taxProvince = existing.deliveryMethod === "pickup" ? existing.dealer.province : existing.shipping.province
    priced = quoteCheckout(taxProvince, existing.items, existing.deliveryMethod, existing.promo, discountCents)
    if (priced.totalCents <= 0) {
      return Response.json({ error: "quote_total_nonpositive", detail: "Quoted total must be greater than zero." }, { status: 400 })
    }
    dealerDiscountCents = discountCents
  }

  const q = await quotes.update(id, row => {
    if (dealerDiscountCents !== undefined) {
      row.priceRevisions = row.priceRevisions || []
      row.priceRevisions.push({
        at: new Date().toISOString(),
        byUserId: gate.session.userId,
        before: { discountCents: row.quote.discountCents, totalCents: row.quote.totalCents },
        after: { discountCents: priced.discountCents, totalCents: priced.totalCents },
        overwrittenPromo: row.promo ?? row.quote.promo?.code ?? null,
      })
      row.dealerDiscountCents = dealerDiscountCents
      row.quote = priced
    }
    row.status = "approved"
    row.approvedAt = new Date().toISOString()
  })
  if (!q) return Response.json({ error: "quote_not_found" }, { status: 404 })
  return Response.json({ quote: publicQuote(q) })
}
