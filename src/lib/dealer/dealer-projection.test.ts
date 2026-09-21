import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import type { StorefrontDealerSummary } from "../api/api-contract.ts";

const srcRoot = new URL("../../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      let url = new URL(specifier.slice(2), srcRoot).href;
      if (!/\.(ts|js|mjs|cjs|json)$/.test(url)) url += ".ts";
      return { url, shortCircuit: true };
    }
    if (specifier.startsWith(".") && !/\.(ts|js|mjs|cjs|json)$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.endsWith(".json")) return nextLoad(url, context);
    return { format: "json", source: readFileSync(new URL(url), "utf8"), shortCircuit: true };
  }
});

const projection = import("./dealer-projection.ts");

function location(overrides: Record<string, unknown> = {}) {
  return {
    id: "loc-1",
    dealerId: "dealer-1",
    dealerLocationId: "loc-1",
    name: "Winnipeg",
    address: "856 Century St",
    city: "Winnipeg",
    province: "MB",
    postalCode: "R3H 0M5",
    phone: "+1 204 505 2288",
    availableForPickup: true,
    ...overrides
  };
}

function summary(overrides: Partial<StorefrontDealerSummary> = {}): StorefrontDealerSummary {
  return {
    id: "dealer-1",
    code: "MB2",
    name: "mb2",
    status: "active",
    locations: [],
    ...overrides
  };
}

test("D1: an active Dealer with zero locations stays directory-visible but is not fulfillable/mappable", async () => {
  const { flattenDealerLocations, fulfillableDealerLocations, mappableDealerLocations } = await projection;
  const master = summary({ locations: [] });

  assert.equal(flattenDealerLocations([master]).length, 0, "no locations to flatten");
  assert.equal(fulfillableDealerLocations([master]).length, 0, "not selectable for fulfillment");
  assert.equal(mappableDealerLocations([master]).length, 0, "no map marker");
});

test("D2: an active location without coordinates is fulfillable but not mappable", async () => {
  const { fulfillableDealerLocations, mappableDealerLocations } = await projection;
  const master = summary({
    locations: [location({ latitude: undefined, longitude: undefined, availableForPickup: true })]
  });

  assert.equal(fulfillableDealerLocations([master]).length, 1, "selectable for fulfillment");
  assert.equal(mappableDealerLocations([master]).length, 0, "map still has no marker");
});

test("D3: adding valid coordinates produces a map marker", async () => {
  const { mappableDealerLocations } = await projection;
  const master = summary({
    locations: [location({ latitude: 49.909, longitude: -97.203 })]
  });

  const mapped = mappableDealerLocations([master]);
  assert.equal(mapped.length, 1, "one marker");
  assert.equal(mapped[0].latitude, 49.909);
  assert.equal(mapped[0].longitude, -97.203);
});

test("D4/D5: projection is pure and deterministic across revalidation (same payload -> same output)", async () => {
  const { flattenDealerLocations } = await projection;
  const master = summary({ locations: [location()] });

  const first = flattenDealerLocations([master]);
  const second = flattenDealerLocations([master]);
  assert.deepEqual(first, second, "identical payload projects identically");
  assert.equal(first[0].dealerId, "dealer-1", "location carries the stable Dealer master ID");
  assert.equal(first[0].dealerLocationId, "loc-1", "location keeps its stable location ID");
});

test("dealer projection never fabricates locations or coordinates", async () => {
  const { flattenDealerLocations, mappableDealerLocations } = await projection;
  const master = summary(); // zero locations

  assert.equal(flattenDealerLocations([master]).length, 0);
  assert.equal(mappableDealerLocations([master]).length, 0, "no coordinates are invented");
});
