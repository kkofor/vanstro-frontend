/**
 * Dealer-facing email — "New paid order to coordinate".
 *
 * Sent to the selected independent local dealer from receipts@mail.vanstro.ca the moment
 * the Moneris receipt is approved. It is the dealer's order sheet for pickup / delivery
 * coordination and after-sales, so it carries only what fulfilment needs (PIPEDA
 * minimisation): customer name, contact, ship-to, items, delivery method, order value.
 * Never card data, never the customer's consents or IP.
 *
 * Language follows the dealer's province (QC → fr-CA), not the customer's locale.
 */
import type { RenderedMail, Locale } from "../lib/mail"
import { esc, p, renderLayout, BRAND, COMPANY } from "./layout"
import type { DealerSnapshot } from "../lib/dealers"
import type { OrderItem, OrderAddress } from "./orders"

export interface DealerNewOrderInput {
  dealer: DealerSnapshot
  orderNo: string
  paidAt: Date
  customer: { name: string; email: string; phone?: string | null }
  shipTo: OrderAddress
  items: OrderItem[]
  totalCents: number
  delivery: { method: "freight" | "white" | "pickup"; labelEn: string; labelFr: string }
  notes?: string | null
  /** Where the dealer can see the order sheet (dealer portal / account). */
  orderUrl?: string
}

const FONT = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"

function cad(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "CAD" }).format(cents / 100)
}
function when(d: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "America/Winnipeg" }).format(d)
}
function addr(a: OrderAddress) {
  return [a.name, a.company, `${a.unit ? a.unit + "–" : ""}${a.street}`, `${a.city}, ${a.province} ${a.postalCode}`].filter((x): x is string => !!x)
}
function row(k: string, v: string) {
  return `<tr><td style="padding:6px 12px 6px 0;font:13px ${FONT};color:${BRAND.muted};white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font:14px/1.45 ${FONT};color:${BRAND.text}">${v}</td></tr>`
}

export function dealerNewOrder(i: DealerNewOrderInput): RenderedMail {
  const locale: Locale = i.dealer.province === "QC" ? "fr-CA" : "en-CA"
  const fr = locale === "fr-CA"
  const deliveryLabel = fr ? i.delivery.labelFr : i.delivery.labelEn
  const pickup = i.delivery.method === "pickup"

  const itemsHtml = i.items.map(it => `<tr>
    <td style="padding:8px 0;border-bottom:1px solid ${BRAND.rule};font:14px/1.4 ${FONT};color:${BRAND.text}">${esc(it.name)}${it.variant ? `<div style="font-size:12px;color:${BRAND.muted}">${esc(it.variant)}</div>` : ""}<div style="font-size:12px;color:${BRAND.muted}">SKU ${esc(it.sku)}</div></td>
    <td align="right" style="padding:8px 0;border-bottom:1px solid ${BRAND.rule};font:600 14px ${FONT};color:${BRAND.text};white-space:nowrap">× ${it.qty}</td>
  </tr>`).join("")

  const action = pickup
    ? (fr ? `Préparez la commande pour le ramassage et avisez le client par courriel lorsqu’elle est prête.` : `Prepare the order for pickup and email the customer when it is ready.`)
    : (fr ? `Communiquez avec le client pour planifier la livraison (${deliveryLabel.toLowerCase()}).` : `Contact the customer to schedule delivery (${deliveryLabel.toLowerCase()}).`)

  const body = `
${p(fr
  ? `Un client de votre secteur vient de payer la commande <b>${esc(i.orderNo)}</b> sur vanstro.ca. Vous êtes le détaillant local de cette commande : premier contact pour le ramassage, la coordination de la livraison, les retours et le service après-vente.`
  : `A customer in your area just paid order <b>${esc(i.orderNo)}</b> on vanstro.ca. You are the local dealer on this order: first contact for pickup, delivery coordination, returns and after-sales help.`)}
${p(`<b>${esc(fr ? "À faire" : "Action")}:</b> ${esc(action)}`)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px">
  ${row(fr ? "Commande" : "Order", `<b>${esc(i.orderNo)}</b> · ${esc(when(i.paidAt, locale))}`)}
  ${row(fr ? "Livraison" : "Delivery", esc(deliveryLabel))}
  ${row(fr ? "Client" : "Customer", `${esc(i.customer.name)}<br><a href="mailto:${esc(i.customer.email)}" style="color:${BRAND.navy}">${esc(i.customer.email)}</a>${i.customer.phone ? `<br>${esc(i.customer.phone)}` : ""}`)}
  ${row(fr ? "Adresse" : "Ship to", addr(i.shipTo).map(esc).join("<br>"))}
  ${i.notes ? row(fr ? "Notes" : "Notes", esc(i.notes)) : ""}
  ${row(fr ? "Valeur" : "Order value", esc(cad(i.totalCents, locale)) + ` <span style="color:${BRAND.muted}">(${fr ? "payée à Vanstro" : "paid to Vanstro"})</span>`)}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><th align="left" style="padding:0 0 6px;font:600 11px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};border-bottom:2px solid ${BRAND.rule}">${fr ? "Article" : "Item"}</th><th align="right" style="padding:0 0 6px;font:600 11px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};border-bottom:2px solid ${BRAND.rule}">${fr ? "Qté" : "Qty"}</th></tr>
  ${itemsHtml}
</table>
${p(fr
  ? `Le vendeur des produits est ${COMPANY.name}; la facture fiscale est émise par Vanstro. Les services du détaillant (installation, mesure, etc.) sont convenus, facturés et perçus par vous, séparément de cette commande.`
  : `${COMPANY.name} is the Seller of the products and issues the tax invoice. Dealer Services (installation, measurement, etc.) are agreed, invoiced and collected by you, separately from this order.`, { muted: true, small: true })}
${p(fr
  ? `Questions sur la commande : <a href="mailto:${COMPANY.support}" style="color:${BRAND.navy}">${COMPANY.support}</a> · ${COMPANY.phone}. Ces renseignements client servent uniquement à exécuter la commande.`
  : `Order questions: <a href="mailto:${COMPANY.support}" style="color:${BRAND.navy}">${COMPANY.support}</a> · ${COMPANY.phone}. Customer details are provided only to fulfil this order.`, { muted: true, small: true })}`

  const text = [
    fr ? `Nouvelle commande payée ${i.orderNo} — ${when(i.paidAt, locale)}` : `New paid order ${i.orderNo} — ${when(i.paidAt, locale)}`,
    "",
    `${fr ? "À faire" : "Action"}: ${action}`,
    `${fr ? "Livraison" : "Delivery"}: ${deliveryLabel}`,
    `${fr ? "Client" : "Customer"}: ${i.customer.name} · ${i.customer.email}${i.customer.phone ? " · " + i.customer.phone : ""}`,
    `${fr ? "Adresse" : "Ship to"}: ${addr(i.shipTo).join(", ")}`,
    i.notes ? `Notes: ${i.notes}` : "",
    `${fr ? "Valeur" : "Order value"}: ${cad(i.totalCents, locale)} (${fr ? "payée à Vanstro" : "paid to Vanstro"})`,
    "",
    ...i.items.map(it => `- ${it.qty} × ${it.name} (${it.sku})`),
    "",
    fr ? `Vendeur : ${COMPANY.name}. Services du détaillant facturés séparément par vous.` : `Seller: ${COMPANY.name}. Dealer Services are invoiced separately by you.`,
    `${COMPANY.support} · ${COMPANY.phone}`,
  ].filter(l => l !== "").join("\n")

  const subject = fr
    ? `Nouvelle commande à coordonner · ${i.orderNo} · ${pickup ? "Ramassage" : "Livraison"}`
    : `New order to coordinate · ${i.orderNo} · ${pickup ? "Pickup" : "Delivery"}`

  const rendered = renderLayout({
    locale,
    preheader: fr ? `${i.customer.name} · ${deliveryLabel} · ${cad(i.totalCents, locale)}` : `${i.customer.name} · ${deliveryLabel} · ${cad(i.totalCents, locale)}`,
    heading: fr ? `Nouvelle commande payée : ${i.orderNo}` : `New paid order: ${i.orderNo}`,
    body,
    text,
    footNote: fr ? `Envoyé à ${i.dealer.name} (${i.dealer.code}), détaillant participant Vanstro.` : `Sent to ${i.dealer.name} (${i.dealer.code}), participating Vanstro dealer.`,
  })
  return { subject, ...rendered }
}
