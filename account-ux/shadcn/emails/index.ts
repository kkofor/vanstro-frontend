/**
 * Vanstro account emails — EN-CA / FR-CA.
 *
 *  verifyEmail      → after register / email change      (24 h link)
 *  welcome          → after verification succeeds        (WELCOME15 issued here, not at sign-up)
 *  resetPassword    → forgot-password                    (15 min, single-use link)
 *  passwordChanged  → after a successful reset           (security notice, "Not you? Freeze")
 *  orderConfirmation / invoice → see ./orders.ts        (sent from receipts@)
 *
 * All four are transactional under CASL: no unsubscribe link required, no promotional
 * content mixed in (the welcome offer is a one-time account benefit, not a campaign).
 */
import type { Locale, RenderedMail } from "../lib/mail"
import { button, esc, linkFallback, p, renderLayout, BRAND } from "./layout"

export { orderConfirmation, invoice } from "./orders"
export type { OrderConfirmationInput, InvoiceInput, OrderItem, OrderTotals, OrderAddress, OrderPayment } from "./orders"

function dt(locale: Locale, d: Date): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Winnipeg",
  }).format(d)
}

/* ------------------------------------------------------------------ verify */
export interface VerifyEmailInput {
  locale: Locale
  firstName?: string
  link: string
}

export function verifyEmail(i: VerifyEmailInput): RenderedMail {
  const fr = i.locale === "fr-CA"
  const hi = i.firstName ? (fr ? `Bonjour ${esc(i.firstName)},` : `Hi ${esc(i.firstName)},`) : (fr ? "Bonjour," : "Hi there,")
  const heading = fr ? "Confirmez votre adresse courriel" : "Confirm your email address"
  const subject = fr ? "Confirmez votre courriel pour activer votre compte Vanstro" : "Confirm your email to activate your Vanstro account"
  const cta = fr ? "Confirmer mon courriel" : "Confirm my email"

  const body =
    p(hi) +
    p(fr
      ? "Merci d’avoir créé un compte Vanstro. Cliquez sur le bouton ci-dessous pour confirmer cette adresse. Le lien est valide <strong>24 heures</strong>."
      : "Thanks for creating a Vanstro account. Click the button below to confirm this address. The link is valid for <strong>24 hours</strong>.") +
    button(cta, i.link) +
    linkFallback(i.locale, i.link) +
    p(fr
      ? "Vous pouvez déjà parcourir le catalogue et commander. L’enregistrement de modes de paiement et les avis produits seront débloqués après la confirmation."
      : "You can browse and order right away. Saving payment methods and writing reviews unlock after you confirm.", { muted: true, small: true })

  const text = `${hi.replace(/<[^>]+>/g, "")}

${fr
  ? "Merci d’avoir créé un compte Vanstro. Ouvrez ce lien pour confirmer votre adresse (valide 24 heures) :"
  : "Thanks for creating a Vanstro account. Open this link to confirm your address (valid 24 hours):"}
${i.link}

${fr
  ? "Vous pouvez déjà parcourir le catalogue et commander."
  : "You can browse and order right away."}`

  const footNote = fr
    ? "Vous n’avez pas créé de compte ? Ignorez simplement ce courriel — aucun compte ne sera activé."
    : "Didn’t create an account? Just ignore this email — nothing will be activated."

  const r = renderLayout({ locale: i.locale, preheader: subject, heading, body, text, footNote })
  return { subject, ...r }
}

/* ----------------------------------------------------------------- welcome */
export interface WelcomeInput {
  locale: Locale
  firstName: string
  offerCode?: string      // default WELCOME15
  offerPercent?: number   // default 15
  offerDays?: number      // default 30
  accountUrl: string
  shopUrl: string
}

export function welcome(i: WelcomeInput): RenderedMail {
  const fr = i.locale === "fr-CA"
  const code = i.offerCode ?? "WELCOME15"
  const pct = i.offerPercent ?? 15
  const days = i.offerDays ?? 30
  const heading = fr ? `Bienvenue, ${esc(i.firstName)}` : `Welcome, ${esc(i.firstName)}`
  const subject = fr ? `Votre compte Vanstro est prêt — ${pct} % sur votre première commande` : `Your Vanstro account is ready — ${pct}% off your first order`

  const offer = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;border:1px solid ${BRAND.rule};border-radius:10px;background:#fbf7f2">
  <tr>
    <td width="64" align="center" valign="middle" style="padding:16px 0 16px 16px">
      <div style="width:52px;height:52px;border-radius:10px;background:${BRAND.orange};color:#fff;font:800 16px/52px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;text-align:center">${pct}%</div>
    </td>
    <td style="padding:16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <div style="font-size:15px;font-weight:700;color:${BRAND.text};margin-bottom:4px">${fr ? `Offre de bienvenue : ${pct} % sur votre première commande` : `Welcome offer: ${pct}% off your first order`}</div>
      <div style="font-size:13px;color:${BRAND.muted}">${fr ? "Code" : "Code"} <code style="font:600 13px ui-monospace,Menlo,monospace;background:#fff;border:1px solid ${BRAND.rule};padding:2px 6px;border-radius:4px;color:${BRAND.text}">${code}</code> · ${fr ? `valide ${days} jours` : `valid ${days} days`}</div>
    </td>
  </tr>
</table>`

  const bullets = fr
    ? ["Suivez vos commandes et téléchargez vos factures", "Enregistrez des listes de projets et demandez des devis", "Gérez vos adresses de livraison partout au Canada"]
    : ["Track orders and download invoices", "Save project lists and request dealer quotes", "Manage shipping addresses across Canada"]

  const body =
    p(fr ? "Votre courriel est confirmé et votre compte est prêt." : "Your email is confirmed and your account is ready.") +
    offer +
    p(fr ? "Avec votre compte, vous pouvez :" : "With your account you can:") +
    `<ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.7;color:${BRAND.text}">${bullets.map(b => `<li>${b}</li>`).join("")}</ul>` +
    button(fr ? "Commencer mes achats" : "Start shopping", i.shopUrl) +
    p(`${fr ? "Ou allez à" : "Or go to"} <a href="${esc(i.accountUrl)}" style="color:${BRAND.navy}">${fr ? "votre compte" : "your account"}</a>.`, { muted: true, small: true })

  const text = `${fr ? "Votre courriel est confirmé et votre compte est prêt." : "Your email is confirmed and your account is ready."}

${fr ? `Offre de bienvenue : ${pct} % sur votre première commande. Code ${code}, valide ${days} jours.` : `Welcome offer: ${pct}% off your first order. Code ${code}, valid ${days} days.`}

${bullets.map(b => `• ${b}`).join("\n")}

${fr ? "Commencer mes achats" : "Start shopping"}: ${i.shopUrl}
${fr ? "Votre compte" : "Your account"}: ${i.accountUrl}`

  const r = renderLayout({ locale: i.locale, preheader: subject, heading, body, text })
  return { subject, ...r }
}

/* ------------------------------------------------------------------- reset */
export interface ResetPasswordInput {
  locale: Locale
  firstName?: string
  link: string
  requestedAt: Date
  /** e.g. "Winnipeg, MB · Chrome on macOS" — from IP + UA, best effort */
  requestContext?: string
}

export function resetPassword(i: ResetPasswordInput): RenderedMail {
  const fr = i.locale === "fr-CA"
  const hi = i.firstName ? (fr ? `Bonjour ${esc(i.firstName)},` : `Hi ${esc(i.firstName)},`) : (fr ? "Bonjour," : "Hi there,")
  const heading = fr ? "Réinitialisez votre mot de passe" : "Reset your password"
  const subject = fr ? "Réinitialisation de votre mot de passe Vanstro" : "Reset your Vanstro password"
  const cta = fr ? "Choisir un nouveau mot de passe" : "Choose a new password"
  const when = dt(i.locale, i.requestedAt)
  const ctx = i.requestContext ? ` · ${esc(i.requestContext)}` : ""

  const body =
    p(hi) +
    p(fr
      ? `Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Vanstro le <strong>${when}</strong>${ctx}.`
      : `We received a request to reset the password for your Vanstro account on <strong>${when}</strong>${ctx}.`) +
    button(cta, i.link) +
    p(fr
      ? "Ce lien est valide <strong>15 minutes</strong> et ne peut être utilisé qu’une seule fois."
      : "This link is valid for <strong>15 minutes</strong> and can only be used once.", { small: true }) +
    linkFallback(i.locale, i.link)

  const text = `${hi.replace(/<[^>]+>/g, "")}

${fr
  ? `Demande de réinitialisation reçue le ${when}${i.requestContext ? ` · ${i.requestContext}` : ""}.`
  : `Password reset requested on ${when}${i.requestContext ? ` · ${i.requestContext}` : ""}.`}

${fr ? "Choisir un nouveau mot de passe (valide 15 minutes, usage unique) :" : "Choose a new password (valid 15 minutes, single use):"}
${i.link}`

  const footNote = fr
    ? "Ce n’était pas vous ? Aucune action requise — votre mot de passe n’a pas changé et le lien expirera tout seul."
    : "Not you? No action needed — your password hasn’t changed and the link will expire on its own."

  const r = renderLayout({ locale: i.locale, preheader: subject, heading, body, text, footNote })
  return { subject, ...r }
}

/* --------------------------------------------------------- password changed */
export interface PasswordChangedInput {
  locale: Locale
  firstName?: string
  changedAt: Date
  context?: string          // "Winnipeg, MB · Chrome on macOS"
  signedOutOthers: boolean
  freezeUrl: string         // "Not you? Freeze account"
  supportUrl?: string
}

export function passwordChanged(i: PasswordChangedInput): RenderedMail {
  const fr = i.locale === "fr-CA"
  const hi = i.firstName ? (fr ? `Bonjour ${esc(i.firstName)},` : `Hi ${esc(i.firstName)},`) : (fr ? "Bonjour," : "Hi there,")
  const heading = fr ? "Votre mot de passe a été modifié" : "Your password was changed"
  const subject = fr ? "Alerte de sécurité : mot de passe Vanstro modifié" : "Security alert: your Vanstro password was changed"
  const when = dt(i.locale, i.changedAt)
  const ctx = i.context ? ` · ${esc(i.context)}` : ""

  const body =
    p(hi) +
    p(fr
      ? `Le mot de passe de votre compte Vanstro a été modifié le <strong>${when}</strong>${ctx}.`
      : `The password for your Vanstro account was changed on <strong>${when}</strong>${ctx}.`) +
    p(i.signedOutOthers
      ? (fr ? "Tous les autres appareils ont été déconnectés. Vous devrez vous reconnecter avec le nouveau mot de passe." : "All other devices were signed out. You’ll need to sign in again with the new password.")
      : (fr ? "Les autres appareils restent connectés." : "Other devices remain signed in."), { muted: true, small: true }) +
    p(fr ? "<strong>Si c’était vous</strong>, tout est en ordre — aucune action requise." : "<strong>If this was you</strong>, you’re all set — no action needed.") +
    p(fr
      ? "<strong>Si ce n’était pas vous</strong>, gelez votre compte immédiatement. La connexion sera bloquée et notre équipe vous contactera pour vérifier votre identité."
      : "<strong>If this wasn’t you</strong>, freeze your account immediately. Sign-in will be blocked and our team will contact you to verify your identity.") +
    button(fr ? "Ce n’était pas moi — geler mon compte" : "This wasn’t me — freeze my account", i.freezeUrl)

  const text = `${hi.replace(/<[^>]+>/g, "")}

${fr ? `Mot de passe modifié le ${when}${i.context ? ` · ${i.context}` : ""}.` : `Password changed on ${when}${i.context ? ` · ${i.context}` : ""}.`}
${i.signedOutOthers ? (fr ? "Tous les autres appareils ont été déconnectés." : "All other devices were signed out.") : (fr ? "Les autres appareils restent connectés." : "Other devices remain signed in.")}

${fr ? "Si c’était vous, aucune action requise." : "If this was you, no action needed."}
${fr ? "Si ce n’était pas vous, gelez votre compte :" : "If this wasn’t you, freeze your account:"}
${i.freezeUrl}`

  const footNote = fr
    ? `Questions ? Écrivez-nous à <a href="mailto:support@vanstro.ca" style="color:${BRAND.navy}">support@vanstro.ca</a>.`
    : `Questions? Email <a href="mailto:support@vanstro.ca" style="color:${BRAND.navy}">support@vanstro.ca</a>.`

  const r = renderLayout({ locale: i.locale, preheader: subject, heading, body, text, footNote })
  return { subject, ...r }
}

/* -------------------------------------------------------------- claim order */
export interface ClaimOrderInput {
  locale: Locale
  orderNo: string
  accountEmail: string
  link: string
}

export function claimOrder(i: ClaimOrderInput): RenderedMail {
  const fr = i.locale === "fr-CA"
  const heading = fr ? "Confirmer l’association de cette commande" : "Confirm attaching this order"
  const subject = fr
    ? `Quelqu’un demande d’associer la commande ${i.orderNo} à un compte Vanstro`
    : `Someone requested to attach order ${i.orderNo} to a Vanstro account`
  const cta = fr ? "Confirmer l’association" : "Confirm and attach this order"

  const body =
    p(fr
      ? `Une personne a demandé d’associer la commande <strong>${esc(i.orderNo)}</strong> au compte <strong>${esc(i.accountEmail)}</strong>.`
      : `Someone requested to attach order <strong>${esc(i.orderNo)}</strong> to the account <strong>${esc(i.accountEmail)}</strong>.`) +
    p(fr
      ? "Si c’était vous, cliquez sur le bouton ci-dessous. Le lien est valide <strong>30 minutes</strong> et ne peut être utilisé qu’une seule fois."
      : "If this was you, click the button below. The link is valid for <strong>30 minutes</strong> and can only be used once.") +
    button(cta, i.link) +
    linkFallback(i.locale, i.link)

  const text = fr
    ? `Une personne a demandé d’associer la commande ${i.orderNo} au compte ${i.accountEmail}.\n\nSi c’était vous, ouvrez ce lien (valide 30 minutes, usage unique) :\n${i.link}\n\nSi ce n’était pas vous, ignorez ce courriel — la commande ne sera pas déplacée.`
    : `Someone requested to attach order ${i.orderNo} to the account ${i.accountEmail}.\n\nIf this was you, open this link (valid 30 minutes, single use):\n${i.link}\n\nIf this wasn’t you, ignore this email — the order will not be moved.`

  const footNote = fr
    ? "Si ce n’était pas vous, ignorez simplement ce courriel. La commande restera telle quelle."
    : "If this wasn’t you, just ignore this email. The order will stay as it is."

  return { subject, ...renderLayout({ locale: i.locale, preheader: subject, heading, body, text, footNote }) }
}
