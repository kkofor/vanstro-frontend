/**
 * PATCH /api/admin/products/:sku
 * Body: { unitCents?, name?, variant?, category?, img?, disabled?, revert? }
 */
import { z } from "zod"
import { requireStaff } from "@/lib/staff"
import { applyCataloguePatch, revertCatalogue, UnknownSkuError } from "@/lib/catalogue"

const bodySchema = z.object({
  unitCents: z.number().int().min(1).max(50_000_000).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  variant: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  img: z.string().trim().max(400).optional(),
  disabled: z.boolean().optional(),
  revert: z.literal(true).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ sku: string }> }) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const { sku } = await params
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  try {
    if (parsed.data.revert) {
      const product = await revertCatalogue(decodeURIComponent(sku))
      return Response.json({ product }, { headers: { "cache-control": "no-store" } })
    }
    const { revert: _r, ...patch } = parsed.data
    if (!Object.keys(patch).length) return Response.json({ error: "invalid_request" }, { status: 400 })
    const product = await applyCataloguePatch(decodeURIComponent(sku), patch, staff.email)
    return Response.json({ product }, { headers: { "cache-control": "no-store" } })
  } catch (e) {
    if (e instanceof UnknownSkuError) return Response.json({ error: "not_found" }, { status: 404 })
    if (e instanceof Error && (e.message === "invalid_price" || e.message === "invalid_name")) {
      return Response.json({ error: "invalid_request" }, { status: 400 })
    }
    throw e
  }
}
