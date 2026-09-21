import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogRoutes } from "./catalog.js";

async function assertCatalogInvalid(response: Response) {
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: response.url.includes("products/commerce")
      ? "productIds must be a non-empty array of non-empty strings."
      : "limit and offset must be finite nonnegative integers.",
    code: "CATALOG_INVALID"
  });
}

test("catalog rejects non-finite, fractional, and negative pagination before querying", async () => {
  const routes = createCatalogRoutes();
  for (const query of ["limit=NaN", "limit=Infinity", "limit=1.5", "limit=-1", "offset=NaN", "offset=Infinity", "offset=2.5", "offset=-1"]) {
    await assertCatalogInvalid(await routes.request(`/products?${query}`));
  }
});

test("catalog commerce rejects malformed productIds arrays before filtering", async () => {
  const routes = createCatalogRoutes();
  const invalidBodies = [null, {}, { productIds: "product-1" }, { productIds: [] }, { productIds: ["product-1", 2] }, { productIds: ["product-1", "  "] }];

  for (const body of invalidBodies) {
    const response = await routes.request("/products/commerce", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "productIds must be a non-empty array of non-empty strings.",
      code: "CATALOG_INVALID"
    });
  }
});
