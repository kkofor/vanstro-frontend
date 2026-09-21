/**
 * Send sample emails to one inbox for review.
 *   npx tsx scripts/send-samples.mts you@example.com [en|fr|both] [all|account|orders|<name>,<name>]
 *   names: verify welcome reset password-changed order invoice
 * Writes rendered HTML/text to /tmp/vanstro-mail/ as well.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { sendMail, type Locale, type RenderedMail, type MailAttachment } from "../shadcn/lib/mail.ts"
import { verifyEmail, welcome, resetPassword, passwordChanged, orderConfirmation, invoice, type OrderConfirmationInput } from "../shadcn/emails/index.ts"
import { quoteTax, GST_HST_BN, QST_BN } from "../shadcn/lib/tax.ts"
import { invoicePdf } from "../shadcn/lib/invoice-pdf.ts"
import { defaultDealer, snapshotDealer } from "../shadcn/lib/dealers.ts"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const to = process.argv[2]
const which = (process.argv[3] ?? "both") as "en" | "fr" | "both"
const pick = process.argv[4] ?? "all"
if (!to) { console.error("usage: send-samples.mts <email> [en|fr|both] [all|account|orders|names]"); process.exit(1) }

const base = process.env.APP_URL ?? "http://localhost:8787"
const locales: Locale[] = which === "both" ? ["en-CA", "fr-CA"] : which === "fr" ? ["fr-CA"] : ["en-CA"]
const now = new Date()
const out = "/tmp/vanstro-mail"
mkdirSync(out, { recursive: true })

const ACCOUNT = ["verify", "welcome", "reset", "password-changed"]
const ORDERS = ["order", "invoice"]
const wanted = pick === "all" ? [...ACCOUNT, ...ORDERS] : pick === "account" ? ACCOUNT : pick === "orders" ? ORDERS : pick.split(",")

function sampleOrder(locale: Locale): Omit<OrderConfirmationInput, "orderUrl"> {
  const items = [
    { sku: "KC-SHK-B30-DW", name: locale === "fr-CA" ? "Armoire de base Shaker 30 po" : "Shaker Base Cabinet 30\"", variant: "Dove White · 30×34.5×24", qty: 2, unitCents: 41900 },
    { sku: "KC-SHK-W3036-DW", name: locale === "fr-CA" ? "Armoire murale Shaker 30×36" : "Shaker Wall Cabinet 30×36", variant: "Dove White", qty: 2, unitCents: 28900 },
    { sku: "WP-SLAT-OAK-2440", name: locale === "fr-CA" ? "Panneau mural à lattes, chêne" : "Slat Wall Panel, Oak", variant: "2400×600 · " + (locale === "fr-CA" ? "paquet de 2" : "2-pack"), qty: 4, unitCents: 18900 },
  ]
  const subtotalCents = items.reduce((s, i) => s + i.unitCents * i.qty, 0)
  const freightCents = 24900
  const province = locale === "fr-CA" ? "QC" : "MB"
  const tq = quoteTax(province, subtotalCents + freightCents)
  const placedAt = now
  const etaFrom = new Date(now.getTime() + 7 * 864e5), etaTo = new Date(now.getTime() + 10 * 864e5)
  const shipTo = locale === "fr-CA"
    ? { name: "Marie-Ève Tremblay", street: "1450 rue Sherbrooke O", unit: "804", city: "Montréal", province: "QC" as const, postalCode: "H3G 1K4", phone: "514 555 0142" }
    : { name: "Guannan Zhang", company: "Zhang Renovations Ltd.", street: "856 Century Street", city: "Winnipeg", province: "MB" as const, postalCode: "R3H 0M5", phone: "204 555 0188" }
  return {
    locale,
    firstName: locale === "fr-CA" ? "Marie-Ève" : "Guannan",
    orderNo: "VS-2026-004821",
    placedAt,
    items,
    totals: { subtotalCents, freightCents, taxLines: tq.lines, taxTotalCents: tq.taxTotal, totalCents: tq.totalCents, province },
    delivery: { method: "freight", labelEn: "Curbside freight (LTL)", labelFr: "Livraison en bordure de rue (LTL)", etaFrom, etaTo },
    shipTo,
    payment: { brand: "Visa", last4: "4242", authCode: "027453", referenceNo: "660123450010690030", paidAt: placedAt },
    // Independent local dealer for the shipping province (Yuan Construction for MB, QC10 for QC).
    dealer: (() => { const d = defaultDealer(province); return d ? snapshotDealer(d) : null })(),
  }
}

for (const locale of locales) {
  const first = locale === "fr-CA" ? "Marie-Ève" : "Guannan"
  const order = sampleOrder(locale)
  const inv = { ...order, orderUrl: `${base}/account.html#orders`, invoiceNo: "INV-2026-004821", invoiceDate: now, invoicePdfUrl: `${base}/samples/Vanstro-INV-2026-004821.${locale}.pdf`, gstHstBn: GST_HST_BN, qstBn: order.totals.province === "QC" ? QST_BN : null }
  // Real PDF via headless Chrome; also copied into the prototype so the "Download" link works on the local server.
  const pdf = wanted.includes("invoice") ? await invoicePdf(inv) : null
  if (pdf) { mkdirSync(resolve(root, "samples"), { recursive: true }); writeFileSync(resolve(root, `samples/Vanstro-INV-2026-004821.${locale}.pdf`), pdf.content) }
  const set: Record<string, { mail: RenderedMail; channel?: "account" | "receipt"; attachments?: MailAttachment[] }> = {
    "verify": { mail: verifyEmail({ locale, firstName: first, link: `${base}/verify-email?token=SAMPLE_TOKEN_abc123` }) },
    "welcome": { mail: welcome({ locale, firstName: first, accountUrl: `${base}/account.html`, shopUrl: "https://www.vanstro.ca/shop/" }) },
    "reset": { mail: resetPassword({ locale, firstName: first, link: `${base}/reset-password?token=SAMPLE_TOKEN_xyz789`, requestedAt: now, requestContext: "Winnipeg, MB · Chrome on macOS" }) },
    "password-changed": { mail: passwordChanged({ locale, firstName: first, changedAt: now, context: "Winnipeg, MB · Chrome on macOS", signedOutOthers: true, freezeUrl: `${base}/security/freeze?u=demo` }) },
    "order": { channel: "receipt", mail: orderConfirmation({ ...order, orderUrl: `${base}/account.html#orders`, invoiceFollows: true }) },
    "invoice": {
      channel: "receipt",
      mail: invoice(inv),
      attachments: pdf ? [{ name: `${pdf.name.replace(/\.pdf$/, "")}.pdf`, contentType: "application/pdf", content: pdf.content }] : undefined,
    },
  }
  for (const name of wanted) {
    const s = set[name]
    if (!s) { console.error(`unknown sample "${name}"`); continue }
    writeFileSync(`${out}/${name}.${locale}.html`, s.mail.html)
    writeFileSync(`${out}/${name}.${locale}.txt`, s.mail.text)
    if (process.env.DRY_RUN) { console.log(`${locale}  ${name.padEnd(18)} rendered (dry run)`); continue }
    const r = await sendMail({ to, channel: s.channel, tag: `sample:${name}:${locale}`, attachments: s.attachments, ...s.mail })
    console.log(`${locale}  ${name.padEnd(18)} → ${r.id}`)
  }
}
console.log(`\nrendered files in ${out}`)
