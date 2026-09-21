/**
 * GET /api/admin/reports?window=today|7d|30d|all — sales analytics for the ops console.
 * Everything is derived from the order snapshots on disk (no recomputation of tax / totals).
 */
import { requireStaff } from "@/lib/staff"
import { orders, type Order } from "@/lib/orders"
import { winnipegDay } from "@/lib/traffic"

type Win = "today" | "7d" | "30d" | "all"

function since(window: Win): string {
  if (window === "all") return "1970-01-01T00:00:00Z"
  if (window === "today") {
    const today = winnipegDay(new Date())
    return today // compare on Winnipeg day below
  }
  const days = window === "7d" ? 7 : 30
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
}

function inWin(iso: string, window: Win, s: string) {
  if (window === "all") return true
  if (window === "today") return winnipegDay(iso) === s
  return iso >= s
}

function paidAt(o: Order) { return o.payment?.paidAt || o.createdAt }
function amount(o: Order) { return o.payment?.amountCents ?? o.quote.totalCents }

function bucket<K extends string>(map: Record<K, { key: K; orders: number; cents: number; label?: string }>, key: K, cents: number, label?: string) {
  map[key] ??= { key, orders: 0, cents: 0, label }
  map[key].orders += 1
  map[key].cents += cents
}

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const window = (new URL(req.url).searchParams.get("window") || "30d") as Win
  if (!["today", "7d", "30d", "all"].includes(window)) return Response.json({ error: "invalid_request" }, { status: 400 })
  const s = since(window)

  const all = await orders.listAll()
  const created = all.filter(o => inWin(o.createdAt, window, s))
  const paid = all.filter(o => o.status === "paid" && inWin(paidAt(o), window, s))

  const revenue = paid.reduce((a, o) => a + amount(o), 0)
  const tax = paid.reduce((a, o) => a + o.quote.tax.taxTotal, 0)
  const freight = paid.reduce((a, o) => a + o.quote.freightCents, 0)
  const discount = paid.reduce((a, o) => a + (o.quote.discountCents || 0), 0)
  const product = paid.reduce((a, o) => a + o.quote.subtotalCents, 0)

  // Daily revenue series (Winnipeg days), continuous axis.
  const nDays = window === "today" ? 1 : window === "7d" ? 7 : window === "30d" ? 30 : 0
  const byDay: Record<string, { day: string; paid: number; cents: number; created: number }> = {}
  for (const o of paid) { const d = winnipegDay(paidAt(o)); byDay[d] ??= { day: d, paid: 0, cents: 0, created: 0 }; byDay[d].paid += 1; byDay[d].cents += amount(o) }
  for (const o of created) { const d = winnipegDay(o.createdAt); byDay[d] ??= { day: d, paid: 0, cents: 0, created: 0 }; byDay[d].created += 1 }
  let daily: { day: string; paid: number; cents: number; created: number }[]
  if (nDays) {
    daily = []
    for (let i = nDays - 1; i >= 0; i--) {
      const day = winnipegDay(new Date(Date.now() - i * 24 * 3600 * 1000))
      daily.push(byDay[day] || { day, paid: 0, cents: 0, created: 0 })
    }
  } else {
    daily = Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)).slice(-60)
  }

  // Products
  const skus: Record<string, { sku: string; name: string; variant?: string; qty: number; cents: number; orders: number }> = {}
  for (const o of paid) for (const i of o.items) {
    skus[i.sku] ??= { sku: i.sku, name: i.name, variant: i.variant, qty: 0, cents: 0, orders: 0 }
    skus[i.sku].qty += i.qty
    skus[i.sku].cents += i.qty * i.unitCents
    skus[i.sku].orders += 1
  }

  const provinces: Record<string, { key: string; orders: number; cents: number }> = {}
  const dealers: Record<string, { key: string; orders: number; cents: number; label?: string }> = {}
  const delivery: Record<string, { key: string; orders: number; cents: number }> = {}
  const channel: Record<string, { key: string; orders: number; cents: number }> = {}
  const account: Record<string, { key: string; orders: number; cents: number }> = {}
  const promos: Record<string, { key: string; orders: number; cents: number }> = {}
  const brands: Record<string, { key: string; orders: number; cents: number }> = {}
  for (const o of paid) {
    const c = amount(o)
    bucket(provinces, o.shipping.province, c)
    bucket(dealers, o.dealer?.id ?? "direct", c, o.dealer?.name ?? "Vanstro direct")
    bucket(delivery, o.deliveryMethod, c)
    bucket(channel, o.paymentMethod === "pos" ? "pos" : "ht", c)
    bucket(account, o.userId === null ? "guest" : "account", c)
    if (o.quote.promo?.code) bucket(promos, o.quote.promo.code, o.quote.discountCents || 0)
    bucket(brands, o.payment?.brand || "Unknown", c)
  }

  // Customers: new vs returning (first paid order ever falls inside the window)
  const firstPaid: Record<string, string> = {}
  for (const o of all.filter(o => o.status === "paid").sort((a, b) => paidAt(a).localeCompare(paidAt(b)))) {
    const e = o.email.trim().toLowerCase()
    if (!firstPaid[e]) firstPaid[e] = paidAt(o)
  }
  const emailsInWin = new Set(paid.map(o => o.email.trim().toLowerCase()))
  let newCustomers = 0
  for (const e of emailsInWin) if (inWin(firstPaid[e], window, s)) newCustomers += 1

  // Timing
  const payLagMin = paid
    .filter(o => o.payment?.paidAt)
    .map(o => (Date.parse(o.payment!.paidAt) - Date.parse(o.createdAt)) / 60000)
    .filter(m => m >= 0 && m < 60 * 24 * 30)
  const medianLag = payLagMin.length ? payLagMin.sort((a, b) => a - b)[Math.floor(payLagMin.length / 2)] : null

  const status: Record<string, number> = {}
  for (const o of created) status[o.status] = (status[o.status] || 0) + 1
  const fulfillment: Record<string, number> = {}
  for (const o of all.filter(o => o.status === "paid")) { const f = o.fulfillment ?? "unfulfilled"; fulfillment[f] = (fulfillment[f] || 0) + 1 }

  const pendingAging = all
    .filter(o => o.status === "pending_payment")
    .map(o => ({ orderNo: o.orderNo, email: o.email, cents: o.quote.totalCents, channel: o.paymentMethod === "pos" ? "pos" : "ht", ageMin: Math.round((Date.now() - Date.parse(o.openedAt || o.createdAt)) / 60000) }))
    .sort((a, b) => b.ageMin - a.ageMin)

  const sortCents = <T extends { cents: number }>(m: Record<string, T>) => Object.values(m).sort((a, b) => b.cents - a.cents)

  return Response.json({
    window,
    totals: {
      created: created.length,
      paid: paid.length,
      revenueCents: revenue,
      productCents: product,
      taxCents: tax,
      freightCents: freight,
      discountCents: discount,
      aovCents: paid.length ? Math.round(revenue / paid.length) : 0,
      unitsSold: paid.reduce((a, o) => a + o.items.reduce((x, i) => x + i.qty, 0), 0),
      customers: emailsInWin.size,
      newCustomers,
      returningCustomers: emailsInWin.size - newCustomers,
      medianMinutesToPay: medianLag === null ? null : Math.round(medianLag * 10) / 10,
      paidRate: created.length ? Math.round((100 * created.filter(o => o.status === "paid").length) / created.length) : null,
    },
    daily,
    topSkus: Object.values(skus).sort((a, b) => b.cents - a.cents).slice(0, 15),
    provinces: sortCents(provinces),
    dealers: sortCents(dealers),
    delivery: sortCents(delivery),
    channel: sortCents(channel),
    account: sortCents(account),
    promos: sortCents(promos),
    brands: sortCents(brands),
    status,
    fulfillment,
    pendingAging: pendingAging.slice(0, 20),
  }, { headers: { "cache-control": "no-store" } })
}
