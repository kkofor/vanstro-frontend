import { quotes, publicQuote } from "@/lib/quotes"
import { assertStore, requireDealer } from "../_shared"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireDealer(req)
  if (!gate.ok) return gate.response
  const { id } = await params
  const q = await quotes.get(id)
  if (!q) return Response.json({ error: "quote_not_found" }, { status: 404 })
  const mismatch = assertStore(gate.session.dealerId, q.dealerId)
  if (mismatch) return mismatch
  return Response.json({ quote: publicQuote(q) }, { headers: { "cache-control": "no-store" } })
}
