CREATE INDEX IF NOT EXISTS "inventory_reservations_paymentSessionId_idx"
  ON "inventory_reservations"("paymentSessionId");

CREATE INDEX IF NOT EXISTS "orders_guestOrderToken_idx"
  ON "orders"("guestOrderToken");

CREATE INDEX IF NOT EXISTS "payment_sessions_guestOrderToken_idx"
  ON "payment_sessions"("guestOrderToken");

CREATE INDEX IF NOT EXISTS "idx_prices_sku_status_created"
  ON "prices" ("skuId", status, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_dealer_service_areas_type_code"
  ON "dealer_service_areas" ("areaType", "areaCode");

CREATE INDEX IF NOT EXISTS "idx_products_active_created"
  ON "products" ("createdAt" DESC) WHERE status = 'active';
