DROP INDEX IF EXISTS "tax_rates_province_key";
CREATE UNIQUE INDEX "tax_rates_province_effectiveFrom_key"
  ON "tax_rates"("province", "effectiveFrom");
CREATE INDEX "tax_rates_province_isActive_effectiveFrom_idx"
  ON "tax_rates"("province", "isActive", "effectiveFrom" DESC);
CREATE INDEX "prices_skuId_status_effectiveFrom_effectiveUntil_idx"
  ON "prices"("skuId", "status", "effectiveFrom" DESC, "effectiveUntil");
