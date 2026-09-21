import type { ProductDetail, ProductSummary } from "../api/api-contract.ts";

/**
 * Complete-The-Project companions.
 *
 * A companion is a product that genuinely completes the same install as the
 * current product. The rule is family-based and deliberately NOT locked to raw
 * `category` equality: the PDP rail catalog (the in-repo fixture) labels every
 * kitchen cabinet "Kitchen Cabinets", while a live website product may arrive
 * with concrete family categories ("Wall Cabinets", "Base Cabinets", "Tall
 * Cabinets", "Accessories") and no subCategory or finish at all. The old rule
 * (same category string + same subCategory + only handles as the pairing) left
 * every live rail empty once handles/trim were excluded.
 *
 * Gates, in order:
 *   1. Exclusion — handles and trim (baseboards, mouldings, casing) are NEVER
 *      companions, and never produce a rail themselves.
 *   2. Family — every product maps to a cabinet family (base / wall / tall /
 *      vanity / accessories / door) from its subCategory, category or name.
 *      Both sides must resolve to a family.
 *   3. Finish — when the current product declares a finish/color, the rail
 *      must carry the exact same finish (live products carry no finish, so no
 *      comparison is possible there and the gate is skipped).
 *   4. Companion kinds, in ranking order:
 *        - same series:   equal subCategory (other sizes of the same cabinet type)
 *        - same family:   same family bucket (base↔base, wall↔wall, …)
 *        - base ↔ wall:   base cabinets pair with wall cabinets, and vice versa
 *        - cabinet ↔ filler: any cabinet/vanity pairs with fillers (Accessories)
 *        - cabinet ↔ door:    cabinets pair with same-colour doors (real door
 *          SKUs only — no invented products)
 *
 * Rails fill the desktop row (6 per row in the v2 layout), never include
 * handles, and are never empty for a cabinetry PDP.
 */

const RAIL_SIZE = 6;

export type CompanionFamily = "base" | "wall" | "tall" | "vanity" | "accessories" | "door";

/**
 * Family markers, evaluated in order. subCategory and category stay in the
 * source language for both locales (localizeProduct translates names, not
 * taxonomy), so these tokens match live API products and fixture rails alike;
 * the name is the tiebreaker for products whose category is a generic bucket
 * ("Accessories") but whose name says exactly what they complete ("Wall End
 * Panel WEP1230" is a wall piece, "Filler F342" is an accessory, …).
 */
const FAMILY_RULES: ReadonlyArray<readonly [CompanionFamily, readonly string[]]> = [
  ["door", ["door"]],
  ["wall", ["wall cabinet", "wall end panel", "diagonal corner wall", "open end shelf"]],
  ["base", ["base cabinet", "base end panel", "drawer base", "sink base", "lazy susan base"]],
  ["tall", ["tall cabinet", "tall end panel", "oven tall cabinet", "microwave cabinet"]],
  ["vanity", ["vanit", "bathroom", "lavabo", "meubles-lavabos"]],
  ["accessories", ["filler", "accessories", "accessoire", "toe kick"]]
] as const satisfies ReadonlyArray<readonly [CompanionFamily, readonly string[]]>;

function normalized(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Handles and trim (baseboards, mouldings, casing) can never be project companions. */
function isExcludedCompanionCategory(category: string | undefined, name: string | undefined): boolean {
  const categoryToken = normalized(category);
  const nameToken = normalized(name);
  return (
    categoryToken.includes("handle") ||
    categoryToken.includes("baseboard") ||
    categoryToken.includes("moulding") ||
    categoryToken.includes("molding") ||
    categoryToken.includes("casing") ||
    nameToken.includes("handle") ||
    nameToken.includes("moulding") ||
    nameToken.includes("molding") ||
    nameToken.includes("baseboard") ||
    nameToken.includes("casing") ||
    // French rail/product names (localizeProduct translates names): Poignée = handle,
    // Moulure/plinthe = moulding/baseboard.
    nameToken.includes("poignee") ||
    nameToken.includes("poignée") ||
    nameToken.includes("moulure") ||
    nameToken.includes("plinthe")
  );
}

/**
 * The cabinet family a product belongs to, resolved from its subCategory,
 * category or name. Returns null for anything outside cabinetry (handles and
 * trim are already excluded before this runs).
 */
function familyOf(product: { category?: string; subCategory?: string; name?: string }): CompanionFamily | null {
  const nameToken = normalized(product.name);
  const subCategoryToken = normalized(product.subCategory);
  const categoryToken = normalized(product.category);
  for (const [family, markers] of FAMILY_RULES) {
    if (markers.some((marker) => nameToken.includes(marker) || subCategoryToken.includes(marker) || categoryToken.includes(marker))) {
      return family;
    }
  }
  return null;
}

/**
 * Finish parity. Live website products carry no finish/color, so when the
 * current product declares none there is nothing to compare — the gate cannot
 * apply. When it DOES declare one, the rail must declare the exact same one:
 * no other-finish padding, no finish-less filler.
 */
function sameFinish(current: ProductDetail, rail: ProductSummary): boolean {
  const currentFinish = (current.finish ?? current.colorName ?? "").trim().toLowerCase();
  if (!currentFinish) return true;
  const railFinish = (rail.finish ?? rail.colorName ?? "").trim().toLowerCase();
  return Boolean(railFinish) && railFinish === currentFinish;
}

/** Real cross-series project pairings (same family is handled by its own tier). */
function isProjectPairing(currentFamily: CompanionFamily, railFamily: CompanionFamily): boolean {
  // base ↔ wall: wall cabinets complete a base run (and vice versa).
  if ((currentFamily === "base" && railFamily === "wall") || (currentFamily === "wall" && railFamily === "base")) {
    return true;
  }
  // cabinet/vanity ↔ filler (Accessories), either direction.
  if ((currentFamily === "accessories") !== (railFamily === "accessories") && currentFamily !== "door" && railFamily !== "door") {
    return true;
  }
  // cabinet ↔ door, either direction.
  if (currentFamily === "door" || railFamily === "door") {
    return true;
  }
  return false;
}

export function selectCompleteProjectProducts(product: ProductDetail, allProducts: ProductSummary[]) {
  // A handle/trim page is never a companion source: it recommends nothing.
  if (isExcludedCompanionCategory(product.category, product.name)) return [];
  const currentFamily = familyOf(product);
  if (!currentFamily) return [];
  const currentSubCategory = normalized(product.subCategory);

  const others = allProducts.filter((railProduct) => railProduct.id !== product.id);

  const eligible = others.filter((railProduct) => {
    if (isExcludedCompanionCategory(railProduct.category, railProduct.name)) return false;
    if (!familyOf(railProduct)) return false;
    if (!sameFinish(product, railProduct)) return false;
    return true;
  });

  // Same series (equal subCategory) first, then the same family bucket (other
  // sizes of the same cabinet family), then real cross-series pairings
  // (base ↔ wall, cabinet ↔ filler, cabinet ↔ door). Live products have no
  // subCategory, so the same-series tier is empty there and the same-family
  // tier carries the rail.
  const sameSeries = eligible.filter(
    (railProduct) => Boolean(currentSubCategory) && normalized(railProduct.subCategory) === currentSubCategory
  );
  const sameFamily = eligible.filter(
    (railProduct) =>
      familyOf(railProduct) === currentFamily &&
      !(Boolean(currentSubCategory) && normalized(railProduct.subCategory) === currentSubCategory)
  );
  const paired = eligible.filter(
    (railProduct) =>
      familyOf(railProduct) !== currentFamily && isProjectPairing(currentFamily, familyOf(railProduct) as CompanionFamily)
  );

  const seen = new Set<string>();
  const selected: ProductSummary[] = [];
  for (const railProduct of [...sameSeries, ...sameFamily, ...paired]) {
    if (seen.has(railProduct.id)) continue;
    seen.add(railProduct.id);
    selected.push(railProduct);
    if (selected.length === RAIL_SIZE) break;
  }
  return selected;
}