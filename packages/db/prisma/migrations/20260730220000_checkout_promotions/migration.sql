ALTER TABLE "promotions"
  ADD COLUMN "discountPercent" INTEGER,
  ADD COLUMN "minimumSubtotalCents" INTEGER;
ALTER TABLE "promotions"
  ADD CONSTRAINT "promotions_discount_percent_check"
  CHECK ("discountPercent" IS NULL OR ("discountPercent" >= 1 AND "discountPercent" <= 90));
ALTER TABLE "promotions"
  ADD CONSTRAINT "promotions_minimum_subtotal_check"
  CHECK ("minimumSubtotalCents" IS NULL OR "minimumSubtotalCents" >= 0);

ALTER TABLE "payment_sessions"
  ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "promotionKey" TEXT;
ALTER TABLE "orders"
  ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "promotionKey" TEXT;
