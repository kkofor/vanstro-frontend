import assert from "node:assert/strict";
import test from "node:test";
import { VanstroApiError } from "../../lib/api/api-client.ts";
import { ApiValidationError } from "../../lib/api/runtime-validation.ts";
import type { CheckoutSession } from "../../lib/api/api-contract.ts";
import {
  PAYMENT_SESSION_POLLABLE_STATUSES,
  PAYMENT_SESSION_TERMINAL_STATUSES,
  PaymentSessionPoller,
  paymentTerminalAnnouncement
} from "./payment-session-poller.ts";

const pendingSession = {
  id: "session-1",
  status: "pending",
  fulfillment: "pickup",
  paymentMethod: "pos",
  expiresAt: "2026-07-31T12:00:00.000Z",
  subtotal: { amount: 100, currency: "CAD" },
  tax: { amount: 12, currency: "CAD" },
  shipping: { amount: 0, currency: "CAD" },
  total: { amount: 112, currency: "CAD" },
  guestOrderToken: "token"
} satisfies CheckoutSession;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createHarness(load: () => Promise<CheckoutSession>) {
  const timers = new Map<number, () => void>();
  const delays: number[] = [];
  const sessions: CheckoutSession[] = [];
  const errors: Array<{ error: unknown; retrying: boolean }> = [];
  let timerId = 0;
  const poller = new PaymentSessionPoller({
    load,
    onSession: (session) => sessions.push(session),
    onError: (error, retrying) => errors.push({ error, retrying }),
    setTimer: (callback, delay) => {
      const id = ++timerId;
      timers.set(id, callback);
      delays.push(delay);
      return id;
    },
    clearTimer: (id) => {
      timers.delete(id);
    }
  });
  return {
    poller,
    timers,
    delays,
    sessions,
    errors,
    runTimer: async () => {
      const entry = timers.entries().next().value as [number, () => void] | undefined;
      assert.ok(entry);
      timers.delete(entry[0]);
      entry[1]();
      await Promise.resolve();
      await Promise.resolve();
    }
  };
}

function apiError(status: number, code: "PAYMENT_SESSION_DENIED" | "PAYMENT_SESSION_NOT_FOUND") {
  return new VanstroApiError({ status, code, message: code });
}

test("403 and 404 payment session errors stop automatic polling", async () => {
  for (const error of [apiError(403, "PAYMENT_SESSION_DENIED"), apiError(404, "PAYMENT_SESSION_NOT_FOUND")]) {
    let requests = 0;
    const harness = createHarness(async () => {
      requests += 1;
      throw error;
    });
    harness.poller.start();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(requests, 1);
    assert.equal(harness.timers.size, 0);
    assert.equal(harness.errors[0]?.retrying, false);
  }
});

test("permanent errors stay stopped across visibility changes until explicit retry", async () => {
  let requests = 0;
  const harness = createHarness(async () => {
    requests += 1;
    throw apiError(403, "PAYMENT_SESSION_DENIED");
  });
  harness.poller.start();
  await Promise.resolve();
  await Promise.resolve();
  harness.poller.setVisible(false);
  harness.poller.setVisible(true);
  await Promise.resolve();
  assert.equal(requests, 1);
  harness.poller.retry();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(requests, 2);
});

test("malformed payment response stops automatic polling", async () => {
  const harness = createHarness(async () => {
    throw new ApiValidationError("response.data must be valid");
  });
  harness.poller.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(harness.timers.size, 0);
  assert.equal(harness.errors[0]?.retrying, false);
});

test("transient errors use bounded backoff and recover to pending cadence", async () => {
  let requests = 0;
  const harness = createHarness(async () => {
    requests += 1;
    if (requests <= 2) throw new TypeError("network unavailable");
    return pendingSession;
  });
  harness.poller.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(harness.delays, [5_000]);
  await harness.runTimer();
  assert.deepEqual(harness.delays, [5_000, 10_000]);
  await harness.runTimer();
  assert.deepEqual(harness.delays, [5_000, 10_000, 5_000]);
  assert.equal(harness.sessions.length, 1);
});

test("visibility changes preserve transient retry budget and delay", async () => {
  let requests = 0;
  const harness = createHarness(async () => {
    requests += 1;
    throw new TypeError("offline");
  });
  harness.poller.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(harness.delays, [5_000]);
  harness.poller.setVisible(false);
  harness.poller.setVisible(true);
  assert.equal(requests, 1);
  assert.deepEqual(harness.delays, [5_000, 5_000]);
  await harness.runTimer();
  assert.equal(requests, 2);
  assert.equal(harness.delays.at(-1), 10_000);
});

test("transient retries stop after the bounded retry budget", async () => {
  let requests = 0;
  const harness = createHarness(async () => {
    requests += 1;
    throw new TypeError("offline");
  });
  harness.poller.start();
  await Promise.resolve();
  await Promise.resolve();
  await harness.runTimer();
  await harness.runTimer();
  await harness.runTimer();
  assert.equal(requests, 4);
  assert.deepEqual(harness.delays, [5_000, 10_000, 20_000]);
  assert.equal(harness.timers.size, 0);
  assert.equal(harness.errors.at(-1)?.retrying, false);
});

test("explicit retry and visibility changes preserve one request chain", async () => {
  const first = deferred<CheckoutSession>();
  const second = deferred<CheckoutSession>();
  let requests = 0;
  const harness = createHarness(() => {
    requests += 1;
    return requests === 1 ? first.promise : second.promise;
  });
  harness.poller.start();
  harness.poller.retry();
  harness.poller.retry();
  harness.poller.setVisible(false);
  harness.poller.setVisible(true);
  assert.equal(requests, 1);
  first.resolve(pendingSession);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(requests, 2);
  assert.equal(harness.timers.size, 0);
  second.resolve(pendingSession);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(harness.timers.size, 1);
});

test("pollable payment lifecycle states continue until the expected terminal status", async () => {
  const transitions: Array<[CheckoutSession["status"], CheckoutSession["status"]]> = [
    ["reconciliation_required", "paid"],
    ["refund_pending", "refund_processing"],
    ["refund_processing", "refunded"],
    ["refund_processing", "refund_failed"],
    ["refund_failed", "refund_pending"]
  ];

  for (const [from, to] of transitions) {
    let requests = 0;
    const harness = createHarness(async () => {
      requests += 1;
      return { ...pendingSession, status: requests === 1 ? from : to };
    });

    harness.poller.start();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(requests, 1, `${from} should complete its first request`);
    assert.equal(harness.timers.size, 1, `${from} should schedule another poll`);
    await harness.runTimer();
    assert.equal(requests, 2, `${from} should be able to evolve to ${to}`);

    if (PAYMENT_SESSION_TERMINAL_STATUSES.includes(to as (typeof PAYMENT_SESSION_TERMINAL_STATUSES)[number])) {
      assert.equal(harness.timers.size, 0, `${to} should stop polling`);
    } else {
      assert.equal(harness.timers.size, 1, `${to} should remain pollable`);
    }
    harness.poller.stop();
  }
});

test("each terminal payment status stops timers and visibility reentry", async () => {
  for (const status of PAYMENT_SESSION_TERMINAL_STATUSES) {
    let requests = 0;
    const harness = createHarness(async () => {
      requests += 1;
      return { ...pendingSession, status };
    });

    harness.poller.start();
    await Promise.resolve();
    await Promise.resolve();
    harness.poller.setVisible(false);
    harness.poller.setVisible(true);
    await Promise.resolve();
    assert.equal(requests, 1, `${status} should remain stopped`);
    assert.equal(harness.timers.size, 0, `${status} should not retain a timer`);
  }
});

test("payment lifecycle classifications are complete, disjoint and contract constrained", () => {
  assert.deepEqual(PAYMENT_SESSION_POLLABLE_STATUSES, [
    "pending",
    "reconciliation_required",
    "refund_pending",
    "refund_processing",
    "refund_failed"
  ]);
  assert.deepEqual(PAYMENT_SESSION_TERMINAL_STATUSES, ["paid", "failed", "expired", "refunded"]);
  assert.equal(
    new Set([...PAYMENT_SESSION_POLLABLE_STATUSES, ...PAYMENT_SESSION_TERMINAL_STATUSES]).size,
    9
  );
});

test("pollable lifecycle visibility changes preserve one request chain", async () => {
  const first = deferred<CheckoutSession>();
  const second = deferred<CheckoutSession>();
  let requests = 0;
  const harness = createHarness(() => {
    requests += 1;
    return requests === 1 ? first.promise : second.promise;
  });

  harness.poller.start();
  harness.poller.setVisible(false);
  harness.poller.setVisible(true);
  assert.equal(requests, 1);
  first.resolve({ ...pendingSession, status: "refund_processing" });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(requests, 1);
  assert.equal(harness.timers.size, 1);

  harness.poller.setVisible(false);
  harness.poller.setVisible(true);
  assert.equal(requests, 2);
  assert.equal(harness.timers.size, 0);
  second.resolve({ ...pendingSession, status: "refunded" });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(requests, 2);
  assert.equal(harness.timers.size, 0);
});

test("queued retry is discarded when the in-flight response is terminal", async () => {
  const first = deferred<CheckoutSession>();
  let requests = 0;
  const harness = createHarness(() => {
    requests += 1;
    return first.promise;
  });
  harness.poller.start();
  harness.poller.retry();
  first.resolve({ ...pendingSession, status: "expired" });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(requests, 1);
  assert.equal(harness.timers.size, 0);
});

test("terminal session consumer cannot synchronously restart polling", async () => {
  let requests = 0;
  let poller!: PaymentSessionPoller;
  poller = new PaymentSessionPoller({
    load: async () => {
      requests += 1;
      return { ...pendingSession, status: "paid" };
    },
    onSession: () => poller.retry(),
    onError: () => undefined,
    setTimer: () => 1,
    clearTimer: () => undefined
  });
  poller.start();
  await Promise.resolve();
  await Promise.resolve();
  poller.stop();
  assert.equal(requests, 1);
});

test("terminal response stays stopped when the session consumer throws", async () => {
  const first = deferred<CheckoutSession>();
  let requests = 0;
  const timers = new Map<number, () => void>();
  const poller = new PaymentSessionPoller({
    load: () => {
      requests += 1;
      return first.promise;
    },
    onSession: () => {
      throw new Error("consumer render failure");
    },
    onError: () => undefined,
    setTimer: (callback) => {
      timers.set(1, callback);
      return 1;
    },
    clearTimer: (id) => timers.delete(id)
  });
  poller.start();
  poller.retry();
  first.resolve({ ...pendingSession, status: "failed" });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(requests, 1);
  assert.equal(timers.size, 0);
  poller.setVisible(false);
  poller.setVisible(true);
  assert.equal(requests, 1);
});

test("successful pending polls report session-load recovery through onSession", async () => {
  const events: string[] = [];
  let requests = 0;
  const poller = new PaymentSessionPoller({
    load: async () => {
      requests += 1;
      if (requests === 1) throw new TypeError("offline");
      return pendingSession;
    },
    onSession: () => events.push("session-load-recovered"),
    onError: () => events.push("session-load-error"),
    setTimer: (callback) => {
      queueMicrotask(callback);
      return 1;
    },
    clearTimer: () => undefined
  });
  poller.start();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(events, ["session-load-error", "session-load-recovered"]);
  poller.stop();
});

test("terminal responses stay stopped across visibility changes", async () => {
  let requests = 0;
  const harness = createHarness(async () => {
    requests += 1;
    return { ...pendingSession, status: "expired" };
  });
  harness.poller.start();
  await Promise.resolve();
  await Promise.resolve();
  harness.poller.setVisible(false);
  harness.poller.setVisible(true);
  await Promise.resolve();
  assert.equal(requests, 1);
  assert.equal(harness.timers.size, 0);
});

test("terminal announcements are localized for pending to expired or failed", () => {
  assert.equal(
    paymentTerminalAnnouncement("en-CA", "expired"),
    "The payment session expired. Return to checkout to check inventory again."
  );
  assert.equal(
    paymentTerminalAnnouncement("fr-CA", "expired"),
    "La séance de paiement a expiré. Retournez à la caisse pour vérifier le stock de nouveau."
  );
  assert.equal(
    paymentTerminalAnnouncement("en-CA", "failed"),
    "Payment could not be prepared. Return to checkout to try again."
  );
  assert.equal(
    paymentTerminalAnnouncement("fr-CA", "failed"),
    "Le paiement n’a pas pu être préparé. Retournez à la caisse pour réessayer."
  );
  assert.equal(paymentTerminalAnnouncement("en-CA", "pending"), "");
});
