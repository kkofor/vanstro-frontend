import type {
  PaymentProvider,
  PaymentInitiateInput,
  PaymentInitiateResult,
  PaymentVerifyInput,
  PaymentVerifyResult
} from "./types.js";

export type MonerisConfig = {
  environment: "qa" | "prod";
  storeId: string;
  apiToken: string;
  checkoutId: string;
};

// Moneris Checkout (MCO) gateway hosts.
const GATEWAY_HOST: Record<MonerisConfig["environment"], string> = {
  qa: "https://gatewayt.moneris.com",
  prod: "https://gateway.moneris.com"
};

type MonerisResponseEnvelope = {
  response?: {
    success?: string;
    ticket?: string;
    receipt?: {
      result?: string;
      order_no?: string;
      txn_total?: string;
      cc?: { result?: { success?: string }; amount?: string };
      // Moneris receipt shapes vary; keep this permissive.
      [key: string]: unknown;
    };
  };
};

function receiptAmountCents(receipt: NonNullable<MonerisResponseEnvelope["response"]>["receipt"]) {
  const raw = receipt?.cc?.amount ?? receipt?.txn_total;
  if (raw === undefined || raw === null) return undefined;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.round(numeric * 100);
}

/**
 * Moneris Checkout provider. Wired but requires esqa (QA) or production credentials
 * to exercise. With no credentials it is never selected (local default is manual).
 *
 * initiate(): calls the MCO "preload" action to obtain a ticket the client renders.
 * verify(): calls the MCO "receipt" action to confirm the transaction succeeded.
 *
 * `fetchImpl` is injectable so unit tests can mock the gateway without network calls.
 */
export class MonerisPaymentProvider implements PaymentProvider {
  readonly name = "moneris" as const;

  constructor(
    private readonly config: MonerisConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private endpoint() {
    return `${GATEWAY_HOST[this.config.environment]}/chkt/request/request.php`;
  }

  private async postAction(payload: Record<string, unknown>): Promise<MonerisResponseEnvelope> {
    const response = await this.fetchImpl(this.endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: this.config.storeId,
        api_token: this.config.apiToken,
        checkout_id: this.config.checkoutId,
        environment: this.config.environment,
        ...payload
      }),
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`Moneris gateway returned HTTP ${response.status}.`);
    return (await response.json().catch(() => null)) as MonerisResponseEnvelope;
  }

  async initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    const body = await this.postAction({
      action: "preload",
      txn_total: (input.amountCents / 100).toFixed(2),
      order_no: input.paymentSessionId,
      cust_id: input.email
    });
    const ticket = body.response?.ticket;
    if (body.response?.success !== "true" || !ticket) {
      throw new Error("Moneris preload did not return a ticket.");
    }
    return { provider: this.name, ticket, providerRef: ticket };
  }

  async verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    if (!input.ticket) return { ok: false, reason: "Moneris ticket is required." };
    const body = await this.postAction({ action: "receipt", ticket: input.ticket });
    const receipt = body.response?.receipt;
    const success = receipt?.cc?.result?.success ?? receipt?.result;
    if (body.response?.success !== "true" || (success !== "true" && success !== "a")) {
      return { ok: false, reason: "Moneris receipt did not confirm a successful payment." };
    }
    const receiptOrderNo = typeof receipt?.order_no === "string" ? receipt.order_no.trim() : undefined;
    if (receiptOrderNo && receiptOrderNo !== input.paymentSessionId) {
      return { ok: false, reason: "Moneris receipt order_no does not match payment session." };
    }
    const paidCents = receiptAmountCents(receipt);
    if (paidCents !== undefined && paidCents !== input.amountCents) {
      return { ok: false, reason: "Moneris receipt amount does not match payment session." };
    }
    return { ok: true, providerPaymentId: input.providerPaymentId ?? input.ticket };
  }
}
