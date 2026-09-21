/**
 * Printable quotation (Letter) — attached to the dealer quote email.
 * Same table layout as the tax invoice, but this is not a tax invoice:
 * no GST/HST BN, no “paid”, no CRA invoice wording.
 */
import { existsSync, readFileSync } from "node:fs"
import { join, resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { COMPANY, esc } from "./layout"
import { DEALER_COPY, dealerAddress } from "../lib/dealers"
import { DELIVERY } from "../lib/checkout"
import type { Quote } from "../lib/quotes"

const TEAL = "#004744"
const ORANGE = "#f5a93f"
const GREEN = "#0d8968"

let logoDataUri: string | null = null
function logo(): string {
  if (logoDataUri) return logoDataUri
  const candidates = [
    process.env.INVOICE_LOGO_PATH,
    join(process.cwd(), "public/assets/brand/logo-print.png"),
    join(process.cwd(), "account-ux/assets/brand/logo-print.png"),
    resolve(dirname(fileURLToPath(import.meta.url)), "../../account-ux/assets/brand/logo-print.png"),
  ].filter(Boolean) as string[]
  for (const p of candidates) {
    if (existsSync(p)) {
      logoDataUri = `data:image/png;base64,${readFileSync(p).toString("base64")}`
      return logoDataUri
    }
  }
  throw new Error("invoice_logo_missing")
}

const cad = (cents: number, fr: boolean) =>
  new Intl.NumberFormat(fr ? "fr-CA" : "en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)
const date = (d: Date, fr: boolean) =>
  new Intl.DateTimeFormat(fr ? "fr-CA" : "en-CA", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Winnipeg" }).format(d)

export function renderQuoteHtml(q: Quote): string {
  const fr = q.locale === "fr-CA"
  const t = q.quote
  const d = q.dealer
  const dc = DEALER_COPY[q.locale]
  const pickup = q.deliveryMethod === "pickup"
  const ship = q.shipping
  const valid = date(new Date(q.validUntil), fr)
  const issued = date(new Date(q.createdAt), fr)
  const deliveryLabel = fr ? DELIVERY[q.deliveryMethod].labelFr : DELIVERY[q.deliveryMethod].labelEn

  const terms = fr
    ? [
        `Ceci est un devis, pas une facture fiscale. Aucun paiement n’est demandé par ce document.`,
        `Vendu par ${esc(COMPANY.name)}. ${esc(d.name)} est un détaillant indépendant : premier contact pour le ramassage, la coordination de livraison et le service après-vente.`,
        `Valable jusqu’au ${esc(valid)}. Les taxes sont une estimation selon la province de destination (${t.tax.province}).`,
        `Tous les montants sont en dollars canadiens (CAD). Les articles sur mesure sont finaux.`,
      ]
    : [
        `This is a quotation, not a tax invoice. This document does not request payment.`,
        `Sold by ${esc(COMPANY.name)}. ${esc(d.name)} is an independent local dealer — first contact for pickup, delivery coordination and after-sales.`,
        `Valid until ${esc(valid)}. Taxes are estimated for the destination province (${t.tax.province}).`,
        `All amounts in Canadian dollars (CAD). Made-to-order items are final sale.`,
      ]

  const taxRows = t.tax.lines.map(l => `
                    <tr>
                      <td class="lab">${esc(fr ? l.labelFr : l.labelEn)}</td>
                      <td class="amt">${cad(l.cents, fr)}</td>
                    </tr>`).join("")

  const items = q.items.map((i, idx) => {
    const n = idx + 1
    const alt = n % 2 === 0 ? " item-alt" : ""
    return `
        <tr class="item${alt}">
          <td class="first">${n}</td>
          <td>
            <div class="item-name">${esc(i.name)}</div>
            <div class="item-meta">SKU: ${esc(i.sku)}${i.variant ? ` &nbsp;·&nbsp; ${esc(i.variant)}` : ""}</div>
          </td>
          <td class="ctr">${fr ? "ch." : "each"}</td>
          <td class="num">${cad(i.unitCents, fr)}</td>
          <td class="ctr">${i.qty}</td>
          <td class="num last">${cad(i.unitCents * i.qty, fr)}</td>
        </tr>`
  }).join("")

  return `<!DOCTYPE html>
<html lang="${fr ? "fr-CA" : "en-CA"}">
<head>
  <meta charset="utf-8" />
  <title>${fr ? "Devis" : "Quote"} ${esc(q.quoteNo)} · ${esc(COMPANY.name)}</title>
  <style>
    @page { size: 8.5in 11in; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { width: 8.5in; background: #fff; }
    body { width: 8.5in; min-height: 11in; background: #fff; color: #1a2c2b; font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { width: 8.5in; min-height: 11in; background: #fff; }
    table { border-collapse: collapse; border-spacing: 0; }
    img { border: 0; display: block; }
    .doc { width: 8.5in; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    .bar-teal { background: ${TEAL}; height: 0.08in; font-size: 0; line-height: 0; }
    .bar-orange { background: ${ORANGE}; height: 0.032in; font-size: 0; line-height: 0; }
    .header-pad { padding: 0.1in 0.52in; }
    .logo-cell { padding: 0.16in 0.52in 0.08in; }
    .logo { width: 1.85in; height: auto; }
    .logo-foot { width: 1.05in; height: auto; }
    .company-name { font-size: 9pt; font-weight: bold; color: ${TEAL}; }
    .company-line { font-size: 8pt; color: #4d605e; line-height: 1.38; }
    .doc-kicker { font-size: 7pt; font-weight: bold; letter-spacing: 0.2em; color: ${GREEN}; text-transform: uppercase; padding-bottom: 0.03in; }
    .doc-title { font-size: 22pt; font-weight: bold; color: ${TEAL}; letter-spacing: 0.16em; line-height: 0.95; padding-bottom: 0.06in; }
    .meta-label { font-size: 7pt; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; color: #7a8c89; }
    .meta-value { font-size: 9.5pt; font-weight: bold; color: #1a2c2b; padding-bottom: 0.05in; }
    .section-label { font-size: 7pt; font-weight: bold; letter-spacing: 0.16em; text-transform: uppercase; color: ${GREEN}; padding-bottom: 0.05in; }
    .party-name { font-size: 10pt; font-weight: bold; color: ${TEAL}; }
    .party-line { font-size: 8.5pt; color: #3e524f; line-height: 1.4; }
    .parties-pad { padding: 0.1in 0.52in; }
    .total-band { background: ${TEAL}; color: #fff; }
    .total-kicker { font-size: 7.5pt; font-weight: bold; letter-spacing: 0.18em; text-transform: uppercase; color: #c5ddd6; padding-bottom: 0.02in; }
    .total-amount { font-size: 18pt; font-weight: bold; letter-spacing: 0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
    .total-sub { font-size: 8pt; color: #c5ddd6; padding-top: 0.04in; }
    .col-heads th { background: ${TEAL}; color: #fff; font-size: 7pt; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; padding: 0.07in 0.08in; text-align: left; vertical-align: middle; border-bottom: 2pt solid ${ORANGE}; }
    .col-heads th.num { text-align: right; } .col-heads th.ctr { text-align: center; }
    .col-heads th.first { padding-left: 0.52in; } .col-heads th.last { padding-right: 0.52in; }
    tr.item { page-break-inside: avoid; break-inside: avoid; }
    tr.item td { padding: 0.08in; vertical-align: top; border-bottom: 0.5pt solid #d5dedc; font-size: 9pt; color: #1a2c2b; }
    tr.item td.first { padding-left: 0.52in; } tr.item td.last { padding-right: 0.52in; }
    tr.item-alt td { background: #f4f7f6; }
    .item-name { font-weight: bold; font-size: 9.5pt; color: ${TEAL}; }
    .item-meta { font-size: 7.5pt; color: #5a6e6c; padding-top: 0.02in; line-height: 1.35; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .ctr { text-align: center; font-variant-numeric: tabular-nums; }
    .keep-together { page-break-inside: avoid; break-inside: avoid; }
    .block-pad { padding: 0.14in 0.52in 0.1in; }
    .notes-title { font-size: 7.5pt; font-weight: bold; letter-spacing: 0.14em; text-transform: uppercase; color: ${TEAL}; padding-bottom: 0.05in; }
    .notes-body { font-size: 8pt; color: #3e524f; line-height: 1.45; }
    .notes-body ul { margin: 0; padding-left: 0.16in; } .notes-body li { padding-bottom: 0.015in; }
    .totals { width: 100%; }
    .totals td { padding: 0.04in 0; font-size: 9pt; color: #3e524f; }
    .totals td.lab { text-align: left; padding-right: 0.16in; }
    .totals td.amt { text-align: right; font-variant-numeric: tabular-nums; color: #1a2c2b; }
    .totals tr.grand td { background: ${TEAL}; color: #fff; font-weight: bold; font-size: 11pt; padding: 0.08in 0.1in; }
    .totals tr.grand td.amt { color: #fff; font-size: 12pt; }
    .totals tr.rule td { border-top: 1pt solid ${TEAL}; padding-top: 0.06in; }
    .footer-pad { padding: 0.09in 0.52in 0.14in; }
    .footer-rule { border-top: 1.5pt solid ${TEAL}; }
    .footer-copy { font-size: 7pt; color: #5a6e6c; letter-spacing: 0.03em; }
    .footer-slogan { font-size: 7pt; font-weight: bold; letter-spacing: 0.16em; text-transform: uppercase; color: ${TEAL}; }
  </style>
</head>
<body>
  <div class="sheet">
    <table class="doc" width="100%" cellspacing="0" cellpadding="0" border="0">
      <thead>
        <tr>
          <td colspan="6">
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr><td class="bar-teal">&nbsp;</td></tr>
              <tr><td class="bar-orange">&nbsp;</td></tr>
            </table>
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td class="logo-cell" width="62%" valign="middle"><img class="logo" src="${logo()}" alt="VANSTRO" /></td>
                <td class="logo-cell" width="38%" valign="middle" align="right">
                  <div class="doc-kicker">${fr ? "Devis de prix" : "Price quotation"}</div>
                  <div class="doc-title">${fr ? "DEVIS" : "QUOTE"}</div>
                </td>
              </tr>
            </table>
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td class="header-pad">
                  <table width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td width="58%" valign="top">
                        <div class="company-name">${esc(COMPANY.name)} <span style="font-size:7pt;font-weight:normal;color:#7a8c89;letter-spacing:.1em;text-transform:uppercase">${fr ? "Vendeur" : "Seller"}</span></div>
                        <div class="company-line">${esc(COMPANY.address)}</div>
                        <div class="company-line">${esc(COMPANY.phone)} &nbsp;·&nbsp; ${esc(COMPANY.support)}</div>
                      </td>
                      <td width="42%" valign="top" align="right">
                        <table cellspacing="0" cellpadding="0" border="0" align="right">
                          <tr><td align="right"><div class="meta-label">${fr ? "Numéro de devis" : "Quote number"}</div><div class="meta-value">${esc(q.quoteNo)}</div></td></tr>
                          <tr><td align="right"><div class="meta-label">${fr ? "Date du devis" : "Quote date"}</div><div class="meta-value">${issued}</div></td></tr>
                          <tr><td align="right"><div class="meta-label">${fr ? "Valable jusqu’au" : "Valid until"}</div><div class="meta-value">${valid}</div></td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td colspan="6" class="parties-pad">
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="31%" valign="top">
                  <div class="section-label">${fr ? "Client" : "Prepared for"}</div>
                  <div class="party-name">${esc(q.customer.name || q.customer.email)}</div>
                  <div class="party-line">${esc(q.customer.email)}</div>
                  ${q.customer.phone ? `<div class="party-line">${esc(q.customer.phone)}</div>` : ""}
                </td>
                <td width="3.5%">&nbsp;</td>
                <td width="31%" valign="top">
                  <div class="section-label">${pickup ? (fr ? "Ramassage" : "Pick up at") : (fr ? "Expédier à" : "Ship to")}</div>
                  ${pickup
                    ? `<div class="party-name">${esc(d.name)}</div><div class="party-line">${esc(dealerAddress(d))}</div><div class="party-line">${esc(deliveryLabel)}</div>`
                    : `<div class="party-name">${esc(ship.company ?? ship.name)}</div>
                       <div class="party-line">${esc(`${ship.unit ? ship.unit + "–" : ""}${ship.street}`)}</div>
                       <div class="party-line">${esc(`${ship.city}, ${ship.province} ${ship.postalCode}`)}</div>
                       <div class="party-line" style="padding-top:0.03in;color:${GREEN}">${esc(deliveryLabel)}</div>`}
                </td>
                <td width="3.5%">&nbsp;</td>
                <td width="31%" valign="top">
                  <div class="section-label">${fr ? "Détaillant local" : "Local dealer"}</div>
                  <div class="party-name">${esc(d.name)}</div>
                  <div class="party-line">${esc(dealerAddress(d))}</div>
                  <div class="party-line">${esc(d.phone)}</div>
                  <div class="party-line">${esc(d.email)}</div>
                  <div class="party-line" style="padding-top:0.03in;color:#9a4a0f;font-size:7pt;font-weight:bold;letter-spacing:.1em;text-transform:uppercase">${esc(dc.badge)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td colspan="6">
            <table width="100%" cellspacing="0" cellpadding="0" border="0" class="total-band">
              <tr>
                <td width="52%" valign="middle" style="padding: 0.09in 0.52in;">
                  <div class="total-kicker">${fr ? "Total du devis" : "Quote total"}</div>
                  <div class="total-sub">${fr ? "Devise" : "Currency"}: CAD &nbsp;·&nbsp; ${fr ? "Valable jusqu’au" : "Valid until"} ${valid}</div>
                </td>
                <td width="48%" valign="middle" align="right" style="padding: 0.09in 0.52in;">
                  <div class="total-amount">CAD $${cad(t.totalCents, fr)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr class="col-heads">
          <th class="first" width="8%" align="left">#</th>
          <th width="44%" align="left">${fr ? "Article" : "Item"}</th>
          <th class="ctr" width="9%">${fr ? "Unité" : "Unit"}</th>
          <th class="num" width="13%">${fr ? "Prix" : "Price"}</th>
          <th class="ctr" width="10%">${fr ? "Qté" : "Qty"}</th>
          <th class="num last" width="16%">${fr ? "Montant" : "Amount"}</th>
        </tr>
      </thead>
      <tfoot>
        <tr>
          <td colspan="6" class="footer-pad footer-rule">
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td valign="middle" width="28%"><img class="logo-foot" src="${logo()}" alt="VANSTRO" /></td>
                <td valign="middle" align="center" class="footer-slogan">${fr ? "Votre plateforme d’approvisionnement mondiale" : "Your global supply platform"}</td>
                <td valign="middle" align="right" class="footer-copy">© ${esc(COMPANY.name)} &nbsp;·&nbsp; ${esc(q.quoteNo)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </tfoot>
      <tbody>
        ${items}
        <tr class="keep-together">
          <td colspan="6" class="block-pad">
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="54%" valign="top" style="padding-right: 0.28in;">
                  <div class="notes-title">${fr ? "Conditions" : "Terms"}</div>
                  <div class="notes-body"><ul>${terms.map(s => `<li>${s}</li>`).join("")}</ul></div>
                </td>
                <td width="46%" valign="top">
                  <table class="totals" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr><td class="lab">${fr ? "Sous-total" : "Subtotal"}</td><td class="amt">${cad(t.subtotalCents, fr)}</td></tr>
                    ${t.discountCents ? `<tr><td class="lab">${fr ? "Rabais détaillant" : "Dealer discount"}</td><td class="amt">−${cad(t.discountCents, fr)}</td></tr>` : ""}
                    <tr><td class="lab">${fr ? "Livraison" : "Shipping"}</td><td class="amt">${t.freightCents ? cad(t.freightCents, fr) : (fr ? "Devis du détaillant" : "Quoted by dealer")}</td></tr>
                    ${taxRows}
                    <tr class="rule grand"><td class="lab">Total CAD</td><td class="amt">$${cad(t.totalCents, fr)}</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`
}
