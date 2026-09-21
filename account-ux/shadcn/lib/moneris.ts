/**
 * Moneris server helpers — REST API (Developer Portal) + Hosted Tokenization.
 *
 * Card capture: Hosted Tokenization (HT). The card number / expiry / CVV inputs live in a
 * small Moneris-hosted iframe styled with our CSS, so the page looks like our own form while
 * the PAN never touches Vanstro (PCI SAQ A). On "Pay" the page asks the frame to tokenize
 * and receives a temporary token (`dataKey`, single use, minutes).
 *
 * Charge: server-to-server POST /payments with paymentMethodSource TEMPORARY_TOKEN, OAuth
 * client-credentials bearer. Credentials never leave the server.
 *
 * Env:
 *   MONERIS_ENV            qa | prod                (sandbox api.sb.moneris.io / api.moneris.io)
 *   MONERIS_MERCHANT_ID    13-digit MID             (X-Merchant-Id header)
 *   MONERIS_CLIENT_ID / MONERIS_CLIENT_SECRET       Developer Portal → OAuth client
 *   MONERIS_HT_PROFILE_ID  MRC → Admin → Hosted Tokenization → profile for this site's origin
 */
import { isIP } from "node:net"

export type MonerisEnv = "qa" | "prod"

const API: Record<MonerisEnv, string> = {
  qa: "https://api.sb.moneris.io",
  prod: "https://api.moneris.io",
}
/** Hosted Tokenization frame. The `id` query param is the HT profile; the profile pins the parent page origin. */
export const HT_URL: Record<MonerisEnv, string> = {
  qa: "https://esqa.moneris.com/HPPtoken/index.php",
  prod: "https://www3.moneris.com/HPPtoken/index.php",
}
const API_VERSION = "2024-09-17"

export function monerisEnv(): MonerisEnv {
  return process.env.MONERIS_ENV === "prod" ? "prod" : "qa"
}

function creds() {
  const merchantId = process.env.MONERIS_MERCHANT_ID
  const clientId = process.env.MONERIS_CLIENT_ID
  const clientSecret = process.env.MONERIS_CLIENT_SECRET
  if (!merchantId || !clientId || !clientSecret) {
    throw new Error("Moneris credentials missing (MONERIS_MERCHANT_ID, MONERIS_CLIENT_ID, MONERIS_CLIENT_SECRET).")
  }
  return { merchantId, clientId, clientSecret, env: monerisEnv() }
}

/** What the browser needs to render the card inputs. `profileId` null → HT not configured yet. */
export function hostedTokenization(): { env: MonerisEnv; url: string; profileId: string | null } {
  const env = monerisEnv()
  return { env, url: HT_URL[env], profileId: process.env.MONERIS_HT_PROFILE_ID || null }
}

/* ------------------------------------------------------------------ OAuth */

let tokenCache: { value: string; expiresAt: number } | null = null

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value
  const { clientId, clientSecret, env } = creds()
  const res = await fetch(`${API[env]}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope: "payment.write" }),
  })
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: string | number; error?: string }
  if (!res.ok || !data.access_token) throw new Error(`Moneris OAuth failed: HTTP ${res.status} ${data.error ?? ""}`.trim())
  tokenCache = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000 }
  return tokenCache.value
}

/* ------------------------------------------------------------------ /payments */

export interface MonerisBillingAddress {
  street: string
  unit?: string
  city: string
  province: string
  postalCode: string
}

export interface CreatePaymentInput {
  orderNo: string
  amountCents: number
  /** Hosted Tokenization dataKey (single use). */
  temporaryToken: string
  /** Store as a permanent Moneris payment method (customer asked to save the card). */
  store: boolean
  cardholderName?: string
  email?: string
  phone?: string
  billing?: MonerisBillingAddress
  /** Customer IP for the issuer's risk scoring. */
  ip?: string
  /** Idempotency key: same value on a retry returns the original result instead of charging twice. */
  idempotencyKey: string
}

export interface MonerisPayment {
  paymentId: string
  orderId: string
  paymentStatus: "CANCELED" | "DECLINED" | "DECLINED_RETRY" | "AUTHORIZED" | "PROCESSING" | "SUCCEEDED" | "INCREMENTED" | "PARTIALLY_COMPLETED"
  amount: { amount: number; currency: string }
  paymentMethod?: {
    paymentMethodId?: string
    paymentMethodInformation?: {
      storePaymentMethod?: string
      cardInformation?: { bankIdentificationNumber?: string; lastFour?: string; cardBrand?: string; cardType?: string }
    }
  }
  transactionDetails?: { responseCode?: string; isoResponseCode?: string; authorizationCode?: string; message?: string; transactionUniqueId?: string; ecommerceIndicator?: string }
  verificationDetails?: { cardSecurityCodeResultCode?: string; threeDSecureAuthenticationValueResultCode?: string; addressVerificationServiceResultCode?: string }
}

/** Moneris problem-details categories we branch on (others are passed through). */
export type MonerisErrorCategory =
  | "DECLINED_ERROR" | "INVALID_REQUEST_ERROR" | "UNAUTHORIZED_ERROR" | "IDEMPOTENCY_ERROR" | "RATE_LIMIT_ERROR" | "API_ERROR" | string

export class MonerisApiError extends Error {
  readonly category: MonerisErrorCategory | undefined
  readonly detail: string | undefined
  readonly errors: { parameterName?: string; errorMessage?: string }[]
  constructor(public status: number, public body: unknown) {
    const b = (body ?? {}) as { category?: string; detail?: string; title?: string; errors?: { parameterName?: string; errorMessage?: string }[] }
    super(`Moneris /payments HTTP ${status}${b.category ? ` ${b.category}` : ""}: ${b.detail ?? b.title ?? ""}${b.errors?.length ? " · " + b.errors.map(e => `${e.parameterName}: ${e.errorMessage}`).join("; ") : ""}`.trim())
    this.category = b.category
    this.detail = b.detail
    this.errors = b.errors ?? []
  }
  /** Issuer decline delivered as HTTP 400 DECLINED_ERROR: `detail` starts with the 3-digit response code ("052-38 - PIN retries exceeded"). */
  get declineCode(): string | undefined {
    if (this.category !== "DECLINED_ERROR") return undefined
    return /^(\d{3})/.exec(this.detail ?? "")?.[1]
  }
  /** Validation error naming the temporary token → the HT dataKey was expired / already used. */
  get tokenRejected(): boolean {
    return this.category === "INVALID_REQUEST_ERROR" && this.errors.some(e => /temporaryToken/i.test(e.parameterName ?? ""))
  }
}

function splitStreet(street: string): { streetNumber?: string; streetName: string } {
  const m = /^\s*(\d+[A-Za-z]?)\s+(.+)$/.exec(street)
  return m ? { streetNumber: m[1], streetName: m[2] } : { streetName: street }
}

/**
 * Purchase (authorize + capture) with a Hosted Tokenization temporary token.
 * Resolves with Moneris' payment object for both approvals and declines (declines are HTTP 201
 * with paymentStatus DECLINED); throws MonerisApiError on 4xx/5xx (bad token, auth, validation).
 */
export async function createPayment(input: CreatePaymentInput): Promise<MonerisPayment> {
  const { merchantId, env } = creds()
  const paymentMethod: Record<string, unknown> = {
    paymentMethodSource: "TEMPORARY_TOKEN",
    temporaryToken: input.temporaryToken,
    storePaymentMethod: input.store ? "CARDHOLDER_INITIATED" : "DO_NOT_STORE",
  }
  if (input.store) paymentMethod.credentialOnFileInformation = { paymentIndicator: "UNSCHEDULED_CREDENTIAL_ON_FILE", paymentInformation: "FIRST" }
  if (input.cardholderName) paymentMethod.cardholderInformation = { cardholderName: input.cardholderName.slice(0, 60) }
  // contactDetails.phoneNumber must be E.164 (^\+[1-9]\d{1,14}$); our contactSchema stores 10 national digits.
  const phone = input.phone ? toE164(input.phone) : undefined
  if (input.email || phone) paymentMethod.contactDetails = { email: input.email, phoneNumber: phone }
  if (input.billing) {
    paymentMethod.billingAddress = { ...splitStreet(input.billing.street), unitNumber: input.billing.unit, city: input.billing.city, province: input.billing.province, postalCode: input.billing.postalCode.replace(/\s+/g, ""), country: "CA" }
  }
  if (input.idempotencyKey.length > 36) throw new Error("Moneris idempotencyKey must be ≤ 36 characters")
  const body: Record<string, unknown> = {
    idempotencyKey: input.idempotencyKey,
    // Moneris: no two Purchases may share an orderId → callers pass a per-attempt suffix (see lib/payments.ts).
    orderId: input.orderNo.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 50),
    amount: { amount: input.amountCents, currency: "CAD" },
    paymentMethod,
    // No 3-D Secure step in this flow yet (see docs/05-checkout.md → 3DS).
    ecommerceIndicator: "NON_AUTHENTICATED_ECOMMERCE",
    automaticCapture: true,
    dynamicDescriptor: "VANSTRO",
  }
  if (input.ip) {
    const v = isIP(input.ip)
    if (v === 4) body.ipv4 = input.ip
    else if (v === 6) body.ipv6 = input.ip
  }

  const send = async () => {
    const token = await accessToken()
    return fetch(`${API[env]}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Api-Version": API_VERSION,
        "X-Merchant-Id": merchantId,
        "X-Correlation-Id": input.idempotencyKey,
      },
      body: JSON.stringify(body),
    })
  }
  let res = await send()
  if (res.status === 401) {
    // Cached bearer revoked/expired early → drop it and retry once. Safe: same idempotencyKey.
    tokenCache = null
    res = await send()
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new MonerisApiError(res.status, data)
  return data as MonerisPayment
}

/** 10 national digits → +1XXXXXXXXXX; already-E.164 values pass through; anything else is dropped. */
export function toE164(phone: string): string | undefined {
  const digits = phone.replace(/[^\d+]/g, "")
  if (/^\+[1-9]\d{1,14}$/.test(digits)) return digits
  if (/^[2-9]\d{9}$/.test(digits)) return `+1${digits}`
  if (/^1[2-9]\d{9}$/.test(digits)) return `+${digits}`
  return undefined
}

/**
 * Only SUCCEEDED is money in the bank for a Purchase (automaticCapture: true). AUTHORIZED
 * without capture would never settle and PROCESSING is not final — neither may mark the order paid.
 */
export function isApproved(p: MonerisPayment): boolean {
  return p.paymentStatus === "SUCCEEDED"
}

/** Moneris is still working on it (async issuer / network) — not a decline, not a receipt. */
export function isPending(p: MonerisPayment): boolean {
  return p.paymentStatus === "PROCESSING" || p.paymentStatus === "AUTHORIZED"
}

/** Moneris cardBrand → display name used in emails / invoice. */
export function brandName(brand?: string): string {
  switch ((brand ?? "").toUpperCase()) {
    case "VISA": return "Visa"
    case "MASTERCARD": return "Mastercard"
    case "AMEX": case "AMERICAN_EXPRESS": return "Amex"
    case "DISCOVER": return "Discover"
    case "DINERS": case "DINERS_CLUB": return "Diners"
    case "JCB": return "JCB"
    case "INTERAC": return "Interac"
    case "": return "Card"
    default: return (brand as string)[0] + (brand as string).slice(1).toLowerCase()
  }
}
