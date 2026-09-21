/**
 * GET /api/admin/products — live server catalogue (snapshot + staff overrides).
 * POST /api/admin/products — add a SKU used at checkout (not the live vanstro.ca PLP).
 */
import { z } from "zod"
import { requireStaff } from "@/lib/staff"
import { createCatalogueSku, listCatalogue } from "@/lib/catalogue"

const createSchema = z.object({
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(1).max(160),
  variant: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  img: z.string().trim().max(400).optional(),
  unitCents: z.number().int().min(1).max(50_000_000),
})

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase()
  const cat = new URL(req.url).searchParams.get("cat") || ""
  let products = await listCatalogue()
  if (cat) products = products.filter(p => p.category === cat)
  if (q) products = products.filter(p => `${p.sku} ${p.name} ${p.variant || ""} ${p.category || ""}`.toLowerCase().includes(q))
  const categories = [...new Set((await listCatalogue()).map(p => p.category).filter(Boolean))] as string[]
  return Response.json({ products, total: products.length, categories }, { headers: { "cache-control": "no-store" } })
}

export async function POST(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  try {
    const product = await createCatalogueSku(parsed.data, staff.email)
    return Response.json({ product }, { status: 201, headers: { "cache-control": "no-store" } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error"
    if (msg === "sku_taken") return Response.json({ error: msg }, { status: 409 })
    if (msg === "invalid_sku" || msg === "invalid_name" || msg === "invalid_price") {
      return Response.json({ error: "invalid_request" }, { status: 400 })
    }
    throw e
  }
}
