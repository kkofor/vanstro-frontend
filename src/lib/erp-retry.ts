/**
 * lib/erp-retry.ts — outbox for failed paid → ERP pushes.
 *
 * Off unless ERP_RETRY_ENABLED=true. Payment stays captured. The queue only
 * re-calls Order/syncEspoQuote with backoff. Staff "Push again" still works.
 */
import { erpConfigured } from "./erp"
import { orders } from "./orders"

const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000, 24 * 60 * 60_000]
export const ERP_RETRY_MAX = Math.max(3, Number(process.env.ERP_RETRY_MAX || 12))

export function erpRetryEnabled() {
  return process.env.ERP_RETRY_ENABLED === "true"
}

export function scheduleErpRetry<T extends { status: string; attempts: number; nextRetryAt?: string; deadLetter?: boolean }>(erp: T): T {
  if (erp.status !== "failed") return { ...erp, nextRetryAt: undefined, deadLetter: false }
  if (erp.attempts >= ERP_RETRY_MAX) return { ...erp, nextRetryAt: undefined, deadLetter: true }
  const step = Math.min(Math.max(erp.attempts - 1, 0), BACKOFF_MS.length - 1)
  return { ...erp, nextRetryAt: new Date(Date.now() + BACKOFF_MS[step]).toISOString(), deadLetter: false }
}

export async function sweepErpRetries(): Promise<{ checked: number; retried: number; recovered: number }> {
  if (!erpRetryEnabled() || !erpConfigured()) return { checked: 0, retried: 0, recovered: 0 }
  const all = await orders.listAll()
  for (const o of all) {
    if (o.status !== "paid" || o.erp?.status !== "failed" || o.erp.deadLetter || o.erp.nextRetryAt) continue
    try { await orders.setErp(o.orderNo, scheduleErpRetry(o.erp)) } catch { /* keep sweeping */ }
  }
  const now = Date.now()
  const due = (await orders.listAll()).filter(o =>
    o.status === "paid"
    && o.erp?.status === "failed"
    && !o.erp.deadLetter
    && o.erp.nextRetryAt
    && Date.parse(o.erp.nextRetryAt) <= now
  )
  const { retryErpPush } = await import("./order-notify")
  let recovered = 0
  for (const o of due) {
    try {
      const erp = await retryErpPush(o.orderNo)
      if (erp.status === "success" || erp.status === "skipped") recovered += 1
    } catch (e) {
      console.warn(`[erp-retry] ${o.orderNo} ${e instanceof Error ? e.message : e}`)
    }
  }
  if (due.length) console.info(`[erp-retry] retried ${due.length} failed push(es), ${recovered} recovered`)
  return { checked: due.length, retried: due.length, recovered }
}
