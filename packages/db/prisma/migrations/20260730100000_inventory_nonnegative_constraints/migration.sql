ALTER TABLE "inventory_snapshots"
  ADD CONSTRAINT "inventory_snapshots_nonnegative_check"
  CHECK (
    "quantityOnHand" >= 0
    AND "quantityReserved" >= 0
    AND "quantityReserved" <= "quantityOnHand"
  );

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_positive_quantity_check"
  CHECK ("quantity" > 0);
