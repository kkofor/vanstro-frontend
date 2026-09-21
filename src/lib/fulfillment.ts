/**
 * lib/fulfillment.ts — storefront-side fulfillment writes (never writes ERP).
 */
import type { DeliveryMethod } from "./checkout"
import { orders, trackingHref, type FulfillmentStatus, type Order, type ShipmentTracking } from "./orders"
import { sendFulfillmentReady } from "./order-notify"

const RANK: Record<FulfillmentStatus, number> = {
  unfulfilled: 0,
  processing: 1,
  ready: 2,
  in_transit: 2,
  delivered: 3,
  returned: 3,
}

export function shouldAdvance(from: FulfillmentStatus | null | undefined, to: FulfillmentStatus) {
  return RANK[to] > RANK[from ?? "unfulfilled"]
}

export function fulfillmentFromErp(delivery: DeliveryMethod, orderStatus: number): FulfillmentStatus | null {
  if (orderStatus === 2) return "processing"
  if (orderStatus === 3) return delivery === "pickup" ? "ready" : "in_transit"
  if (orderStatus === 4) return "delivered"
  if (orderStatus === 6) return "returned"
  return null
}

function shippingOn(f: FulfillmentStatus) {
  return f === "ready" || f === "in_transit" || f === "delivered"
}

export function dealerAllowedFulfillment(o: Order): FulfillmentStatus[] {
  if (o.status !== "paid" || o.riskHold) return []
  const ff = o.fulfillment ?? "unfulfilled"
  if (o.deliveryMethod === "pickup") {
    if (ff === "unfulfilled" || ff === "processing") return ["ready"]
    if (ff === "ready") return ["delivered"]
    return []
  }
  if (ff === "unfulfilled" || ff === "processing") return ["in_transit"]
  if (ff === "in_transit") return ["delivered"]
  return []
}

export async function findOrderByAnyNo(no: string): Promise<Order | null> {
  const direct = await orders.get(no)
  if (direct) return direct
  const all = await orders.listAll()
  return all.find(o => o.erp?.erpOrderNo === no || o.invoiceNo === no) ?? null
}

export async function applyFulfillment(
  o: Order,
  next: FulfillmentStatus,
  opts: { tracking?: { carrier?: string; trackingNo: string; trackingUrl?: string } | null; notify?: boolean } = {},
): Promise<Order> {
  if (o.status !== "paid" && o.status !== "cancelled") throw new Error("fulfillment_requires_paid")
  if (shippingOn(next) && o.riskHold) throw new Error("fulfillment_on_hold")
  const trackNo = opts.tracking?.trackingNo?.trim()
  if (trackNo) {
    const tracking: ShipmentTracking = {
      carrier: opts.tracking?.carrier?.trim() || undefined,
      trackingNo: trackNo,
      trackingUrl: opts.tracking?.trackingUrl?.trim() || undefined,
      at: new Date().toISOString(),
    }
    if (!tracking.trackingUrl) tracking.trackingUrl = trackingHref(tracking)
    await orders.setTracking(o.orderNo, tracking)
  }
  await orders.setFulfillment(o.orderNo, next)
  const fresh = (await orders.get(o.orderNo)) ?? o
  if (opts.notify !== false && (next === "ready" || next === "in_transit")) {
    try { await sendFulfillmentReady(fresh) }
    catch (e) { console.error(`[fulfillment] ${o.orderNo} notify failed: ${e instanceof Error ? e.message : e}`) }
  }
  return (await orders.get(o.orderNo)) ?? fresh
}
