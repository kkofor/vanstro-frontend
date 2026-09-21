import assert from "node:assert/strict";
import test from "node:test";
import {
  formatStorefrontProduct,
  productDetailInclude,
  productListInclude,
  storefrontActivePriceWhere,
  type ProductWithRelations
} from "./product-payload.js";

type CandidatePrice = {
  status: string;
  currency: string;
  amountCents: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
};

type ActivePriceWhere = ReturnType<typeof storefrontActivePriceWhere>;

/** Extract the concrete bounds from the where produced by storefrontActivePriceWhere. */
function priceBounds(where: ActivePriceWhere) {
  const [fromClause, untilClause] = where.AND;
  // AND holds one clause per bound; each clause's OR array mixes null/open
  // and closed forms, so narrow each accessed element to the field we read.
  const fromLte = (fromClause.OR[1] as { effectiveFrom?: { lte?: Date } | null } | undefined)?.effectiveFrom?.lte as Date | undefined;
  const untilGt = (untilClause.OR[1] as { effectiveUntil?: { gt?: Date } | null } | undefined)?.effectiveUntil?.gt as Date | undefined;
  return { status: where.status, currency: where.currency, fromLte, untilGt };
}

/** Evaluate a candidate price row against the where object, mirroring Prisma OR/AND semantics. */
function isBuyable(where: ActivePriceWhere, row: CandidatePrice) {
  const bounds = priceBounds(where);
  if (row.status !== bounds.status) return false;
  if (row.currency !== bounds.currency) return false;
  const fromOk = row.effectiveFrom === null || (bounds.fromLte !== undefined && row.effectiveFrom <= bounds.fromLte);
  const untilOk = row.effectiveUntil === null || (bounds.untilGt !== undefined && row.effectiveUntil > bounds.untilGt);
  return fromOk && untilOk;
}

const NOW = Date.now();
const HOUR_MS = 60 * 60 * 1000;
const CAD = "CAD";
const USD = "USD";

function candidate(overrides: Partial<CandidatePrice>): CandidatePrice {
  return {
    status: "active",
    currency: CAD,
    amountCents: 1250,
    effectiveFrom: new Date(NOW - 60 * 60 * 1000),
    effectiveUntil: new Date(NOW + 24 * 60 * 60 * 1000),
    ...overrides
  };
}

function baseProduct(overrides: Partial<ProductWithRelations> = {}): ProductWithRelations {
  return {
    id: "product-1",
    slug: "product-1",
    name: "Fixture Product",
    shortDescription: null,
    description: null,
    status: "active",
    brand: null,
    manufacturerPartNumber: null,
    subCategoryKey: null,
    unit: null,
    dimensions: null,
    finish: null,
    colorName: null,
    colorHex: null,
    packageQuantity: null,
    finishOptions: null,
    productHighlights: null,
    documents: null,
    supportLinks: null,
    recommendations: null,
    certificationRequired: false,
    category: null,
    assets: [],
    specifications: [],
    skus: [],
    ...overrides
  };
}

function productWithPrices(prices: Array<{ amountCents: number; currency: string }>) {
  return baseProduct({
    skus: [
      {
        id: "sku-1",
        skuCode: "SKU-1",
        name: "Fixture SKU",
        manufacturerPartNumber: null,
        attributes: {},
        prices
      }
    ]
  });
}

test("storefrontActivePriceWhere selects status active, storefront currency, current window", () => {
  const where = storefrontActivePriceWhere();
  assert.equal(where.status, "active");
  assert.equal(where.currency, "CAD");
  assert.equal(where.AND.length, 2);
  const bounds = priceBounds(where);
  assert.ok(bounds.fromLte instanceof Date);
  assert.ok(bounds.untilGt instanceof Date);
  // The window is evaluated per call: the bound must be fresh, not module-load time.
  assert.ok(Math.abs((bounds.fromLte as Date).getTime() - Date.now()) < 60_000);
});

test("storefrontActivePriceWhere excludes inactive, future, expired, and currency-mismatch prices", () => {
  const where = storefrontActivePriceWhere();
  const active = candidate({});
  assert.equal(isBuyable(where, active), true);

  assert.equal(isBuyable(where, candidate({ status: "inactive" })), false, "inactive price must be excluded");
  assert.equal(isBuyable(where, candidate({ status: "draft" })), false, "draft price must be excluded");
  assert.equal(
    isBuyable(where, candidate({ effectiveFrom: new Date(NOW + HOUR_MS) })),
    false,
    "future effectiveFrom must be excluded"
  );
  assert.equal(
    isBuyable(where, candidate({ effectiveUntil: new Date(NOW - HOUR_MS) })),
    false,
    "expired effectiveUntil must be excluded"
  );
  assert.equal(
    isBuyable(where, candidate({ effectiveUntil: new Date(NOW) })),
    false,
    "effectiveUntil equal to now must be excluded (half-open interval)"
  );
  assert.equal(
    isBuyable(where, candidate({ currency: USD })),
    false,
    "currency mismatch must be excluded, never fall back to another currency"
  );
});

test("storefrontActivePriceWhere treats null bounds as unbounded", () => {
  const where = storefrontActivePriceWhere();
  assert.equal(isBuyable(where, candidate({ effectiveFrom: null })), true, "null effectiveFrom is unbounded");
  assert.equal(isBuyable(where, candidate({ effectiveUntil: null })), true, "null effectiveUntil is unbounded");
  assert.equal(isBuyable(where, candidate({ effectiveFrom: null, effectiveUntil: null })), true);
});

test("productListInclude and productDetailInclude use the unified buyable-price rule", () => {
  const listPrices = productListInclude().skus.include.prices;
  assert.deepEqual(listPrices.where, storefrontActivePriceWhere());
  assert.deepEqual(listPrices.orderBy, { effectiveFrom: { sort: "desc", nulls: "last" } });
  assert.deepEqual(listPrices.take, 1);

  const detailPrices = productDetailInclude().skus.include.prices;
  assert.deepEqual(detailPrices.where, storefrontActivePriceWhere());
  assert.deepEqual(detailPrices.orderBy, { effectiveFrom: { sort: "desc", nulls: "last" } });
});

test("includes evaluate the price window per request, not at module load", async () => {
  const first = productListInclude().skus.include.prices.where as ActivePriceWhere;
  await new Promise((resolve) => setTimeout(resolve, 20));
  const second = productListInclude().skus.include.prices.where as ActivePriceWhere;
  const firstFrom = priceBounds(first).fromLte as Date;
  const secondFrom = priceBounds(second).fromLte as Date;
  assert.ok(secondFrom.getTime() > firstFrom.getTime(), "each call must re-evaluate the current time");
});

test("formatStorefrontProduct maps the selected active price to summary and websiteApi", () => {
  const product = productWithPrices([{ amountCents: 1250, currency: CAD }]);
  const formatted = formatStorefrontProduct(product);
  assert.deepEqual(formatted.summary.price, { amount: 12.5, amountCents: 1250, currency: CAD });
  assert.deepEqual(formatted.websiteApi.price, { amount: 12.5, amountCents: 1250, currency: CAD });
});

test("formatStorefrontProduct keeps price null instead of a $0.00 fallback when no buyable price exists", () => {
  const noPrice = formatStorefrontProduct(baseProduct());
  assert.equal(noPrice.summary.price, null);
  assert.equal(noPrice.websiteApi.price, null);

  // Inactive / future / expired / currency-mismatch rows are filtered by the
  // include where clause (covered above); given that empty selection the
  // formatter must not fabricate a $0.00 or otherwise fake buyable price.
  const filteredOut = formatStorefrontProduct(productWithPrices([]));
  assert.equal(filteredOut.summary.price, null);
  assert.equal(filteredOut.websiteApi.price, null);
});

test("formatStorefrontProduct detail does not override websiteApi price with a fallback", () => {
  const formatted = formatStorefrontProduct(baseProduct(), { includeDetail: true });
  // includeDetail: true guarantees the detail block (implementation returns
  // it unconditionally in that branch), so the assertion may narrow it.
  const detail = formatted.detail!;
  assert.equal(detail.price, null);
  assert.equal(formatted.websiteApi.price, null);
  assert.equal(detail.price, formatted.websiteApi.price);
});

test("formatStorefrontProduct exposes dimensions and finishOptions on websiteApi (list shape)", () => {
  const finishOptions = [
    { name: "Light Grey", sku: "011710230", active: false, colorHex: "#c9cbc7" },
    { name: "White", sku: "011710130", active: true, colorHex: "#f7f6f2" }
  ];
  const formatted = formatStorefrontProduct(
    baseProduct({ dimensions: '12" W × 34½" H × 24" D', finishOptions })
  );
  assert.equal(formatted.websiteApi.dimensions, '12" W × 34½" H × 24" D');
  assert.deepEqual(formatted.websiteApi.finishOptions, finishOptions);
});

test("formatStorefrontProduct websiteApi dimensions is null, not empty string, when unset", () => {
  const formatted = formatStorefrontProduct(baseProduct());
  assert.equal(formatted.websiteApi.dimensions, null);
  assert.equal(formatted.websiteApi.finishOptions, undefined);
});

test("duplicate active prices resolve to the latest effectiveFrom (include order, first row)", () => {
  // The include returns in-window prices ordered by effectiveFrom desc, nulls last;
  // the formatter consumes the first row, matching cart/checkout selection.
  const older = { amountCents: 1000, currency: CAD };
  const newer = { amountCents: 1250, currency: CAD };
  const formatted = formatStorefrontProduct(productWithPrices([newer, older]));
  assert.deepEqual(formatted.summary.price, { amount: 12.5, amountCents: 1250, currency: CAD });
  assert.deepEqual(formatted.websiteApi.price, { amount: 12.5, amountCents: 1250, currency: CAD });

  // Currency filtering happens in the include where clause (tested above), never
  // as a formatter-side fallback to another currency.
  const mismatched = formatStorefrontProduct(productWithPrices([{ amountCents: 900, currency: USD }, older]));
  assert.deepEqual(mismatched.websiteApi.price, { amount: 9, amountCents: 900, currency: USD });
});
