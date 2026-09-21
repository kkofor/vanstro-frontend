import type { CheckoutSession } from "../../lib/api/api-contract.ts";
import { preservePaymentSessionAfterAccepted } from "./payment-accepted-state.ts";

type PaymentSessionUpdater = (
  update: (current: CheckoutSession | undefined) => CheckoutSession | undefined
) => void;

type ConfirmationStateOptions = {
  setSession: PaymentSessionUpdater;
  setActionMessage: (message: string) => void;
  setProcessing: (processing: boolean) => void;
  confirmationPendingMessage: string;
};

export function applyAcceptedPaymentConfirmation(options: ConfirmationStateOptions) {
  options.setActionMessage(options.confirmationPendingMessage);
  options.setSession(preservePaymentSessionAfterAccepted);
  options.setProcessing(false);
}
