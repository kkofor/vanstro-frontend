import type {
  ProductInventory,
  ProductInventoryLocation,
  ProductSummary
} from "@/lib/api/api-contract";
import { getInventoryStatus } from "@vanstro/commerce";
export { getInventoryStatus } from "@vanstro/commerce";
export type { InventoryStatus } from "@vanstro/commerce";

const FALLBACK_UPDATED_AT = "static-inventory";

const NO_DEALER_AVAILABILITY_MESSAGE =
  "Select a local dealer to view this SKU's inventory; no cross-dealer total is shown.";

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

  return {
    productId: product.id,
    sku: product.sku,
    locations,
    totalAvailable: 0,
    status: "out_of_stock",
    availabilityMessage: NO_DEALER_AVAILABILITY_MESSAGE,
    updatedAt: FALLBACK_UPDATED_AT
  };
}

export function getProductInventory(product: ProductSummary, dealerId?: string): ProductInventory {
  const source = product.availability ?? createInventoryFromDealerStock(product);

  if (!dealerId) {
    return {
      productId: source.productId,
      sku: source.sku,
      locations: [],
      totalAvailable: 0,
      status: "out_of_stock",
      availabilityMessage: NO_DEALER_AVAILABILITY_MESSAGE,
      updatedAt: source.updatedAt
    };
  }

  const location = source.locations.find((candidate) => candidate.dealerId === dealerId);
  return {
    productId: source.productId,
    sku: source.sku,
    selectedDealerId: dealerId,
    locations: location ? [location] : [],
    totalAvailable: location?.quantity ?? 0,
    status: location?.status ?? "out_of_stock",
    availabilityMessage: source.availabilityMessage,
    updatedAt: source.updatedAt
  };
}

export function getInventoryLocation(
  product: ProductSummary,
  dealerId: string
): ProductInventoryLocation | undefined {
  return getProductInventory(product, dealerId).locations[0];
}

export function getAvailableQuantity(product: ProductSummary, dealerId: string) {
  return getInventoryLocation(product, dealerId)?.quantity ?? 0;
}

export function canFulfillLocation(location: ProductInventoryLocation | undefined, quantity: number) {
  if (!location) return false;
  if (location.quantityKnown === false) {
    return ["in_stock", "low_stock"].includes(location.status);
  }
  return location.quantity >= quantity && ["in_stock", "low_stock"].includes(location.status);
}

export function canFulfillQuantity(product: ProductSummary, dealerId: string, quantity: number) {
  return canFulfillLocation(getInventoryLocation(product, dealerId), quantity);
}

export function getTotalAvailable(product: ProductSummary, dealerId: string) {
  return getProductInventory(product, dealerId).totalAvailable;
}

export function getInventoryLabel(location?: ProductInventoryLocation, locale: "en-CA" | "fr-CA" = "en-CA") {
  const french = locale === "fr-CA";
  if (!location) return french ? "Non disponible chez le détaillant sélectionné" : "Not available at selected dealer";
  if (location.status === "backorder") return french ? "Disponible en commande différée" : "Backorder available";
  if (location.status === "unavailable") return french ? "Non disponible" : "Unavailable";
  if (location.quantityKnown === false) return french ? "Disponible" : "Available";
  if (location.quantity <= 0) return french ? "Rupture de stock" : "Out of stock";
  if (location.quantity <= 3) return french ? `${location.quantity} restant${location.quantity === 1 ? "" : "s"}` : `${location.quantity} left`;
  return french ? `${location.quantity} disponibles` : `${location.quantity} available`;
}

export function getInventoryStatusClass(location?: ProductInventoryLocation) {
  if (!location) return "out";
  if (location.status === "in_stock") return "in";
  if (location.status === "low_stock" || location.status === "backorder") return "low";
  return "out";
}

export type ApiInventoryPayload = {
  productId: string;
  sku: string;
  totalAvailable: number;
  locations: Array<{
    dealerLocationId: string;
    dealerId: string;
    dealerName: string;
    quantityOnHand: number;
    quantityReserved: number;
    quantityAvailable: number;
    updatedAt: string;
  }>;
};

export function mapApiInventoryToProductInventory(api: ApiInventoryPayload): ProductInventory {
  const locations: ProductInventoryLocation[] = api.locations.map((location) => ({
    dealerId: location.dealerId,
    dealerLocationId: location.dealerLocationId,
    quantity: location.quantityAvailable,
    quantityKnown: true,
    quantityOnHand: location.quantityOnHand,
    quantityReserved: location.quantityReserved,
    status: getInventoryStatus(location.quantityAvailable),
    pickupAvailable: location.quantityAvailable > 0,
    deliveryAvailable: location.quantityAvailable > 0,
    updatedAt: location.updatedAt
  }));

  return {
    productId: api.productId,
    sku: api.sku,
    locations,
    totalAvailable: api.totalAvailable,
    status: getInventoryStatus(api.totalAvailable),
    updatedAt: locations[0]?.updatedAt ?? FALLBACK_UPDATED_AT
  };
}
