import type {
  PaymentProvider,
  PaymentInitiateInput,
  PaymentInitiateResult,
  PaymentRefundInput,
  PaymentRefundResult,
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

const ESELECTPLUS_HOST: Record<MonerisConfig["environment"], string> = {
  qa: "https://esqa.moneris.com",
  prod: "https://mpg1.moneris.io"
};

const ESELECTPLUS_PATH = "/gateway2/servlet/MpgRequest";

type MonerisResponseEnvelope = {
  response?: {
    success?: string;
    ticket?: string;
    receipt?: {
      result?: string;
      order_no?: string;
      txn_total?: string;
      cc?: { result?: { success?: string }; amount?: string };
      transaction_no?: string;
      txn_number?: string;
      txnNumber?: string;
      TxnNumber?: string;
      // Moneris receipt shapes vary across MCO revisions; unknown fields are retained.
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

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xmlValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]
    ?.replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .trim();
}

function approvedResponseCode(value: string | undefined) {
  if (!value || !/^\d{3}$/.test(value)) return false;
  return Number(value) < 50;
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
    return `${GATEWAY_HOST[this.config.environment]}/chktv2/request/request.php`;
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

  private async postRefund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    if (input.currency !== "CAD") {
      return { ok: false, reason: "Moneris Canada refunds require CAD.", retryable: false };
    }
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
      return { ok: false, reason: "Refund amount must be a positive integer number of cents.", retryable: false };
    }
    const statusCheck = input.statusCheck === true ? "true" : "false";
    const xml = `<?xml version="1.0" encoding="UTF-8"?><request>`
      + `<store_id>${xmlEscape(this.config.storeId)}</store_id>`
      + `<api_token>${xmlEscape(this.config.apiToken)}</api_token>`
      + `<status_check>${statusCheck}</status_check>`
      + `<refund>`
      + `<order_id>${xmlEscape(input.orderId)}</order_id>`
      + `<amount>${(input.amountCents / 100).toFixed(2)}</amount>`
      + `<txn_number>${xmlEscape(input.providerPaymentId)}</txn_number>`
      + `<crypt_type>7</crypt_type>`
      + `</refund></request>`;
    let response: Response;
    try {
      response = await this.fetchImpl(`${ESELECTPLUS_HOST[this.config.environment]}${ESELECTPLUS_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=UTF-8",
          "User-Agent": "VanStro-Moneris/1.0"
        },
        body: xml,
        signal: AbortSignal.timeout(35_000)
      });
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "Moneris refund request failed.",
        retryable: true
      };
    }
    if (!response.ok) {
      return { ok: false, reason: `Moneris refund gateway returned HTTP ${response.status}.`, retryable: true };
    }
    const responseXml = await response.text();
    const complete = xmlValue(responseXml, "Complete")?.toLowerCase();
    const responseCode = xmlValue(responseXml, "ResponseCode");
    const timedOut = xmlValue(responseXml, "TimedOut")?.toLowerCase();
    const providerRefundId = xmlValue(responseXml, "TxnNumber");
    const message = xmlValue(responseXml, "Message") ?? "Moneris refund was not approved.";
    if (complete === "true" && timedOut !== "true" && approvedResponseCode(responseCode) && providerRefundId) {
      return { ok: true, providerRefundId };
    }
    return {
      ok: false,
      reason: message,
      retryable: timedOut === "true" || complete !== "true" || !responseCode
    };
  }

  async initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    const body = await this.postAction({
      action: "preload",
      txn_total: (input.amountCents / 100).toFixed(2),
      txn_id: input.paymentSessionId,
      order_no: input.paymentSessionId,
      cust_id: input.email,
      language: "en"
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
    if (!receiptOrderNo) {
      return { ok: false, reason: "Moneris receipt order_no is required." };
    }
    if (receiptOrderNo !== input.paymentSessionId) {
      return { ok: false, reason: "Moneris receipt order_no does not match payment session." };
    }
    const paidCents = receiptAmountCents(receipt);
    if (paidCents === undefined) {
      return { ok: false, reason: "Moneris receipt amount is required." };
    }
    if (paidCents !== input.amountCents) {
      return { ok: false, reason: "Moneris receipt amount does not match payment session." };
    }
    const transactionNumber = [receipt?.transaction_no, receipt?.txn_number, receipt?.txnNumber, receipt?.TxnNumber]
      .find((value): value is string => typeof value === "string" && Boolean(value.trim()))
      ?.trim();
    if (!transactionNumber) {
      return { ok: false, reason: "Moneris receipt transaction number is required for settlement and refunds." };
    }
    return { ok: true, providerPaymentId: transactionNumber };
  }

  async refund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    const result = await this.postRefund(input);
    if (result.ok || !result.retryable || input.statusCheck) return result;
    return this.postRefund({ ...input, statusCheck: true });
  }
}
