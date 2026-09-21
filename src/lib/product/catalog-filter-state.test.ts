import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCatalogSubcategoryFilter,
  serializeCatalogSubcategoryFilter
} from "./catalog-filter-state.ts";

const validIds = ["base-cabinet", "accessories", "wall-cabinet"];

test("catalog subcategory query accepts stable IDs and removes invalid values", () => {
  assert.deepEqual(
    parseCatalogSubcategoryFilter("accessories,invalid,accessories", validIds),
    ["accessories"]
  );
});

test("catalog subcategory query serializes selected filters and clears empty state", () => {
  assert.equal(serializeCatalogSubcategoryFilter(["accessories"]), "accessories");
  assert.equal(serializeCatalogSubcategoryFilter([]), null);
});
