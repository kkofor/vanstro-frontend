/**
 * lib/stock.ts — resolves display/checkout stock for a (sku, dealer) pair.
 *
 * Precedence (never reversed): ERP record > manual fallback (data/manual-stock.json) > none.
 * The manual file is a temporary backfill for SKUs Yuan hasn't logged in ERP yet
 * ("临时兜底、待 ERP 补录") — the moment ERP has a record for that sku it wins outright.
 *
 * Placeholder dealers (no erpAccountId — the five non-Yuan snapshot rows) never have real
 * stock data and are never asked: they always resolve to `dealer_no_stock`.
 *
 * ERP being unreachable/erroring is NOT the same as ERP explicitly returning no record.
 * A transport failure must resolve to `unavailable` (checkout stays open, degrade the UI)
 * so an ERP outage never blocks a sale; an explicit empty list can become `out_of_stock`.
 *
 * This module must only be called at request time (API routes / client fetch), never at
 * module load or from a page that's statically generated at build (PDP is SSG) — otherwise
 * the stock value gets frozen into the build and an ERP outage during `next build` would
 * silently bake in `unavailable` for everyone until the next deploy.
 */
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { getDealer } from "./dealers"
import { fetchSkuStock } from "./erp-catalog"

export type StockReason = "in_stock" | "out_of_stock" | "insufficient" | "dealer_no_stock" | "unavailable"
export type StockSource = "erp" | "manual" | "none"

export interface StockResult {
  reason: StockReason
  canOrder: boolean
  qty: number
  source: StockSource
  /** ISO timestamp from ERP `updated_at`, only present when source === "erp". */
  updatedAt?: string
}

const MANUAL_STOCK_FILE = process.env.MANUAL_STOCK_FILE ?? join(process.cwd(), "data", "manual-stock.json")
/** ERP data is stale by nature (median ~15.8 days between updates); 120s just avoids re-hitting
 *  ERP on every PDP re-render/refresh within the same short visit, it is not a freshness claim. */
const CACHE_TTL_MS = 120_000

/**
 * ERP's `updated_at` is a Unix **seconds** timestamp (confirmed live: e.g. `1788844171` ==
 * 2026-09-08), even though it travels through the wire as a bare number, not milliseconds and
 * not an ISO string. Converting it here (once, at the source) means every consumer of
 * StockResult.updatedAt gets a real ISO string and never has to guess the unit again.
 */
function erpUpdatedAtToIso(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  const seconds = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined
  return new Date(seconds * 1000).toISOString()
}

type ManualStockFile = { skus?: Record<string, { quantity: number }> }
let manualCache: { at: number; data: ManualStockFile } | null = null

async function loadManualStock(): Promise<ManualStockFile> {
  if (manualCache && Date.now() - manualCache.at < CACHE_TTL_MS) return manualCache.data
  try {
    const raw = JSON.parse(await readFile(MANUAL_STOCK_FILE, "utf8")) as ManualStockFile
    manualCache = { at: Date.now(), data: raw }
    return raw
  } catch {
    const empty: ManualStockFile = { skus: {} }
    manualCache = { at: Date.now(), data: empty }
    return empty
  }
}

interface CacheEntry { at: number; result: StockResult }
const stockCache = new Map<string, CacheEntry>()

function cacheKey(skuCode: string, dealerId: string) {
  return `${dealerId}::${skuCode}`
}

/** Resolves quantity/orderability for one sku at one dealer. ERP is only consulted for dealers with an erpAccountId. */
export async function resolveStock(skuCode: string, dealerId: string): Promise<StockResult> {
  const key = cacheKey(skuCode, dealerId)
  const cached = stockCache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result

  const result = await resolveStockUncached(skuCode, dealerId)
  stockCache.set(key, { at: Date.now(), result })
  return result
}

const DEFAULT_DEALER_ID = "MB-YUAN"

async function resolveStockUncached(skuCode: string, dealerId: string): Promise<StockResult> {
  // Only a genuinely empty/missing dealerId (never a real client value) falls back to the
  // default dealer. A non-empty id that isn't a known snapshot id — whether a live-directory
  // UUID that the caller failed to map (see lib/dealer/dealer-stock-id.ts), a stale value, or
  // anything else — must fail closed as dealer_no_stock, never silently borrow Yuan's real
  // stock. Reversed from an earlier version of this function that fell back to the default
  // dealer for ANY unknown id; that masked every non-Yuan dealer selection from the live
  // Website API directory behind Yuan's inventory (architect-reported regression, 2026-09-09).
  const resolvedDealerId = dealerId || DEFAULT_DEALER_ID
  const dealer = getDealer(resolvedDealerId, { includeDisabled: true })
  if (!dealer || !dealer.erpAccountId) {
    return { reason: "dealer_no_stock", canOrder: false, qty: 0, source: "none" }
  }

  const erp = await fetchSkuStock(skuCode)
  if (erp.ok) {
    const qty = erp.data.quantity_on_hand
    return {
      reason: qty > 0 ? "in_stock" : "out_of_stock",
      canOrder: qty > 0,
      qty,
      source: "erp",
      updatedAt: erpUpdatedAtToIso(erp.data.updated_at),
    }
  }

  if (erp.reason === "unavailable") {
    return { reason: "unavailable", canOrder: true, qty: 0, source: "none" }
  }

  // erp.reason === "empty": ERP explicitly has no record for this sku — fall back to manual.
  const manual = await loadManualStock()
  const manualQty = manual.skus?.[skuCode]?.quantity
  if (manualQty !== undefined) {
    return { reason: manualQty > 0 ? "in_stock" : "out_of_stock", canOrder: manualQty > 0, qty: manualQty, source: "manual" }
  }
  return { reason: "out_of_stock", canOrder: false, qty: 0, source: "none" }
}

/** Checkout-time check: does this dealer have at least `quantity` of this sku right now? Distinguishes the three block reasons from a soft "unavailable" (never blocks). */
export async function assertStock(skuCode: string, dealerId: string, quantity: number): Promise<{ ok: true } | { ok: false; reason: "out_of_stock" | "insufficient" | "dealer_no_stock" }> {
  const stock = await resolveStock(skuCode, dealerId)
  if (stock.reason === "unavailable") return { ok: true }
  if (stock.reason === "dealer_no_stock") return { ok: false, reason: "dealer_no_stock" }
  if (stock.reason === "out_of_stock") return { ok: false, reason: "out_of_stock" }
  if (stock.qty < quantity) return { ok: false, reason: "insufficient" }
  return { ok: true }
}
