/**
 * lib/erp-watch.ts — pull ERP sales-order status onto a paid storefront order.
 *
 * Off unless ERP_WATCH_ENABLED=true. A failed poll never un-pays the order.
 */
import { erpConfigured, queryErpOrder, type ErpPushRecord } from "./erp"
import { applyFulfillment, fulfillmentFromErp, shouldAdvance } from "./fulfillment"
import { orders, trackingHref, type FulfillmentStatus, type Order } from "./orders"

export { fulfillmentFromErp }

const POLL_MS = Math.max(15_000, Number(process.env.ERP_POLL_MIN_MS || 45_000))
const TERMINAL: FulfillmentStatus[] = ["delivered", "returned"]

export function erpWatchEnabled() {
  return process.env.ERP_WATCH_ENABLED === "true"
}

function shippingOn(f: FulfillmentStatus) {
  return f === "ready" || f === "in_transit" || f === "delivered"
}

export async function refreshPaidOrderFromErp(o: Order, opts: { force?: boolean } = {}): Promise<Order> {
  if (o.status !== "paid") return o
  if (!erpConfigured() || o.erp?.status !== "success") return o
  const current = o.fulfillment ?? "unfulfilled"
  if (!opts.force && TERMINAL.includes(current)) return o
  if (!opts.force && o.erp.polledAt && Date.now() - Date.parse(o.erp.polledAt) < POLL_MS) return o

  const remoteNo = o.erp.erpOrderNo || o.orderNo
  let remote
  try {
    remote = await queryErpOrder(remoteNo)
  } catch (e) {
    const pollError = e instanceof Error ? e.message : String(e)
    console.warn(`[erp-watch] ${o.orderNo} poll failed: ${pollError}`)
    await orders.setErp(o.orderNo, { ...o.erp, polledAt: new Date().toISOString(), pollError })
    return (await orders.get(o.orderNo)) ?? o
  }

  const erp: ErpPushRecord = {
    ...o.erp,
    erpOrderId: remote.orderId || o.erp.erpOrderId,
    erpOrderNo: remote.orderNo || o.erp.erpOrderNo,
    erpInvoiceNo: remote.invoiceNo || o.erp.erpInvoiceNo,
    erpOrderStatus: remote.orderStatus,
    polledAt: new Date().toISOString(),
    pollError: undefined,
  }
  await orders.setErp(o.orderNo, erp)

  const next = fulfillmentFromErp(o.deliveryMethod, remote.orderStatus)
  const tracking = remote.trackingNo
    ? { carrier: remote.carrier, trackingNo: remote.trackingNo, trackingUrl: remote.trackingUrl }
    : undefined
  if (next && shouldAdvance(current, next) && !(o.riskHold && shippingOn(next))) {
    try {
      return await applyFulfillment({ ...o, fulfillment: current }, next, { tracking })
    } catch (e) {
      console.warn(`[erp-watch] ${o.orderNo} apply skipped: ${e instanceof Error ? e.message : e}`)
    }
  } else if (tracking && tracking.trackingNo !== o.tracking?.trackingNo) {
    await orders.setTracking(o.orderNo, {
      carrier: tracking.carrier,
      trackingNo: tracking.trackingNo,
      trackingUrl: tracking.trackingUrl || trackingHref(tracking),
      at: new Date().toISOString(),
    })
  }
  return (await orders.get(o.orderNo)) ?? o
}

export async function safeRefreshPaidOrder(o: Order, opts: { force?: boolean } = {}): Promise<Order> {
  try { return await refreshPaidOrderFromErp(o, opts) }
  catch (e) {
    console.warn(`[erp-watch] ${o.orderNo} refresh skipped: ${e instanceof Error ? e.message : e}`)
    return o
  }
}

export async function sweepErpFulfillment(): Promise<{ checked: number; advanced: number }> {
  if (!erpWatchEnabled() || !erpConfigured()) return { checked: 0, advanced: 0 }
  const all = await orders.listAll()
  const open = all.filter(o =>
    o.status === "paid"
    && o.erp?.status === "success"
    && !TERMINAL.includes(o.fulfillment ?? "unfulfilled")
  )
  let advanced = 0
  for (const o of open) {
    const before = o.fulfillment ?? "unfulfilled"
    const next = await refreshPaidOrderFromErp(o).catch(() => o)
    if ((next.fulfillment ?? "unfulfilled") !== before) advanced += 1
  }
  if (open.length) console.info(`[erp-watch] swept ${open.length} paid order(s), ${advanced} advanced`)
  return { checked: open.length, advanced }
}
