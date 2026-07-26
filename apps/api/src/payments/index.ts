import { ManualPaymentProvider } from "./manual.js";
import { MonerisPaymentProvider, type MonerisConfig } from "./moneris.js";
import type { PaymentProvider } from "./types.js";

export * from "./types.js";
export { ManualPaymentProvider } from "./manual.js";
export { MonerisPaymentProvider } from "./moneris.js";

export type CheckoutPaymentMethod = "card" | "pos" | "cash";

function readMonerisConfig(env: NodeJS.ProcessEnv): MonerisConfig | undefined {
  const environment = env.MONERIS_ENVIRONMENT?.trim().toLowerCase() === "prod" ? "prod" : "qa";
  const storeId = env.MONERIS_STORE_ID?.trim();
  const apiToken = env.MONERIS_API_TOKEN?.trim();
  const checkoutId = env.MONERIS_CHECKOUT_ID?.trim();
  if (!storeId || !apiToken || !checkoutId) return undefined;
  return { environment, storeId, apiToken, checkoutId };
}

let cachedManual: ManualPaymentProvider | undefined;
let cachedMoneris: MonerisPaymentProvider | undefined;

function getManualProvider(env: NodeJS.ProcessEnv = process.env): ManualPaymentProvider {
  if (cachedManual) return cachedManual;
  const secret = env.PAYMENT_CALLBACK_SECRET?.trim();
  if (!secret) throw new Error("PAYMENT_CALLBACK_SECRET is required for the manual payment provider.");
  cachedManual = new ManualPaymentProvider(secret);
  return cachedManual;
}

function getMonerisProvider(env: NodeJS.ProcessEnv = process.env): MonerisPaymentProvider {
  if (cachedMoneris) return cachedMoneris;
  const config = readMonerisConfig(env);
  if (!config) {
    throw new Error("Moneris credentials are not configured.");
  }
  cachedMoneris = new MonerisPaymentProvider(config);
  return cachedMoneris;
}

export function isMonerisConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(readMonerisConfig(env));
}

/** Resolve the payment provider for a checkout session payment method. */
export function resolvePaymentProvider(
  paymentMethod: CheckoutPaymentMethod,
  env: NodeJS.ProcessEnv = process.env
): PaymentProvider {
  if (paymentMethod === "card") return getMonerisProvider(env);
  return getManualProvider(env);
}

/**
 * @deprecated Use resolvePaymentProvider for checkout flows.
 * Kept for backward compatibility in environments that still set PAYMENT_PROVIDER.
 */
export function getPaymentProvider(env: NodeJS.ProcessEnv = process.env): PaymentProvider {
  const raw = env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (raw === "moneris") return getMonerisProvider(env);
  return getManualProvider(env);
}

/** Test helper to reset cached providers between cases. */
export function resetPaymentProviderCache() {
  cachedManual = undefined;
  cachedMoneris = undefined;
}
