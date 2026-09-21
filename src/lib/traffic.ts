/**
 * lib/traffic.ts — first-party site analytics for the ops console.
 *
 * Sources
 *  - assets/analytics.js beacons pageviews, named events (add_to_cart, order_created, purchase)
 *    and Core Web Vitals to POST /api/track.
 *  - scripts/dev-server.mts logs crawler hits on HTML pages and 404s server-side (type crawl / notfound)
 *    so SEO monitoring does not depend on the crawler running JavaScript.
 *
 * Events are appended to data/traffic/YYYY-MM-DD.jsonl (gitignored). Nothing personal is stored:
 * IP is hashed with VANSTRO_LINK_SECRET, the visitor id is a random id from localStorage, no emails.
 *
 * Production swaps the file store for the warehouse; the aggregate shape from `summarizeTraffic`
 * is what admin.html renders.
 */
import { appendFile, mkdir, readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { createHash } from "node:crypto"
import { linkSecret } from "./signed-links"

export type TrafficWindow = "today" | "7d" | "30d"
export type Channel = "organic" | "paid" | "social" | "ai" | "email" | "referral" | "direct" | "internal"

export interface TrafficEvent {
  at: string
  type: "pageview" | "event" | "crawl" | "notfound"
  name?: string
  path: string
  page: string            // normalised page key: home, cart, checkout, order-status, account, login, register, other
  ref: string             // referrer host, "direct" or "internal"
  channel?: Channel
  platform?: string       // Google, Bing, Facebook, Instagram, TikTok, ChatGPT … or the referrer host
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string }
  click?: string          // gclid | fbclid | msclkid | ttclid | li_fat_id | twclid
  vid: string
  sid: string
  role: "guest" | "customer" | "dealer" | "staff" | "bot"
  device: "desktop" | "mobile" | "tablet" | "bot"
  browser: string
  bot?: string            // Googlebot, Bingbot, GPTBot … when device === "bot"
  lang: string
  ipHash: string
  data?: Record<string, string | number | boolean>
}

const DIR = process.env.TRAFFIC_DIR ?? join(process.cwd(), "data", "traffic")
const WINNIPEG = "America/Winnipeg"

export function winnipegDay(iso: string | Date) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: WINNIPEG })
}
export function winnipegHour(iso: string) {
  return Number(new Date(iso).toLocaleString("en-CA", { timeZone: WINNIPEG, hour: "2-digit", hour12: false }).slice(0, 2)) % 24
}
function utcDay(iso: string) { return iso.slice(0, 10) }

export function hashIp(ip: string) {
  return createHash("sha256").update(`${linkSecret() ?? "dev"}:${ip}`).digest("hex").slice(0, 16)
}

export function pageKey(path: string): string {
  const p = path.replace(/^\/ux/, "").replace(/\.html$/, "").replace(/\/+$/, "") || "/"
  if (p === "/" || p === "/index") return "home"
  const first = p.split("/")[1] || ""
  if (["cart", "checkout", "order-status", "account", "login", "register", "forgot-password", "products", "dealers", "admin"].includes(first)) return first
  return "other"
}

export function refHost(referrer: string | undefined, selfHost: string): string {
  if (!referrer) return "direct"
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase()
    if (!h || h === selfHost.replace(/^www\./, "").toLowerCase()) return "internal"
    return h
  } catch { return "direct" }
}

/* ---------------------------------------------------------------- platforms */

const PLATFORMS: { name: string; channel: Channel; hosts: RegExp }[] = [
  { name: "Google", channel: "organic", hosts: /(^|\.)google\.[a-z.]+$|^googlesyndication\.com$/ },
  { name: "Bing", channel: "organic", hosts: /(^|\.)bing\.com$/ },
  { name: "DuckDuckGo", channel: "organic", hosts: /(^|\.)duckduckgo\.com$/ },
  { name: "Yahoo", channel: "organic", hosts: /(^|\.)yahoo\.[a-z.]+$/ },
  { name: "Baidu", channel: "organic", hosts: /(^|\.)baidu\.com$/ },
  { name: "Ecosia", channel: "organic", hosts: /(^|\.)ecosia\.org$/ },
  { name: "Yandex", channel: "organic", hosts: /(^|\.)yandex\.[a-z]+$/ },
  { name: "Facebook", channel: "social", hosts: /(^|\.)(facebook\.com|fb\.com|m\.facebook\.com|l\.facebook\.com|lm\.facebook\.com)$/ },
  { name: "Instagram", channel: "social", hosts: /(^|\.)(instagram\.com|l\.instagram\.com)$/ },
  { name: "TikTok", channel: "social", hosts: /(^|\.)tiktok\.com$/ },
  { name: "Pinterest", channel: "social", hosts: /(^|\.)pinterest\.[a-z.]+$/ },
  { name: "YouTube", channel: "social", hosts: /(^|\.)(youtube\.com|youtu\.be)$/ },
  { name: "LinkedIn", channel: "social", hosts: /(^|\.)(linkedin\.com|lnkd\.in)$/ },
  { name: "X / Twitter", channel: "social", hosts: /(^|\.)(twitter\.com|x\.com|t\.co)$/ },
  { name: "Reddit", channel: "social", hosts: /(^|\.)(reddit\.com|redd\.it)$/ },
  { name: "Threads", channel: "social", hosts: /(^|\.)threads\.net$/ },
  { name: "Snapchat", channel: "social", hosts: /(^|\.)snapchat\.com$/ },
  { name: "WeChat", channel: "social", hosts: /(^|\.)(weixin\.qq\.com|wechat\.com)$/ },
  { name: "Xiaohongshu", channel: "social", hosts: /(^|\.)xiaohongshu\.com$/ },
  { name: "Houzz", channel: "referral", hosts: /(^|\.)houzz\.[a-z.]+$/ },
  { name: "Kijiji", channel: "referral", hosts: /(^|\.)kijiji\.ca$/ },
  { name: "ChatGPT", channel: "ai", hosts: /(^|\.)(chatgpt\.com|openai\.com)$/ },
  { name: "Perplexity", channel: "ai", hosts: /(^|\.)perplexity\.ai$/ },
  { name: "Copilot", channel: "ai", hosts: /(^|\.)copilot\.microsoft\.com$/ },
  { name: "Gemini", channel: "ai", hosts: /(^|\.)gemini\.google\.com$/ },
  { name: "Claude", channel: "ai", hosts: /(^|\.)claude\.ai$/ },
]

const SOURCE_ALIASES: Record<string, string> = {
  google: "Google", bing: "Bing", facebook: "Facebook", fb: "Facebook", ig: "Instagram", instagram: "Instagram", tiktok: "TikTok",
  pinterest: "Pinterest", youtube: "YouTube", linkedin: "LinkedIn", twitter: "X / Twitter", x: "X / Twitter", reddit: "Reddit",
  newsletter: "Newsletter", email: "Email", mailchimp: "Email", klaviyo: "Email", chatgpt: "ChatGPT", perplexity: "Perplexity",
}

export function classify(ref: string, utm?: TrafficEvent["utm"], click?: string): { channel: Channel; platform: string } {
  const medium = (utm?.medium || "").toLowerCase()
  const source = (utm?.source || "").toLowerCase()
  const byHost = ref === "direct" || ref === "internal" ? null : PLATFORMS.find(p => p.hosts.test(ref))
  const platform = (source && (SOURCE_ALIASES[source] || source)) || byHost?.name || (ref === "direct" || ref === "internal" ? ref : ref)

  if (click || /^(cpc|ppc|paid|paidsocial|paid_social|display|retargeting|sem)$/.test(medium)) return { channel: "paid", platform: platform === "direct" ? clickPlatform(click) : platform }
  if (/^(email|e-mail|newsletter|sms)$/.test(medium) || /^(email|newsletter)$/.test(source)) return { channel: "email", platform: platform === "direct" ? "Email" : platform }
  if (/^(social|organic_social|social-network)$/.test(medium)) return { channel: "social", platform }
  if (/^(organic|seo)$/.test(medium)) return { channel: "organic", platform }
  if (/^(referral|affiliate|partner)$/.test(medium)) return { channel: "referral", platform }
  if (byHost) return { channel: byHost.channel, platform: byHost.name }
  if (ref === "internal") return { channel: "internal", platform: "internal" }
  if (ref === "direct") return { channel: source ? "referral" : "direct", platform: source ? platform : "direct" }
  return { channel: "referral", platform: ref }
}

function clickPlatform(click?: string) {
  return { gclid: "Google Ads", msclkid: "Microsoft Ads", fbclid: "Meta Ads", ttclid: "TikTok Ads", li_fat_id: "LinkedIn Ads", twclid: "X Ads" }[click || ""] || "Paid"
}

/* ---------------------------------------------------------------- user agents */

const BOTS: [RegExp, string][] = [
  [/googlebot|google-inspectiontool|storebot-google|googleother/i, "Googlebot"],
  [/adsbot-google/i, "AdsBot-Google"],
  [/bingbot|bingpreview/i, "Bingbot"],
  [/duckduckbot/i, "DuckDuckBot"],
  [/yandex(bot|images)/i, "YandexBot"],
  [/baiduspider/i, "Baiduspider"],
  [/applebot/i, "Applebot"],
  [/gptbot/i, "GPTBot"],
  [/oai-searchbot/i, "OAI-SearchBot"],
  [/chatgpt-user/i, "ChatGPT-User"],
  [/perplexitybot/i, "PerplexityBot"],
  [/claudebot|anthropic-ai/i, "ClaudeBot"],
  [/ccbot/i, "CCBot"],
  [/bytespider/i, "Bytespider"],
  [/amazonbot/i, "Amazonbot"],
  [/facebookexternalhit|meta-externalagent|facebot/i, "Facebook"],
  [/twitterbot/i, "Twitterbot"],
  [/linkedinbot/i, "LinkedInBot"],
  [/pinterestbot|pinterest\//i, "Pinterestbot"],
  [/slackbot/i, "Slackbot"],
  [/discordbot/i, "Discordbot"],
  [/telegrambot/i, "TelegramBot"],
  [/whatsapp/i, "WhatsApp"],
  [/ahrefsbot/i, "AhrefsBot"],
  [/semrushbot/i, "SemrushBot"],
  [/mj12bot/i, "MJ12bot"],
  [/dotbot/i, "DotBot"],
  [/petalbot/i, "PetalBot"],
  [/uptimerobot|pingdom|statuscake/i, "Uptime monitor"],
  [/lighthouse|chrome-lighthouse|pagespeed/i, "Lighthouse"],
  [/headlesschrome|puppeteer|playwright|phantomjs|selenium/i, "Headless browser"],
  [/curl\/|wget\/|python-requests|python-urllib|go-http-client|okhttp|java\//i, "Script"],
  [/bot|crawl|spider|slurp|preview|fetch|scan/i, "Other bot"],
]

export function botOf(ua: string): string | null {
  if (!ua) return "Script"
  for (const [re, name] of BOTS) if (re.test(ua)) return name
  return null
}

export function deviceOf(ua: string): TrafficEvent["device"] {
  if (botOf(ua)) return "bot"
  const u = ua.toLowerCase()
  if (/ipad|tablet|(android(?!.*mobile))/.test(u)) return "tablet"
  if (/mobi|iphone|android/.test(u)) return "mobile"
  return "desktop"
}

export function browserOf(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge"
  if (/opr\/|opera/i.test(ua)) return "Opera"
  if (/samsungbrowser/i.test(ua)) return "Samsung"
  if (/chrome|crios/i.test(ua)) return "Chrome"
  if (/firefox|fxios/i.test(ua)) return "Firefox"
  if (/safari/i.test(ua)) return "Safari"
  if (!ua) return "Unknown"
  return "Other"
}

/* ---------------------------------------------------------------- store */

export async function appendTraffic(ev: TrafficEvent) {
  await mkdir(DIR, { recursive: true })
  await appendFile(join(DIR, `${utcDay(ev.at)}.jsonl`), JSON.stringify(ev) + "\n")
}

/** Server-side hit for HTML pages / 404s (no cookie, no JS). Used by the dev server. */
export async function appendServerHit(input: { kind: "crawl" | "notfound"; path: string; ua: string; ip: string; referrer?: string; selfHost: string }) {
  const bot = botOf(input.ua)
  if (input.kind === "crawl" && !bot) return
  const ref = refHost(input.referrer, input.selfHost)
  await appendTraffic({
    at: new Date().toISOString(),
    type: input.kind,
    path: input.path.slice(0, 200),
    page: pageKey(input.path),
    ref,
    vid: "server",
    sid: "server",
    role: bot ? "bot" : "guest",
    device: bot ? "bot" : deviceOf(input.ua),
    browser: browserOf(input.ua),
    bot: bot || undefined,
    lang: "",
    ipHash: hashIp(input.ip),
  })
}

async function readWindow(window: TrafficWindow): Promise<TrafficEvent[]> {
  const since = sinceIso(window)
  let files: string[] = []
  try { files = (await readdir(DIR)).filter(f => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort() } catch { return [] }
  const minFile = utcDay(new Date(Date.parse(since) - 24 * 3600 * 1000).toISOString())
  const out: TrafficEvent[] = []
  for (const f of files) {
    if (f.slice(0, 10) < minFile) continue
    const raw = await readFile(join(DIR, f), "utf8")
    for (const line of raw.split("\n")) {
      if (!line) continue
      try {
        const ev = JSON.parse(line) as TrafficEvent
        if (ev.at >= since) out.push(ev)
      } catch { /* skip torn line */ }
    }
  }
  return out
}

export function sinceIso(window: TrafficWindow): string {
  if (window === "today") {
    const day = winnipegDay(new Date())
    const probe = new Date(`${day}T00:00:00Z`)
    return new Date(probe.getTime() + tzOffsetMinutes(probe) * 60 * 1000).toISOString()
  }
  const days = window === "7d" ? 7 : 30
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
}

function tzOffsetMinutes(d: Date) {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: WINNIPEG, timeZoneName: "shortOffset" }).formatToParts(d).find(p => p.type === "timeZoneName")?.value || "GMT-6"
  const m = s.match(/GMT([+-]\d+)/)
  return m ? -Number(m[1]) * 60 : 360
}

/* ---------------------------------------------------------------- aggregate */

function top<T extends string>(counts: Record<T, number>, n = 10) {
  return (Object.entries(counts) as [T, number][]).sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }))
}
function p75(values: number[]) {
  if (!values.length) return null
  const s = values.slice().sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))]
}

export interface OrderFunnelInput {
  orderNo: string
  createdAt: string
  status: string
  paidAt?: string | null
  totalCents: number
}

interface Bucket { key: string; label?: string; channel?: Channel; sessions: number; visitors: Set<string>; pageviews: number; bounced: number; cart: number; checkout: number; orders: number; paid: number; cents: number }
function bucket(map: Record<string, Bucket>, key: string, extra?: Partial<Bucket>): Bucket {
  return (map[key] ??= { key, sessions: 0, visitors: new Set(), pageviews: 0, bounced: 0, cart: 0, checkout: 0, orders: 0, paid: 0, cents: 0, ...extra })
}
function finish(map: Record<string, Bucket>, sortKey: "sessions" | "cents" = "sessions") {
  return Object.values(map).map(b => ({
    key: b.key, label: b.label, channel: b.channel, sessions: b.sessions, visitors: b.visitors.size, pageviews: b.pageviews,
    bounceRate: b.sessions ? Math.round((100 * b.bounced) / b.sessions) : 0,
    cart: b.cart, checkout: b.checkout, orders: b.orders, paid: b.paid, cents: b.cents,
    conversion: b.sessions ? Math.round((1000 * b.paid) / b.sessions) / 10 : 0,
  })).sort((a, b) => b[sortKey] - a[sortKey] || b.sessions - a.sessions)
}

export async function summarizeTraffic(window: TrafficWindow, orders: OrderFunnelInput[]) {
  const events = await readWindow(window)
  const since = sinceIso(window)
  const byOrder = new Map(orders.map(o => [o.orderNo, o]))

  const crawls = events.filter(e => e.type === "crawl")
  const notFound = events.filter(e => e.type === "notfound")
  const human = events.filter(e => (e.type === "pageview" || e.type === "event") && e.device !== "bot")
  const beaconBots = events.filter(e => (e.type === "pageview" || e.type === "event") && e.device === "bot")
  const pv = human.filter(e => e.type === "pageview")
  const evs = human.filter(e => e.type === "event")

  const vids = new Set(pv.map(e => e.vid))
  const perSession: Record<string, TrafficEvent[]> = {}
  for (const e of pv) (perSession[e.sid] ??= []).push(e)
  const sessions = Object.values(perSession)
  for (const list of sessions) list.sort((a, b) => a.at.localeCompare(b.at))

  // session-level facts
  const sessionOrders: Record<string, Set<string>> = {}
  const sessionPaid: Record<string, Set<string>> = {}
  for (const e of evs) {
    const orderNo = typeof e.data?.orderNo === "string" ? e.data.orderNo : null
    if (!orderNo) continue
    if (e.name === "order_created") (sessionOrders[e.sid] ??= new Set()).add(orderNo)
    if (e.name === "purchase") (sessionPaid[e.sid] ??= new Set()).add(orderNo)
  }
  const attributedPaid = new Set<string>()

  const pages: Record<string, number> = {}
  const paths: Record<string, number> = {}
  const devices: Record<string, number> = {}
  const browsers: Record<string, number> = {}
  const langs: Record<string, number> = {}
  const roles: Record<string, number> = {}
  const eventNames: Record<string, number> = {}
  const daily: Record<string, { pageviews: number; visitors: Set<string>; sessions: Set<string>; organic: number; paid: number; social: number; direct: number }> = {}
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, pageviews: 0 }))
  const channels: Record<string, Bucket> = {}
  const platforms: Record<string, Bucket> = {}
  const landing: Record<string, Bucket> = {}
  const referrers: Record<string, Bucket> = {}
  const campaigns: Record<string, Bucket> = {}
  const terms: Record<string, number> = {}
  const clicks: Record<string, number> = {}
  let bounced = 0

  for (const e of pv) {
    pages[e.page] = (pages[e.page] || 0) + 1
    paths[e.path] = (paths[e.path] || 0) + 1
    devices[e.device] = (devices[e.device] || 0) + 1
    browsers[e.browser] = (browsers[e.browser] || 0) + 1
    langs[e.lang || "?"] = (langs[e.lang || "?"] || 0) + 1
    const day = winnipegDay(e.at)
    daily[day] ??= { pageviews: 0, visitors: new Set(), sessions: new Set(), organic: 0, paid: 0, social: 0, direct: 0 }
    daily[day].pageviews += 1
    daily[day].visitors.add(e.vid)
    daily[day].sessions.add(e.sid)
    if (window === "today") hourly[winnipegHour(e.at)].pageviews += 1
  }

  for (const list of sessions) {
    const first = list[0]
    const cls = first.channel ? { channel: first.channel, platform: first.platform || first.ref } : classify(first.ref, first.utm, first.click)
    const isBounce = list.length === 1
    if (isBounce) bounced += 1
    const sawCart = list.some(e => e.page === "cart")
    const sawCheckout = list.some(e => e.page === "checkout")
    const created = sessionOrders[first.sid]?.size || 0
    let paidN = 0, cents = 0
    for (const no of sessionPaid[first.sid] || []) {
      const o = byOrder.get(no)
      if (!o || o.status !== "paid") continue
      paidN += 1; cents += o.totalCents; attributedPaid.add(no)
    }
    const apply = (b: Bucket) => {
      b.sessions += 1; b.visitors.add(first.vid); b.pageviews += list.length
      if (isBounce) b.bounced += 1
      if (sawCart) b.cart += 1
      if (sawCheckout) b.checkout += 1
      b.orders += created; b.paid += paidN; b.cents += cents
    }
    apply(bucket(channels, cls.channel, { channel: cls.channel }))
    apply(bucket(platforms, cls.platform, { channel: cls.channel }))
    apply(bucket(landing, first.path))
    apply(bucket(referrers, first.ref))
    if (first.utm?.campaign || first.utm?.source) {
      const key = [first.utm.source || "—", first.utm.medium || "—", first.utm.campaign || "—"].join(" / ")
      apply(bucket(campaigns, key, { label: key }))
    }
    if (first.utm?.term) terms[first.utm.term] = (terms[first.utm.term] || 0) + 1
    if (first.click) clicks[first.click] = (clicks[first.click] || 0) + 1
    const role = list.some(e => e.role === "dealer") ? "dealer" : list.some(e => e.role === "customer") ? "customer" : "guest"
    roles[role] = (roles[role] || 0) + 1
    const d = daily[winnipegDay(first.at)]
    if (d) {
      if (cls.channel === "organic") d.organic += 1
      else if (cls.channel === "paid") d.paid += 1
      else if (cls.channel === "social") d.social += 1
      else if (cls.channel === "direct") d.direct += 1
    }
  }
  for (const e of evs) eventNames[e.name || "event"] = (eventNames[e.name || "event"] || 0) + 1

  // Core Web Vitals: p75 per page from `vitals` events
  const vitalsByPage: Record<string, { lcp: number[]; cls: number[]; inp: number[]; fcp: number[]; ttfb: number[] }> = {}
  for (const e of evs.filter(e => e.name === "vitals" && e.data)) {
    const v = (vitalsByPage[e.path] ??= { lcp: [], cls: [], inp: [], fcp: [], ttfb: [] })
    for (const k of ["lcp", "cls", "inp", "fcp", "ttfb"] as const) {
      const n = Number(e.data![k]); if (Number.isFinite(n) && n >= 0) v[k].push(n)
    }
  }
  const vitals = Object.entries(vitalsByPage).map(([path, v]) => ({
    path, samples: Math.max(v.lcp.length, v.cls.length, v.inp.length, v.fcp.length, v.ttfb.length),
    lcp: p75(v.lcp), cls: p75(v.cls), inp: p75(v.inp), fcp: p75(v.fcp), ttfb: p75(v.ttfb),
  })).sort((a, b) => b.samples - a.samples)

  // Crawlers
  const botNames: Record<string, number> = {}
  const botPaths: Record<string, number> = {}
  const botDaily: Record<string, number> = {}
  for (const e of [...crawls, ...beaconBots]) {
    botNames[e.bot || "Other bot"] = (botNames[e.bot || "Other bot"] || 0) + 1
    botPaths[e.path] = (botPaths[e.path] || 0) + 1
    const d = winnipegDay(e.at); botDaily[d] = (botDaily[d] || 0) + 1
  }
  const lastCrawl: Record<string, string> = {}
  for (const e of crawls) if (!lastCrawl[e.bot || "Other bot"] || lastCrawl[e.bot || "Other bot"] < e.at) lastCrawl[e.bot || "Other bot"] = e.at

  // 404s
  const nf: Record<string, { path: string; count: number; refs: Record<string, number>; last: string; bot: number }> = {}
  for (const e of notFound) {
    const r = (nf[e.path] ??= { path: e.path, count: 0, refs: {}, last: e.at, bot: 0 })
    r.count += 1; r.refs[e.ref] = (r.refs[e.ref] || 0) + 1; if (e.at > r.last) r.last = e.at; if (e.device === "bot") r.bot += 1
  }
  const notFoundList = Object.values(nf).sort((a, b) => b.count - a.count).slice(0, 25).map(r => ({ path: r.path, count: r.count, bot: r.bot, last: r.last, referrers: top(r.refs, 3) }))

  // Funnel (site-wide): sessions → cart → checkout → orders (repo) → paid (repo)
  const sawCart = sessions.filter(l => l.some(e => e.page === "cart")).length
  const sawCheckout = sessions.filter(l => l.some(e => e.page === "checkout")).length
  const created = orders.filter(o => o.createdAt >= since)
  const paid = orders.filter(o => o.status === "paid" && (o.paidAt || o.createdAt) >= since)
  const paidCents = paid.reduce((s, o) => s + o.totalCents, 0)

  const fiveMin = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const live = human.filter(e => e.at >= fiveMin)
  const livePages: Record<string, number> = {}
  for (const e of live.filter(e => e.type === "pageview")) livePages[e.path] = (livePages[e.path] || 0) + 1

  const nDays = window === "today" ? 1 : window === "7d" ? 7 : 30
  const days: { day: string; pageviews: number; visitors: number; sessions: number; organic: number; paid: number; social: number; direct: number; bots: number }[] = []
  for (let i = nDays - 1; i >= 0; i--) {
    const day = winnipegDay(new Date(Date.now() - i * 24 * 3600 * 1000))
    const d = daily[day]
    days.push({ day, pageviews: d?.pageviews || 0, visitors: d?.visitors.size || 0, sessions: d?.sessions.size || 0, organic: d?.organic || 0, paid: d?.paid || 0, social: d?.social || 0, direct: d?.direct || 0, bots: botDaily[day] || 0 })
  }

  const sids = sessions.length
  return {
    window,
    since,
    collecting: events.length > 0,
    totals: {
      pageviews: pv.length,
      visitors: vids.size,
      sessions: sids,
      events: evs.length,
      bots: crawls.length + beaconBots.length,
      notFound: notFound.length,
      pagesPerSession: sids ? Math.round((pv.length / sids) * 10) / 10 : 0,
      bounceRate: sids ? Math.round((100 * bounced) / sids) : 0,
      attributedPaid: attributedPaid.size,
      attributedCents: [...attributedPaid].reduce((s, no) => s + (byOrder.get(no)?.totalCents || 0), 0),
    },
    live: { visitors: new Set(live.map(e => e.vid)).size, pages: top(livePages, 6) },
    funnel: {
      sessions: sids, cart: sawCart, checkout: sawCheckout, ordersCreated: created.length, paid: paid.length, paidCents,
      conversion: sids && paid.length <= sids ? Math.round((1000 * paid.length) / sids) / 10 : null,
      revenuePerSession: sids && paid.length <= sids ? Math.round(paidCents / sids) : null,
    },
    daily: days,
    hourly: window === "today" ? hourly : null,
    channels: finish(channels),
    platforms: finish(platforms),
    landing: finish(landing).slice(0, 15),
    referrers: finish(referrers).slice(0, 15),
    campaigns: finish(campaigns).slice(0, 20),
    terms: top(terms, 15),
    clicks: top(clicks, 6),
    pages: top(pages, 12),
    paths: top(paths, 15),
    devices: top(devices, 4),
    browsers: top(browsers, 8),
    languages: top(langs, 6),
    roles: top(roles, 3),
    events: top(eventNames, 12),
    vitals,
    crawlers: { total: crawls.length + beaconBots.length, bots: top(botNames, 15).map(b => ({ ...b, last: lastCrawl[b.key] || null })), paths: top(botPaths, 12) },
    notFound: notFoundList,
  }
}
