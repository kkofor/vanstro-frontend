/**
 * GET /api/admin/customers — unique emails seen on orders, plus staff CRM overlay.
 */
import { requireStaff } from "@/lib/staff"
import { orders } from "@/lib/orders"
import { listCustomerCrm } from "@/lib/customer-crm"

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff

  const list = await orders.listAll()
  const crm = await listCustomerCrm()
  const map = new Map<string, {
    email: string
    name: string
    phone: string | null
    note: string | null
    orders: number
    paid: number
    guest: boolean
    claimed: boolean
    lastAt: string
    totalCents: number
    provinces: Set<string>
  }>()

  for (const o of list) {
    const email = o.email.trim().toLowerCase()
    const overlay = crm[email]
    const cur = map.get(email) ?? {
      email,
      name: overlay?.name || o.firstName || email.split("@")[0],
      phone: overlay?.phone || o.phone || null,
      note: overlay?.note || null,
      orders: 0,
      paid: 0,
      guest: true,
      claimed: false,
      lastAt: o.createdAt,
      totalCents: 0,
      provinces: new Set<string>(),
    }
    cur.orders += 1
    if (o.status === "paid") {
      cur.paid += 1
      cur.totalCents += o.payment?.amountCents ?? o.quote.totalCents
    }
    if (o.userId) { cur.guest = false; if (o.claimedAt) cur.claimed = true }
    if (o.createdAt > cur.lastAt) cur.lastAt = o.createdAt
    if (o.shipping.province) cur.provinces.add(o.shipping.province)
    if (overlay?.name) cur.name = overlay.name
    if (overlay?.phone) cur.phone = overlay.phone
    if (overlay?.note) cur.note = overlay.note
    map.set(email, cur)
  }

  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase()
  let customers = [...map.values()].map(c => ({
    email: c.email,
    name: c.name,
    phone: c.phone,
    note: c.note,
    orders: c.orders,
    paid: c.paid,
    guest: c.guest,
    claimed: c.claimed,
    lastAt: c.lastAt,
    totalCents: c.totalCents,
    provinces: [...c.provinces],
  })).sort((a, b) => b.lastAt.localeCompare(a.lastAt))
  if (q) customers = customers.filter(c => `${c.email} ${c.name} ${c.phone || ""} ${c.note || ""}`.toLowerCase().includes(q))

  return Response.json({ customers, total: customers.length }, { headers: { "cache-control": "no-store" } })
}
