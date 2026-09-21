import assert from "node:assert/strict";
import test from "node:test";
import type { CheckoutSession } from "../../lib/api/api-contract.ts";
import { applyAcceptedPaymentConfirmation } from "./payment-confirmation-state.ts";

const pendingSession = {
  id: "session-1",
  status: "pending",
  fulfillment: "pickup",
  paymentMethod: "card",
  expiresAt: "2026-07-31T12:00:00.000Z",
  subtotal: { amount: 100, currency: "CAD" },
  tax: { amount: 12, currency: "CAD" },
  shipping: { amount: 0, currency: "CAD" },
  total: { amount: 112, currency: "CAD" },
  guestOrderToken: "token"
} satisfies CheckoutSession;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function renderPaymentState(session: CheckoutSession | undefined) {
  if (!session) return "missing";
  if (session.status === "paid") return `paid:${session.orderId ?? ""}`;
  return `${session.status}:${session.orderId ?? ""}`;
}

test("deferred accepted response preserves authoritative UI state without restarting polling", async () => {
  for (const status of [
    "paid",
    "reconciliation_required",
    "refund_processing",
    "refunded"
  ] as const) {
    const confirm = deferred<{ accepted: true }>();
    let current: CheckoutSession | undefined = pendingSession;
    let actionMessage = "";
    let processing = true;
    const pollerStarts = 1;
    const requests = 2;
    const finishConfirm = confirm.promise.then(() => {
      applyAcceptedPaymentConfirmation({
        setSession: (update) => {
          current = update(current);
        },
        setActionMessage: (message) => {
          actionMessage = message;
        },
        setProcessing: (nextProcessing) => {
          processing = nextProcessing;
        },
        confirmationPendingMessage: "Confirmation is processing."
      });
    });

    current = { ...pendingSession, status, orderId: "order-1" };
    const authoritativeView = renderPaymentState(current);
    confirm.resolve({ accepted: true });
    await finishConfirm;

    assert.equal(current.status, status);
    assert.equal(current.orderId, "order-1");
    assert.equal(renderPaymentState(current), authoritativeView);
    assert.equal(actionMessage, "Confirmation is processing.");
    assert.equal(processing, false);
    assert.equal(pollerStarts, 1);
    assert.equal(requests, 2);
  }
});
