/**
 * GET /api/quotes/:id/quote.pdf
 * Dealer downloads the same PDF that quote email attaches (renderQuoteHtml + htmlToPdf).
 */
import { quotes } from "@/lib/quotes"
import { quotePdf } from "@/lib/invoice-pdf"
import { assertStore, requireDealer } from "../../_shared"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireDealer(req)
  if (!gate.ok) return gate.response
  const { id } = await params
  const q = await quotes.get(id)
  if (!q) return Response.json({ error: "quote_not_found" }, { status: 404 })
  const mismatch = assertStore(gate.session.dealerId, q.dealerId)
  if (mismatch) return mismatch
  try {
    const { name, content } = await quotePdf(q)
    return new Response(new Uint8Array(content), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "private, no-store",
      },
    })
  } catch {
    return Response.json({ error: "quote_render_failed" }, { status: 502 })
  }
}
