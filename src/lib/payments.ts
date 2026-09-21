/**
 * lib/payments.ts — the seam between orders and the payment provider.
 *
 * Orders never talk to Moneris directly; the routes call `paymentSession` (what the browser
 * needs to show the card inputs) and `chargeOrder` (server-to-server purchase with the
 * Hosted Tokenization temporary token). Both delegate to lib/moneris.ts.
 *
 * MONERIS_MOCK=1 runs the whole order → email → invoice pipeline without merchant
 * credentials: the browser's stand-in card box produces a `mock:<Brand>:<last4>` token and the
 * "issuer" approves everything except the prototype's decline PANs (…0002 → 076 insufficient
 * funds, …0069 → 051 expired card) and totals ending in .51 / .54 (Moneris penny rules).
 */
import { createPayment, hostedTokenization, isApproved, isPending, brandName, MonerisApiError, type MonerisEnv } from "./moneris"
import { orders, type Order, type PaymentRecord } from "./orders"
import { createHash, randomBytes } from "node:crypto"

export type PaymentMode = "live" | "mock"

export function paymentMode(): PaymentMode {
  return process.env.MONERIS_MOCK === "1" || process.env.MONERIS_MOCK === "true" ? "mock" : "live"
}

export interface PaymentSession {
  mode: PaymentMode
  env: MonerisEnv
  /** Hosted Tokenization frame; null in mock mode (the page renders its stand-in). */
  ht: { url: string; profileId: string } | null
  /** Pending orders are payable for 30 minutes, then swept to `expired`. */
  expiresAt: string
}

/** No network call: tells the browser how to render the card inputs for this order. */
export function paymentSession(order: Order): PaymentSession & { channel?: "ht" | "pos" } {
  const ttl = order.paymentMethod === "pos" ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000
  const expiresAt = new Date(Date.parse(order.createdAt) + ttl).toISOString()
  const { env, url, profileId } = hostedTokenization()
  if (order.paymentMethod === "pos") return { mode: paymentMode(), env, ht: null, expiresAt, channel: "pos" }
  if (paymentMode() === "mock") return { mode: "mock", env, ht: null, expiresAt, channel: "ht" }
  if (!profileId) throw new Error("MONERIS_HT_PROFILE_ID is not set (MRC → Admin → Hosted Tokenization).")
  return { mode: "live", env, ht: { url, profileId }, expiresAt, channel: "ht" }
}

export type Settlement =
  | { ok: true; payment: PaymentRecord }
  /** Declined (issuer code) or soft failure the customer can retry with a new token (`token_rejected`). */
  | { ok: false; code: string; message?: string }
  /** Moneris accepted the request but the outcome is not final. Never mark paid, never let the customer retry. */
  | { ok: false; pending: true; code: "payment_pending"; referenceNo: string; message?: string }
  /** Provider unreachable / 5xx / rate-limited / idempotency conflict. Nothing charged as far as we know. */
  | { ok: false; unavailable: true; code: "payment_unavailable"; message?: string }

export interface ChargeInput {
  /** Hosted Tokenization dataKey, or `mock:<Brand>:<last4>` in mock mode. */
  temporaryToken: string
  cardholderName?: string
  /** Overrides order.saveCard (the checkbox sits next to the card box, so it arrives with the token). */
  saveCard?: boolean
  ip?: string
  /** Mock only: wallet the prototype showed. */
  wallet?: "Apple Pay" | "Google Pay"
}

/**
 * Authoritative outcome for an order. Live: POST /payments with the temporary token, the
 * response is the receipt (the browser never decides "paid"). Mock: see module comment.
 */
export async function chargeOrder(order: Order, input: ChargeInput): Promise<Settlement> {
  const paidAt = new Date().toISOString()
  const saveCard = input.saveCard ?? order.saveCard

  // One attempt per temporary token (mock and live). Same token replays; a new token is
  // refused while a previous attempt is still unresolved.
  const tokenHash = createHash("sha256").update(input.temporaryToken).digest("hex")
  const attempt = await orders.beginPaymentAttempt(order.orderNo, tokenHash)

  if (paymentMode() === "mock") {
    const m = /^mock:([^:]*):(\d{4})$/.exec(input.temporaryToken)
    if (!m) {
      await orders.recordPaymentAttempt(order.orderNo, attempt.n, "error", "bad_token")
      return { ok: false, code: "bad_token", message: "Mock token must look like mock:Visa:4242" }
    }
    const [, brandRaw, last4] = m
    const cents = order.quote.totalCents % 100
    if (last4 === "0502") {
      await orders.recordPaymentAttempt(order.orderNo, attempt.n, "error", "network")
      return { ok: false, unavailable: true, code: "payment_unavailable", message: "mock provider down" }
    }
    if (cents === 51 || last4 === "0002") {
      await orders.recordPaymentAttempt(order.orderNo, attempt.n, "declined", "076")
      return { ok: false, code: "076" }
    }
    if (cents === 54 || last4 === "0069") {
      await orders.recordPaymentAttempt(order.orderNo, attempt.n, "declined", "051")
      return { ok: false, code: "051" }
    }
    await orders.recordPaymentAttempt(order.orderNo, attempt.n, "approved", "027")
    return {
      ok: true,
      payment: {
        provider: "moneris",
        method: order.paymentMethod,
        wallet: input.wallet,
        brand: brandRaw || "Visa",
        last4,
        authCode: String(100000 + Math.floor(Math.random() * 899999)),
        referenceNo: "pi_mock_" + randomBytes(6).toString("hex"),
        responseCode: "027",
        amountCents: order.quote.totalCents,
        paidAt,
        threeDS: false,
        vaultToken: saveCard ? "pm_mock_" + randomBytes(6).toString("hex") : undefined,
      },
    }
  }

  let p
  try {
    p = await createPayment({
      orderNo: attempt.n === 1 ? order.orderNo : `${order.orderNo}-${attempt.n}`,
      amountCents: order.quote.totalCents,
      temporaryToken: input.temporaryToken,
      store: saveCard,
      cardholderName: input.cardholderName,
      email: order.email,
      phone: order.phone ?? undefined, // → E.164 inside createPayment
      billing: { street: order.billing.street, unit: order.billing.unit, city: order.billing.city, province: order.billing.province, postalCode: order.billing.postalCode },
      ip: input.ip,
      idempotencyKey: attempt.idempotencyKey,
    })
  } catch (e) {
    if (e instanceof MonerisApiError) {
      // Issuer decline delivered as HTTP 400 DECLINED_ERROR ("076-… insufficient funds").
      const code = e.declineCode
      if (code) { await orders.recordPaymentAttempt(order.orderNo, attempt.n, "declined", code); return { ok: false, code, message: e.detail } }
      // Expired / already-used HT dataKey → customer re-enters the card; nothing charged.
      if (e.tokenRejected) { await orders.recordPaymentAttempt(order.orderNo, attempt.n, "error", "token_rejected"); return { ok: false, code: "token_rejected", message: e.message } }
      // Our bug (other validation) or the platform's problem (auth, idempotency, 429, 5xx): not the customer's card.
      await orders.recordPaymentAttempt(order.orderNo, attempt.n, "error", e.category ?? String(e.status))
      console.error(`[payments] ${order.orderNo} attempt ${attempt.n}: ${e.message}`)
      return { ok: false, unavailable: true, code: "payment_unavailable", message: e.message }
    }
    // fetch/network failure — we don't know whether Moneris saw it; the same token replays with the same key.
    await orders.recordPaymentAttempt(order.orderNo, attempt.n, "error", "network")
    return { ok: false, unavailable: true, code: "payment_unavailable", message: e instanceof Error ? e.message : String(e) }
  }

  const td = p.transactionDetails ?? {}
  if (isPending(p)) {
    await orders.recordPaymentAttempt(order.orderNo, attempt.n, "pending", p.paymentStatus)
    return { ok: false, pending: true, code: "payment_pending", referenceNo: p.paymentId, message: td.message }
  }
  if (!isApproved(p)) {
    const code = td.responseCode ?? "050"
    await orders.recordPaymentAttempt(order.orderNo, attempt.n, "declined", code)
    return { ok: false, code, message: td.message }
  }
  await orders.recordPaymentAttempt(order.orderNo, attempt.n, "approved", td.responseCode)

  const card = p.paymentMethod?.paymentMethodInformation?.cardInformation ?? {}
  const stored = p.paymentMethod?.paymentMethodInformation?.storePaymentMethod
  const eci = td.ecommerceIndicator ?? ""
  return {
    ok: true,
    payment: {
      provider: "moneris",
      method: order.paymentMethod,
      brand: brandName(card.cardBrand),
      last4: card.lastFour ?? "",
      authCode: td.authorizationCode,
      referenceNo: p.paymentId,
      responseCode: td.responseCode,
      amountCents: Number(p.amount?.amount ?? order.quote.totalCents),
      paidAt,
      threeDS: eci === "AUTHENTICATED_ECOMMERCE" && !!p.verificationDetails?.threeDSecureAuthenticationValueResultCode && !/NOT_PRESENT|FAILED/.test(p.verificationDetails.threeDSecureAuthenticationValueResultCode),
      vaultToken: stored && stored !== "DO_NOT_STORE" ? p.paymentMethod?.paymentMethodId : undefined,
    },
  }
}
