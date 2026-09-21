import {
  CHECKOUT_SESSION_STATUSES,
  type CheckoutSession,
  type CheckoutSessionStatus
} from "../../lib/api/api-contract.ts";
import { VanstroApiError } from "../../lib/api/api-client.ts";
import { ApiValidationError } from "../../lib/api/runtime-validation.ts";
import type { SiteLocale } from "../../lib/i18n/locale.ts";

const TRANSIENT_RETRY_DELAYS = [5_000, 10_000, 20_000] as const;
const SESSION_POLL_DELAY = 5_000;

export const PAYMENT_SESSION_POLLABLE_STATUSES = [
  "pending",
  "reconciliation_required",
  "refund_pending",
  "refund_processing",
  "refund_failed"
] as const satisfies readonly CheckoutSessionStatus[];

export const PAYMENT_SESSION_TERMINAL_STATUSES = [
  "paid",
  "failed",
  "expired",
  "refunded"
] as const satisfies readonly CheckoutSessionStatus[];

type StatusCoverage = Exclude<
  CheckoutSessionStatus,
  (typeof PAYMENT_SESSION_POLLABLE_STATUSES)[number] | (typeof PAYMENT_SESSION_TERMINAL_STATUSES)[number]
>;
const STATUS_COVERAGE: StatusCoverage extends never ? true : never = true;
void STATUS_COVERAGE;

const pollableStatuses = new Set<CheckoutSessionStatus>(PAYMENT_SESSION_POLLABLE_STATUSES);
const terminalStatuses = new Set<CheckoutSessionStatus>(PAYMENT_SESSION_TERMINAL_STATUSES);

if (
  CHECKOUT_SESSION_STATUSES.some(
    (status) => Number(pollableStatuses.has(status)) + Number(terminalStatuses.has(status)) !== 1
  )
) {
  throw new Error("Payment session polling status classification must be complete and disjoint.");
}

export function isPaymentSessionPollable(status: CheckoutSessionStatus) {
  return pollableStatuses.has(status);
}

export function isPaymentSessionTerminal(status: CheckoutSessionStatus) {
  return terminalStatuses.has(status);
}

type PollerOptions = {
  load: () => Promise<CheckoutSession>;
  onSession: (session: CheckoutSession) => void;
  onError: (error: unknown, retrying: boolean) => void;
  setTimer?: (callback: () => void, delay: number) => number;
  clearTimer?: (timer: number) => void;
};

export function shouldRetryPaymentSessionError(error: unknown) {
  if (error instanceof ApiValidationError) return false;
  if (error instanceof VanstroApiError) {
    if (error.status === 403 || error.status === 404) return false;
    return error.status >= 500;
  }
  return true;
}

export function paymentTerminalAnnouncement(
  locale: SiteLocale,
  status: CheckoutSession["status"]
) {
  if (status === "expired") {
    return locale === "fr-CA"
      ? "La séance de paiement a expiré. Retournez à la caisse pour vérifier le stock de nouveau."
      : "The payment session expired. Return to checkout to check inventory again.";
  }
  if (status === "failed") {
    return locale === "fr-CA"
      ? "Le paiement n’a pas pu être préparé. Retournez à la caisse pour réessayer."
      : "Payment could not be prepared. Return to checkout to try again.";
  }
  return "";
}

export class PaymentSessionPoller {
  private active = false;
  private visible = true;
  private inFlight = false;
  private retryAfterFlight = false;
  private timer: number | undefined;
  private transientFailures = 0;
  private stoppedByError = false;
  private completed = false;
  private readonly options: PollerOptions;
  private readonly setTimer: NonNullable<PollerOptions["setTimer"]>;
  private readonly clearTimer: NonNullable<PollerOptions["clearTimer"]>;

  constructor(options: PollerOptions) {
    this.options = options;
    this.setTimer = options.setTimer ?? ((callback, delay) => window.setTimeout(callback, delay));
    this.clearTimer = options.clearTimer ?? ((timer) => window.clearTimeout(timer));
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.request();
  }

  stop() {
    this.active = false;
    this.retryAfterFlight = false;
    this.cancelTimer();
  }

  retry() {
    if (!this.active) return;
    this.cancelTimer();
    if (this.inFlight) {
      this.retryAfterFlight = true;
      return;
    }
    this.stoppedByError = false;
    this.completed = false;
    this.transientFailures = 0;
    this.request();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) {
      this.cancelTimer();
      return;
    }
    if (this.stoppedByError || this.completed || this.inFlight) return;
    if (this.transientFailures > 0) {
      this.schedule(TRANSIENT_RETRY_DELAYS[this.transientFailures - 1]);
      return;
    }
    this.request();
  }

  private cancelTimer() {
    if (this.timer === undefined) return;
    this.clearTimer(this.timer);
    this.timer = undefined;
  }

  private schedule(delay: number) {
    if (!this.active || !this.visible) return;
    this.cancelTimer();
    this.timer = this.setTimer(() => {
      this.timer = undefined;
      this.request();
    }, delay);
  }

  private async request() {
    if (!this.active || !this.visible || this.inFlight || this.completed || this.stoppedByError) return;
    this.inFlight = true;
    let nextDelay: number | undefined;
    try {
      const session = await this.options.load();
      if (!this.active) return;
      this.stoppedByError = false;
      this.transientFailures = 0;
      this.completed = isPaymentSessionTerminal(session.status);
      if (isPaymentSessionPollable(session.status)) nextDelay = SESSION_POLL_DELAY;
      try {
        this.options.onSession(session);
      } catch {
        nextDelay = undefined;
        this.stoppedByError = true;
      }
    } catch (error) {
      if (!this.active) return;
      const retryable = shouldRetryPaymentSessionError(error);
      if (retryable && this.transientFailures < TRANSIENT_RETRY_DELAYS.length) {
        nextDelay = TRANSIENT_RETRY_DELAYS[this.transientFailures];
        this.transientFailures += 1;
      }
      this.stoppedByError = nextDelay === undefined;
      this.options.onError(error, nextDelay !== undefined);
    } finally {
      this.inFlight = false;
      if (!this.active) return;
      if (this.retryAfterFlight) {
        this.retryAfterFlight = false;
        if (!this.completed && !this.stoppedByError) this.request();
      } else if (nextDelay !== undefined) {
        this.schedule(nextDelay);
      }
    }
  }
}
