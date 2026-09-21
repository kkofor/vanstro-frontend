ALTER TABLE "prices"
  ADD CONSTRAINT "prices_amount_nonnegative" CHECK ("amountCents" >= 0) NOT VALID,
  ADD CONSTRAINT "prices_compare_at_valid" CHECK ("compareAtCents" IS NULL OR "compareAtCents" >= "amountCents") NOT VALID,
  ADD CONSTRAINT "prices_effective_window_valid" CHECK ("effectiveUntil" IS NULL OR "effectiveFrom" IS NULL OR "effectiveUntil" > "effectiveFrom") NOT VALID;

ALTER TABLE "payment_sessions"
  ADD CONSTRAINT "payment_sessions_amounts_nonnegative" CHECK (
    "subtotalCents" >= 0 AND "discountCents" >= 0 AND "taxCents" >= 0 AND "shippingCents" >= 0 AND "totalCents" >= 0
  ) NOT VALID,
  ADD CONSTRAINT "payment_sessions_discount_valid" CHECK ("discountCents" <= "subtotalCents") NOT VALID,
  ADD CONSTRAINT "payment_sessions_total_valid" CHECK (
    "totalCents" = "subtotalCents" - "discountCents" + "taxCents" + "shippingCents"
  ) NOT VALID;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_amounts_nonnegative" CHECK (
    "subtotalCents" >= 0 AND "discountCents" >= 0 AND "taxCents" >= 0 AND "shippingCents" >= 0 AND "totalCents" >= 0
  ) NOT VALID,
  ADD CONSTRAINT "orders_discount_valid" CHECK ("discountCents" <= "subtotalCents") NOT VALID,
  ADD CONSTRAINT "orders_total_valid" CHECK (
    "totalCents" = "subtotalCents" - "discountCents" + "taxCents" + "shippingCents"
  ) NOT VALID;

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0) NOT VALID,
  ADD CONSTRAINT "order_items_amounts_nonnegative" CHECK ("unitPriceCents" >= 0 AND "lineTotalCents" >= 0) NOT VALID,
  ADD CONSTRAINT "order_items_line_total_valid" CHECK ("lineTotalCents" = "quantity" * "unitPriceCents") NOT VALID;

ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_quantity_positive" CHECK ("quantity" > 0) NOT VALID;

ALTER TABLE "tax_rates"
  ADD CONSTRAINT "tax_rates_components_valid" CHECK (
    "gstRate" >= 0 AND "gstRate" <= 1 AND
    "pstRate" >= 0 AND "pstRate" <= 1 AND
    "hstRate" >= 0 AND "hstRate" <= 1 AND
    "combinedRate" >= 0 AND "combinedRate" <= 1
  ) NOT VALID,
  ADD CONSTRAINT "tax_rates_combined_valid" CHECK (
    "combinedRate" = "gstRate" + "pstRate" + "hstRate"
  ) NOT VALID;
