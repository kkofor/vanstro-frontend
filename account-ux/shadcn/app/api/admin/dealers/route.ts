/**
 * GET /api/admin/dealers — directory + invite codes + order volume.
 * POST /api/admin/dealers — add a participating dealer (writes data/dealers.json).
 */
import { z } from "zod"
import { requireStaff } from "@/lib/staff"
import { DEALER_SERVICES, SERVICE_LABEL, ensureDealers, getDealer, listDealers, upsertDealer } from "@/lib/dealers"
import { orders } from "@/lib/orders"
import { terminalIdForDealer } from "@/lib/terminals"
import { PROVINCES } from "@/lib/tax"

const writeSchema = z.object({
  id: z.string().trim().optional(),
  code: z.string().trim().min(4).max(8),
  inviteCode: z.string().trim().min(8).max(32).optional(),
  name: z.string().trim().min(2).max(80),
  street: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(60),
  province: z.enum(Object.keys(PROVINCES) as [keyof typeof PROVINCES, ...Array<keyof typeof PROVINCES>]),
  postalCode: z.string().trim().min(6).max(8),
  phone: z.string().trim().min(7).max(24),
  email: z.string().trim().email(),
  hoursEn: z.string().trim().max(80).optional(),
  hoursFr: z.string().trim().max(80).optional(),
  services: z.array(z.enum(DEALER_SERVICES)).min(1),
  areaEn: z.string().trim().max(80).optional(),
  areaFr: z.string().trim().max(80).optional(),
  disabled: z.boolean().optional(),
  erpAccountId: z.string().trim().max(24).optional(),
  erpUserId: z.string().trim().max(24).optional(),
})

function withVolume(
  d: ReturnType<typeof listDealers>[number],
  list: Awaited<ReturnType<typeof orders.listAll>>,
) {
  const theirs = list.filter(o => o.dealer?.id === d.id)
  return {
    ...d,
    terminalId: terminalIdForDealer(d.id),
    services: d.services.map(s => ({ id: s, en: SERVICE_LABEL[s].en })),
    serviceIds: d.services,
    orders: theirs.length,
    paid: theirs.filter(o => o.status === "paid").length,
    paidCents: theirs.filter(o => o.status === "paid").reduce((s, o) => s + (o.payment?.amountCents ?? o.quote.totalCents), 0),
  }
}

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  await ensureDealers()
  const list = await orders.listAll()
  const dealers = listDealers({ includeDisabled: true }).map(d => withVolume(d, list))
  return Response.json({ dealers }, { headers: { "cache-control": "no-store" } })
}

export async function POST(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  await ensureDealers()
  const parsed = writeSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  if (parsed.data.id && getDealer(parsed.data.id, { includeDisabled: true })) {
    return Response.json({ error: "dealer_id_taken" }, { status: 409 })
  }
  try {
    const dealer = await upsertDealer(parsed.data, staff.email)
    const list = await orders.listAll()
    return Response.json({ dealer: withVolume(dealer, list) }, { status: 201, headers: { "cache-control": "no-store" } })
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
