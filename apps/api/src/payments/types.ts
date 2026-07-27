export type PaymentProviderName = "manual" | "moneris" | "demo";

export type PaymentInitiateInput = {
  paymentSessionId: string;
  amountCents: number;
  currency: string;
  email: string;
  /** Optional URLs the client may return to after a hosted payment flow. */
  returnUrl?: string;
  cancelUrl?: string;
};

export type PaymentInitiateResult = {
  provider: PaymentProviderName;
  /** Opaque handoff for hosted providers. Null for manual/POS (settled out of band). */
  paymentUrl?: string;
  /** Provider ticket/token (e.g. Moneris Checkout ticket) for client-side SDKs. */
  ticket?: string;
  /** Provider-side reference id, when known at initiation. */
  providerRef?: string;
  demo?: boolean;
};

export type PaymentVerifyInput = {
  paymentSessionId: string;
  amountCents: number;
  currency: string;
  /** Raw fields from the incoming callback/webhook body. */
  providerPaymentId?: string;
  ticket?: string;
  /** Signature header value, for HMAC-style providers (manual). */
  signature?: string;
};

export type PaymentVerifyResult =
  | { ok: true; providerPaymentId: string }
  | { ok: false; reason: string };

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** Called during checkout session creation. Must not throw for well-formed input when configured. */
  initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult>;
  /** Called by the payment callback route to authenticate and confirm a paid event. */
  verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult>;
}
