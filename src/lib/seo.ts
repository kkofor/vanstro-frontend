/**
 * lib/seo.ts — SEO monitoring for the ops console.
 *
 *  - auditPages(): parses every storefront HTML page on disk and reports on-page SEO signals
 *    (title, description, canonical, robots, h1, lang, Open Graph, JSON-LD, image alt coverage,
 *    internal links, word count) with a 0–100 score and actionable issues.
 *  - crawlability(): robots.txt / sitemap.xml presence and content.
 *  - keyword watchlist + Google Search Console performance import (CSV export), file-backed in data/seo.json.
 *    Search Console has no free push API for query data, so staff export "Performance → Queries/Pages" as CSV
 *    and paste it here; the console shows clicks / impressions / CTR / position and deltas vs the last import.
 */
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"

const ROOT = process.env.SITE_ROOT ?? process.cwd()
const STORE = process.env.SEO_STORE ?? join(process.cwd(), "data", "seo.json")

export interface Keyword { id: string; term: string; targetPath: string; note?: string; addedAt: string }
export interface GscRow { query: string; page?: string; clicks: number; impressions: number; ctr: number; position: number }
export interface GscImport { id: string; at: string; label: string; kind: "queries" | "pages"; rows: GscRow[] }
export interface SeoStore { keywords: Keyword[]; imports: GscImport[] }

async function readStore(): Promise<SeoStore> {
  try { const s = JSON.parse(await readFile(STORE, "utf8")); return { keywords: s.keywords ?? [], imports: s.imports ?? [] } } catch { return { keywords: [], imports: [] } }
}
async function writeStore(s: SeoStore) {
  await mkdir(join(STORE, ".."), { recursive: true })
  await writeFile(STORE, JSON.stringify(s, null, 2))
}
export const getSeoStore = readStore

export async function addKeyword(term: string, targetPath: string, note?: string) {
  const s = await readStore()
  const k: Keyword = { id: `kw_${Date.now().toString(36)}`, term: term.trim(), targetPath: targetPath.trim() || "/", note: note?.trim() || undefined, addedAt: new Date().toISOString() }
  s.keywords = s.keywords.filter(x => x.term.toLowerCase() !== k.term.toLowerCase()).concat(k)
  await writeStore(s); return k
}
export async function removeKeyword(id: string) {
  const s = await readStore(); s.keywords = s.keywords.filter(k => k.id !== id); await writeStore(s)
}

/** Parse a Search Console CSV export. Accepts English headers (Top queries / Top pages, Clicks, Impressions, CTR, Position) and tab/comma separators. */
export function parseGscCsv(csv: string): { kind: "queries" | "pages"; rows: GscRow[] } {
  const lines = csv.replace(/\r/g, "").split("\n").map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error("empty_csv")
  const sep = lines[0].includes("\t") ? "\t" : ","
  const split = (l: string) => {
    const out: string[] = []; let cur = ""; let q = false
    for (const ch of l) {
      if (ch === '"') q = !q
      else if (ch === sep && !q) { out.push(cur); cur = "" }
      else cur += ch
    }
    out.push(cur); return out.map(s => s.trim())
  }
  const header = split(lines[0]).map(h => h.toLowerCase())
  const col = (names: string[]) => header.findIndex(h => names.some(n => h === n || h.startsWith(n)))
  const iq = col(["top queries", "query", "queries", "keyword"])
  const ip = col(["top pages", "page", "pages", "url"])
  const ic = col(["clicks"]), ii = col(["impressions"]), ictr = col(["ctr"]), ipos = col(["position", "avg. position", "average position"])
  if ((iq < 0 && ip < 0) || ic < 0 || ii < 0) throw new Error("unrecognised_header")
  const kind = iq >= 0 ? "queries" : "pages"
  const num = (s: string | undefined) => Number(String(s ?? "").replace(/[%,\s]/g, "")) || 0
  const rows: GscRow[] = []
  for (const l of lines.slice(1)) {
    const c = split(l)
    const key = iq >= 0 ? c[iq] : c[ip]
    if (!key) continue
    const clicks = num(c[ic]), impressions = num(c[ii])
    // GSC exports CTR as "8.4%"; some tools export a fraction (0.084). Only rescale when there is no % sign.
    const rawCtr = ictr >= 0 ? String(c[ictr] ?? "") : ""
    const ctr = ictr < 0 ? (impressions ? Math.round((10000 * clicks) / impressions) / 100 : 0)
      : rawCtr.includes("%") ? num(rawCtr) : Math.round(num(rawCtr) * 10000) / 100
    rows.push({ query: key, page: ip >= 0 ? c[ip] : undefined, clicks, impressions, ctr: Math.round(ctr * 100) / 100, position: ipos >= 0 ? num(c[ipos]) : 0 })
  }
  if (!rows.length) throw new Error("no_rows")
  return { kind, rows: rows.slice(0, 2000) }
}

export async function importGsc(csv: string, label?: string) {
  const parsed = parseGscCsv(csv)
  const s = await readStore()
  const imp: GscImport = { id: `gsc_${Date.now().toString(36)}`, at: new Date().toISOString(), label: label?.trim() || new Date().toLocaleDateString("en-CA"), kind: parsed.kind, rows: parsed.rows }
  s.imports = s.imports.concat(imp).slice(-12)
  await writeStore(s); return imp
}
export async function removeImport(id: string) {
  const s = await readStore(); s.imports = s.imports.filter(i => i.id !== id); await writeStore(s)
}

/** Latest import vs previous of the same kind, with deltas; watchlist keywords enriched with GSC data. */
export function searchPerformance(s: SeoStore) {
  const latestOf = (kind: GscImport["kind"]) => s.imports.filter(i => i.kind === kind).slice(-2)
  const [prevQ, curQ] = (() => { const l = latestOf("queries"); return l.length === 2 ? l : [undefined, l[0]] })()
  const [prevP, curP] = (() => { const l = latestOf("pages"); return l.length === 2 ? l : [undefined, l[0]] })()
  const sum = (rows?: GscRow[]) => rows ? { clicks: rows.reduce((a, r) => a + r.clicks, 0), impressions: rows.reduce((a, r) => a + r.impressions, 0) } : null
  const totals = sum(curQ?.rows) ?? sum(curP?.rows)
  const prevTotals = sum(prevQ?.rows) ?? sum(prevP?.rows)
  const withDelta = (cur?: GscImport, prev?: GscImport) => (cur?.rows ?? []).map(r => {
    const p = prev?.rows.find(x => x.query === r.query)
    return { ...r, dClicks: p ? r.clicks - p.clicks : null, dPosition: p ? Math.round((r.position - p.position) * 10) / 10 : null }
  })
  const queries = withDelta(curQ, prevQ).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
  const pages = withDelta(curP, prevP).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
  const watch = s.keywords.map(k => {
    const row = curQ?.rows.find(r => r.query.toLowerCase() === k.term.toLowerCase())
    const prev = prevQ?.rows.find(r => r.query.toLowerCase() === k.term.toLowerCase())
    return { ...k, clicks: row?.clicks ?? null, impressions: row?.impressions ?? null, ctr: row?.ctr ?? null, position: row?.position ?? null, dPosition: row && prev ? Math.round((row.position - prev.position) * 10) / 10 : null }
  })
  const striking = queries.filter(q => q.position > 4 && q.position <= 20 && q.impressions >= 20).sort((a, b) => b.impressions - a.impressions).slice(0, 15)
  const lowCtr = queries.filter(q => q.impressions >= 50 && q.position <= 10 && q.ctr < 2).slice(0, 10)
  return {
    lastImport: (curQ || curP) ? { at: (curQ ?? curP)!.at, label: (curQ ?? curP)!.label, queries: curQ?.rows.length ?? 0, pages: curP?.rows.length ?? 0 } : null,
    totals: totals ? { ...totals, ctr: totals.impressions ? Math.round((10000 * totals.clicks) / totals.impressions) / 100 : 0, avgPosition: curQ?.rows.length ? Math.round((curQ.rows.reduce((a, r) => a + r.position * r.impressions, 0) / Math.max(1, totals.impressions)) * 10) / 10 : null, dClicks: prevTotals ? totals.clicks - prevTotals.clicks : null, dImpressions: prevTotals ? totals.impressions - prevTotals.impressions : null } : null,
    queries: queries.slice(0, 50),
    pages: pages.slice(0, 30),
    striking,
    lowCtr,
    watch,
    imports: s.imports.map(i => ({ id: i.id, at: i.at, label: i.label, kind: i.kind, rows: i.rows.length })).reverse(),
  }
}

/* ---------------------------------------------------------------- on-page audit */

export interface PageAudit {
  path: string
  file: string
  bytes: number
  score: number
  indexable: boolean
  title: string | null
  titleLength: number
  description: string | null
  descriptionLength: number
  canonical: string | null
  robots: string | null
  lang: string | null
  h1: string[]
  h2: number
  words: number
  images: number
  imagesMissingAlt: number
  internalLinks: number
  externalLinks: number
  og: { title: boolean; description: boolean; image: boolean; url: boolean }
  twitterCard: boolean
  jsonLd: string[]
  viewport: boolean
  hreflang: number
  inbound: number
  issues: { level: "error" | "warn" | "info"; text: string }[]
}

const AUDIT_SKIP = /^(admin|dashboard|preview)\b/i
const PUBLIC_PAGES = ["index", "cart", "checkout", "order-status", "login", "register", "forgot-password", "account"]

function strip(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim()
}
function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))
  return m ? (m[2] ?? m[3] ?? m[4] ?? "").trim() : null
}
function metaContent(html: string, key: "name" | "property", value: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || []
  for (const t of tags) if ((attr(t, key) || "").toLowerCase() === value) return attr(t, "content")
  return null
}
function linkHref(html: string, rel: string) {
  const tags = html.match(/<link\b[^>]*>/gi) || []
  return tags.filter(t => (attr(t, "rel") || "").toLowerCase().split(/\s+/).includes(rel))
}

function auditHtml(path: string, file: string, html: string): PageAudit {
  const issues: PageAudit["issues"] = []
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim() || null
  const description = metaContent(html, "name", "description")
  const robots = metaContent(html, "name", "robots")
  const canonical = linkHref(html, "canonical")[0] ? attr(linkHref(html, "canonical")[0], "href") : null
  const lang = attr(html.match(/<html\b[^>]*>/i)?.[0] || "", "lang")
  const h1 = (html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || []).map(strip)
  const h2 = (html.match(/<h2\b/gi) || []).length
  const text = strip(html)
  const words = text ? text.split(" ").length : 0
  const imgs = html.match(/<img\b[^>]*>/gi) || []
  const imagesMissingAlt = imgs.filter(t => attr(t, "alt") === null).length
  const anchors = html.match(/<a\b[^>]*>/gi) || []
  let internal = 0, external = 0
  for (const a of anchors) {
    const href = attr(a, "href") || ""
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue
    if (/^https?:\/\//i.test(href)) external += 1; else internal += 1
  }
  const og = { title: !!metaContent(html, "property", "og:title"), description: !!metaContent(html, "property", "og:description"), image: !!metaContent(html, "property", "og:image"), url: !!metaContent(html, "property", "og:url") }
  const twitterCard = !!metaContent(html, "name", "twitter:card")
  const jsonLd = (html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []).map(s => {
    try { const j = JSON.parse(s.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "")); return String((Array.isArray(j) ? j[0] : j)?.["@type"] || "unknown") } catch { return "invalid" }
  })
  const viewport = !!metaContent(html, "name", "viewport")
  const hreflang = linkHref(html, "alternate").filter(t => attr(t, "hreflang")).length
  const noindex = /noindex/i.test(robots || "")
  const isPublic = PUBLIC_PAGES.includes(file.replace(/\.html$/, "")) && !["checkout", "account", "forgot-password"].includes(file.replace(/\.html$/, ""))

  if (!title) issues.push({ level: "error", text: "Missing <title>" })
  else if (title.length > 60) issues.push({ level: "warn", text: `Title is ${title.length} chars (aim ≤ 60)` })
  else if (title.length < 20) issues.push({ level: "info", text: `Title is short (${title.length} chars)` })
  if (!description) issues.push({ level: isPublic ? "error" : "warn", text: "Missing meta description" })
  else if (description.length > 160) issues.push({ level: "warn", text: `Description is ${description.length} chars (aim ≤ 160)` })
  else if (description.length < 60) issues.push({ level: "info", text: `Description is short (${description.length} chars)` })
  if (!canonical) issues.push({ level: isPublic ? "warn" : "info", text: "No canonical link" })
  if (!lang) issues.push({ level: "warn", text: "<html> has no lang attribute" })
  if (h1.length === 0) issues.push({ level: "warn", text: "No <h1>" })
  if (h1.length > 1) issues.push({ level: "warn", text: `${h1.length} <h1> tags (use one)` })
  if (imagesMissingAlt) issues.push({ level: "warn", text: `${imagesMissingAlt} of ${imgs.length} images missing alt` })
  if (!og.title || !og.description || !og.image) issues.push({ level: isPublic ? "warn" : "info", text: "Incomplete Open Graph tags (title / description / image)" })
  if (!jsonLd.length && isPublic) issues.push({ level: "info", text: "No JSON-LD structured data (Organization / Product / BreadcrumbList)" })
  if (jsonLd.includes("invalid")) issues.push({ level: "error", text: "JSON-LD block does not parse" })
  if (!viewport) issues.push({ level: "error", text: "Missing viewport meta (mobile-first indexing)" })
  if (noindex && isPublic) issues.push({ level: "error", text: "Public page is noindex" })
  if (!noindex && !isPublic && ["checkout", "account", "forgot-password"].includes(file.replace(/\.html$/, ""))) issues.push({ level: "info", text: "Transactional page is indexable — consider noindex" })
  if (words < 150 && isPublic) issues.push({ level: "info", text: `Thin content (${words} words)` })

  let score = 100
  for (const i of issues) score -= i.level === "error" ? 20 : i.level === "warn" ? 8 : 3
  return {
    path, file, bytes: Buffer.byteLength(html), score: Math.max(0, score), indexable: !noindex,
    title, titleLength: title?.length || 0, description, descriptionLength: description?.length || 0, canonical, robots, lang,
    h1, h2, words, images: imgs.length, imagesMissingAlt, internalLinks: internal, externalLinks: external, og, twitterCard, jsonLd, viewport, hreflang, inbound: 0, issues,
  }
}

export async function auditPages() {
  const files = (await readdir(ROOT)).filter(f => f.endsWith(".html") && !AUDIT_SKIP.test(f)).sort()
  const pages: PageAudit[] = []
  const inbound: Record<string, number> = {}
  for (const f of files) {
    const html = await readFile(join(ROOT, f), "utf8")
    const path = f === "index.html" ? "/" : `/${f.replace(/\.html$/, "")}`
    pages.push(auditHtml(path, f, html))
    for (const a of html.match(/<a\b[^>]*>/gi) || []) {
      const href = (attr(a, "href") || "").split(/[?#]/)[0]
      if (!href || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) continue
      const key = href.replace(/^\.?\//, "").replace(/\.html$/, "").replace(/\/$/, "") || "index"
      inbound[key] = (inbound[key] || 0) + 1
    }
  }
  for (const p of pages) {
    p.inbound = inbound[p.file.replace(/\.html$/, "")] || 0
    if (p.inbound === 0 && p.file !== "index.html" && p.file !== "admin.html") p.issues.push({ level: "warn", text: "Orphan page — no internal links point here" })
  }
  return pages
}

export async function crawlability() {
  const read = async (name: string) => { try { const st = await stat(join(ROOT, name)); return st.isFile() ? await readFile(join(ROOT, name), "utf8") : null } catch { return null } }
  const robots = await read("robots.txt")
  const sitemap = await read("sitemap.xml")
  const disallow = robots ? robots.split("\n").map(l => l.trim()).filter(l => /^disallow:/i.test(l)).map(l => l.replace(/^disallow:\s*/i, "")) : []
  const sitemapRef = robots ? (robots.match(/^sitemap:\s*(\S+)/im)?.[1] ?? null) : null
  const urls = sitemap ? (sitemap.match(/<loc>([^<]+)<\/loc>/gi) || []).map(l => l.replace(/<\/?loc>/gi, "").trim()) : []
  const issues: PageAudit["issues"] = []
  if (!robots) issues.push({ level: "error", text: "robots.txt is missing — add one that allows the storefront and disallows /admin, /api, /account, /checkout" })
  if (!sitemap) issues.push({ level: "error", text: "sitemap.xml is missing — list the public pages so search engines discover them without relying on links" })
  if (robots && !sitemapRef) issues.push({ level: "warn", text: "robots.txt does not reference the sitemap" })
  if (robots && /^disallow:\s*\/\s*$/im.test(robots)) issues.push({ level: "error", text: "robots.txt blocks the whole site (Disallow: /)" })
  for (const p of ["/admin", "/api"]) if (robots && !disallow.some(d => d.startsWith(p))) issues.push({ level: "info", text: `robots.txt does not disallow ${p}` })
  return { robots: { present: !!robots, bytes: robots?.length || 0, disallow, sitemapRef }, sitemap: { present: !!sitemap, urls: urls.length, sample: urls.slice(0, 10) }, issues }
}
