/**
 * PATCH /api/admin/dealers/:id — edit or disable a dealer. Writes data/dealers.json.
 */
import { z } from "zod"
import { requireStaff } from "@/lib/staff"
import { DEALER_SERVICES, SERVICE_LABEL, ensureDealers, getDealer, upsertDealer } from "@/lib/dealers"
import { orders } from "@/lib/orders"
import { terminalIdForDealer } from "@/lib/terminals"
import { PROVINCES } from "@/lib/tax"

const patchSchema = z.object({
  code: z.string().trim().min(4).max(8).optional(),
  inviteCode: z.string().trim().min(8).max(32).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  street: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(60).optional(),
  province: z.enum(Object.keys(PROVINCES) as [keyof typeof PROVINCES, ...Array<keyof typeof PROVINCES>]).optional(),
  postalCode: z.string().trim().min(6).max(8).optional(),
  phone: z.string().trim().min(7).max(24).optional(),
  email: z.string().trim().email().optional(),
  hoursEn: z.string().trim().max(80).optional(),
  hoursFr: z.string().trim().max(80).optional(),
  services: z.array(z.enum(DEALER_SERVICES)).min(1).optional(),
  areaEn: z.string().trim().max(80).optional(),
  areaFr: z.string().trim().max(80).optional(),
  disabled: z.boolean().optional(),
  erpAccountId: z.string().trim().max(24).optional(),
  erpUserId: z.string().trim().max(24).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  await ensureDealers()
  const { id } = await params
  if (!getDealer(id, { includeDisabled: true })) return Response.json({ error: "not_found" }, { status: 404 })
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  if (!Object.keys(parsed.data).length) return Response.json({ error: "invalid_request" }, { status: 400 })
  try {
    const dealer = await upsertDealer({ ...parsed.data, id }, staff.email)
    const list = await orders.listAll()
    const theirs = list.filter(o => o.dealer?.id === dealer.id)
    return Response.json({
      dealer: {
        ...dealer,
        terminalId: terminalIdForDealer(dealer.id),
        services: dealer.services.map(s => ({ id: s, en: SERVICE_LABEL[s].en })),
        serviceIds: dealer.services,
        orders: theirs.length,
        paid: theirs.filter(o => o.status === "paid").length,
        paidCents: theirs.filter(o => o.status === "paid").reduce((s, o) => s + (o.payment?.amountCents ?? o.quote.totalCents), 0),
      },
    }, { headers: { "cache-control": "no-store" } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error"
    if ([
      "invalid_dealer_id", "invalid_province", "invalid_dealer_code", "dealer_code_province",
      "invalid_invite", "invalid_services", "invalid_dealer",
      "dealer_id_taken", "dealer_code_taken", "invite_taken", "invalid_erp_id",
    ].includes(msg)) {
      return Response.json({ error: msg }, { status: msg.endsWith("_taken") ? 409 : 400 })
    }
    throw e
  }
}
