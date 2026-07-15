import {
  InventoryStatus,
  ProductInventory,
  ProductInventoryLocation,
  ProductSummary
} from "@/lib/api/api-contract";

const FALLBACK_UPDATED_AT = "static-inventory";

export function getInventoryStatus(quantity: number): InventoryStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= 3) return "low_stock";
  return "in_stock";
}

export function createInventoryFromDealerStock(product: ProductSummary): ProductInventory {
  const locations = Object.entries(product.dealerStock ?? {}).map(([dealerId, quantity]) => ({
    dealerId,
    quantity,
    quantityOnHand: quantity,
    quantityReserved: 0,
    status: getInventoryStatus(quantity),
    pickupAvailable: quantity > 0,
    deliveryAvailable: quantity > 0,
    updatedAt: FALLBACK_UPDATED_AT
  }));
  const totalAvailable = locations.reduce((total, location) => total + location.quantity, 0);

  return {
    productId: product.id,
    sku: product.sku,
    locations,
    totalAvailable,
    status: getInventoryStatus(totalAvailable),
    availabilityMessage: "Inventory is loaded from static dealer stock until backend inventory is connected.",
    updatedAt: FALLBACK_UPDATED_AT
  };
}

export function getProductInventory(product: ProductSummary): ProductInventory {
  return product.availability ?? createInventoryFromDealerStock(product);
}

export function getInventoryLocation(
  product: ProductSummary,
  dealerId: string
): ProductInventoryLocation | undefined {
  return getProductInventory(product).locations.find((location) => location.dealerId === dealerId);
}

export function getAvailableQuantity(product: ProductSummary, dealerId: string) {
  return getInventoryLocation(product, dealerId)?.quantity ?? 0;
}

export function canFulfillQuantity(product: ProductSummary, dealerId: string, quantity: number) {
  const location = getInventoryLocation(product, dealerId);
  if (!location) return false;
  if (location.quantityKnown === false) {
    return ["in_stock", "low_stock"].includes(location.status);
  }
  return location.quantity >= quantity && ["in_stock", "low_stock"].includes(location.status);
}

export function getTotalAvailable(product: ProductSummary) {
  return getProductInventory(product).totalAvailable;
}

export function getInventoryLabel(location?: ProductInventoryLocation) {
  if (!location) return "Not available at selected dealer";
  if (location.status === "backorder") return "Backorder available";
  if (location.status === "unavailable") return "Unavailable";
  if (location.quantityKnown === false) return "Available";
  if (location.quantity <= 0) return "Out of stock";
  if (location.quantity <= 3) return `${location.quantity} left`;
  return `${location.quantity} available`;
}

export function getInventoryStatusClass(location?: ProductInventoryLocation) {
  if (!location) return "out";
  if (location.status === "in_stock") return "in";
  if (location.status === "low_stock" || location.status === "backorder") return "low";
  return "out";
}
