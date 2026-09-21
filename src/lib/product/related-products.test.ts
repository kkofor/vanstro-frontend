import assert from "node:assert/strict";
import test from "node:test";
import type { ProductDetail, ProductSummary } from "../api/api-contract.ts";
import { selectCompleteProjectProducts } from "./related-products.ts";

function product(
  id: string,
  category: string,
  subCategory?: string,
  finish?: string,
  name?: string
): ProductSummary {
  return {
    id,
    slug: id,
    sku: id,
    name: name ?? id,
    category,
    subCategory,
    finish,
    price: { amount: 1, currency: "CAD" },
    unit: "each",
    dimensions: "",
    images: [{ url: "/product.jpg", alt: id }],
    inStock: true
  };
}

function detail(
  id: string,
  category: string,
  subCategory?: string,
  finish?: string,
  name?: string
): ProductDetail {
  return {
    ...product(id, category, subCategory, finish, name),
    description: "",
    specifications: {},
    inventory: []
  };
}

test("same series + same finish rank first, then real pairings (wall, filler); handles and baseboards never appear", () => {
  const current = detail("b12", "Kitchen Cabinets", "Base Cabinet", "White");
  const catalog = [
    product("b15", "Kitchen Cabinets", "Base Cabinet", "White"),
    product("w30", "Kitchen Cabinets", "Wall Cabinet", "White"),
    product("f342", "Kitchen Cabinets", "Accessories", "White", "Filler F342"),
    product("handle", "Handle series", undefined, "White"), // same finish, still never eligible
    product("baseboard", "Baseboards & Mouldings", "Baseboard", "White"),
    product("vanity", "Bathroom Vanities", "Bathroom Vanities", "White"),
    product("b15-lt", "Kitchen Cabinets", "Base Cabinet", "Light Grey")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  // Same series (Base Cabinet, White) first; the wall cabinet and filler are the
  // only real cross-series pairings. Handle, baseboard, vanity and wrong finish
  // are all excluded.
  assert.deepEqual(selected.map(({ id }) => id), ["b15", "w30", "f342"]);
});

test("handles can never appear even when the current product has no same-series mates", () => {
  const current = detail("lsb33", "Kitchen Cabinets", "Lazy Susan Base", "White");
  const catalog = [
    product("lsb36", "Kitchen Cabinets", "Lazy Susan Base", "White"),
    product("handle-white", "Handle series", undefined, "White"),
    product("handle-black", "Handle series", undefined, "Matte Black"),
    product("baseboard", "Baseboards & Mouldings", "Baseboard", "White"),
    product("casing", "Baseboards & Mouldings", "Casing", "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected.map(({ id }) => id), ["lsb36"]);
  assert.equal(selected.some(({ category }) => /handle/i.test(category)), false);
});

test("a handle page recommends nothing — handles are never a companion source", () => {
  const current = detail("handle-96", "Handle series", undefined, "Matte Black", "Handle CTC-96mm");
  const catalog = [
    product("b12", "Kitchen Cabinets", "Base Cabinet", "White"),
    product("v36", "Bathroom Vanities", "Bathroom Vanities", "White"),
    product("baseboard", "Baseboards & Mouldings", "Baseboard", "White"),
    product("handle-192", "Handle series", undefined, "Matte Black", "Handle CTC-192mm")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected, []);
});

test("a baseboard page recommends nothing — baseboards are never a companion source", () => {
  const current = detail("bb-035", "Baseboards & Mouldings", "Baseboard", "Putty White", "Baseboard-035");
  const catalog = [
    product("bb-039", "Baseboards & Mouldings", "Baseboard", "Putty White", "Baseboard-039"),
    product("casing", "Baseboards & Mouldings", "Casing", "White finish", "Casing-049"),
    product("b12", "Kitchen Cabinets", "Base Cabinet", "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected, []);
});

test("cabinet-with-filler pairing is symmetrical: a filler page pairs with cabinetry", () => {
  const current = detail("f342", "Kitchen Cabinets", "Accessories", "White", "Filler F342");
  const catalog = [
    product("b12", "Kitchen Cabinets", "Base Cabinet", "White"),
    product("b15", "Kitchen Cabinets", "Base Cabinet", "White"),
    product("w30", "Kitchen Cabinets", "Wall Cabinet", "White"),
    product("toe-kick", "Kitchen Cabinets", "Accessories", "White", "Toe Kick TKC-MS"),
    product("baseboard", "Baseboards & Mouldings", "Baseboard", "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  // Same series (Accessories family) first, then the cabinets the filler fills.
  assert.deepEqual(selected.map(({ id }) => id), ["toe-kick", "b12", "b15", "w30"]);
});

test("cabinet-with-door pairing fires only when a real door SKU exists in the catalog", () => {
  const current = detail("b12", "Kitchen Cabinets", "Base Cabinet", "White");
  const catalog = [
    product("door-24", "Kitchen Cabinets", "Cabinet Door", "White", "Cabinet Door 24\""),
    product("handle", "Handle series", undefined, "White"),
    product("baseboard", "Baseboards & Mouldings", "Baseboard", "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected.map(({ id }) => id), ["door-24"]);
});

test("same finish is required on both sides — no other-finish padding", () => {
  const current = detail("b12", "Kitchen Cabinets", "Base Cabinet", "White");
  const catalog = [
    product("b15-grey", "Kitchen Cabinets", "Base Cabinet", "Light Grey"),
    product("b18-nofinish", "Kitchen Cabinets", "Base Cabinet"),
    product("w30", "Kitchen Cabinets", "Wall Cabinet", "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected.map(({ id }) => id), ["w30"]);
});

test("vanity rail pairs vanities only — no handles, no kitchen cabinetry", () => {
  const current = detail("vs36", "Bathroom Vanities", "Bathroom Vanities", "White");
  const catalog = [
    product("v42", "Bathroom Vanities", "Bathroom Vanities", "White"),
    product("v48", "Bathroom Vanities", "Bathroom Vanities", "White"),
    product("handle", "Handle series", undefined, "White"),
    product("b12", "Kitchen Cabinets", "Base Cabinet", "White"),
    product("baseboard", "Baseboards & Mouldings", "Baseboard", "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected.map(({ id }) => id), ["v42", "v48"]);
});

test("concrete category labels may differ between the product and its rail — families and base↔wall pairing still link them", () => {
  // Live website products arrive with concrete family categories ("Base
  // Cabinets", "Wall Cabinets") while the PDP rail catalog labels every kitchen
  // cabinet "Kitchen Cabinets". Requiring raw category equality made live rails
  // empty; the family mapping resolves that, and handles never appear.
  const current = detail("b12", "Base Cabinets", "Base Cabinet", "White");
  const catalog = [
    product("b15", "Base Cabinets", "Base Cabinet", "White"),
    product("w30", "Wall Cabinets", "Wall Cabinet", "White"), // different category label, real base↔wall pairing
    product("kitchen-parent", "Kitchen Cabinets", "Base Cabinet", "White"), // fixture label, same family
    product("handle", "handle-series", undefined, "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected.map(({ id }) => id), ["b15", "kitchen-parent", "w30"]);
});

test("live-shape products (concrete category, no subCategory, no finish) still get real companions", () => {
  // The live Website API never sends subCategory or a Finish/Color spec, so the
  // current product can only be classified by category/name and the finish gate
  // is skipped. The rail must still be real same-family cabinets plus pairings.
  const current = detail("w0936", "Wall Cabinets", undefined, undefined, "Wall Cabinet W0936");
  const catalog = [
    product("w0930", "Kitchen Cabinets", "Wall Cabinet", "White"),
    product("w0942", "Kitchen Cabinets", "Wall Cabinet", "White"),
    product("b12", "Kitchen Cabinets", "Base Cabinet", "White"),
    product("handle", "Handle series", undefined, "Matte Black", "Handle CTC-96mm"),
    product("baseboard", "Baseboards & Mouldings", "Baseboard", "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected.map(({ id }) => id), ["w0930", "w0942", "b12"]);
});

test("live-shape vanity pairs other vanities — never handles, never kitchen cabinets", () => {
  const current = detail("vs36", "Bathroom Vanities", undefined, undefined, "Vanity Cabinet VS36");
  const catalog = [
    product("v42", "Bathroom Vanities", "Bathroom Vanities", "White"),
    product("v48", "Bathroom Vanities", "Bathroom Vanities", "White"),
    product("handle", "Handle series", undefined, "White", "Handle CTC-96mm"),
    product("b12", "Kitchen Cabinets", "Base Cabinet", "White"),
    product("baseboard", "Baseboards & Mouldings", "Baseboard", "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected.map(({ id }) => id), ["v42", "v48"]);
});

test("trim by name is never a companion and never produces a rail (Decorative Moulding)", () => {
  // "Decorative Moulding" lives inside the Accessories category, but a moulding
  // is trim: it must neither fill a cabinet's rail nor produce its own rail.
  const current = detail("b12", "Kitchen Cabinets", "Base Cabinet", "White");
  const catalog = [
    product("moulding", "Accessories", "Accessories", "White", "Decorative Moulding BCM8(DCM)"),
    product("w30", "Kitchen Cabinets", "Wall Cabinet", "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected.map(({ id }) => id), ["w30"]);

  const mouldingPage = selectCompleteProjectProducts(detail("moulding", "Accessories", "Accessories", "White", "Decorative Moulding BCM8(DCM)"), catalog);
  assert.deepEqual(mouldingPage, []);
});

test("rail is capped at four real cabinets", () => {
  const current = detail("b12", "Kitchen Cabinets", "Base Cabinet", "White");
  const catalog = ["b15", "b18", "b21", "b24", "b27", "b30"].map((id) =>
    product(id, "Kitchen Cabinets", "Base Cabinet", "White")
  );

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.equal(selected.length, 4);
  assert.deepEqual(selected.map(({ id }) => id), ["b15", "b18", "b21", "b24"]);
});

test("current product is never repeated in its own rail", () => {
  const current = detail("b12", "Kitchen Cabinets", "Base Cabinet", "White");
  const catalog = [
    product("b12", "Kitchen Cabinets", "Base Cabinet", "White"),
    product("b15", "Kitchen Cabinets", "Base Cabinet", "White")
  ];

  const selected = selectCompleteProjectProducts(current, catalog);
  assert.deepEqual(selected.map(({ id }) => id), ["b15"]);
});