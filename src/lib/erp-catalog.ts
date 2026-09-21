/**
 * lib/erp-catalog.ts — read-only ERP catalog/stock calls (Product/skuList, Stock/skuStockList,
 * Stock/dealerStockList). Separate credential from lib/erp.ts's order-push token: this uses
 * `ERP_CATALOG_TOKEN`, never `ERP_TOKEN`. No write endpoints exist on ERP for stock.
 *
 * Same transport contract as lib/erp.ts / EspoCRM ErpClient: POST only (GET 302s to the Espo
 * login page), headers `token`, `server: 1`, `Content-Type: application/json`. Success is
 * JSON `{ code: 1, ... }`. The token value is never logged, thrown in an Error message, or
 * written to any file — callers only see typed results.
 *
 * ERP does not support batch or paginated queries: passing an array or page/pageSize returns
 * a PHP error page, not JSON. Every lookup here is for exactly one sku_code.
 */

const ERP_BASE_URL = "https://erp.vanstro.ca/api"

export interface ErpStockRecord {
  sku_code: string
  sku_id?: number
  dealer_id: number
  dealer_code: string
  quantity_on_hand: number
  /** Unix seconds (confirmed live, e.g. `1788844171` == 2026-09-08), not milliseconds and not an ISO string. */
  updated_at: number | string
}

export type ErpCatalogResult<T> =
  | { ok: true; data: T }
  /** Reached ERP, got a well-formed response, but it explicitly says "no record" (not the same as a transport failure). */
  | { ok: false; reason: "empty" }
  /** Network/timeout/5xx/non-JSON/`code!==1` — ERP could not be asked. Callers must not treat this as "no stock". */
  | { ok: false; reason: "unavailable"; error: string }

/**
 * ERP wraps the record array as `{ list: [...] }`, not a bare array (confirmed against the live
 * response: `{ code:1, data:{ list:[{ quantity_on_hand, sku_code, dealer_code, ... }] } }`).
 * Bare-array shape is also accepted defensively in case a different endpoint ever returns one.
 */
function extractList(data: unknown): ErpStockRecord[] {
  if (Array.isArray(data)) return data as ErpStockRecord[]
  if (data && typeof data === "object" && Array.isArray((data as { list?: unknown }).list)) {
    return (data as { list: ErpStockRecord[] }).list
  }
  return []
}

async function postErp(path: string, body: unknown): Promise<{ code?: number; data?: unknown } | null> {
  const token = process.env.ERP_CATALOG_TOKEN
  if (!token) return null
  const res = await fetch(`${ERP_BASE_URL}/${path}`, {
    method: "POST",
    headers: { token, server: "1", "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  })
  if (!res.ok) return null
  try {
    return (await res.json()) as { code?: number; data?: unknown }
  } catch {
    return null
  }
}

/** One SKU at a time (no batch support). */
export async function fetchSkuStock(skuCode: string): Promise<ErpCatalogResult<ErpStockRecord>> {
  try {
    const json = await postErp("Stock/skuStockList", { sku_code: skuCode })
    if (!json || json.code !== 1) return { ok: false, reason: "unavailable", error: "erp_bad_response" }
    const list = extractList(json.data)
    const record = list.find(r => r.dealer_code === "MB01") ?? list[0]
    if (!record) return { ok: false, reason: "empty" }
    return { ok: true, data: record }
  } catch (err) {
    return { ok: false, reason: "unavailable", error: err instanceof Error ? err.message : "erp_fetch_failed" }
  }
}

/** Requires both dealer_id and sku_code together. Only MB01 (dealer_id=1) has data today; others return an empty list, not an error. */
export async function fetchDealerSkuStock(dealerId: number, skuCode: string): Promise<ErpCatalogResult<ErpStockRecord>> {
  try {
    const json = await postErp("Stock/dealerStockList", { dealer_id: dealerId, sku_code: skuCode })
    if (!json || json.code !== 1) return { ok: false, reason: "unavailable", error: "erp_bad_response" }
    const list = extractList(json.data)
    const record = list[0]
    if (!record) return { ok: false, reason: "empty" }
    return { ok: true, data: record }
  } catch (err) {
    return { ok: false, reason: "unavailable", error: err instanceof Error ? err.message : "erp_fetch_failed" }
  }
}
