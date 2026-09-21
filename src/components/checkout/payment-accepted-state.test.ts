import assert from "node:assert/strict";
import test from "node:test";
import {
  CHECKOUT_SESSION_STATUSES,
  type CheckoutSession
} from "../../lib/api/api-contract.ts";
import { preservePaymentSessionAfterAccepted } from "./payment-accepted-state.ts";

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

test("accepted confirmation preserves every shared payment session status", () => {
  for (const status of CHECKOUT_SESSION_STATUSES) {
    const current = { ...pendingSession, status };
    assert.equal(preservePaymentSessionAfterAccepted(current), current);
    assert.equal(preservePaymentSessionAfterAccepted(current)?.status, status);
  }
  assert.equal(preservePaymentSessionAfterAccepted(undefined), undefined);
});

test("deferred accepted confirmation cannot overwrite a newer authoritative status", async () => {
  for (const status of [
    "paid",
    "reconciliation_required",
    "refund_processing",
    "refunded"
  ] as const) {
    const confirm = deferred<{ accepted: true }>();
    let current: CheckoutSession | undefined = pendingSession;
    const finishConfirm = confirm.promise.then(() => {
      current = preservePaymentSessionAfterAccepted(current);
    });

    current = { ...pendingSession, status, orderId: status === "paid" ? "order-1" : undefined };
    confirm.resolve({ accepted: true });
    await finishConfirm;

    assert.equal(current.status, status);
    assert.equal(current.orderId, status === "paid" ? "order-1" : undefined);
  }
});
