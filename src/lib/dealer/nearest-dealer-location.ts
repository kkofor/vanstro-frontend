import type { Dealer } from "@/lib/api/api-contract";
import type { DealerMapLocation } from "@/lib/data/dealer-map-locations";

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearestDealerLocation(
  lat: number,
  lng: number,
  locations: readonly DealerMapLocation[]
): DealerMapLocation | null {
  if (!locations.length) return null;
  let best = locations[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const location of locations) {
    const distance = haversineKm(lat, lng, location.latitude, location.longitude);
    if (distance < bestDistance) {
      best = location;
      bestDistance = distance;
    }
  }
  return best;
}

export function matchDealerForMapLocation(
  location: DealerMapLocation,
  dealers: readonly Dealer[]
): Dealer | undefined {
  const city = location.city.trim().toLowerCase();
  return dealers.find((dealer) => {
    const dealerCity = dealer.city.trim().toLowerCase();
    return (
      dealerCity === city ||
      dealer.id === location.id ||
      dealer.dealerLocationId === location.id ||
      dealer.dealerId === location.id
    );
  });
}
