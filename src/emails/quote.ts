import type { Locale, RenderedMail } from "../lib/mail"
import { COMPANY, esc, p, renderLayout } from "./layout"
import type { Quote } from "../lib/quotes"

function cad(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "CAD" }).format(cents / 100)
}
function dt(locale: Locale, iso: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "America/Winnipeg" }).format(new Date(iso))
}

export function quoteEmail(q: Quote): RenderedMail {
  const fr = q.locale === "fr-CA"
  const heading = fr ? `Devis ${esc(q.quoteNo)}` : `Quote ${esc(q.quoteNo)}`
  const testMark = /^TEST\b/i.test(q.project || "") ? "[TEST] " : ""
  const subject = testMark + (fr
    ? `Votre devis Vanstro ${q.quoteNo} — valable jusqu’au ${dt(q.locale, q.validUntil)}`
    : `Your Vanstro quote ${q.quoteNo} — valid until ${dt(q.locale, q.validUntil)}`)
  const d = q.dealer
  const rows = q.items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #dfe7e5;font:14px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f1a19">${esc(i.name)}${i.variant ? `<div style="color:#5f6f6d;font-size:12px">${esc(i.variant)}</div>` : ""}<div style="color:#5f6f6d;font-size:12px">${i.qty} × ${cad(i.unitCents, q.locale)}</div></td>
      <td style="padding:8px 0;border-bottom:1px solid #dfe7e5;text-align:right;font:14px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;white-space:nowrap">${cad(i.unitCents * i.qty, q.locale)}</td>
    </tr>`).join("")
  const body =
    p(fr
      ? `Voici le devis préparé par <strong>${esc(d.name)}</strong> pour ${esc(q.customer.name || q.customer.email)}. Il est valable jusqu’au <strong>${esc(dt(q.locale, q.validUntil))}</strong>. Un PDF est joint.`
      : `Here is the quote prepared by <strong>${esc(d.name)}</strong> for ${esc(q.customer.name || q.customer.email)}. It is valid until <strong>${esc(dt(q.locale, q.validUntil))}</strong>. A PDF is attached.`) +
    p(`<strong>${esc(q.quoteNo)}</strong> · ${esc(q.project)}`, { small: true, muted: true }) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">${rows}
      ${q.quote.discountCents ? `<tr><td style="padding:8px 0;color:#5f6f6d;font:14px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${fr ? "Rabais détaillant" : "Dealer discount"}</td><td style="padding:8px 0;text-align:right;color:#5f6f6d;font:14px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">−${cad(q.quote.discountCents, q.locale)}</td></tr>` : ""}
      <tr><td style="padding:12px 0;font:600 15px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${fr ? "Total (CAD, taxes comprises)" : "Total (CAD, taxes included)"}</td>
      <td style="padding:12px 0;text-align:right;font:600 15px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${cad(q.quote.totalCents, q.locale)}</td></tr>
    </table>` +
    p(fr
      ? `${esc(COMPANY.name)} est le vendeur des produits. ${esc(d.name)} est un détaillant indépendant : premier contact pour le ramassage, la coordination de livraison et le service après-vente.`
      : `${esc(COMPANY.name)} is the Seller of the products. ${esc(d.name)} is an independent local dealer — first contact for pickup, delivery coordination and after-sales.`, { muted: true, small: true })

  const text = `${fr ? "Devis" : "Quote"} ${q.quoteNo}
${d.name}
${fr ? "Valable jusqu’au" : "Valid until"} ${dt(q.locale, q.validUntil)}

${q.items.map(i => `${i.qty} × ${i.name} — ${cad(i.unitCents * i.qty, q.locale)}`).join("\n")}
${fr ? "Total" : "Total"}: ${cad(q.quote.totalCents, q.locale)}

${COMPANY.name} is the Seller. ${d.name} is the independent local dealer.`

  const r = renderLayout({ locale: q.locale, preheader: subject, heading, body, text })
  return { subject, ...r }
}
