import assert from "node:assert/strict";
import test from "node:test";
import { fetchCompleteCatalog } from "./catalog-pagination.ts";

const products = Array.from({ length: 140 }, (_, index) => ({
  id: `product-${index + 1}`,
  slug: `product-${index + 1}`
}));

test("fetchCompleteCatalog requests the second page for a 140-product catalog", async () => {
  const offsets: number[] = [];

  const result = await fetchCompleteCatalog(async (limit, offset) => {
    offsets.push(offset);
    return {
      data: products.slice(offset, offset + limit),
      meta: { limit, offset, total: products.length }
    };
  });

  assert.equal(result.length, 140);
  assert.deepEqual(offsets, [0, 100]);
  assert.equal(result[139]?.id, "product-140");
});

test("fetchCompleteCatalog rejects incomplete pagination metadata", async () => {
  await assert.rejects(
    fetchCompleteCatalog(async () => ({ data: products.slice(0, 100), meta: { total: 140 } })),
    /incomplete pagination metadata/
  );
});

test("fetchCompleteCatalog rejects a missing second page", async () => {
  await assert.rejects(
    fetchCompleteCatalog(async (limit, offset) => ({
      data: offset === 0 ? products.slice(0, 100) : [],
      meta: { limit, offset, total: products.length }
    })),
    /incomplete page/
  );
});
