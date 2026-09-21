import type { StorefrontDealerSummary } from "@/lib/api/api-contract";

export const dealers: StorefrontDealerSummary[] = [
  {
    id: "MB-YUAN",
    code: "WPG",
    name: "Yuan Construction Ltd.",
    status: "active",
    phone: "+1 204 505 2288",
    locations: [
      {
        id: "MB-YUAN",
        dealerId: "MB-YUAN",
        dealerLocationId: "MB-YUAN",
        name: "Yuan Construction Ltd.",
        address: "856 Century St",
        city: "Winnipeg",
        province: "MB",
        postalCode: "R3H 0M5",
        phone: "+1 204 505 2288",
        availableForPickup: true
      }
    ]
  }
];
