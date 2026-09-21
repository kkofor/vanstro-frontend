/**
 * GET / PATCH /api/admin/orders/:orderNo
 * Patch: cancel, fulfillment, internal note, contact, addresses, dealer, delivery, pending lines, ERP retry.
 */
import { z } from "zod"
import { requireStaff } from "@/lib/staff"
import { orders, ORDER_NO_RE } from "@/lib/orders"
import { staffOrderView } from "@/lib/staff-order"
import { ensureRisk, setRiskHoldRecord } from "@/lib/risk"
import { formatPostalCode, POSTAL_RE, PROVINCES } from "@/lib/validators"
import { deliveryMethodSchema } from "@/lib/checkout"
import { ensureDealers } from "@/lib/dealers"
import type { ProvinceCode } from "@/lib/tax"
import { retryErpPush, sendFulfillmentReady } from "@/lib/order-notify"
import { refreshPaidOrderFromErp } from "@/lib/erp-watch"

const storedAddress = z.object({
  name: z.string().trim().min(1).max(80),
  company: z.string().trim().max(80).optional(),
  street: z.string().trim().min(1).max(120),
  unit: z.string().trim().max(40).optional(),
  city: z.string().trim().min(1).max(60),
  province: z.enum(Object.keys(PROVINCES) as [ProvinceCode, ...ProvinceCode[]]),
  postalCode: z.string().transform(formatPostalCode).refine(p => POSTAL_RE.test(p), "postal"),
  phone: z.string().optional(),
})

const patchSchema = z.object({
  status: z.enum(["cancelled", "pending_payment"]).optional(),
  reopen: z.literal(true).optional(),
  riskHold: z.boolean().optional(),
  riskReason: z.string().trim().max(400).optional(),
  fulfillment: z.enum(["unfulfilled", "processing", "ready", "in_transit", "delivered", "returned"]).optional(),
  note: z.string().trim().min(1).max(2000).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().optional().nullable(),
  firstName: z.string().trim().min(1).max(40).optional(),
  notes: z.string().trim().max(140).optional().nullable(),
  deliveryMethod: deliveryMethodSchema.optional(),
  dealerId: z.string().min(1).nullable().optional(),
  shipping: storedAddress.optional(),
  billing: storedAddress.optional(),
  items: z.array(z.object({
    sku: z.string().min(1),
    qty: z.number().int().min(1).max(999),
  })).min(1).optional(),
  erpPush: z.literal(true).optional(),
  erpRefresh: z.literal(true).optional(),
  tracking: z.object({
    carrier: z.string().trim().max(40).optional(),
    trackingNo: z.string().trim().min(1).max(80),
    trackingUrl: z.string().trim().max(300).optional(),
  }).nullable().optional(),
})

function digitsPhone(raw: string | null | undefined) {
  if (raw === undefined) return undefined
  if (raw === null || !raw.trim()) return null
  const d = raw.replace(/\D/g, "").replace(/^1/, "")
  if (!/^[2-9]\d{9}$/.test(d)) throw new Error("invalid_phone")
  return d
}

export async function GET(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  await ensureDealers()
  const { orderNo } = await params
  if (!ORDER_NO_RE.test(orderNo)) return Response.json({ error: "not_found" }, { status: 404 })
  const order = await orders.get(orderNo)
  if (!order) return Response.json({ error: "not_found" }, { status: 404 })
  const all = await orders.listAll()
  return Response.json({ order: await staffOrderView(order, all) }, { headers: { "cache-control": "no-store" } })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  await ensureDealers()
  const { orderNo } = await params
  if (!ORDER_NO_RE.test(orderNo)) return Response.json({ error: "not_found" }, { status: 404 })
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  const d = parsed.data
  const keys = Object.keys(d).filter(k => d[k as keyof typeof d] !== undefined)
  if (!keys.length) return Response.json({ error: "invalid_request" }, { status: 400 })
  let phone: string | null | undefined
  try { phone = digitsPhone(d.phone) }
  catch { return Response.json({ error: "invalid_phone" }, { status: 400 }) }

  const toStored = (a: z.infer<typeof storedAddress>) => ({
    name: a.name,
    company: a.company || undefined,
    street: a.street,
    unit: a.unit || undefined,
    city: a.city,
    province: a.province,
    postalCode: a.postalCode,
    phone: a.phone || undefined,
  })

  try {
    if (d.erpPush) {
      await retryErpPush(orderNo)
      const all = await orders.listAll()
      const fresh = await orders.get(orderNo)
      if (!fresh) return Response.json({ error: "not_found" }, { status: 404 })
      return Response.json({ order: await staffOrderView(fresh, all) }, { headers: { "cache-control": "no-store" } })
    }
    if (d.erpRefresh) {
      const existing = await orders.get(orderNo)
      if (!existing) return Response.json({ error: "not_found" }, { status: 404 })
      const fresh = await refreshPaidOrderFromErp(existing, { force: true })
      const all = await orders.listAll()
      return Response.json({ order: await staffOrderView(fresh, all) }, { headers: { "cache-control": "no-store" } })
    }
    await ensureRisk()
    const order = await orders.patchAdmin(orderNo, {
      by: staff.email,
      status: d.reopen ? "pending_payment" : d.status,
      fulfillment: d.fulfillment,
      note: d.note,
      email: d.email?.trim().toLowerCase(),
      phone,
      firstName: d.firstName,
      notes: d.notes === undefined ? undefined : (d.notes || null),
      deliveryMethod: d.deliveryMethod,
      dealerId: d.dealerId,
      shipping: d.shipping ? toStored(d.shipping) : undefined,
      billing: d.billing ? toStored(d.billing) : undefined,
      items: d.items,
      riskHold: d.riskHold,
      riskReason: d.riskReason,
      tracking: d.tracking,
    })
    if (d.riskHold === true && order.riskHold) await setRiskHoldRecord(order.orderNo, order.riskHold)
    if (d.riskHold === false) await setRiskHoldRecord(order.orderNo, null)
    if (d.fulfillment === "ready" || d.fulfillment === "in_transit") {
      try { await sendFulfillmentReady(order) }
      catch (err) { console.error(`[erp-watch] ${order.orderNo} staff notify failed: ${err instanceof Error ? err.message : err}`) }
    }
    const all = await orders.listAll()
    const fresh = await orders.get(orderNo) ?? order
    return Response.json({ order: await staffOrderView(fresh, all) }, { headers: { "cache-control": "no-store" } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error"
    if (msg.startsWith("order_not_found")) return Response.json({ error: "not_found" }, { status: 404 })
    if (msg.startsWith("unknown_sku:")) return Response.json({ error: "unknown_sku", sku: msg.slice(12) }, { status: 400 })
    if ([
      "order_not_cancellable", "fulfillment_requires_paid", "items_locked", "money_locked",
      "items_empty", "pickup_unavailable", "dealer_required", "dealer_not_found", "dealer_province_mismatch",
      "order_already_paid", "order_not_reopenable", "fulfillment_on_hold", "order_not_paid",
    ].includes(msg)) {
      return Response.json({ error: msg }, { status: 409 })
    }
    throw e
  }
}
