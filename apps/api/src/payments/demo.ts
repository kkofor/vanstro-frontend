import { randomBytes } from "node:crypto";
import type { PaymentProvider, PaymentInitiateInput, PaymentInitiateResult, PaymentVerifyInput, PaymentVerifyResult } from "./types.js";

export class DemoCardPaymentProvider implements PaymentProvider {
  readonly name = "demo" as const;

  async initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    const ticket = `demo_${input.paymentSessionId}_${randomBytes(8).toString("hex")}`;
    return {
      provider: "demo",
      ticket,
      providerRef: ticket,
      paymentUrl: `/checkout/payment?demoTicket=${encodeURIComponent(ticket)}`,
      demo: true
    };
  }

  async verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    if (!input.ticket?.startsWith(`demo_${input.paymentSessionId}_`)) {
      return { ok: false, reason: "Demo payment ticket does not match the payment session." };
    }
    return { ok: true, providerPaymentId: input.ticket };
  }
}
