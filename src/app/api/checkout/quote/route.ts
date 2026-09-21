/**
 * POST /api/checkout/quote
 * Destination-based tax quote for the sticky order summary. Re-prices from the catalogue.
 */
import { quoteRequestSchema, quoteCheckout } from "@/lib/checkout"
import { getItem, UnknownSkuError } from "@/lib/catalogue"

export async function POST(req: Request) {
  const parsed = quoteRequestSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  }
  const { province, items, deliveryMethod, promo } = parsed.data
  let priced
  try {
    priced = await Promise.all(items.map(async i => {
      const c = await getItem(i.sku)
      return { sku: c.sku, name: c.name, unitCents: c.unitCents, qty: i.qty }
    }))
  } catch (e) {
    if (e instanceof UnknownSkuError) return Response.json({ error: "unknown_sku", sku: e.sku }, { status: 400 })
    throw e
  }
  const quote = quoteCheckout(province, priced, deliveryMethod, promo)
  return Response.json(quote, { headers: { "Cache-Control": "no-store" } })
}
