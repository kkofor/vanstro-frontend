import { ManualPaymentProvider } from "./manual.js";
import { MonerisPaymentProvider, type MonerisConfig } from "./moneris.js";
import type { PaymentProvider, PaymentProviderName } from "./types.js";

export * from "./types.js";
export { ManualPaymentProvider } from "./manual.js";
export { MonerisPaymentProvider } from "./moneris.js";

function readProviderName(env: NodeJS.ProcessEnv): PaymentProviderName {
  const raw = env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === "manual") return "manual";
  if (raw === "moneris") return "moneris";
  throw new Error("PAYMENT_PROVIDER must be either manual or moneris.");
}

function readMonerisConfig(env: NodeJS.ProcessEnv): MonerisConfig {
  const environment = env.MONERIS_ENVIRONMENT?.trim().toLowerCase() === "prod" ? "prod" : "qa";
  const storeId = env.MONERIS_STORE_ID?.trim();
  const apiToken = env.MONERIS_API_TOKEN?.trim();
  const checkoutId = env.MONERIS_CHECKOUT_ID?.trim();
  if (!storeId || !apiToken || !checkoutId) {
    throw new Error(
      "PAYMENT_PROVIDER=moneris requires MONERIS_STORE_ID, MONERIS_API_TOKEN and MONERIS_CHECKOUT_ID."
    );
  }
  return { environment, storeId, apiToken, checkoutId };
}

let cached: PaymentProvider | undefined;

/** Resolve the configured payment provider. Cached after first construction. */
export function getPaymentProvider(env: NodeJS.ProcessEnv = process.env): PaymentProvider {
  if (cached) return cached;
  const name = readProviderName(env);
  if (name === "moneris") {
    cached = new MonerisPaymentProvider(readMonerisConfig(env));
  } else {
    const secret = env.PAYMENT_CALLBACK_SECRET?.trim();
    if (!secret) throw new Error("PAYMENT_CALLBACK_SECRET is required for the manual payment provider.");
    cached = new ManualPaymentProvider(secret);
  }
  return cached;
}

/** Test helper to reset the cached provider between cases. */
export function resetPaymentProviderCache() {
  cached = undefined;
}
