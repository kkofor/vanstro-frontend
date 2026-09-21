/**
 * GET /api/admin/risk — review queue + blocked emails.
 * POST { action: hold|release|block_email|unblock_email, orderNo?, email?, reason? }
 */
import { z } from "zod"
import { requireStaff } from "@/lib/staff"
import { orders, ORDER_NO_RE } from "@/lib/orders"
import { staffOrderView } from "@/lib/staff-order"
import { getRiskStore, setEmailBlock, setRiskHoldRecord } from "@/lib/risk"

const bodySchema = z.object({
  action: z.enum(["hold", "release", "block_email", "unblock_email"]),
  orderNo: z.string().optional(),
  email: z.string().email().optional(),
  reason: z.string().trim().max(400).optional(),
})

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const all = await orders.listAll()
  const store = await getRiskStore()
  const views = await Promise.all(all.map(o => staffOrderView(o, all, store)))
  const queue = views
    .filter(o => o.risk.level !== "clear" || o.riskHold)
    .sort((a, b) => (b.risk.score - a.risk.score) || b.createdAt.localeCompare(a.createdAt))
  return Response.json({
    queue,
    holds: queue.filter(o => o.riskHold),
    high: queue.filter(o => o.risk.level === "high"),
    review: queue.filter(o => o.risk.level === "review" && !o.riskHold),
    blocks: Object.values(store.blocks).sort((a, b) => b.at.localeCompare(a.at)),
  }, { headers: { "cache-control": "no-store" } })
}

export async function POST(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  const { action, reason } = parsed.data

  if (action === "hold" || action === "release") {
    const orderNo = parsed.data.orderNo || ""
    if (!ORDER_NO_RE.test(orderNo)) return Response.json({ error: "not_found" }, { status: 404 })
    try {
      const order = await orders.patchAdmin(orderNo, {
        by: staff.email,
        riskHold: action === "hold",
        riskReason: reason,
      })
      await setRiskHoldRecord(order.orderNo, order.riskHold ?? null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error"
      if (msg.startsWith("order_not_found")) return Response.json({ error: "not_found" }, { status: 404 })
      throw e
    }
  } else {
    const email = (parsed.data.email || "").trim().toLowerCase()
    if (!email) return Response.json({ error: "invalid_request" }, { status: 400 })
    try {
      await setEmailBlock(email, staff.email, reason || "", action === "block_email")
    } catch (e) {
      if (e instanceof Error && e.message === "invalid_email") return Response.json({ error: "invalid_request" }, { status: 400 })
      throw e
    }
  }

  return GET(req)
}
