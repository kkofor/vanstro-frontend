/**
 * GET /api/admin/payments?window=today|7d|all
 * Payment analytics + risk-tinted queues. No PAN.
 */
import { requireStaff } from "@/lib/staff"
import { orders } from "@/lib/orders"
import { staffOrderView } from "@/lib/staff-order"
import { declineLabel, getRiskStore, inWindow, winnipegDay } from "@/lib/risk"

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const window = (new URL(req.url).searchParams.get("window") || "all") as "today" | "7d" | "all"
  if (!["today", "7d", "all"].includes(window)) return Response.json({ error: "invalid_request" }, { status: 400 })

  const all = await orders.listAll()
  const store = await getRiskStore()
  const list = all.filter(o => inWindow(o.payment?.paidAt || o.createdAt, window))
  const views = await Promise.all(list.map(o => staffOrderView(o, all, store)))

  const paid = list.filter(o => o.status === "paid")
  const declined = list.filter(o => o.status === "declined")
  const attempts = list.flatMap(o => o.paymentAttempts ?? [])
  const approved = attempts.filter(a => a.outcome === "approved").length
  const codes: Record<string, number> = {}
  for (const a of attempts) {
    if (a.outcome === "declined" || a.outcome === "error" || a.code === "payment_pending") {
      codes[a.code || a.outcome || "unknown"] = (codes[a.code || "unknown"] || 0) + 1
    }
  }

  const byChannel = {
    ht: { paid: 0, declined: 0, pending: 0, cents: 0 },
    pos: { paid: 0, declined: 0, pending: 0, cents: 0 },
  }
  for (const o of list) {
    const ch = o.paymentMethod === "pos" ? "pos" : "ht"
    if (o.status === "paid") { byChannel[ch].paid += 1; byChannel[ch].cents += o.payment?.amountCents ?? o.quote.totalCents }
    else if (o.status === "declined") byChannel[ch].declined += 1
    else if (o.status === "pending_payment") byChannel[ch].pending += 1
  }

  const byBrand: Record<string, { paid: number; cents: number }> = {}
  for (const o of paid) {
    const b = o.payment?.brand || "Unknown"
    byBrand[b] ??= { paid: 0, cents: 0 }
    byBrand[b].paid += 1
    byBrand[b].cents += o.payment?.amountCents ?? o.quote.totalCents
  }

  const last4: Record<string, { last4: string; brand: string; emails: Set<string>; orders: number; paid: number }> = {}
  for (const o of all) {
    if (!o.payment?.last4) continue
    const k = o.payment.last4
    last4[k] ??= { last4: k, brand: o.payment.brand, emails: new Set(), orders: 0, paid: 0 }
    last4[k].emails.add(o.email.trim().toLowerCase())
    last4[k].orders += 1
    if (o.status === "paid") last4[k].paid += 1
  }

  const dayMap: Record<string, { day: string; paid: number; declined: number; paidCents: number }> = {}
  for (const o of list) {
    const day = winnipegDay(o.payment?.paidAt || o.createdAt)
    dayMap[day] ??= { day, paid: 0, declined: 0, paidCents: 0 }
    if (o.status === "paid") { dayMap[day].paid += 1; dayMap[day].paidCents += o.payment?.amountCents ?? o.quote.totalCents }
    if (o.status === "declined") dayMap[day].declined += 1
  }

  const unresolved = views.filter(o => o.risk.signals.some(s => s.id === "unresolved"))
  const highRisk = views.filter(o => o.risk.level === "high").slice(0, 40)

  return Response.json({
    window,
    totals: {
      orders: list.length,
      paid: paid.length,
      paidCents: paid.reduce((s, o) => s + (o.payment?.amountCents ?? o.quote.totalCents), 0),
      declined: declined.length,
      pending: list.filter(o => o.status === "pending_payment").length,
      expired: list.filter(o => o.status === "expired").length,
      cancelled: list.filter(o => o.status === "cancelled").length,
      attempts: attempts.length,
      approvalRate: attempts.length ? Math.round(100 * approved / attempts.length) : null,
      threeDS: paid.filter(o => o.payment?.threeDS).length,
      no3DS: paid.filter(o => o.payment && !o.payment.threeDS).length,
    },
    byChannel,
    byBrand,
    declineCodes: Object.entries(codes)
      .map(([code, count]) => ({ code, count, label: declineLabel(code) }))
      .sort((a, b) => b.count - a.count),
    last4Clusters: Object.values(last4)
      .filter(x => x.emails.size > 1 || x.orders >= 3)
      .map(x => ({ last4: x.last4, brand: x.brand, emails: x.emails.size, orders: x.orders, paid: x.paid }))
      .sort((a, b) => b.emails - a.emails || b.orders - a.orders),
    daily: Object.values(dayMap).sort((a, b) => a.day.localeCompare(b.day)),
    unresolved,
    highRisk,
  }, { headers: { "cache-control": "no-store" } })
}
