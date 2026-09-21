/**
 * Order emails — sent from receipts@mail.vanstro.ca (channel: "receipt").
 *
 *  orderConfirmation → immediately after the server-side Moneris receipt is approved
 *                      (docs/05-checkout.md §Placing order). Items, delivery, totals, next steps.
 *  invoice           → the CRA-compliant tax invoice. PDF attached + download link.
 *                      Prints GST/HST BN, QST number for Quebec, tax lines per province,
 *                      payment reference. Sent right after confirmation (or on resend).
 *
 * Both are transactional under CASL (no unsubscribe required).
 * Money is always integer cents from the server-side quote; never from the client.
 *
 * Dealer disclosure (www.vanstro.ca/dealer-services-and-responsibility): every order email
 * names the Seller (Vanstro Global Supply Inc.), the selected independent local dealer with
 * contact details, what the dealer handles (pickup, delivery coordination, returns, after-sales)
 * and that Dealer Services are quoted and billed separately. `dealer: null` = Vanstro fulfils.
 */
import type { Locale, RenderedMail } from "../lib/mail"
import type { TaxLine, ProvinceCode } from "../lib/tax"
import { button, esc, p, renderLayout, BRAND, COMPANY } from "./layout"
import { DEALER_COPY, DEALER_POLICY_URL, SERVICE_LABEL, dealerAddress, type DealerSnapshot } from "../lib/dealers"

/* ------------------------------------------------------------------ types */
export interface OrderAddress {
  name: string
  company?: string
  street: string
  unit?: string
  city: string
  province: ProvinceCode
  postalCode: string
  phone?: string
}

export interface OrderItem {
  sku: string
  name: string
  variant?: string        // "Shaker · Dove White · 30×36"
  qty: number
  unitCents: number
}

export interface OrderTotals {
  subtotalCents: number
  /** Promo discount on products (omit / 0 when none). */
  discountCents?: number
  promoCode?: string
  freightCents: number
  taxLines: TaxLine[]
  taxTotalCents: number
  totalCents: number
  province: ProvinceCode
}

export interface OrderPayment {
  brand: string           // "Visa"
  last4: string
  authCode?: string       // Moneris auth code
  referenceNo?: string    // Moneris reference number
  paidAt: Date
}

export interface OrderEmailBase {
  locale: Locale
  firstName: string
  orderNo: string          // "VS-2026-004821"
  placedAt: Date
  items: OrderItem[]
  totals: OrderTotals
  delivery: { method: "freight" | "white" | "pickup"; labelEn: string; labelFr: string; etaFrom: Date; etaTo: Date }
  shipTo: OrderAddress
  billTo?: OrderAddress
  payment: OrderPayment
  orderUrl: string         // account → order detail (guests: signed /order-status link)
  /** Guest checkout only: register link that pre-fills the order email and claims the order. */
  accountUrl?: string
  /** Independent local dealer snapshot at purchase time; null when Vanstro fulfils directly. */
  dealer: DealerSnapshot | null
}

export interface OrderConfirmationInput extends OrderEmailBase {
  /** When true, mention the invoice arrives as a separate email. */
  invoiceFollows?: boolean
}

export interface InvoiceInput extends OrderEmailBase {
  invoiceNo: string        // "INV-2026-004821"
  invoiceDate: Date
  invoicePdfUrl: string
  gstHstBn: string         // "71411 2364 RT0001"
  qstBn?: string | null    // only printed for QC
}

/* ---------------------------------------------------------------- helpers */
function cad(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "CAD" }).format(cents / 100)
}
function date(locale: Locale, d: Date, withTime = false): string {
  return new Intl.DateTimeFormat(locale, withTime
    ? { dateStyle: "medium", timeStyle: "short", timeZone: "America/Winnipeg" }
    : { dateStyle: "medium", timeZone: "America/Winnipeg" }).format(d)
}
function etaRange(locale: Locale, from: Date, to: Date): string {
  const f = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "America/Winnipeg" })
  return from.getTime() === to.getTime() ? f.format(from) : `${f.format(from)} – ${f.format(to)}`
}
function addressBlock(a: OrderAddress): string {
  const lines = [
    esc(a.name),
    a.company ? esc(a.company) : "",
    esc(`${a.unit ? a.unit + "–" : ""}${a.street}`),
    esc(`${a.city}, ${a.province} ${a.postalCode}`),
    a.phone ? esc(a.phone) : "",
  ].filter(Boolean)
  return lines.join("<br>")
}
function addressText(a: OrderAddress): string {
  return [a.name, a.company, `${a.unit ? a.unit + "–" : ""}${a.street}`, `${a.city}, ${a.province} ${a.postalCode}`, a.phone].filter(Boolean).join("\n")
}

const FONT = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"

function itemsTable(items: OrderItem[], locale: Locale): string {
  const fr = locale === "fr-CA"
  const rows = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.rule};font:14px/1.4 ${FONT};color:${BRAND.text}">
        <div style="font-weight:600">${esc(i.name)}</div>
        ${i.variant ? `<div style="font-size:12px;color:${BRAND.muted}">${esc(i.variant)}</div>` : ""}
        <div style="font-size:12px;color:${BRAND.muted}">SKU ${esc(i.sku)}</div>
      </td>
      <td align="center" style="padding:10px 8px;border-bottom:1px solid ${BRAND.rule};font:14px ${FONT};color:${BRAND.muted};white-space:nowrap">× ${i.qty}</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.rule};font:600 14px ${FONT};color:${BRAND.text};white-space:nowrap">${cad(i.unitCents * i.qty, locale)}</td>
    </tr>`).join("")
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0">
  <tr>
    <th align="left" style="padding:0 0 6px;font:600 11px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};border-bottom:2px solid ${BRAND.rule}">${fr ? "Article" : "Item"}</th>
    <th align="center" style="padding:0 8px 6px;font:600 11px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};border-bottom:2px solid ${BRAND.rule}">${fr ? "Qté" : "Qty"}</th>
    <th align="right" style="padding:0 0 6px;font:600 11px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};border-bottom:2px solid ${BRAND.rule}">${fr ? "Montant" : "Amount"}</th>
  </tr>
  ${rows}
</table>`
}

function totalsTable(t: OrderTotals, locale: Locale): string {
  const fr = locale === "fr-CA"
  const row = (label: string, value: string, opts: { strong?: boolean; muted?: boolean } = {}) => `
    <tr>
      <td style="padding:5px 0;font:${opts.strong ? "700 16px" : "14px"} ${FONT};color:${opts.muted ? BRAND.muted : BRAND.text}">${label}</td>
      <td align="right" style="padding:5px 0;font:${opts.strong ? "700 16px" : "14px"} ${FONT};color:${BRAND.text};white-space:nowrap">${value}</td>
    </tr>`
  const taxRows = t.taxLines.map(l => row(fr ? l.labelFr : l.labelEn, cad(l.cents, locale), { muted: true })).join("")
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0">
  ${row(fr ? "Sous-total" : "Subtotal", cad(t.subtotalCents, locale))}
  ${t.discountCents ? row(`${fr ? "Rabais" : "Discount"}${t.promoCode ? ` · ${t.promoCode}` : ""}`, `−${cad(t.discountCents, locale)}`) : ""}
  ${row(fr ? "Livraison" : "Delivery", t.freightCents ? cad(t.freightCents, locale) : (fr ? "Gratuit" : "Free"))}
  ${taxRows}
  <tr><td colspan="2" style="padding:4px 0"><div style="height:1px;background:${BRAND.rule}"></div></td></tr>
  ${row(fr ? "Total payé (CAD)" : "Total paid (CAD)", cad(t.totalCents, locale), { strong: true })}
</table>`
}

function totalsText(t: OrderTotals, locale: Locale): string {
  const fr = locale === "fr-CA"
  return [
    `${fr ? "Sous-total" : "Subtotal"}: ${cad(t.subtotalCents, locale)}`,
    ...(t.discountCents ? [`${fr ? "Rabais" : "Discount"}${t.promoCode ? ` · ${t.promoCode}` : ""}: −${cad(t.discountCents, locale)}`] : []),
    `${fr ? "Livraison" : "Delivery"}: ${t.freightCents ? cad(t.freightCents, locale) : (fr ? "Gratuit" : "Free")}`,
    ...t.taxLines.map(l => `${fr ? l.labelFr : l.labelEn}: ${cad(l.cents, locale)}`),
    `${fr ? "Total payé (CAD)" : "Total paid (CAD)"}: ${cad(t.totalCents, locale)}`,
  ].join("\n")
}

function itemsText(items: OrderItem[], locale: Locale): string {
  return items.map(i => `• ${i.name}${i.variant ? ` (${i.variant})` : ""} × ${i.qty} — ${cad(i.unitCents * i.qty, locale)}`).join("\n")
}

function twoCol(leftTitle: string, left: string, rightTitle: string, right: string): string {
  const th = `font:600 11px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};padding-bottom:6px`
  const td = `font:14px/1.5 ${FONT};color:${BRAND.text};vertical-align:top`
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 4px">
  <tr>
    <td width="50%" style="${td};padding-right:12px"><div style="${th}">${leftTitle}</div>${left}</td>
    <td width="50%" style="${td}"><div style="${th}">${rightTitle}</div>${right}</td>
  </tr>
</table>`
}

/** Dealer disclosure card: who the dealer is, what they handle, and the Dealer Services boundary. */
function dealerBlock(d: DealerSnapshot | null, locale: Locale, orderNo: string): string {
  const fr = locale === "fr-CA"
  const c = DEALER_COPY[locale]
  const head = `font:600 11px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};padding-bottom:6px`
  const li = (x: string) => `<li style="margin:2px 0">${esc(x)}</li>`
  if (!d) {
    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;background:#f4f6f6;border-radius:10px">
  <tr><td style="padding:14px 16px;font:13px/1.55 ${FONT};color:${BRAND.text}">
    <div style="${head}">${fr ? "Exécution de la commande" : "Order fulfilment"}</div>
    ${esc(c.noDealer)}
  </td></tr>
</table>`
  }
  const services = d.services.map(sv => `<span style="display:inline-block;margin:6px 6px 0 0;padding:2px 8px;border:1px solid ${BRAND.rule};border-radius:999px;font:600 11px ${FONT};color:${BRAND.muted};background:#fff">${esc(SERVICE_LABEL[sv][fr ? "fr" : "en"])}</span>`).join("")
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;border:1px solid ${BRAND.rule};border-radius:10px">
  <tr>
    <td style="padding:14px 16px 4px;font:14px/1.5 ${FONT};color:${BRAND.text}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="55%" style="vertical-align:top;padding-right:12px;font:14px/1.5 ${FONT};color:${BRAND.text}">
            <div style="${head}">${fr ? "Votre détaillant local" : "Your local dealer"}</div>
            <strong>${esc(d.name)}</strong> <span style="display:inline-block;margin-left:4px;padding:1px 7px;border-radius:4px;background:#fdf1e6;color:#9a4a0f;font:700 10px ${FONT};letter-spacing:.06em;text-transform:uppercase;vertical-align:2px">${esc(c.badge)}</span><br>
            ${esc(dealerAddress(d))}<br>
            <span style="color:${BRAND.muted};font-size:12px">${esc(fr ? d.hoursFr : d.hoursEn)}</span>
            <div>${services}</div>
          </td>
          <td width="45%" style="vertical-align:top;font:14px/1.6 ${FONT};color:${BRAND.text}">
            <div style="${head}">Contact</div>
            <a href="tel:+1${d.phone.replace(/\D/g, "")}" style="color:${BRAND.navy};font-weight:600;text-decoration:none">${esc(d.phone)}</a><br>
            <a href="mailto:${esc(d.email)}?subject=${encodeURIComponent(`Vanstro ${orderNo}`)}" style="color:${BRAND.navy};font-weight:600;text-decoration:none">${esc(d.email)}</a><br>
            <span style="color:${BRAND.muted};font-size:12px">${fr ? "Citez votre numéro de commande" : "Quote your order number"} ${esc(orderNo)}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:10px 16px 14px;font:13px/1.55 ${FONT};color:${BRAND.text}">
      <div style="padding:10px 12px;background:#f4f6f6;border-radius:8px">
        ${esc(c.intro(d.name))}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0">
          <tr>
            <td width="50%" style="vertical-align:top;padding-right:10px;font:12px/1.5 ${FONT};color:${BRAND.text}">
              <div style="font:700 11px ${FONT};letter-spacing:.06em;text-transform:uppercase;color:#9a4a0f;margin-bottom:2px">${esc(c.dealerHandles)}</div>
              <ul style="margin:0;padding-left:16px">${c.dealerList.map(li).join("")}</ul>
            </td>
            <td width="50%" style="vertical-align:top;font:12px/1.5 ${FONT};color:${BRAND.text}">
              <div style="font:700 11px ${FONT};letter-spacing:.06em;text-transform:uppercase;color:${BRAND.navy};margin-bottom:2px">${esc(c.vanstroHandles)}</div>
              <ul style="margin:0;padding-left:16px">${c.vanstroList.map(li).join("")}</ul>
            </td>
          </tr>
        </table>
        <div style="margin-top:8px;color:${BRAND.muted};font-size:12px">${esc(c.boundary)} <a href="${DEALER_POLICY_URL}" style="color:${BRAND.navy};font-weight:600">${esc(c.policyLink)}</a></div>
      </div>
    </td>
  </tr>
</table>`
}

function dealerText(d: DealerSnapshot | null, locale: Locale): string {
  const fr = locale === "fr-CA"
  const c = DEALER_COPY[locale]
  if (!d) return `${fr ? "EXÉCUTION DE LA COMMANDE" : "ORDER FULFILMENT"}\n${c.noDealer}`
  return [
    fr ? "VOTRE DÉTAILLANT LOCAL (indépendant)" : "YOUR LOCAL DEALER (independent)",
    d.name,
    dealerAddress(d),
    `${d.phone} · ${d.email}`,
    fr ? d.hoursFr : d.hoursEn,
    "",
    c.intro(d.name),
    `${c.dealerHandles}: ${c.dealerList.join("; ")}.`,
    `${c.vanstroHandles}: ${c.vanstroList.join("; ")}.`,
    `${c.boundary} ${DEALER_POLICY_URL}`,
  ].join("\n")
}

function sectionTitle(s: string): string {
  return `<div style="margin:22px 0 6px;font:700 13px ${FONT};letter-spacing:.04em;color:${BRAND.navy}">${s}</div>`
}

/* ------------------------------------------------------- order confirmation */
export function orderConfirmation(i: OrderConfirmationInput): RenderedMail {
  const fr = i.locale === "fr-CA"
  const heading = fr ? `Merci, ${esc(i.firstName)} — commande confirmée` : `Thanks, ${esc(i.firstName)} — your order is confirmed`
  const subject = fr ? `Commande ${i.orderNo} confirmée · ${cad(i.totals.totalCents, i.locale)}` : `Order ${i.orderNo} confirmed · ${cad(i.totals.totalCents, i.locale)}`
  const pickup = i.delivery.method === "pickup"
  const deliveryLabel = fr ? i.delivery.labelFr : i.delivery.labelEn
  const eta = etaRange(i.locale, i.delivery.etaFrom, i.delivery.etaTo)

  const orderMeta = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:#f4f6f6;border-radius:10px">
  <tr>
    <td style="padding:14px 16px;font:13px/1.6 ${FONT};color:${BRAND.muted}">
      ${fr ? "Numéro de commande" : "Order number"}<br><span style="font:700 18px ui-monospace,Menlo,Consolas,monospace;color:${BRAND.text};letter-spacing:.02em">${esc(i.orderNo)}</span>
    </td>
    <td align="right" style="padding:14px 16px;font:13px/1.6 ${FONT};color:${BRAND.muted}">
      ${fr ? "Passée le" : "Placed"}<br><span style="color:${BRAND.text}">${date(i.locale, i.placedAt, true)}</span>
    </td>
  </tr>
</table>`

  const d = i.dealer
  const pickupAt = d ? `${d.name}, ${dealerAddress(d)}` : COMPANY.address
  const nextSteps = pickup
    ? (fr ? `${d ? esc(d.name) : "Nous"} vous enverra un courriel dès que la commande sera prête au comptoir de ramassage (${esc(pickupAt)}), habituellement <strong>${eta}</strong>. Apportez une pièce d’identité et ce numéro de commande.`
          : `${d ? esc(d.name) : "We"} will email you as soon as the order is ready at the pickup counter (${esc(pickupAt)}), usually <strong>${eta}</strong>. Bring photo ID and this order number.`)
    : d
      ? (fr ? `Livraison prévue <strong>${eta}</strong>. <strong>${esc(d.name)}</strong>, votre détaillant local, vous appellera au numéro indiqué pour coordonner la livraison et fixer un créneau.`
            : `Estimated delivery <strong>${eta}</strong>. <strong>${esc(d.name)}</strong>, your local dealer, will call the number on file to coordinate delivery and book a window.`)
      : (fr ? `Livraison prévue <strong>${eta}</strong>. Le transporteur vous appellera au numéro indiqué pour fixer un créneau avant la livraison.`
            : `Estimated delivery <strong>${eta}</strong>. The carrier will call the number on file to book a delivery window before arriving.`)

  const body =
    p(fr ? "Votre paiement a été approuvé et la commande est en préparation." : "Your payment was approved and the order is now being prepared.") +
    orderMeta +
    sectionTitle(fr ? "Articles" : "Items") +
    itemsTable(i.items, i.locale) +
    totalsTable(i.totals, i.locale) +
    sectionTitle(pickup ? (fr ? "Ramassage" : "Pickup") : (fr ? "Livraison" : "Delivery")) +
    p(`<strong>${esc(deliveryLabel)}</strong><br>${nextSteps}`) +
    twoCol(
      pickup ? (fr ? "Ramassage à" : "Pick up at") : (fr ? "Expédier à" : "Ship to"),
      pickup ? esc(pickupAt) : addressBlock(i.shipTo),
      fr ? "Paiement" : "Payment",
      `${esc(i.payment.brand)} •••• ${esc(i.payment.last4)}<br><span style="color:${BRAND.muted};font-size:12px">${fr ? "Autorisation" : "Auth"} ${esc(i.payment.authCode ?? "—")} · ${date(i.locale, i.payment.paidAt, true)}</span><br><span style="color:${BRAND.muted};font-size:12px">${esc(DEALER_COPY[i.locale].seller)}</span>`,
    ) +
    sectionTitle(d ? (fr ? "Votre détaillant local et son rôle" : "Your local dealer and their role") : (fr ? "Exécution de la commande" : "Order fulfilment")) +
    dealerBlock(d, i.locale, i.orderNo) +
    button(fr ? "Voir ma commande" : "View my order", i.orderUrl) +
    (i.accountUrl
      ? p(fr ? `Vous avez commandé en tant qu’invité. <a href="${esc(i.accountUrl)}" style="color:${BRAND.navy};font-weight:600">Créez un compte</a> avec ce courriel pour suivre cette commande, télécharger vos factures et commander à nouveau en un clic.`
             : `You checked out as a guest. <a href="${esc(i.accountUrl)}" style="color:${BRAND.navy};font-weight:600">Create an account</a> with this email to track this order, download invoices and reorder in one click.`, { muted: true, small: true })
      : "") +
    (i.invoiceFollows !== false
      ? p(fr ? "Votre facture officielle (avec numéros de TPS/TVH) suit dans un courriel séparé et reste téléchargeable depuis votre compte pendant 7 ans."
             : "Your official tax invoice (with GST/HST registration numbers) follows in a separate email and stays downloadable from your account for 7 years.", { muted: true, small: true })
      : "")

  const text = `${fr ? "Votre paiement a été approuvé et la commande est en préparation." : "Your payment was approved and the order is now being prepared."}

${fr ? "Numéro de commande" : "Order number"}: ${i.orderNo}
${fr ? "Passée le" : "Placed"}: ${date(i.locale, i.placedAt, true)}

${fr ? "ARTICLES" : "ITEMS"}
${itemsText(i.items, i.locale)}

${totalsText(i.totals, i.locale)}

${pickup ? (fr ? "RAMASSAGE" : "PICKUP") : (fr ? "LIVRAISON" : "DELIVERY")}: ${deliveryLabel}
${nextSteps.replace(/<[^>]+>/g, "")}

${pickup ? (fr ? "Ramassage à" : "Pick up at") : (fr ? "Expédier à" : "Ship to")}:
${pickup ? pickupAt : addressText(i.shipTo)}

${fr ? "Paiement" : "Payment"}: ${i.payment.brand} •••• ${i.payment.last4} · ${fr ? "Autorisation" : "Auth"} ${i.payment.authCode ?? "—"}
${DEALER_COPY[i.locale].seller}

${dealerText(d, i.locale)}

${fr ? "Voir ma commande" : "View my order"}: ${i.orderUrl}${i.accountUrl ? `
${fr ? "Créer un compte pour suivre cette commande" : "Create an account to track this order"}: ${i.accountUrl}` : ""}`

  const footNote = d
    ? (fr ? `Ramassage, livraison, retours ou service après-vente : contactez d’abord ${esc(d.name)} au ${esc(d.phone)}. Questions sur un produit ou une politique : <a href="mailto:${COMPANY.support}" style="color:${BRAND.navy}">${COMPANY.support}</a> en citant ${esc(i.orderNo)}.`
          : `Pickup, delivery, returns or after-sales: contact ${esc(d.name)} first at ${esc(d.phone)}. Product or policy questions: <a href="mailto:${COMPANY.support}" style="color:${BRAND.navy}">${COMPANY.support}</a> quoting ${esc(i.orderNo)}.`)
    : (fr ? `Une question sur cette commande ? Répondez à ce courriel ou écrivez à <a href="mailto:${COMPANY.support}" style="color:${BRAND.navy}">${COMPANY.support}</a> en citant ${esc(i.orderNo)}.`
          : `Questions about this order? Reply to this email or write to <a href="mailto:${COMPANY.support}" style="color:${BRAND.navy}">${COMPANY.support}</a> quoting ${esc(i.orderNo)}.`)

  const r = renderLayout({ locale: i.locale, preheader: subject, heading, body, text, footNote })
  return { subject, ...r }
}

/* ----------------------------------------------------------------- invoice */
export function invoice(i: InvoiceInput): RenderedMail {
  const fr = i.locale === "fr-CA"
  const heading = fr ? `Facture ${esc(i.invoiceNo)}` : `Invoice ${esc(i.invoiceNo)}`
  const subject = fr ? `Votre facture ${i.invoiceNo} pour la commande ${i.orderNo}` : `Your invoice ${i.invoiceNo} for order ${i.orderNo}`
  const isQc = i.totals.province === "QC"
  const billTo = i.billTo ?? i.shipTo
  const d = i.dealer
  const pickupAt = d ? `${d.name}, ${dealerAddress(d)}` : COMPANY.address

  const meta = (label: string, value: string) => `
    <tr>
      <td style="padding:3px 16px 3px 0;font:13px ${FONT};color:${BRAND.muted};white-space:nowrap">${label}</td>
      <td style="padding:3px 0;font:13px ${FONT};color:${BRAND.text}">${value}</td>
    </tr>`

  const legal = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;background:#f4f6f6;border-radius:10px">
  <tr><td style="padding:14px 16px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      ${meta(fr ? "Numéro de facture" : "Invoice number", `<strong style="font-family:ui-monospace,Menlo,Consolas,monospace">${esc(i.invoiceNo)}</strong>`)}
      ${meta(fr ? "Date de facturation" : "Invoice date", date(i.locale, i.invoiceDate))}
      ${meta(fr ? "Commande" : "Order", esc(i.orderNo))}
      ${meta(fr ? "Vendeur" : "Seller", esc(COMPANY.name))}
      ${meta(fr ? "Détaillant local" : "Local dealer", d ? `${esc(d.name)} <span style="color:${BRAND.muted}">(${esc(DEALER_COPY[i.locale].badge).toLowerCase()})</span>` : (fr ? "Aucun · exécution directe par Vanstro" : "None · fulfilled directly by Vanstro"))}
      ${meta(fr ? "Statut" : "Status", `<span style="color:#1b7f4a;font-weight:600">${fr ? "Payée" : "Paid"}</span> · ${esc(i.payment.brand)} •••• ${esc(i.payment.last4)}${i.payment.referenceNo ? ` · ${fr ? "Réf." : "Ref."} ${esc(i.payment.referenceNo)}` : ""}`)}
      ${meta(fr ? "N° TPS/TVH" : "GST/HST No.", esc(i.gstHstBn))}
      ${isQc && i.qstBn ? meta(fr ? "N° TVQ" : "QST No.", esc(i.qstBn)) : ""}
    </table>
  </td></tr>
</table>`

  const body =
    p(fr ? `Voici votre facture officielle pour la commande ${esc(i.orderNo)}. Le PDF est joint et reste disponible dans votre compte.`
         : `Here is your official tax invoice for order ${esc(i.orderNo)}. The PDF is attached and stays available in your account.`) +
    legal +
    twoCol(fr ? "Facturer à" : "Bill to", addressBlock(billTo), fr ? "Expédier à" : "Ship to", i.delivery.method === "pickup" ? esc(`${fr ? "Ramassage" : "Pickup"} · ${pickupAt}`) : addressBlock(i.shipTo)) +
    sectionTitle(fr ? "Détail" : "Details") +
    itemsTable(i.items, i.locale) +
    totalsTable(i.totals, i.locale) +
    p(fr
      ? `Taxes calculées selon la province de livraison (${i.totals.province}). ${isQc ? "TVQ calculée sur le prix hors TPS. " : ""}Tous les montants en dollars canadiens.`
      : `Taxes calculated for the destination province (${i.totals.province}). ${isQc ? "QST calculated on the price excluding GST. " : ""}All amounts in Canadian dollars.`, { muted: true, small: true }) +
    (d ? p(`${esc(DEALER_COPY[i.locale].invoiceNote(d.name))} <a href="${DEALER_POLICY_URL}" style="color:${BRAND.navy}">${esc(DEALER_COPY[i.locale].policyLink)}</a>`, { muted: true, small: true }) : "") +
    button(fr ? "Télécharger la facture (PDF)" : "Download invoice (PDF)", i.invoicePdfUrl)

  const text = `${fr ? `Facture officielle pour la commande ${i.orderNo}. Le PDF est joint.` : `Official tax invoice for order ${i.orderNo}. PDF attached.`}

${fr ? "Numéro de facture" : "Invoice number"}: ${i.invoiceNo}
${fr ? "Date" : "Date"}: ${date(i.locale, i.invoiceDate)}
${fr ? "Statut" : "Status"}: ${fr ? "Payée" : "Paid"} · ${i.payment.brand} •••• ${i.payment.last4}
${fr ? "N° TPS/TVH" : "GST/HST No."}: ${i.gstHstBn}${isQc && i.qstBn ? `\n${fr ? "N° TVQ" : "QST No."}: ${i.qstBn}` : ""}
${fr ? "Vendeur" : "Seller"}: ${COMPANY.name}
${fr ? "Détaillant local" : "Local dealer"}: ${d ? `${d.name} · ${d.phone}` : (fr ? "Aucun" : "None")}

${fr ? "Facturer à" : "Bill to"}:
${addressText(billTo)}

${fr ? "DÉTAIL" : "DETAILS"}
${itemsText(i.items, i.locale)}

${totalsText(i.totals, i.locale)}
${d ? `\n${DEALER_COPY[i.locale].invoiceNote(d.name)} ${DEALER_POLICY_URL}\n` : ""}
${fr ? "Télécharger la facture" : "Download invoice"}: ${i.invoicePdfUrl}`

  const footNote = fr
    ? `${esc(COMPANY.name)} · ${esc(COMPANY.address)} · TPS/TVH ${esc(i.gstHstBn)}${isQc && i.qstBn ? ` · TVQ ${esc(i.qstBn)}` : ""}. Conservez cette facture pour vos dossiers fiscaux (7 ans).`
    : `${esc(COMPANY.name)} · ${esc(COMPANY.address)} · GST/HST ${esc(i.gstHstBn)}${isQc && i.qstBn ? ` · QST ${esc(i.qstBn)}` : ""}. Keep this invoice for your tax records (7 years).`

  const r = renderLayout({ locale: i.locale, preheader: subject, heading, body, text, footNote })
  return { subject, ...r }
}
