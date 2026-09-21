/**
 * Transactional mail via Azure Communication Services Email.
 *
 * Resource: acs-vanstro-ca (data location: Canada), domain mail.vanstro.ca.
 * Senders:  no-reply@mail.vanstro.ca  (account mail)   → EMAIL_FROM
 *           receipts@mail.vanstro.ca  (order receipts) → RECEIPT_FROM
 * Reply-To always points at the real support inbox so customer replies land in M365.
 * The visible "From" name is configured on the ACS sender username (Azure portal /
 * `az communication email domain sender-username update --display-name`), currently
 * "Vanstro Global Supply" for both usernames; the SDK only takes the address.
 *
 * Env:
 *   AZURE_COMMUNICATION_CONNECTION_STRING
 *   EMAIL_FROM        = Vanstro Global Supply <no-reply@mail.vanstro.ca>
 *   RECEIPT_FROM      = Vanstro Global Supply <receipts@mail.vanstro.ca>
 *   EMAIL_REPLY_TO    = support@vanstro.ca
 *
 * ACS quota (custom domain, default): 30 msg/min, 100 msg/hour per subscription.
 * 429s carry Retry-After; we honour it up to MAX_RETRIES then surface the error so
 * the caller can queue instead of failing the user-facing request.
 */
import { EmailClient, type EmailMessage } from "@azure/communication-email"

export type Locale = "en-CA" | "fr-CA"

export interface RenderedMail {
  subject: string
  html: string
  text: string
}

export interface SendInput extends RenderedMail {
  to: string
  /** "account" → no-reply@, "receipt" → receipts@ */
  channel?: "account" | "receipt"
  /** Free-form tag for delivery-report correlation (shows up in Event Grid payload). */
  tag?: string
  /** e.g. the invoice PDF. ACS limit: 10 MB total per message. */
  attachments?: MailAttachment[]
}

export interface MailAttachment {
  name: string          // "Vanstro-Invoice-VS-2026-004821.pdf"
  contentType: string   // "application/pdf"
  content: Buffer | Uint8Array
}

export interface SendResult {
  id: string
  sentAt: string
}

const MAX_RETRIES = 3

let client: EmailClient | null = null
function getClient(): EmailClient {
  if (client) return client
  const cs = process.env.AZURE_COMMUNICATION_CONNECTION_STRING
  if (!cs) throw new Error("AZURE_COMMUNICATION_CONNECTION_STRING is not set")
  client = new EmailClient(cs)
  return client
}

function parseAddress(v: string | undefined, fallback: string): { address: string; displayName?: string } {
  const raw = (v ?? fallback).trim()
  const m = raw.match(/^(.*?)\s*<([^>]+)>$/)
  if (m) return { displayName: m[1].replace(/^"|"$/g, "").trim() || undefined, address: m[2].trim() }
  return { address: raw }
}

function senderFor(channel: SendInput["channel"]): string {
  const from = channel === "receipt"
    ? parseAddress(process.env.RECEIPT_FROM, "Vanstro Global Supply <receipts@mail.vanstro.ca>")
    : parseAddress(process.env.EMAIL_FROM, "Vanstro Global Supply <no-reply@mail.vanstro.ca>")
  return from.address
}

function replyTo(): { address: string }[] {
  const a = parseAddress(process.env.EMAIL_REPLY_TO, "support@vanstro.ca")
  return [{ address: a.address }]
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function retryAfterMs(err: unknown, attempt: number): number {
  const anyErr = err as { statusCode?: number; response?: { headers?: { get?: (k: string) => string | undefined } } }
  const hdr = anyErr?.response?.headers?.get?.("retry-after")
  const secs = hdr ? Number(hdr) : NaN
  if (Number.isFinite(secs) && secs > 0) return secs * 1000
  return 500 * 2 ** attempt // 0.5s, 1s, 2s
}

function isRetryable(err: unknown): boolean {
  const code = (err as { statusCode?: number })?.statusCode
  return code === 429 || (typeof code === "number" && code >= 500)
}

/**
 * Sends one message. Resolves once ACS reports the message as accepted for delivery
 * (Succeeded). Throws on permanent failure or after exhausting retries.
 */
export async function sendMail(input: SendInput): Promise<SendResult> {
  // MAIL_DRY_RUN=1: log instead of sending (dev / CI). MAIL_REDIRECT_TO=x@y: send everything there.
  if (process.env.MAIL_DRY_RUN === "1") {
    console.log(`[mail dry-run] ${input.channel ?? "account"} → ${input.to} · ${input.subject}${input.attachments?.length ? ` (+${input.attachments.length} attachment)` : ""}`)
    return { id: "dry-run", sentAt: new Date().toISOString() }
  }
  const to = process.env.MAIL_REDIRECT_TO || input.to
  const message: EmailMessage = {
    senderAddress: senderFor(input.channel),
    replyTo: replyTo(),
    recipients: { to: [{ address: to }] },
    content: { subject: input.subject, html: input.html, plainText: input.text },
    headers: input.tag ? { "X-Vanstro-Tag": input.tag } : undefined,
    attachments: input.attachments?.map(a => ({
      name: a.name,
      contentType: a.contentType,
      contentInBase64: Buffer.from(a.content).toString("base64"),
    })),
  }

  let attempt = 0
  for (;;) {
    try {
      const poller = await getClient().beginSend(message)
      const res = await poller.pollUntilDone()
      if (res.status !== "Succeeded") {
        throw Object.assign(new Error(`ACS send failed: ${res.status} ${res.error?.message ?? ""}`), { statusCode: 502 })
      }
      return { id: res.id, sentAt: new Date().toISOString() }
    } catch (err) {
      if (!isRetryable(err) || attempt >= MAX_RETRIES) throw err
      await sleep(retryAfterMs(err, attempt))
      attempt++
    }
  }
}

/** Mask for UI: g•••••n@gmail.com */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@")
  if (!domain) return email
  if (user.length <= 2) return `${user[0] ?? ""}•@${domain}`
  return `${user[0]}${"•".repeat(Math.min(5, user.length - 2))}${user[user.length - 1]}@${domain}`
}
