/**
 * GET /api/admin/summary — ops dashboard counts. Staff only.
 */
import { requireStaff } from "@/lib/staff"
import { orders } from "@/lib/orders"
import { listCatalogue, overrideCount } from "@/lib/catalogue"
import { ensureDealers, listDealers } from "@/lib/dealers"
import { paymentMode } from "@/lib/payments"
import { goCloudConfigured } from "@/lib/terminals"
import { erpConfigured } from "@/lib/erp"
import { assessRisk, getRiskStore } from "@/lib/risk"

function winnipegDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Winnipeg" })
}

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff

  await ensureDealers()
  const list = await orders.listAll()
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Winnipeg" })
  const paid = list.filter(o => o.status === "paid")
  const todayPaid = paid.filter(o => o.payment && winnipegDay(o.payment.paidAt) === today)
  const products = await listCatalogue()
  const risk = await getRiskStore()
  const scored = list.map(o => assessRisk(o, list, risk))

  return Response.json({
    orders: {
      total: list.length,
      paid: paid.length,
      pending: list.filter(o => o.status === "pending_payment").length,
      guest: list.filter(o => o.userId === null).length,
      cancelled: list.filter(o => o.status === "cancelled").length,
      unfulfilled: paid.filter(o => (o.fulfillment ?? "unfulfilled") === "unfulfilled").length,
      erpFailed: paid.filter(o => o.erp?.status === "failed").length,
      todayCount: todayPaid.length,
      todayCents: todayPaid.reduce((s, o) => s + (o.payment?.amountCents ?? o.quote.totalCents), 0),
    },
    payments: {
      declined: list.filter(o => o.status === "declined").length,
      expired: list.filter(o => o.status === "expired").length,
      unresolved: list.filter(o => (o.paymentAttempts ?? []).some(a => a.outcome === "pending")).length,
    },
    risk: {
      high: scored.filter(s => s.level === "high").length,
      review: scored.filter(s => s.level === "review").length,
      holds: list.filter(o => o.riskHold || risk.holds[o.orderNo]).length,
      blocks: Object.keys(risk.blocks).length,
    },
    products: { skuCount: products.length, overrides: await overrideCount() },
    dealers: { count: listDealers({ includeDisabled: true }).length },
    health: {
      payment: paymentMode(),
      ht: !!process.env.MONERIS_HT_PROFILE_ID,
      mail: !!process.env.AZURE_COMMUNICATION_CONNECTION_STRING,
      pos: goCloudConfigured() || paymentMode() === "mock",
      erp: erpConfigured(),
    },
  }, { headers: { "cache-control": "no-store" } })
}
