/**
 * Shared shell for Vanstro transactional emails.
 * Table-based, inline styles only (Outlook-safe). Brand tokens mirror assets/vi.css:
 *   navy #004744 · orange #F28C28 · text #0f1a19 · muted #5f6f6d · rule #dfe7e5
 */
import type { Locale } from "../lib/mail"

export interface LayoutInput {
  locale: Locale
  preheader: string
  heading: string
  /** Inner HTML for the body (paragraphs, button, etc.). */
  body: string
  /** Plain-text fallback body. */
  text: string
  /** Optional line under the footer (e.g. "Not you? …"). */
  footNote?: string
}

export const BRAND = {
  navy: "#004744",
  navy700: "#00352f",
  orange: "#F28C28",
  text: "#0f1a19",
  muted: "#5f6f6d",
  rule: "#dfe7e5",
  bg: "#f4f6f6",
  /** Same asset the main site header uses (315×63, transparent). Rendered at 160×32. */
  logoUrl: "https://www.vanstro.ca/assets/vanstro-logo.png",
}

export const COMPANY = {
  name: "Vanstro Global Supply Inc.",
  address: "856 Century Street, Winnipeg, MB R3H 0M5",
  support: "support@vanstro.ca",
  phone: "204 221 2288",
  site: "https://www.vanstro.ca",
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function button(label: string, href: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
  <tr>
    <td bgcolor="${BRAND.navy}" style="border-radius:8px">
      <a href="${esc(href)}" target="_blank"
         style="display:inline-block;padding:14px 26px;font:600 15px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px;background:${BRAND.navy}">${esc(label)}</a>
    </td>
  </tr>
</table>`
}

export function p(html: string, opts: { muted?: boolean; small?: boolean } = {}): string {
  const color = opts.muted ? BRAND.muted : BRAND.text
  const size = opts.small ? "13px" : "15px"
  return `<p style="margin:0 0 14px;font-size:${size};line-height:1.55;color:${color}">${html}</p>`
}

export function linkFallback(locale: Locale, href: string): string {
  const label = locale === "fr-CA"
    ? "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :"
    : "If the button doesn’t work, copy this link into your browser:"
  return `${p(label, { muted: true, small: true })}
<p style="margin:0 0 18px;font-size:12px;line-height:1.5;word-break:break-all;color:${BRAND.muted}"><a href="${esc(href)}" style="color:${BRAND.navy}">${esc(href)}</a></p>`
}

export function renderLayout(i: LayoutInput): { html: string; text: string } {
  const fr = i.locale === "fr-CA"
  const footer = fr
    ? `${COMPANY.name} · ${COMPANY.address}<br>Ce courriel est transactionnel et concerne votre compte Vanstro. Besoin d’aide ? <a href="mailto:${COMPANY.support}" style="color:${BRAND.navy}">${COMPANY.support}</a> · ${COMPANY.phone}`
    : `${COMPANY.name} · ${COMPANY.address}<br>This is a transactional email about your Vanstro account. Need help? <a href="mailto:${COMPANY.support}" style="color:${BRAND.navy}">${COMPANY.support}</a> · ${COMPANY.phone}`

  const html = `<!doctype html>
<html lang="${fr ? "fr-CA" : "en-CA"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(i.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(i.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg}">
  <tr>
    <td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid ${BRAND.rule}">
        <tr>
          <td style="padding:28px 32px 0">
            <a href="${COMPANY.site}" target="_blank" style="text-decoration:none">
              <img src="${BRAND.logoUrl}" width="160" height="32" alt="Vanstro Global Supply" style="display:block;width:160px;height:32px;border:0;outline:none;font:700 16px/32px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.navy}">
            </a>
            <div style="height:3px;width:40px;background:${BRAND.orange};margin:14px 0 22px;border-radius:2px"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:700;color:${BRAND.text}">${esc(i.heading)}</h1>
            ${i.body}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 28px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
            <div style="height:1px;background:${BRAND.rule};margin:8px 0 18px"></div>
            ${i.footNote ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${BRAND.text}">${i.footNote}</p>` : ""}
            <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted}">${footer}</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font:12px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted}">
        <a href="${COMPANY.site}" style="color:${BRAND.muted}">vanstro.ca</a>
      </p>
    </td>
  </tr>
</table>
</body>
</html>`

  const textFooter = fr
    ? `${COMPANY.name} · ${COMPANY.address}\nCourriel transactionnel concernant votre compte Vanstro. Aide : ${COMPANY.support} · ${COMPANY.phone}`
    : `${COMPANY.name} · ${COMPANY.address}\nTransactional email about your Vanstro account. Help: ${COMPANY.support} · ${COMPANY.phone}`

  const text = `${i.heading}\n\n${i.text.trim()}\n\n${i.footNote ? stripTags(i.footNote) + "\n\n" : ""}${textFooter}\n`
  return { html, text }
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
}
