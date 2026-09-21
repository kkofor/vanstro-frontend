import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dealerMapLocations } from "../data/dealer-map-locations.ts";
import { matchDealerForMapLocation, nearestDealerLocation } from "./nearest-dealer-location.ts";
import type { Dealer } from "../api/api-contract.ts";

describe("nearestDealerLocation", () => {
  it("Winnipeg downtown coords land on mb01", () => {
    const nearest = nearestDealerLocation(49.895, -97.138, dealerMapLocations);
    assert.equal(nearest?.id, "mb01");
    assert.equal(nearest?.city, "Winnipeg");
  });

  it("Calgary coords land on ab10", () => {
    const nearest = nearestDealerLocation(51.0455, -114.0565, dealerMapLocations);
    assert.equal(nearest?.id, "ab10");
    assert.equal(nearest?.city, "Calgary");
  });

  it("empty list returns null", () => {
    assert.equal(nearestDealerLocation(49.9, -97.1, []), null);
  });
});

describe("matchDealerForMapLocation", () => {
  const winnipeg: Dealer = {
    id: "winnipeg",
    dealerId: "winnipeg",
    dealerLocationId: "winnipeg",
    name: "Yuan Construction Ltd.",
    address: "856 Century St",
    city: "Winnipeg",
    province: "MB",
    postalCode: "R3H 0M5",
    phone: "+1 204 505 2288",
    availableForPickup: true
  };

  it("matches mb01 to the Winnipeg header dealer by city", () => {
    const mb01 = dealerMapLocations.find((row) => row.id === "mb01");
    assert.ok(mb01);
    assert.equal(matchDealerForMapLocation(mb01, [winnipeg])?.id, "winnipeg");
  });

  it("does not invent a Calgary dealer when Header only has Winnipeg", () => {
    const ab10 = dealerMapLocations.find((row) => row.id === "ab10");
    assert.ok(ab10);
    assert.equal(matchDealerForMapLocation(ab10, [winnipeg]), undefined);
  });
});
