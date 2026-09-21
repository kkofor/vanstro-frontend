/**
 * GET /api/stock?sku=&dealerId= — request-time stock lookup for the PDP.
 * Delegates to lib/stock.ts (ERP > manual fallback > none; placeholder dealers
 * always dealer_no_stock; ERP outages degrade to `unavailable`, never block).
 * Never called at build time — this route only runs per-request.
 */
import { NextRequest, NextResponse } from "next/server"
import { resolveStock } from "@/lib/stock"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const sku = req.nextUrl.searchParams.get("sku")
  const dealerId = req.nextUrl.searchParams.get("dealerId")

  if (!sku || !dealerId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 })
  }

  const stock = await resolveStock(sku, dealerId)

  return NextResponse.json(
    {
      qty: stock.qty,
      source: stock.source,
      updatedAt: stock.updatedAt ?? null,
      reason: stock.reason,
      canOrder: stock.canOrder,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
