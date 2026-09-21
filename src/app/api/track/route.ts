/**
 * POST /api/track — first-party analytics beacon from assets/analytics.js.
 * Public, rate limited, tiny body. Stores no email / PAN; IP is hashed.
 */
import { z } from "zod"
import { auth } from "@/lib/auth"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { appendTraffic, botOf, browserOf, classify, deviceOf, hashIp, pageKey, refHost } from "@/lib/traffic"

const short = z.string().trim().max(120)
const bodySchema = z.object({
  type: z.enum(["pageview", "event"]),
  name: z.string().trim().min(1).max(40).regex(/^[a-z0-9_:-]+$/i).optional(),
  path: z.string().trim().min(1).max(200),
  ref: z.string().trim().max(500).optional(),
  utm: z.object({ source: short.optional(), medium: short.optional(), campaign: short.optional(), term: short.optional(), content: short.optional() }).optional(),
  click: z.enum(["gclid", "fbclid", "msclkid", "ttclid", "li_fat_id", "twclid"]).optional(),
  vid: z.string().regex(/^[a-z0-9-]{8,40}$/i),
  sid: z.string().regex(/^[a-z0-9-]{8,40}$/i),
  lang: z.string().trim().max(12).optional(),
  data: z.record(z.union([z.string().max(80), z.number(), z.boolean()])).optional(),
})

export async function POST(req: Request) {
  const ip = clientIp(req)
  if (!rateLimit(`track:${ip}`, 240, 60)) return new Response(null, { status: 204 })
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 })
  const b = parsed.data
  if (b.type === "event" && !b.name) return Response.json({ error: "invalid_request" }, { status: 400 })

  // Only an explicit session header counts; the localhost demo-user fallback must not label guests as customers.
  const session = req.headers.get("x-vs-user") ? await auth(req).catch(() => null) : null
  const ua = req.headers.get("user-agent") || ""
  const selfHost = (() => { try { return new URL(req.url).hostname } catch { return "" } })()
  const path = b.path.split("?")[0].split("#")[0].slice(0, 200)
  const ref = refHost(b.ref, selfHost)
  const utm = b.utm && Object.values(b.utm).some(Boolean) ? b.utm : undefined
  const cls = classify(ref, utm, b.click)
  const bot = botOf(ua)

  await appendTraffic({
    at: new Date().toISOString(),
    type: b.type,
    name: b.name,
    path,
    page: pageKey(path),
    ref,
    channel: cls.channel,
    platform: cls.platform,
    utm,
    click: b.click,
    vid: b.vid,
    sid: b.sid,
    role: bot ? "bot" : session?.role === "staff" ? "staff" : session?.role === "dealer" ? "dealer" : session?.userId ? "customer" : "guest",
    device: deviceOf(ua),
    browser: browserOf(ua),
    bot: bot || undefined,
    lang: (b.lang || "").slice(0, 5) || "en-CA",
    ipHash: hashIp(ip),
    data: b.data && Object.keys(b.data).length ? b.data : undefined,
  })
  return new Response(null, { status: 204 })
}
