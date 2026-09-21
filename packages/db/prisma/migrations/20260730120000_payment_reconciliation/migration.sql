ALTER TYPE "PaymentSessionStatus" ADD VALUE IF NOT EXISTS 'reconciliation_required';
ALTER TYPE "PaymentSessionStatus" ADD VALUE IF NOT EXISTS 'refund_pending';
ALTER TYPE "PaymentSessionStatus" ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE "PaymentSessionStatus" ADD VALUE IF NOT EXISTS 'refund_failed';

CREATE TYPE "PaymentEventType" AS ENUM (
  'provider_confirmed',
  'order_created',
  'reconciliation_required',
  'refund_requested',
  'refunded',
  'refund_failed'
);

CREATE TABLE "payment_events" (
  "id" TEXT NOT NULL,
  "paymentSessionId" TEXT NOT NULL,
  "type" "PaymentEventType" NOT NULL,
  "providerEventId" TEXT,
  "amountCents" INTEGER,
  "currency" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_events_paymentSessionId_type_providerEventId_key"
  ON "payment_events"("paymentSessionId", "type", "providerEventId");
CREATE INDEX "payment_events_type_createdAt_idx"
  ON "payment_events"("type", "createdAt");

ALTER TABLE "payment_events"
  ADD CONSTRAINT "payment_events_paymentSessionId_fkey"
  FOREIGN KEY ("paymentSessionId") REFERENCES "payment_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
