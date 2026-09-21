/**
 * POST /api/orders/:orderNo/manual-pay/void  { confirm: true }
 * Voids the last open manual ledger line. Refused after the order is paid.
 */
import { z } from "zod"
import { auth } from "@/lib/auth"
import { orders, publicOrder, OrderMoneyError } from "@/lib/orders"

const bodySchema = z.object({ confirm: z.literal(true) })

export async function POST(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  if (session.role !== "dealer") return Response.json({ error: "dealer_only" }, { status: 403 })
  if (!session.dealerId) return Response.json({ error: "dealer_account_incomplete" }, { status: 403 })

  const { orderNo } = await params
  const existing = await orders.get(orderNo)
  if (!existing) return Response.json({ error: "order_not_found" }, { status: 404 })
  if (!existing.dealer?.id || existing.dealer.id !== session.dealerId) {
    return Response.json({ error: "pos_store_mismatch" }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 })

  try {
    const result = await orders.voidLastManualPayment(orderNo, session.userId)
    const fresh = (await orders.get(orderNo)) ?? result.order
    return Response.json({
      ok: true,
      voided: { id: result.entry.id, amountCents: result.entry.amountCents },
      order: publicOrder(fresh),
    })
  } catch (e) {
    if (e instanceof OrderMoneyError) {
      return Response.json({ error: e.code }, { status: 409 })
    }
    throw e
  }
}
