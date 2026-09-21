/**
 * GET  /api/admin/seo?window=7d|30d — on-page audit, crawlability, crawler activity, 404s, Core Web Vitals,
 *      organic landing pages, Search Console import summary, keyword watchlist.
 * POST { action: add_keyword | remove_keyword | import_gsc | remove_import, ... }
 */
import { z } from "zod"
import { requireStaff } from "@/lib/staff"
import { orders } from "@/lib/orders"
import { summarizeTraffic, type TrafficWindow } from "@/lib/traffic"
import { addKeyword, auditPages, crawlability, getSeoStore, importGsc, removeImport, removeKeyword, searchPerformance } from "@/lib/seo"

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add_keyword"), term: z.string().trim().min(1).max(120), targetPath: z.string().trim().max(200).default("/"), note: z.string().trim().max(200).optional() }),
  z.object({ action: z.literal("remove_keyword"), id: z.string().min(1) }),
  z.object({ action: z.literal("import_gsc"), csv: z.string().min(10).max(2_000_000), label: z.string().trim().max(60).optional() }),
  z.object({ action: z.literal("remove_import"), id: z.string().min(1) }),
])

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const window = (new URL(req.url).searchParams.get("window") || "30d") as TrafficWindow
  if (!["today", "7d", "30d"].includes(window)) return Response.json({ error: "invalid_request" }, { status: 400 })
  const all = await orders.listAll()
  const [pages, crawl, traffic, store] = await Promise.all([
    auditPages(),
    crawlability(),
    summarizeTraffic(window, all.map(o => ({ orderNo: o.orderNo, createdAt: o.createdAt, status: o.status, paidAt: o.payment?.paidAt ?? null, totalCents: o.payment?.amountCents ?? o.quote.totalCents }))),
    getSeoStore(),
  ])
  const organic = traffic.channels.find(c => c.key === "organic")
  const organicPlatforms = traffic.platforms.filter(p => p.channel === "organic")
  const errors = pages.reduce((n, p) => n + p.issues.filter(i => i.level === "error").length, 0) + crawl.issues.filter(i => i.level === "error").length
  const warns = pages.reduce((n, p) => n + p.issues.filter(i => i.level === "warn").length, 0) + crawl.issues.filter(i => i.level === "warn").length
  const siteScore = pages.length ? Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length) - (crawl.issues.filter(i => i.level === "error").length * 10) : 0
  return Response.json({
    window,
    health: { score: Math.max(0, siteScore), errors, warns, pages: pages.length, indexable: pages.filter(p => p.indexable).length },
    pages,
    crawlability: crawl,
    crawlers: traffic.crawlers,
    notFound: traffic.notFound,
    vitals: traffic.vitals,
    organic: {
      sessions: organic?.sessions ?? 0, paid: organic?.paid ?? 0, cents: organic?.cents ?? 0, conversion: organic?.conversion ?? 0,
      platforms: organicPlatforms,
      landing: traffic.landing, // caller filters; kept whole so the SEO page can show all entry pages with organic share
      daily: traffic.daily.map(d => ({ day: d.day, organic: d.organic, bots: d.bots, sessions: d.sessions })),
      terms: traffic.terms,
    },
    search: searchPerformance(store),
  }, { headers: { "cache-control": "no-store" } })
}

export async function POST(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  const b = parsed.data
  try {
    if (b.action === "add_keyword") return Response.json({ ok: true, keyword: await addKeyword(b.term, b.targetPath, b.note) })
    if (b.action === "remove_keyword") { await removeKeyword(b.id); return Response.json({ ok: true }) }
    if (b.action === "import_gsc") { const imp = await importGsc(b.csv, b.label); return Response.json({ ok: true, import: { id: imp.id, kind: imp.kind, rows: imp.rows.length } }) }
    if (b.action === "remove_import") { await removeImport(b.id); return Response.json({ ok: true }) }
  } catch (e) {
    return Response.json({ error: "invalid_csv", detail: (e as Error).message }, { status: 400 })
  }
  return Response.json({ error: "invalid_request" }, { status: 400 })
}
