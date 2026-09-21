import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentProvider,
  PaymentInitiateInput,
  PaymentInitiateResult,
  PaymentVerifyInput,
  PaymentVerifyResult
} from "./types.js";

function callbackSignature(secret: string, sessionId: string, providerPaymentId: string) {
  return createHmac("sha256", secret).update(`${sessionId}:${providerPaymentId}`).digest("hex");
}

function signaturesMatch(expected: string | undefined, actual: string | undefined) {
  if (!expected || !actual || expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

/**
 * Manual/POS provider. Payment is settled out of band (in-store POS or cash) and
 * confirmed via an HMAC-signed callback. This is the local default so end-to-end
 * checkout works without a real payment gateway.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual" as const;

  constructor(private readonly callbackSecret: string) {}

  async initiate(_input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    return { provider: this.name };
  }

  async verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    if (!input.providerPaymentId) return { ok: false, reason: "providerPaymentId is required." };
    const expected = callbackSignature(this.callbackSecret, input.paymentSessionId, input.providerPaymentId);
    if (!signaturesMatch(expected, input.signature)) return { ok: false, reason: "Payment signature is invalid." };
    return { ok: true, providerPaymentId: input.providerPaymentId };
  }
}
