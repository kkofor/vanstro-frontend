-- Merge duplicate inventory snapshots with NULL dealerLocationId (keep newest row, sum quantities).
DO $$
DECLARE
  rec RECORD;
  keeper_id TEXT;
  total_on_hand INT;
  total_reserved INT;
BEGIN
  FOR rec IN
    SELECT "skuId"
    FROM "inventory_snapshots"
    WHERE "dealerLocationId" IS NULL
    GROUP BY "skuId"
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keeper_id
    FROM "inventory_snapshots"
    WHERE "skuId" = rec."skuId" AND "dealerLocationId" IS NULL
    ORDER BY "updatedAt" DESC
    LIMIT 1;

    SELECT COALESCE(SUM("quantityOnHand"), 0), COALESCE(SUM("quantityReserved"), 0)
    INTO total_on_hand, total_reserved
    FROM "inventory_snapshots"
    WHERE "skuId" = rec."skuId" AND "dealerLocationId" IS NULL;

    UPDATE "inventory_snapshots"
    SET "quantityOnHand" = total_on_hand, "quantityReserved" = total_reserved
    WHERE id = keeper_id;

    DELETE FROM "inventory_snapshots"
    WHERE "skuId" = rec."skuId"
      AND "dealerLocationId" IS NULL
      AND id <> keeper_id;
  END LOOP;
END $$;

ALTER TABLE "payment_sessions" ADD COLUMN "cartId" TEXT;

ALTER TABLE "payment_sessions"
  ADD CONSTRAINT "payment_sessions_cartId_fkey"
  FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "payment_sessions_cart_pending_unique"
  ON "payment_sessions" ("cartId")
  WHERE "status" = 'pending' AND "cartId" IS NOT NULL;

ALTER TABLE "inventory_snapshots"
  DROP CONSTRAINT IF EXISTS "inventory_snapshots_skuId_dealerLocationId_key";

CREATE UNIQUE INDEX "inventory_snapshots_sku_dealer_unique"
  ON "inventory_snapshots" ("skuId", "dealerLocationId")
  NULLS NOT DISTINCT;

CREATE INDEX "inventory_reservations_payment_session_idx"
  ON "inventory_reservations" ("paymentSessionId")
  WHERE "paymentSessionId" IS NOT NULL;

CREATE UNIQUE INDEX "inventory_reservations_active_session_sku_unique"
  ON "inventory_reservations" ("paymentSessionId", "skuId")
  WHERE "status" = 'active' AND "paymentSessionId" IS NOT NULL;

CREATE INDEX "inventory_reservations_sku_dealer_status_idx"
  ON "inventory_reservations" ("skuId", "dealerLocationId", "status");

UPDATE "inventory_reservations" ir
SET "paymentSessionId" = NULL
WHERE ir."paymentSessionId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "payment_sessions" ps WHERE ps.id = ir."paymentSessionId"
  );

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_paymentSessionId_fkey"
  FOREIGN KEY ("paymentSessionId") REFERENCES "payment_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "erp_order_links"
  ADD CONSTRAINT "erp_order_links_websiteOrderId_fkey"
  FOREIGN KEY ("websiteOrderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "payment_sessions_cartId_status_idx" ON "payment_sessions" ("cartId", "status");
