import type { CategorySummary, ProductSummary } from "../api/api-contract";
import {
  KITCHEN_CABINET_SUBCATEGORY_PARENT_SLUG,
  KITCHEN_CABINET_SUBCATEGORY_SLUGS,
  localizeProductTaxonomyLabel
} from "./product-localization";

export const HOME_PRODUCT_LIMIT = 8;

export const CATALOG_PAGE_SIZE = 24;

export const BATHROOM_VANITY_FEATURED_SKUS = [
  "022421011",
  "022721011",
  "023021011",
  "023621011",
  "023021511",
  "023021411",
  "023621511",
  "023621411",
  "023021311",
  "023021211",
  "024221611",
  "024821611",
  "026621711"
] as const;

/**
 * Storefront category option. In production the list is built from the Website
 * API `/categories` payload (active categories, demo-seed excluded) — see
 * `getCatalogCategories` in `src/lib/api/server.ts`. The static fallback below
 * exists only for fixture/local builds without a configured API.
 */
export type CatalogCategoryOption = {
  /** Category UUID from the API (stable business identity). */
  id: string;
  /** Canonical category slug; the business key for matching and URL filters. */
  slug: string;
  label: string;
  shortLabel: string;
  description: string | null;
};

export type CatalogSortOption = {
  id: "featured" | "price-asc" | "price-desc";
  label: string;
};

export type CatalogWidthOption = {
  id: string;
  label: string;
  min: number;
  max: number;
};

export type CatalogSubcategoryOption = {
  id: string;
  label: string;
  matches: string[];
};

/**
 * Static fallback for fixture/local builds only (no configured Website API).
 * Slugs mirror the production category slugs so URLs stay stable in dev.
 */
export const FALLBACK_CATEGORY_OPTIONS: CatalogCategoryOption[] = [
  {
    id: "fallback-kitchen-cabinets",
    slug: "kitchen-cabinets",
    label: "Kitchen Cabinets",
    shortLabel: "Kitchen Cabinets",
    description: "Base, wall and pantry cabinets"
  },
  {
    id: "fallback-bathroom-vanities",
    slug: "bathroom-vanities",
    label: "Bathroom Vanities",
    shortLabel: "Bathroom Vanities",
    description: "Vanity cabinets and bath storage"
  },
  {
    id: "fallback-baseboards-and-mouldings",
    slug: "baseboards-and-mouldings",
    label: "Baseboards & Mouldings",
    shortLabel: "Baseboards & Mouldings",
    description: "Primed mouldings and profiles"
  },
  {
    id: "fallback-handle-series",
    slug: "handle-series",
    label: "Handle Series",
    shortLabel: "Handle Series",
    description: "Cabinet handles and hardware"
  }
];

export const CATALOG_SUBCATEGORY_OPTIONS: CatalogSubcategoryOption[] = [
  { id: "baseboard-casing", label: "Baseboard and Casing", matches: ["Baseboard", "Casing"] },
  { id: "base-cabinet", label: "Base Cabinet", matches: ["Base Cabinet"] },
  { id: "three-drawer-base", label: "3-Drawer Base", matches: ["3-Drawer Base"] },
  { id: "wall-cabinet", label: "Wall Cabinet", matches: ["Wall Cabinet"] },
  { id: "tall-cabinet", label: "Tall Cabinet", matches: ["Tall Cabinet"] },
  { id: "sink-base", label: "Sink Base", matches: ["Sink Base"] },
  { id: "lazy-susan-base", label: "Lazy Susan Base", matches: ["Lazy Susan Base"] },
  { id: "wall-cabinet-gd", label: "Wall Cabinet (GD)", matches: ["Wall Cabinet (GD)"] },
  { id: "diagonal-corner-wall", label: "Diagonal Corner Wall", matches: ["Diagonal Corner Wall"] },
  { id: "open-end-shelf", label: "Open End Shelf", matches: ["Open End Shelf"] },
  { id: "microwave-cabinet", label: "Microwave Cabinet", matches: ["Microwave Cabinet"] },
  { id: "oven-tall-cabinet", label: "Oven Tall Cabinet", matches: ["Oven Tall Cabinet"] },
  { id: "accessories", label: "Accessories", matches: ["Accessories"] },
  { id: "bathroom-vanities", label: "Bathroom Vanities", matches: ["Bathroom Vanities"] }
];

export const CATALOG_SORT_OPTIONS: CatalogSortOption[] = [
  { id: "featured", label: "Best match" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" }
];

export const CATALOG_WIDTH_OPTIONS: CatalogWidthOption[] = [
  { id: "narrow", label: "Under 24 in", min: 0, max: 23.99 },
  { id: "standard", label: "24 to 35 in", min: 24, max: 35.99 },
  { id: "wide", label: "36 in and wider", min: 36, max: Number.POSITIVE_INFINITY }
];

export type CatalogLocale = "en-CA" | "fr-CA";

/**
 * Display-only French labels for the fixture fallback. In production the
 * canonical (English) labels come from the API and are localized at render
 * time through `localizeProductTaxonomyLabel`; this map is never the source
 * of which categories exist.
 */
const FR_CATEGORY_LABELS: Readonly<Record<string, Pick<CatalogCategoryOption, "label" | "shortLabel" | "description">>> = {
  "kitchen-cabinets": { label: "Armoires de cuisine", shortLabel: "Cuisine", description: "Armoires de base, murales et hautes" },
  "bathroom-vanities": { label: "Meubles-lavabos", shortLabel: "Meubles-lavabos", description: "Meubles-lavabos et rangement de salle de bain" },
  "base-cabinets": { label: "Armoires de base", shortLabel: "Armoires de base", description: "Armoires de base pour comptoirs de cuisine." },
  "wall-cabinets": { label: "Armoires murales", shortLabel: "Armoires murales", description: "Armoires murales et unités à porte vitrée." },
  "tall-cabinets": { label: "Armoires hautes", shortLabel: "Armoires hautes", description: "Armoires hautes pour garde-manger, four et micro-ondes." },
  "cabinet-accessories": { label: "Accessoires", shortLabel: "Accessoires", description: "Panneaux de finition, fileurs, plinthes et moulures." },
  "handle-series": { label: "Collection de poignées", shortLabel: "Poignées", description: "Poignées, tirettes et quincaillerie de montage." },
  "baseboards-and-mouldings": { label: "Moulures et plinthes", shortLabel: "Moulures", description: "Plinthes, cadrages et profilés apprêtés." }
};

const FR_SUBCATEGORY_LABELS: Readonly<Record<string, string>> = {
  "baseboard-casing": "Plinthes et cadrages",
  "base-cabinet": "Armoire de base",
  "three-drawer-base": "Armoire de base à 3 tiroirs",
  "wall-cabinet": "Armoire murale",
  "tall-cabinet": "Armoire haute",
  "sink-base": "Armoire de base pour évier",
  "lazy-susan-base": "Armoire de base avec plateau tournant",
  "wall-cabinet-gd": "Armoire murale avec porte vitrée",
  "diagonal-corner-wall": "Armoire murale d’angle diagonale",
  "open-end-shelf": "Étagère d’extrémité ouverte",
  "microwave-cabinet": "Armoire pour four à micro-ondes",
  "oven-tall-cabinet": "Armoire haute pour four",
  accessories: "Accessoires",
  "bathroom-vanities": "Meubles-lavabos de salle de bain"
};

const FR_SORT_LABELS: Readonly<Record<CatalogSortOption["id"], string>> = {
  featured: "Meilleure correspondance",
  "price-asc": "Prix : croissant",
  "price-desc": "Prix : décroissant"
};

const FR_WIDTH_LABELS: Readonly<Record<string, string>> = {
  narrow: "Moins de 24 po",
  standard: "De 24 à 35 po",
  wide: "36 po et plus"
};

export function localizeCatalogCategoryOption(
  option: CatalogCategoryOption,
  locale: CatalogLocale = "en-CA"
): CatalogCategoryOption {
  if (locale !== "fr-CA") return option;

  const french = FR_CATEGORY_LABELS[option.slug];
  return french
    ? { ...option, ...french }
    : { ...option, description: null };
}

export function getFallbackCatalogCategoryOptions(locale: CatalogLocale = "en-CA"): CatalogCategoryOption[] {
  return locale === "fr-CA"
    ? FALLBACK_CATEGORY_OPTIONS.map((option) => localizeCatalogCategoryOption(option, locale))
    : FALLBACK_CATEGORY_OPTIONS;
}

function normalizeForMatch(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Matches a product against a catalog category using the canonical category
 * slug as the business key (`product.categorySlug`). When the slug is absent
 * (fixture catalog products carry only the display name), falls back to the
 * canonical label or its localized display form, so English and French
 * fixture builds keep filtering working.
 */
export function matchesCatalogCategory(
  product: Pick<ProductSummary, "category" | "categorySlug">,
  category: CatalogCategoryOption,
  locale: CatalogLocale = "en-CA"
): boolean {
  if (category.slug === "all") return true;
  if (product.categorySlug) {
    if (product.categorySlug === category.slug) return true;
    // The kitchen-cabinets parent category has no categoryId of its own on
    // products anymore (each product carries its child categoryId:
    // base-cabinets / wall-cabinets / tall-cabinets / cabinet-accessories).
    // Matching the parent slug must therefore also match any of its four
    // children, or `?category=kitchen-cabinets` would resolve to zero
    // products even though the backend's own descendant query still returns
    // all of them.
    if (
      category.slug === KITCHEN_CABINET_SUBCATEGORY_PARENT_SLUG &&
      KITCHEN_CABINET_SUBCATEGORY_SLUGS.has(product.categorySlug)
    ) {
      return true;
    }
    return false;
  }
  return (
    normalizeForMatch(product.category) === normalizeForMatch(category.label) ||
    normalizeForMatch(product.category) === normalizeForMatch(localizeProductTaxonomyLabel(category.label, locale))
  );
}

export function getCatalogSubcategoryOptions(locale: CatalogLocale = "en-CA"): CatalogSubcategoryOption[] {
  return locale === "fr-CA"
    ? CATALOG_SUBCATEGORY_OPTIONS.map((option) => ({ ...option, label: FR_SUBCATEGORY_LABELS[option.id] ?? option.label }))
    : CATALOG_SUBCATEGORY_OPTIONS;
}

export function getCatalogSortOptions(locale: CatalogLocale = "en-CA"): CatalogSortOption[] {
  return locale === "fr-CA"
    ? CATALOG_SORT_OPTIONS.map((option) => ({ ...option, label: FR_SORT_LABELS[option.id] }))
    : CATALOG_SORT_OPTIONS;
}

export function getCatalogWidthOptions(locale: CatalogLocale = "en-CA"): CatalogWidthOption[] {
  return locale === "fr-CA"
    ? CATALOG_WIDTH_OPTIONS.map((option) => ({ ...option, label: FR_WIDTH_LABELS[option.id] ?? option.label }))
    : CATALOG_WIDTH_OPTIONS;
}

/**
 * Demo/recovery-fixture category slug that must never surface in the
 * storefront even when the row is active. Shared by the build-time
 * `getCatalogCategories` (server.ts) and the runtime revalidation hook so the
 * two paths project the exact same category identity set.
 */
export const SEED_FIXTURE_CATEGORY_SLUGS: Record<string, true> = {
  "seed-cat-prod": true
};

export function isSeedFixtureCategory(slug: string): boolean {
  return Object.hasOwn(SEED_FIXTURE_CATEGORY_SLUGS, slug);
}

/**
 * Maps a Website API `/categories` summary into a storefront category option.
 * Single source of truth for the projection used by both the build-time and
 * runtime category paths.
 */
export const STOREFRONT_CATEGORY_SLUG_ORDER = [
  "kitchen-cabinets",
  "bathroom-vanities",
  "baseboards-and-mouldings",
  "handle-series"
] as const;

function displayCategoryName(name: string) {
  return name === "Handle series" ? "Handle Series" : name;
}

export function sortStorefrontCategories<T extends { slug: string }>(categories: T[]): T[] {
  const rank = new Map<string, number>(STOREFRONT_CATEGORY_SLUG_ORDER.map((slug, index) => [slug, index]));
  return [...categories].sort((left, right) => {
    const leftRank = rank.get(left.slug) ?? STOREFRONT_CATEGORY_SLUG_ORDER.length;
    const rightRank = rank.get(right.slug) ?? STOREFRONT_CATEGORY_SLUG_ORDER.length;
    return leftRank - rightRank;
  });
}

export function toCatalogCategoryOption(category: CategorySummary): CatalogCategoryOption {
  const name = displayCategoryName(category.name);
  return {
    id: category.id,
    slug: category.slug,
    label: name,
    shortLabel: name,
    description: category.description ?? null
  };
}

/**
 * Projects the public `/categories` payload into storefront category options,
 * excluding demo-seed rows. Shared by the build-time `getCatalogCategories`
 * and the runtime revalidation hook so both paths yield the identical set.
 *
 * Only top-level categories (no `parentId`) are surfaced here: this is the
 * list consumed by the homepage "Shop By Category" cards, the header nav
 * dropdown and the footer Shop links, all of which must keep showing the
 * parent (e.g. Kitchen Cabinets) rather than fanning out into its four
 * subcategories (Base/Wall/Tall Cabinets, Accessories). Subcategory options
 * are exposed separately via `?category=<child-slug>` links and the PDP
 * breadcrumb, not through this top-level list.
 */
export function toCatalogCategoryOptions(categories: CategorySummary[]): CatalogCategoryOption[] {
  return sortStorefrontCategories(
    categories
      .filter((category) => !isSeedFixtureCategory(category.slug))
      .filter((category) => !category.parentId)
      .map(toCatalogCategoryOption)
  );
}

/**
 * Projects the public `/categories` payload into the full set of options a
 * product can be filtered by via `?category=<slug>` — parents AND their
 * children (e.g. kitchen-cabinets plus base-cabinets / wall-cabinets /
 * tall-cabinets / cabinet-accessories). This is deliberately a *different*
 * set from `toCatalogCategoryOptions()`: the nav dropdown, footer Shop links
 * and homepage category cards must keep showing only the four parents (see
 * that function's doc comment), but the catalog list page's own category
 * lookup/matching must recognize every selectable slug, including children,
 * or a `?category=<child-slug>` URL silently fails to match anything.
 */
export function toCatalogFilterableCategoryOptions(categories: CategorySummary[]): CatalogCategoryOption[] {
  return sortStorefrontCategories(
    categories.filter((category) => !isSeedFixtureCategory(category.slug)).map(toCatalogCategoryOption)
  );
}
