/**
 * GET /api/dealers — public participating directory (no invite codes).
 * Checkout uses this so ops-added dealers show up on step 1.
 */
import { ensureDealers, listDealers, publicDealer } from "@/lib/dealers"

export async function GET() {
  await ensureDealers()
  return Response.json({
    dealers: listDealers().map(publicDealer),
  }, { headers: { "cache-control": "no-store" } })
}
