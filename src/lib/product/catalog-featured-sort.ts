import type { ProductSummary } from "@/lib/api/api-contract";
import { BATHROOM_VANITY_FEATURED_SKUS } from "./catalog-config.ts";

const naturalCollator = new Intl.Collator("en-CA", {
  numeric: true,
  sensitivity: "base"
});

/**
 * Default "featured" listing family order: main goods first, accessories
 * last. Main goods are the cabinet families (base, bathroom-vanity, wall,
 * tall); accessories are everything else — baseboards/mouldings, cabinet
 * accessories such as end panels and fillers, and handles/hardware — which
 * sink below every main-good product instead of interrupting the families
 * they are taxonomically nested under.
 */
const FAMILY_ORDER = [
  "Base family",
  "Vanity",
  "Wall family",
  "Tall family",
  "Baseboards & Mouldings",
  "Accessories",
  "Handle series"
] as const;

type CatalogFamily = (typeof FAMILY_ORDER)[number];

/**
 * Live Website API category slugs — the canonical business key. Kitchen
 * products carry their child category slug (base-cabinets / wall-cabinets /
 * tall-cabinets / cabinet-accessories), vanities carry bathroom-vanities, and
 * the accessory lines carry baseboards-and-mouldings / handle-series.
 */
const FAMILY_BY_CATEGORY_SLUG: Readonly<Record<string, CatalogFamily>> = {
  "base-cabinets": "Base family",
  "bathroom-vanities": "Vanity",
  "wall-cabinets": "Wall family",
  "tall-cabinets": "Tall family",
  "baseboards-and-mouldings": "Baseboards & Mouldings",
  "cabinet-accessories": "Accessories",
  "handle-series": "Handle series"
};

/**
 * Fixture/fallback taxonomy (no category slugs): products carry only the
 * display category plus a Kitchen Cabinets subCategory.
 */
const BASE_FAMILY_SUBCATEGORIES = new Set([
  "Base Cabinet",
  "3-Drawer Base",
  "Sink Base",
  "Lazy Susan Base"
]);
const WALL_FAMILY_SUBCATEGORIES = new Set([
  "Wall Cabinet",
  "Wall Cabinet (GD)",
  "Diagonal Corner Wall",
  "Microwave Cabinet",
  "Open End Shelf"
]);
const TALL_FAMILY_SUBCATEGORIES = new Set(["Tall Cabinet", "Oven Tall Cabinet"]);

const bathroomFeaturedRank = new Map<string, number>(
  BATHROOM_VANITY_FEATURED_SKUS.map((sku, index) => [sku, index])
);

function rank(value: string | undefined, order: readonly string[]) {
  if (!value) return order.length;
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}

function compareNatural(left: string | undefined, right: string | undefined) {
  return naturalCollator.compare(left ?? "", right ?? "");
}

/**
 * Classifies a product into its default-listing family. The Website API
 * category slug (`categorySlug`) is authoritative whenever present; the
 * fixture catalog (no slugs) falls back to display category + subCategory.
 *
 * One deliberate exception: the vanity end panel (VEP2230) is taxonomically
 * "Bathroom Vanities" on the live API, but it is an end panel accessory —
 * the fixture taxonomy carries it as Bathroom Vanities / Accessories. Its
 * canonical product slug keeps the same "-end-panel" family marker as the
 * cabinet end panels, so it sinks with the other accessories instead of
 * interrupting the vanity cabinets. Matching the slug is locale-independent
 * and affects only products whose own identity marks them as end panels.
 *
 * Unknown products (no known slug/category/subcategory) rank after every
 * known family, preserving the existing unknown-last SKU fallback.
 */
function catalogFamilyOf(
  product: Pick<ProductSummary, "category" | "categorySlug" | "subCategory" | "slug">
): CatalogFamily | undefined {
  const { categorySlug } = product;

  if (categorySlug) {
    if (product.slug?.includes("-end-panel")) return "Accessories";
    return FAMILY_BY_CATEGORY_SLUG[categorySlug];
  }

  const { category, subCategory } = product;
  if (category === "Kitchen Cabinets") {
    if (subCategory === "Accessories") return "Accessories";
    if (subCategory && BASE_FAMILY_SUBCATEGORIES.has(subCategory)) return "Base family";
    if (subCategory && WALL_FAMILY_SUBCATEGORIES.has(subCategory)) return "Wall family";
    if (subCategory && TALL_FAMILY_SUBCATEGORIES.has(subCategory)) return "Tall family";
    return undefined;
  }
  if (category === "Bathroom Vanities") {
    return subCategory === "Accessories" ? "Accessories" : "Vanity";
  }
  if (category === "Baseboards & Mouldings") return "Baseboards & Mouldings";
  if (category === "Accessories") return "Accessories";
  if (category === "Handle series" || category === "Handle Series") return "Handle series";
  return undefined;
}

export function compareCatalogFeaturedProducts(left: ProductSummary, right: ProductSummary) {
  const leftFamily = catalogFamilyOf(left);
  const rightFamily = catalogFamilyOf(right);
  const familyDifference = rank(leftFamily, FAMILY_ORDER) - rank(rightFamily, FAMILY_ORDER);
  if (familyDifference) return familyDifference;

  if (leftFamily === "Vanity") {
    const bathroomDifference =
      (bathroomFeaturedRank.get(left.sku) ?? BATHROOM_VANITY_FEATURED_SKUS.length) -
      (bathroomFeaturedRank.get(right.sku) ?? BATHROOM_VANITY_FEATURED_SKUS.length);
    if (bathroomDifference) return bathroomDifference;
  }

  const skuDifference = compareNatural(left.sku, right.sku);
  if (skuDifference) return skuDifference;

  return compareNatural(left.id, right.id);
}

export function sortCatalogFeaturedProducts(products: readonly ProductSummary[]) {
  return [...products].sort(compareCatalogFeaturedProducts);
}