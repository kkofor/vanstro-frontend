import type {
  StorefrontDealerLocation,
  StorefrontDealerSummary
} from "@/lib/api/api-contract";

/**
 * Flattens dealer master summaries into their location projections, preserving
 * the Dealer master identity on each location via `dealerId` (and a
 * `dealerLocationId` alias equal to the location `id` for inventory matching).
 */
export function flattenDealerLocations(
  summaries: StorefrontDealerSummary[]
): StorefrontDealerLocation[] {
  return summaries.flatMap((dealer) =>
    dealer.locations.map((location) => ({
      ...location,
      dealerId: location.dealerId || dealer.id,
      dealerLocationId: location.id
    }))
  );
}

/**
 * Locations a customer can actually fulfill from (pickup or delivery). The
 * fulfillment selector must only offer dealers with at least one such location;
 * a dealer master with zero active/fulfillable locations is directory-visible
 * but not selectable.
 */
export function fulfillableDealerLocations(
  summaries: StorefrontDealerSummary[]
): StorefrontDealerLocation[] {
  return flattenDealerLocations(summaries).filter(
    (location) => location.availableForPickup || Boolean(location.availableForDelivery)
  );
}

/** Locations with valid coordinates — the only ones the map can mark. */
export function mappableDealerLocations(
  summaries: StorefrontDealerSummary[]
): (StorefrontDealerLocation & { latitude: number; longitude: number })[] {
  return flattenDealerLocations(summaries).filter(
    (location): location is StorefrontDealerLocation & { latitude: number; longitude: number } =>
      typeof location.latitude === "number" && typeof location.longitude === "number"
  );
}
