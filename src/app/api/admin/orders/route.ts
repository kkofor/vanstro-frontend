/**
 * GET /api/admin/orders — staff list / filter.
 * POST /api/admin/orders { cloneFrom } — new pending copy so ops can correct a paid/expired cart.
 */
import { z } from "zod"
import { requireStaff } from "@/lib/staff"
import { orders, ORDER_NO_RE } from "@/lib/orders"
import { staffOrderView } from "@/lib/staff-order"
import { getRiskStore } from "@/lib/risk"

const cloneSchema = z.object({ cloneFrom: z.string() })

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff

  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim().toLowerCase()
  const status = url.searchParams.get("status") || ""
  const fulfillment = url.searchParams.get("fulfillment") || ""
  const channel = url.searchParams.get("channel") || ""
  const guest = url.searchParams.get("guest")
  const dealerId = url.searchParams.get("dealer") || ""
  const risk = url.searchParams.get("risk") || ""
  const erp = url.searchParams.get("erp") || ""

  const list = await orders.listAll()
  const store = await getRiskStore()
  let views = await Promise.all(list.map(o => staffOrderView(o, list, store)))

  if (status) views = views.filter(o => o.status === status)
  if (fulfillment) views = views.filter(o => (o.fulfillment ?? (o.status === "paid" ? "unfulfilled" : "")) === fulfillment)
  if (channel === "pos") views = views.filter(o => o.payChannel === "pos")
  if (channel === "ht") views = views.filter(o => o.payChannel === "ht")
  if (guest === "1") views = views.filter(o => o.guest)
  if (guest === "0") views = views.filter(o => !o.guest)
  if (dealerId) views = views.filter(o => o.dealer?.id === dealerId)
  if (risk === "hold") views = views.filter(o => !!o.riskHold)
  if (risk === "high" || risk === "review") views = views.filter(o => o.risk.level === risk)
  if (erp === "failed") views = views.filter(o => o.erp?.status === "failed")
  if (erp === "queued") views = views.filter(o => o.erp?.status === "failed" && !o.erp.deadLetter && !!o.erp.nextRetryAt)
  if (erp === "dead") views = views.filter(o => !!o.erp?.deadLetter)
  if (erp === "success") views = views.filter(o => o.erp?.status === "success")
  if (q) {
    views = views.filter(o =>
      [o.orderNo, o.email, o.firstName, o.invoiceNo, o.shipping.city, o.dealer?.name, o.payment?.last4, ...o.items.map(i => i.sku + " " + i.name)]
        .join(" ")
        .toLowerCase()
        .includes(q))
  }

  return Response.json({
    orders: views,
    total: views.length,
  }, { headers: { "cache-control": "no-store" } })
}

export async function POST(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const parsed = cloneSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success || !ORDER_NO_RE.test(parsed.data.cloneFrom)) {
    return Response.json({ error: "invalid_request" }, { status: 400 })
  }
  const from = await orders.get(parsed.data.cloneFrom)
  if (!from) return Response.json({ error: "not_found" }, { status: 404 })
  const created = await orders.create({
    userId: from.userId,
    locale: from.locale,
    email: from.email,
    phone: from.phone,
    firstName: from.firstName,
    items: from.items.map(i => ({ ...i })),
    deliveryMethod: from.deliveryMethod,
    notes: from.notes,
    shipping: { ...from.shipping },
    billing: { ...from.billing },
    seller: from.seller,
    dealer: from.dealer,
    quote: from.quote,
    consents: [],
    smsReceipt: from.smsReceipt,
    paymentMethod: from.paymentMethod === "pos" ? "pos" : "new",
    saveCard: false,
    posTerminalId: from.paymentMethod === "pos" ? from.posTerminalId : null,
  })
  const order = await orders.patchAdmin(created.orderNo, {
    by: staff.email,
    note: `Cloned from ${from.orderNo}`,
  })
  const all = await orders.listAll()
  return Response.json({ order: await staffOrderView(order, all) }, { status: 201, headers: { "cache-control": "no-store" } })
}
