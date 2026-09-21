/**
 * GET /api/admin/traffic?window=today|7d|30d — site analytics for the ops console.
 */
import { requireStaff } from "@/lib/staff"
import { orders } from "@/lib/orders"
import { summarizeTraffic, type TrafficWindow } from "@/lib/traffic"

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const window = (new URL(req.url).searchParams.get("window") || "7d") as TrafficWindow
  if (!["today", "7d", "30d"].includes(window)) return Response.json({ error: "invalid_request" }, { status: 400 })
  const all = await orders.listAll()
  const summary = await summarizeTraffic(window, all.map(o => ({
    orderNo: o.orderNo,
    createdAt: o.createdAt,
    status: o.status,
    paidAt: o.payment?.paidAt ?? null,
    totalCents: o.payment?.amountCents ?? o.quote.totalCents,
  })))
  return Response.json(summary, { headers: { "cache-control": "no-store" } })
}
