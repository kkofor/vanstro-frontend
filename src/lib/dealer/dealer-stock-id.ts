/**
 * lib/dealer/dealer-stock-id.ts — maps a live Website-API/storefront dealer identity
 * (a UUID `id` plus a human `code` like "AB10") to the ERP-snapshot dealer id that
 * `/api/stock` (lib/stock.ts) understands (e.g. "AB-CGY").
 *
 * Client-safe: only imports the static `dealers-snapshot.json`, no `node:fs`.
 *
 * Falls back to the dealer's own id unchanged when it is already a snapshot id or has
 * no matching code — an unmapped id is deliberately left as a non-empty, unrecognized
 * string so `/api/stock` resolves it to `dealer_no_stock` (fail closed) instead of
 * silently defaulting to Yuan's real stock. Only a genuinely empty/missing dealerId
 * falls back to the default dealer (see lib/stock.ts `resolveStock`).
 */
import dealerSnapshot from "@/lib/dealers-snapshot.json"

type SnapshotDealer = { id: string; code: string }

const SNAPSHOT_DEALERS = dealerSnapshot as SnapshotDealer[]
const KNOWN_STOCK_DEALER_IDS = new Set(SNAPSHOT_DEALERS.map((dealer) => dealer.id))
const CODE_TO_STOCK_DEALER_ID = new Map<string, string>(
  SNAPSHOT_DEALERS.map((dealer) => [dealer.code.trim().toUpperCase(), dealer.id]),
)

/** Website-API location codes carry a site suffix ("MB01-MAIN", "AB10-MAIN"); the snapshot
 *  maps the bare master code ("MB01"/"AB10"). Normalize before the lookup. */
function normalizeDealerCode(code: string | undefined): string | undefined {
  if (!code) return undefined
  return code.trim().toUpperCase().replace(/\s*[-(].*/, "")
}

export function toStockDealerId(dealer: { id: string; code?: string }): string {
  if (KNOWN_STOCK_DEALER_IDS.has(dealer.id)) return dealer.id
  const normalized = normalizeDealerCode(dealer.code)
  const byCode = normalized ? CODE_TO_STOCK_DEALER_ID.get(normalized) : undefined
  return byCode ?? dealer.id
}

export function isKnownStockDealerId(id: string): boolean {
  return KNOWN_STOCK_DEALER_IDS.has(id)
}
