/**
 * GET / PATCH /api/admin/customers/:email
 * Staff CRM (name / phone / note / Espo User id) plus that email's orders.
 */
import { z } from "zod"
import { requireStaff } from "@/lib/staff"
import { orders, staffOrder } from "@/lib/orders"
import { getCustomerCrm, upsertCustomerCrm } from "@/lib/customer-crm"

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  erpUserId: z.string().trim().max(24).optional().nullable(),
})

function digitsPhone(raw: string | null | undefined) {
  if (raw === undefined) return undefined
  if (raw === null || !raw.trim()) return null
  const d = raw.replace(/\D/g, "").replace(/^1/, "")
  if (!/^[2-9]\d{9}$/.test(d)) throw new Error("invalid_phone")
  return d
}

async function rollup(email: string) {
  const want = email.trim().toLowerCase()
  const list = (await orders.listAll()).filter(o => o.email.trim().toLowerCase() === want)
  const overlay = await getCustomerCrm(want)
  const paid = list.filter(o => o.status === "paid")
  return {
    email: want,
    name: overlay?.name || list[0]?.firstName || want.split("@")[0],
    phone: overlay?.phone || list[0]?.phone || null,
    note: overlay?.note || null,
    orders: list.length,
    paid: paid.length,
    guest: list.every(o => o.userId === null),
    claimed: list.some(o => !!o.claimedAt),
    lastAt: list[0]?.createdAt || overlay?.updatedAt || null,
    totalCents: paid.reduce((s, o) => s + (o.payment?.amountCents ?? o.quote.totalCents), 0),
    provinces: [...new Set(list.map(o => o.shipping.province))],
    updatedAt: overlay?.updatedAt || null,
    by: overlay?.by || null,
    erpUserId: overlay?.erpUserId || null,
    orderList: list.map(staffOrder),
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ email: string }> }) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const { email } = await params
  const customer = await rollup(email)
  if (!customer.orders && !customer.note && !customer.updatedAt) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }
  return Response.json({ customer }, { headers: { "cache-control": "no-store" } })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ email: string }> }) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const { email } = await params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  let phone: string | null | undefined
  try { phone = digitsPhone(parsed.data.phone) }
  catch { return Response.json({ error: "invalid_phone" }, { status: 400 }) }
  try {
    await upsertCustomerCrm(email, { name: parsed.data.name, phone, note: parsed.data.note, erpUserId: parsed.data.erpUserId }, staff.email)
  } catch (e) {
    if (e instanceof Error && e.message === "invalid_email") return Response.json({ error: "invalid_request" }, { status: 400 })
    if (e instanceof Error && e.message === "invalid_erp_id") return Response.json({ error: "invalid_erp_id" }, { status: 400 })
    throw e
  }
  return Response.json({ customer: await rollup(email) }, { headers: { "cache-control": "no-store" } })
}
