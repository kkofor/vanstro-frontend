/**
 * POST /api/quotes/:id/decline
 * Dealer voids the quote. Status stays `declined` on disk; it is not a customer refusal.
 */
import { quotes, publicQuote } from "@/lib/quotes"
import { assertStore, requireDealer } from "../../_shared"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireDealer(req)
  if (!gate.ok) return gate.response
  const { id } = await params
  const existing = await quotes.get(id)
  if (!existing) return Response.json({ error: "quote_not_found" }, { status: 404 })
  const mismatch = assertStore(gate.session.dealerId, existing.dealerId)
  if (mismatch) return mismatch
  if (existing.status === "expired") return Response.json({ error: "quote_expired" }, { status: 409 })
  if (existing.status !== "awaiting") return Response.json({ error: "quote_not_awaiting" }, { status: 409 })
  const q = await quotes.update(id, row => {
    row.status = "declined"
    row.declinedAt = new Date().toISOString()
  })
  if (!q) return Response.json({ error: "quote_not_found" }, { status: 404 })
  return Response.json({ quote: publicQuote(q) })
}
