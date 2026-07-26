ALTER TABLE "payment_sessions"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "requestHash" TEXT;

CREATE UNIQUE INDEX "payment_sessions_idempotencyKey_key"
  ON "payment_sessions"("idempotencyKey");
