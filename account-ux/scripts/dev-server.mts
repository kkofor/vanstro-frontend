/**
 * scripts/dev-server.mts — local server for the prototype + the real API routes.
 *
 *   npx tsx scripts/dev-server.mts            → http://localhost:8787
 *
 * Serves the static HTML prototypes from the project root and mounts the Next-style route
 * handlers under /api/* (they take a Web `Request` and return a `Response`, so no framework
 * is needed here). Reads .env.local. DEV_DEMO_USER is only defaulted when APP_URL is localhost.
 * With MONERIS_MOCK=1 the whole order → payment → emails → PDF path runs offline;
 * unset it to charge the Moneris sandbox (needs MONERIS_HT_PROFILE_ID for the card frame).
 */
import "./load-env.mts"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize, relative, resolve, sep } from "node:path"

import * as ordersRoute from "../shadcn/app/api/orders/route.ts"
import * as orderRoute from "../shadcn/app/api/orders/[orderNo]/route.ts"
import * as invoicePdfRoute from "../shadcn/app/api/orders/[orderNo]/invoice.pdf/route.ts"
import * as resendRoute from "../shadcn/app/api/orders/[orderNo]/receipt/resend/route.ts"
import * as pushPosRoute from "../shadcn/app/api/orders/[orderNo]/push-pos/route.ts"
import * as lookupRoute from "../shadcn/app/api/orders/lookup/route.ts"
import * as claimRoute from "../shadcn/app/api/orders/claim/route.ts"
import * as claimRequestRoute from "../shadcn/app/api/orders/claim-request/route.ts"
import * as claimConfirmRoute from "../shadcn/app/api/orders/claim-confirm/route.ts"
import * as payRoute from "../shadcn/app/api/checkout/moneris/pay/route.ts"
import * as goPostbackRoute from "../shadcn/app/api/checkout/moneris/go/postback/route.ts"
import * as quoteRoute from "../shadcn/app/api/checkout/quote/route.ts"
import * as paymentConfigRoute from "../shadcn/app/api/checkout/payment-config/route.ts"
import * as meRoute from "../shadcn/app/api/me/route.ts"
import * as sessionsRoute from "../shadcn/app/api/sessions/route.ts"
import * as sessionIdRoute from "../shadcn/app/api/sessions/[id]/route.ts"
import * as authRegisterRoute from "../shadcn/app/api/auth/register/route.ts"
import * as authLoginRoute from "../shadcn/app/api/auth/login/route.ts"
import * as authVerifyRoute from "../shadcn/app/api/auth/verify-email/route.ts"
import * as authVerifyResendRoute from "../shadcn/app/api/auth/verify-email/resend/route.ts"
import * as authForgotRoute from "../shadcn/app/api/auth/forgot/route.ts"
import * as authResetRoute from "../shadcn/app/api/auth/reset/route.ts"
import * as authLogoutRoute from "../shadcn/app/api/auth/logout/route.ts"
import * as dealerInviteRoute from "../shadcn/app/api/dealers/invite/route.ts"
import * as adminSummaryRoute from "../shadcn/app/api/admin/summary/route.ts"
import * as adminOrdersRoute from "../shadcn/app/api/admin/orders/route.ts"
import * as adminOrderRoute from "../shadcn/app/api/admin/orders/[orderNo]/route.ts"
import * as adminResendRoute from "../shadcn/app/api/admin/orders/[orderNo]/resend/route.ts"
import * as adminCustomersRoute from "../shadcn/app/api/admin/customers/route.ts"
import * as adminProductsRoute from "../shadcn/app/api/admin/products/route.ts"
import * as adminProductRoute from "../shadcn/app/api/admin/products/[sku]/route.ts"
import * as adminDealersRoute from "../shadcn/app/api/admin/dealers/route.ts"
import * as adminDealerIdRoute from "../shadcn/app/api/admin/dealers/[id]/route.ts"
import * as adminCustomerEmailRoute from "../shadcn/app/api/admin/customers/[email]/route.ts"
import * as publicDealersRoute from "../shadcn/app/api/dealers/route.ts"
import * as adminPaymentsRoute from "../shadcn/app/api/admin/payments/route.ts"
import * as adminRiskRoute from "../shadcn/app/api/admin/risk/route.ts"
import * as adminTrafficRoute from "../shadcn/app/api/admin/traffic/route.ts"
import * as adminReportsRoute from "../shadcn/app/api/admin/reports/route.ts"
import * as trackRoute from "../shadcn/app/api/track/route.ts"
import * as adminSeoRoute from "../shadcn/app/api/admin/seo/route.ts"
import { appendServerHit } from "../shadcn/lib/traffic.ts"
import * as adminOpsRoute from "../shadcn/app/api/admin/ops/route.ts"
import { paymentMode } from "../shadcn/lib/payments.ts"
import { goCloudConfigured } from "../shadcn/lib/terminals.ts"
import { erpConfigured } from "../shadcn/lib/erp.ts"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: Request, ctx: { params: Promise<any> }) => Promise<Response> | Response
interface Route { method: string; pattern: RegExp; keys: string[]; handler: Handler }

const routes: Route[] = []
function route(method: string, path: string, handler: Handler | undefined) {
  if (!handler) return
  const keys: string[] = []
  const src = path.replace(/\//g, "\\/").replace(/\./g, "\\.").replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)" })
  routes.push({ method, pattern: new RegExp(`^${src}$`), keys, handler })
}

route("GET", "/api/health", async () => Response.json({ ok: true, payment: paymentMode(), ht: !!process.env.MONERIS_HT_PROFILE_ID, mail: !!process.env.AZURE_COMMUNICATION_CONNECTION_STRING, pos: goCloudConfigured() || paymentMode() === "mock", erp: erpConfigured() }))
route("GET", "/api/me", meRoute.GET)
route("GET", "/api/sessions", sessionsRoute.GET)
route("POST", "/api/sessions", sessionsRoute.POST)
route("DELETE", "/api/sessions/:id", sessionIdRoute.DELETE)
route("POST", "/api/auth/register", authRegisterRoute.POST)
route("POST", "/api/auth/login", authLoginRoute.POST)
route("POST", "/api/auth/verify-email", authVerifyRoute.POST)
route("POST", "/api/auth/verify-email/resend", authVerifyResendRoute.POST)
route("POST", "/api/auth/forgot", authForgotRoute.POST)
route("POST", "/api/auth/reset", authResetRoute.POST)
route("POST", "/api/auth/logout", authLogoutRoute.POST)
route("GET", "/api/dealers", publicDealersRoute.GET)
route("GET", "/api/dealers/invite", dealerInviteRoute.GET)
route("GET", "/api/orders", ordersRoute.GET)
route("POST", "/api/orders", ordersRoute.POST)
route("POST", "/api/orders/lookup", lookupRoute.POST)   // before :orderNo so the literal segments win
route("POST", "/api/orders/claim", claimRoute.POST)
route("POST", "/api/orders/claim-request", claimRequestRoute.POST)
route("POST", "/api/orders/claim-confirm", claimConfirmRoute.POST)
route("GET", "/api/orders/:orderNo", orderRoute.GET)
route("GET", "/api/orders/:orderNo/invoice.pdf", invoicePdfRoute.GET)
route("POST", "/api/orders/:orderNo/receipt/resend", resendRoute.POST)
route("POST", "/api/orders/:orderNo/push-pos", pushPosRoute.POST)
route("POST", "/api/checkout/moneris/pay", payRoute.POST)
route("POST", "/api/checkout/moneris/go/postback", goPostbackRoute.POST)
route("GET", "/api/checkout/moneris/go/postback", goPostbackRoute.GET)
route("POST", "/api/checkout/quote", quoteRoute.POST)
route("GET", "/api/checkout/payment-config", paymentConfigRoute.GET)
route("GET", "/api/admin/summary", adminSummaryRoute.GET)
route("GET", "/api/admin/orders", adminOrdersRoute.GET)
route("POST", "/api/admin/orders", adminOrdersRoute.POST)
route("GET", "/api/admin/payments", adminPaymentsRoute.GET)
route("GET", "/api/admin/risk", adminRiskRoute.GET)
route("POST", "/api/admin/risk", adminRiskRoute.POST)
route("GET", "/api/admin/traffic", adminTrafficRoute.GET)
route("GET", "/api/admin/reports", adminReportsRoute.GET)
route("POST", "/api/track", trackRoute.POST)
route("GET", "/api/admin/seo", adminSeoRoute.GET)
route("POST", "/api/admin/seo", adminSeoRoute.POST)
route("GET", "/api/admin/orders/:orderNo", adminOrderRoute.GET)
route("PATCH", "/api/admin/orders/:orderNo", adminOrderRoute.PATCH)
route("POST", "/api/admin/orders/:orderNo/resend", adminResendRoute.POST)
route("GET", "/api/admin/customers", adminCustomersRoute.GET)
route("GET", "/api/admin/customers/:email", adminCustomerEmailRoute.GET)
route("PATCH", "/api/admin/customers/:email", adminCustomerEmailRoute.PATCH)
route("GET", "/api/admin/products", adminProductsRoute.GET)
route("POST", "/api/admin/products", adminProductsRoute.POST)
route("PATCH", "/api/admin/products/:sku", adminProductRoute.PATCH)
route("GET", "/api/admin/dealers", adminDealersRoute.GET)
route("POST", "/api/admin/dealers", adminDealersRoute.POST)
route("PATCH", "/api/admin/dealers/:id", adminDealerIdRoute.PATCH)
route("GET", "/api/admin/ops", adminOpsRoute.GET)

const ROOT = resolve(process.cwd())
const PORT = Number(process.env.PORT ?? 8787)
const BIND = process.env.BIND_HOST ?? "127.0.0.1"
const STATIC_DENIED = new Set(["data", "scripts", "shadcn", "node_modules"])
const STATIC_DIRS = new Set(["assets", "docs", "samples"])
const STATIC_ROOT_OK = /\.(html|ico|png|svg|webp|txt)$/i
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".pdf": "application/pdf", ".ico": "image/x-icon", ".woff2": "font/woff2", ".md": "text/markdown; charset=utf-8",
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) {
    if (!v) continue
    if (k.toLowerCase() === "x-vs-remote-addr") continue
    headers.set(k, Array.isArray(v) ? v.join(", ") : v)
  }
  const remote = req.socket.remoteAddress?.trim()
  if (remote) headers.set("x-vs-remote-addr", remote)
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const body = chunks.length ? Buffer.concat(chunks) : undefined
  return new Request(url, { method: req.method, headers, body: body && req.method !== "GET" && req.method !== "HEAD" ? body : undefined })
}

async function sendWeb(res: ServerResponse, out: Response) {
  res.statusCode = out.status
  out.headers.forEach((v, k) => res.setHeader(k, v))
  res.end(Buffer.from(await out.arrayBuffer()))
}

function allowedStatic(file: string): boolean {
  const rel = relative(ROOT, file)
  if (!rel || rel.startsWith("..") || rel.split(sep).includes("..")) return false
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return false
  const parts = rel.split(sep)
  if (parts.some(p => p.startsWith("."))) return false
  if (STATIC_DENIED.has(parts[0])) return false
  if (parts.length === 1) return STATIC_ROOT_OK.test(parts[0])
  return STATIC_DIRS.has(parts[0])
}

/* Production serves this prototype under https://www.vanstro.ca/ux/ and exposes pretty URLs
   (/cart, /checkout, /products, /order-status …) that nginx rewrites to /ux/<name>.html.
   Mirror that here so links written for production work locally:
     /ux/<anything>        → /<anything>
     /<name> (no extension) → /<name>.html when that file exists at the root
   Extra path segments after a pretty name (/products/faucets) fall through to the page too. */
const PRETTY = /^\/([a-z0-9-]+)(?:\/.*)?$/i
async function prettyToFile(pathname: string): Promise<string> {
  let p = pathname
  if (p === "/ux" || p.startsWith("/ux/")) p = p.slice(3) || "/"
  if (p === "/" || p === "") return "/index.html"
  if (extname(p)) {
    // relative asset links from a nested pretty URL (/products/faucets → assets/vi.css)
    const a = p.match(/^\/(?:[^/]+\/)+((?:assets|docs|samples)\/.+)$/)
    return a ? `/${a[1]}` : p
  }
  const m = p.match(PRETTY)
  if (!m) return p
  const candidate = `/${m[1]}.html`
  try { if ((await stat(join(ROOT, candidate))).isFile()) return candidate } catch { /* not a page */ }
  return p
}

/* SEO monitoring: crawler hits on HTML pages and 404s are logged server-side (crawlers rarely run the
   JS beacon). Never blocks the response; failures are swallowed. */
function logHit(kind: "crawl" | "notfound", req: IncomingMessage, pathname: string) {
  const ip = (process.env.TRUST_PROXY === "1" && String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress || "local"
  appendServerHit({ kind, path: pathname, ua: String(req.headers["user-agent"] || ""), ip, referrer: String(req.headers.referer || ""), selfHost: String(req.headers.host || "").split(":")[0] }).catch(() => {})
}

async function serveStatic(pathname: string, req: IncomingMessage, res: ServerResponse) {
  let rel = await prettyToFile(decodeURIComponent(pathname))
  if (rel.endsWith("/")) rel += "index.html"
  const file = normalize(join(ROOT, rel))
  if (!allowedStatic(file)) { res.statusCode = 403; return res.end("forbidden") }
  try {
    const st = await stat(file)
    if (!st.isFile()) throw new Error("dir")
    res.setHeader("content-type", MIME[extname(file)] ?? "application/octet-stream")
    res.setHeader("cache-control", "no-store")
    res.end(await readFile(file))
    if (extname(file) === ".html" && !rel.startsWith("/admin")) logHit("crawl", req, pathname)
  } catch {
    res.statusCode = 404; res.end("not found")
    if (!/\.(map|ico|png|jpg|svg|webp|css|js|woff2?)$/i.test(pathname)) logHit("notfound", req, pathname)
  }
}

createServer(async (req, res) => {
  const started = Date.now()
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)
  try {
    if (url.pathname.startsWith("/api/")) {
      const r = routes.find(x => x.method === req.method && x.pattern.test(url.pathname))
      if (!r) { res.statusCode = 404; res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ error: "no_route" })) }
      const m = url.pathname.match(r.pattern)!
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
      const out = await r.handler(await toWebRequest(req), { params: Promise.resolve(params) })
      await sendWeb(res, out)
    } else {
      await serveStatic(url.pathname, req, res)
    }
  } catch (e) {
    console.error(e)
    res.statusCode = 500; res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ error: "internal" }))
  } finally {
    if (url.pathname.startsWith("/api/")) console.log(`${req.method} ${url.pathname} → ${res.statusCode} (${Date.now() - started} ms)`)
  }
}).listen(PORT, BIND, () => {
  console.log(`vanstro-account-ux dev server → http://${BIND}:${PORT}`)
  console.log(`  payment: ${paymentMode()}${paymentMode() === "live" ? ` (Moneris ${process.env.MONERIS_ENV ?? "qa"})` : " (MONERIS_MOCK)"} · mail: ${process.env.AZURE_COMMUNICATION_CONNECTION_STRING ? "ACS" : "NOT CONFIGURED"} · orders: ./data/orders`)
})
