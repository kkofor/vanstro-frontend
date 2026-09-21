import type { CheckoutSession } from "../../lib/api/api-contract.ts";

export function preservePaymentSessionAfterAccepted(current: CheckoutSession | undefined) {
  return current;
}
