/**
 * GET /api/orders/:orderNo
 * Order detail for the confirmation page, the public order-status page and account › Orders.
 * Owner or guest access token (see lib/order-access.ts). Returns the stored snapshot (items,
 * quote as charged, dealer, payment summary, notification log).
 */
import { orders, publicOrder } from "@/lib/orders"
import { orderAccess } from "@/lib/order-access"
import { erpWatchEnabled, safeRefreshPaidOrder } from "@/lib/erp-watch"

export async function GET(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params
  const order = await orders.get(orderNo)
  if (!order) return Response.json({ error: "not_found" }, { status: 404 })
  if (!(await orderAccess(req, order))) return Response.json({ error: "not_found" }, { status: 404 })
  const fresh = erpWatchEnabled() ? await safeRefreshPaidOrder(order) : order
  return Response.json({ order: publicOrder(fresh) }, { headers: { "cache-control": "no-store" } })
}
