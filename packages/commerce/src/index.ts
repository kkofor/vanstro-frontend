export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getInventoryStatus(quantity: number): InventoryStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= 3) return "low_stock";
  return "in_stock";
}
