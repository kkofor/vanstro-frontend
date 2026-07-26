ALTER TABLE "orders"
  ADD COLUMN "guestTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "guestTokenRevokedAt" TIMESTAMP(3);

UPDATE "orders"
SET "guestTokenExpiresAt" = "createdAt" + INTERVAL '30 days'
WHERE "userId" IS NULL;

CREATE INDEX "orders_guestTokenExpiresAt_idx"
  ON "orders"("guestTokenExpiresAt");
