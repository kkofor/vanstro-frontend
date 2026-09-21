import type {
  ImageAsset,
  ProductDetail,
  ProductDocument,
  ProductFinishOption,
  ProductQuestion,
  ProductSummary
} from "../api/api-contract.ts";
import { DEFAULT_LOCALE, FRENCH_LOCALE, type SiteLocale } from "../i18n/locale.ts";
import { formatDisplayMeasurement } from "../i18n/display-format.ts";

export type ProductTranslationKey = `id:${string}` | `sku:${string}`;

export type ProductTranslationOverlay = {
  name?: string;
  description?: string;
  productHighlights?: readonly string[];
  /** Canonical specification keys mapped to localized values. */
  specifications?: Readonly<Record<string, string>>;
  questions?: readonly ProductQuestion[];
};

/** Product-specific exceptions keyed by immutable catalog identity. */
export const FR_CA_PRODUCT_OVERLAYS: Readonly<Partial<Record<ProductTranslationKey, ProductTranslationOverlay>>> = {
  "sku:014700131": { name: "Armoire de base avec plateau tournant SPB9" }
};

/** Website API sometimes sends the category slug as `product.category`. */
export const CATEGORY_DISPLAY_NAME_BY_SLUG: Readonly<Record<string, string>> = {
  "kitchen-cabinets": "Kitchen Cabinets",
  "bathroom-vanities": "Bathroom Vanities",
  "baseboards-and-mouldings": "Baseboards & Mouldings",
  "handle-series": "Handle series",
  "base-cabinets": "Base Cabinets",
  "wall-cabinets": "Wall Cabinets",
  "tall-cabinets": "Tall Cabinets",
  "cabinet-accessories": "Accessories"
};

/**
 * Kitchen Cabinets subcategory slugs. Used by the PDP breadcrumb to render a
 * second breadcrumb level (Home / Products / Kitchen Cabinets / <subcategory>
 * / Product) when a product's categorySlug is one of these four, since the
 * catalog API resolves `?category=kitchen-cabinets` to include all four via
 * descendant matching but each product itself only carries its own child
 * categoryId, not the parent's.
 */
export const KITCHEN_CABINET_SUBCATEGORY_PARENT_SLUG = "kitchen-cabinets" as const;
export const KITCHEN_CABINET_SUBCATEGORY_SLUGS: ReadonlySet<string> = new Set([
  "base-cabinets",
  "wall-cabinets",
  "tall-cabinets",
  "cabinet-accessories"
]);

export const FR_CA_CATEGORY_LABELS = {
  "Kitchen Cabinets": "Armoires de cuisine",
  "Bathroom Vanities": "Meubles-lavabos de salle de bain",
  "Handle series": "Collection de poignées",
  "Handle Series": "Collection de poignées",
  "Baseboards & Mouldings": "Plinthes et moulures",
  "Base Cabinets": "Armoires de base",
  "Wall Cabinets": "Armoires murales",
  "Tall Cabinets": "Armoires hautes",
  Accessories: "Accessoires"
} as const satisfies Readonly<Record<string, string>>;

export const FR_CA_SUBCATEGORY_LABELS = {
  "3-Drawer Base": "Armoire de base à 3 tiroirs",
  Accessories: "Accessoires",
  "Base Cabinet": "Armoire de base",
  Baseboard: "Plinthe",
  "Bathroom Vanities": "Meubles-lavabos de salle de bain",
  Casing: "Moulure de cadrage",
  "Diagonal Corner Wall": "Armoire murale d’angle diagonale",
  "Lazy Susan Base": "Armoire de base avec plateau tournant",
  "Microwave Cabinet": "Armoire pour four à micro-ondes",
  "Open End Shelf": "Étagère d’extrémité ouverte",
  "Oven Tall Cabinet": "Armoire haute pour four",
  "Sink Base": "Armoire de base pour évier",
  "Tall Cabinet": "Armoire haute",
  "Wall Cabinet": "Armoire murale",
  "Wall Cabinet (GD)": "Armoire murale avec porte vitrée"
} as const satisfies Readonly<Record<string, string>>;

export const FR_CA_SPECIFICATION_LABELS = {
  Application: "Application",
  Assembly: "Assemblage",
  "Assembly Required": "Assemblage requis",
  Brand: "Marque",
  "Box Material": "Matériau du caisson",
  "Cabinet Type": "Type d’armoire",
  Carcass: "Caisson",
  "Carcass/Cabinet Body": "Caisson",
  Category: "Catégorie",
  "Center to Center": "Entraxe",
  "Center-to-Center": "Entraxe",
  "Overall Length": "Longueur hors tout",
  "Bar Width": "Largeur de la poignée",
  "Bar Thickness": "Épaisseur de la poignée",
  Color: "Couleur",
  Depth: "Profondeur",
  "Depth / Thickness": "Profondeur / épaisseur",
  Dimensions: "Dimensions",
  Door: "Porte",
  "Door Configuration": "Configuration des portes",
  "Door Material": "Matériau de la porte",
  "Drawer Configuration": "Configuration des tiroirs",
  "Exterior Material": "Matériau extérieur",
  Finish: "Fini",
  "Finish Family": "Famille de finis",
  Fulfillment: "Mode de réception",
  Hardware: "Quincaillerie",
  Height: "Hauteur",
  "Hole Spacing": "Entraxe",
  Length: "Longueur",
  Material: "Matériau",
  "Manufacturer Part #": "N° de pièce du fabricant",
  "Option name": "Nom de l’option",
  Profile: "Profil",
  "Product Type": "Type de produit",
  Projection: "Saillie",
  "Shelf Count": "Nombre de tablettes",
  SKU: "UGS",
  "Source category": "Catégorie d’origine",
  "Source product ID": "Identifiant du produit d’origine",
  Surface: "Surface",
  Unit: "Unité",
  Use: "Utilisation",
  Warranty: "Garantie",
  Width: "Largeur"
} as const satisfies Readonly<Record<string, string>>;

const FR_FINISH: Readonly<Record<string, string>> = {
  "Light Grey": "Gris pâle",
  "Light Grey cabinet only": "Gris pâle, sans comptoir",
  "Light Grey with top": "Gris pâle avec comptoir",
  "Matte Black": "Noir mat",
  "Painted or stained finish": "Fini peint ou teint",
  "PVC white": "PVC blanc",
  "Putty White": "Blanc mastic",
  "Standard finish": "Fini standard",
  White: "Blanc",
  "White cabinet only": "Blanc, sans comptoir",
  "White finish": "Fini blanc",
  "White with top": "Blanc avec comptoir"
};

const FR_EXACT_VALUE: Readonly<Record<string, string>> = {
  each: "unité",
  "MDF Matte Soft-Touch": "MDF mat doux au toucher",
  "MDF Thermofoil Finish": "Fini en thermoplastique sur MDF",
  "Pickup or dealer-coordinated delivery": "Ramassage ou livraison coordonnée par le détaillant",
  "Finger Joint Pine": "Pin jointé",
  "Aluminum Alloy": "Alliage d’aluminium",
  "Putty White (Sanded, Paint-Ready)": "Blanc mastic (poncé, prêt à peindre)",
  "Primed MDF": "MDF apprêté",
  "See product specifications": "Voir les spécifications du produit"
};

const FR_DOCUMENT_LABELS: Readonly<Record<string, string>> = {
  "Baseboard specification": "Spécifications de la plinthe",
  "Care and finish guide": "Guide d’entretien et de finition",
  "Finish guidance": "Conseils sur le fini",
  "Installation planning": "Planification de l’installation",
  "Pickup and delivery guide": "Guide de ramassage et de livraison",
  "Specification sheet": "Fiche de spécifications",
  "Tall cabinet specification": "Spécifications de l’armoire haute",
  "Vanity specification sheet": "Fiche de spécifications du meuble-lavabo",
  "Warranty summary": "Résumé de la garantie"
};

const FR_DOCUMENT_TYPES: Readonly<Record<ProductDocument["type"], string>> = {
  care: "Entretien",
  installation: "Installation",
  specification: "Spécifications",
  warranty: "Garantie"
};

const NAME_PREFIXES = [
  ["Wall Cabinet (GD)", "Armoire murale avec porte vitrée "],
  ["3-Drawer Base", "Armoire de base à 3 tiroirs "],
  ["Diagonal Corner Wall", "Armoire murale d’angle diagonale "],
  ["Decorative Moulding", "Moulure décorative "],
  ["Microwave Cabinet", "Armoire pour four à micro-ondes "],
  ["Oven Tall Cabinet", "Armoire haute pour four "],
  ["Open End Shelf", "Étagère d’extrémité ouverte "],
  ["Lazy Susan Base", "Armoire de base avec plateau tournant "],
  ["Vanity Cabinet ", "Meuble-lavabo "],
  ["Wall End Panel", "Panneau d’extrémité mural "],
  ["Base End Panel", "Panneau d’extrémité de base "],
  ["Tall End Panel", "Panneau d’extrémité d’armoire haute "],
  ["Wall Cabinet", "Armoire murale "],
  ["Base Cabinet", "Armoire de base "],
  ["Sink Base", "Armoire de base pour évier "],
  ["Tall Cabinet", "Armoire haute "],
  ["Tall Filler", "Fileur pour armoire haute "],
  ["Toe Kick", "Coup-de-pied "],
  ["Baseboard-", "Plinthe "],
  ["Casing-", "Moulure de cadrage "],
  ["Filler", "Fileur "],
  ["Handle", "Poignée "]
] as const;

function overlayFor(product: Pick<ProductSummary, "id" | "sku">) {
  return FR_CA_PRODUCT_OVERLAYS[`id:${product.id}`] ?? FR_CA_PRODUCT_OVERLAYS[`sku:${product.sku}`];
}

function normalizeDisplayName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function translateProductName(name: string) {
  const normalizedName = normalizeDisplayName(name);
  const match = NAME_PREFIXES.find(([prefix]) => normalizedName.startsWith(prefix));
  return match
    ? normalizeDisplayName(`${match[1]}${normalizedName.slice(match[0].length)}`)
    : normalizedName;
}

function translateFinish(value: string | undefined) {
  return value ? FR_FINISH[value] ?? value : value;
}

// These three full-sentence templates are already complete, correctly-formatted French
// sentences with a deliberate "¾ po" (architect-confirmed intent, #42/#46). The generic
// word-by-word replacements below (which include /Plywood/gi) would otherwise consume the
// word "plywood" before these full-sentence patterns get a chance to match, so they must run
// first — but formatDisplayMeasurement ALSO runs on the whole string afterward (needed for
// the rest of the description, e.g. "34½\" H" in the same Dimensions sentence) and it blindly
// converts every ¾/½/¼ glyph to a decimal ("¾ po" -> "0,75 po") with no way to know these
// three sentences already have the correct fraction. Protecting the glyph with a placeholder
// token here and restoring it after formatDisplayMeasurement runs (see below) fixes the FR
// B27 "0,75 po" regression confirmed live during #47 deploy verification, without skipping
// translation of the rest of the same description string (Carcass/Door/Hardware/Construction).
const FRACTION_PLACEHOLDER = "\u0000FR_FRACTION\u0000";
const FULL_SENTENCE_FRACTION_TEMPLATES: Array<[RegExp, string]> = [
  [/¾"\s*plywood cabinet box with double-sided melamine/gi, `contreplaqué de ${FRACTION_PLACEHOLDER} po avec mélamine sur les deux faces`],
  [/¾" thick cabinet-grade plywood shelves with finished front edges/gi, `tablettes en contreplaqué de qualité armoire de ${FRACTION_PLACEHOLDER} po d’épaisseur avec chants avant finis`],
  [/¾" plywood drawer box with melamine finish/gi, `boîte de tiroir en contreplaqué de ${FRACTION_PLACEHOLDER} po avec fini mélamine`],
  // Architect-approved wording (2026-09-09, user-confirmed): "Porte : MDF ¾ po avec fini
  // thermoplastique, fini PVC mat doux au toucher, de style Shaker." The "Door:"/"Porte :"
  // label swap happens separately in translateGeneratedContent(); this template only covers
  // the value portion so the same translation also applies to the bare specifications.Door
  // map entry (no label prefix there).
  [/¾" MDF thermofoil\. PVC Matte Soft-Touch Finish Shaker Style/gi, `MDF ${FRACTION_PLACEHOLDER} po avec fini thermoplastique, fini PVC mat doux au toucher, de style Shaker.`]
];

function translateValue(value: string) {
  let withProtectedSentences = value;
  let hasProtectedFraction = false;
  for (const [pattern, replacement] of FULL_SENTENCE_FRACTION_TEMPLATES) {
    // These patterns carry the /g flag (needed so .replace() below swaps every occurrence,
    // e.g. two finish options on the same product both containing the same Shelves sentence),
    // which makes .test() STATEFUL: it advances pattern.lastIndex on every call and alternates
    // true/false on repeated calls with the same input, even when the string clearly matches.
    // Module-level regex objects persist across every translateValue() call for the server's
    // whole lifetime, so this bug silently dropped the fix on roughly every other product
    // during the #47 full-catalog build — confirmed by reproducing the exact alternating
    // true/false/true pattern in isolation. Reset lastIndex before every .test() to keep it
    // stateless here (the same reset is redundant-but-harmless before .replace(), since
    // .replace() with /g always scans from the start regardless of lastIndex).
    pattern.lastIndex = 0;
    if (pattern.test(withProtectedSentences)) {
      pattern.lastIndex = 0;
      withProtectedSentences = withProtectedSentences.replace(pattern, replacement);
      hasProtectedFraction = true;
    }
  }

  const translated = FR_FINISH[withProtectedSentences]
    ?? FR_EXACT_VALUE[withProtectedSentences]
    ?? FR_CA_CATEGORY_LABELS[withProtectedSentences as keyof typeof FR_CA_CATEGORY_LABELS]
    ?? FR_CA_SUBCATEGORY_LABELS[withProtectedSentences as keyof typeof FR_CA_SUBCATEGORY_LABELS]
    ?? withProtectedSentences
    .replace(/plywood cabinet box with double-sided melamine/gi, "caisson en contreplaqué avec mélamine sur les deux faces")
    .replace(/plywood cabinet box/gi, "caisson en contreplaqué")
    .replace(/Plywood/gi, "contreplaqué")
    .replace(/Double-Sided Melamine/gi, "mélamine sur les deux faces")
    .replace(/MDF door/gi, "porte en MDF")
    .replace(/with PVC Matte Soft-Touch Finish/gi, "avec fini en PVC mat doux au toucher")
    .replace(/European-style frameless cabinet construction/gi, "construction d’armoire européenne sans cadre")
    .replace(/with thermofoil finish/gi, "avec fini en thermoplastique")
    .replace(/Shaker Style/gi, "de style Shaker")
    .replace(/DTC\s+6-Way Adj\. Hinges\. This door does not include a soft-closing mechanism\./gi, "charnières DTC réglables à 6 positions. Cette porte n’inclut pas de mécanisme de fermeture amortie.")
    .replace(/This door does not include a soft-closing mechanism\./gi, "Cette porte n’inclut pas de mécanisme de fermeture amortie.")
    // Catalog strings use a space after "Adj." ("Adj. Soft-Close") and around "&"
    // ("Hinges & Drawer Slides") — these patterns must tolerate that spacing (\s*) or they
    // silently fail to match and the whole hardware sentence falls through untranslated.
    .replace(/DTC\s+6-Way Adj\.\s*Soft-Close Hinges\s*&\s*Drawer Slides/gi, "charnières DTC réglables à 6 positions et coulisses de tiroir à fermeture amortie")
    .replace(/6-Way Adj\.\s*Soft-Close Hinges\s*&\s*Drawer Slides/gi, "charnières réglables à 6 positions et coulisses de tiroir à fermeture amortie")
    .replace(/DTC\s+6-Way Adj\.\s*Soft-Close Hinges/gi, "charnières DTC réglables à 6 positions à fermeture amortie")
    .replace(/DTC\s+6-Way Adj\. Hinges/gi, "charnières DTC réglables à 6 positions")
    .replace(/Interior trim and baseboard runs/gi, "Moulures intérieures et sections de plinthe")
    .replace(/Baseboard moulding/gi, "Moulure de plinthe")
    .replace(/baseboard profile/gi, "profil de plinthe")
    .replace(/Matte Black/gi, "Noir mat")
    .replace(/Center-to-Center:/gi, "Entraxe :")
    .replace(/Overall Length:/gi, "Longueur hors tout :")
    .replace(/Projection:/gi, "Saillie :")
    .replace(/Bar Width:/gi, "Largeur de la poignée :")
    .replace(/Bar Thickness:/gi, "Épaisseur de la poignée :")
    .replace(/Material:/gi, "Matériau :")
    .replace(/Surface:/gi, "Surface :")
    .replace(/Finger Joint Pine/gi, "Pin jointé")
    .replace(/Aluminum Alloy/gi, "Alliage d’aluminium")
    .replace(/Putty White \(Sanded, Paint-Ready\)/gi, "Blanc mastic (poncé, prêt à peindre)");

  const containsMeasurement = /\d\s*(?:["']|ft\b|in\b|mm\b|cm\b|m\b|kg\b|g\b|%|[WHD]\b)|[¼½¾⅛⅜⅝⅞]|\d\s*[×*]\s*\d/i.test(translated);
  const measured = containsMeasurement ? formatDisplayMeasurement(translated, FRENCH_LOCALE) : translated;
  // Restore the protected ¾ inside the three hand-written sentences above — formatDisplayMeasurement
  // has already converted every OTHER ¾/½/¼ glyph in the rest of the string to a decimal by now.
  return hasProtectedFraction ? measured.split(FRACTION_PLACEHOLDER).join("¾") : measured;
}

function translateGeneratedContent(value: string) {
  return translateValue(value)
    .replace(/(^|\s)Dimensions:/g, "$1Dimensions :")
    .replace(/(^|\s)Carcass\/Cabinet Body:/g, "$1Caisson :")
    .replace(/(^|\s)Carcass:/g, "$1Caisson :")
    // translateValue() already ran (it's the input to this .replace chain) and its generic
    // /Material:/gi rule fires on ANY "Material:" substring, including inside "Door Material:"
    // — turning it into the mixed "Door Matériau :" BEFORE this label-specific regex gets a
    // chance to see the original "Door Material:" token. Match the already-mutated form instead.
    .replace(/(^|\s)Door Matériau\s*:/g, "$1Matériau de la porte :")
    .replace(/(^|\s)Door Material:/g, "$1Matériau de la porte :")
    .replace(/(^|\s)Door:/g, "$1Porte :")
    // The old "Porte : MDF" -> "Porte en MDF" rule that used to live here has been removed:
    // it collided with the architect/user-approved Door sentence (2026-09-09) which must keep
    // the colon verbatim — "Porte : MDF ¾ po avec fini thermoplastique, fini PVC mat doux au
    // toucher, de style Shaker." The only live Door value already produces exactly that string
    // via the FULL_SENTENCE_FRACTION_TEMPLATES entry above; no other Door value in the current
    // catalog starts with "MDF", so removing this rule does not affect anything else.
    .replace(/(^|\s)Hardware:/g, "$1Quincaillerie :")
    .replace(/(^|\s)Construction:/g, "$1Construction :")
    .replace(/(^|\s)Shelves:/g, "$1Tablettes :")
    .replace(/(^|\s)Drawer Box:/g, "$1Boîte de tiroir :");
}

function localizeImage(image: ImageAsset): ImageAsset {
  return {
    ...image,
    alt: translateGeneratedContent(translateProductName(image.alt))
      .replace(/\bSKU\b/g, "UGS")
      .replace(/primary product view/gi, "vue principale du produit")
      .replace(/product view\s+(\d+)/gi, "vue $1 du produit")
  };
}

const IDENTIFIER_SPECIFICATION_LABELS = new Set([
  "manufacturer part #",
  "item #",
  "option name",
  "sku",
  "ugs",
  "source product id",
  "source id"
]);

function isIdentifierSpecification(label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  return IDENTIFIER_SPECIFICATION_LABELS.has(normalizedLabel)
    || /(?:^|\s)(?:id|identifier)$/.test(normalizedLabel);
}

export function localizeSpecifications(
  specifications: Record<string, string>,
  overrides?: Readonly<Record<string, string>>
) {
  return Object.fromEntries(
    Object.entries(specifications).map(([key, value]) => [
      key,
      isIdentifierSpecification(key) ? value : overrides?.[key] ?? translateValue(value)
    ])
  );
}

function localizeFinishOption(option: ProductFinishOption): ProductFinishOption {
  return {
    ...option,
    name: translateFinish(option.name) ?? option.name,
    colorName: translateFinish(option.colorName),
    dimensions: option.dimensions ? formatDisplayMeasurement(translateValue(option.dimensions), FRENCH_LOCALE) : undefined,
    image: option.image ? localizeImage(option.image) : undefined,
    images: option.images?.map(localizeImage),
    description: option.description ? translateGeneratedContent(option.description) : undefined,
    productHighlights: option.productHighlights?.map(translateGeneratedContent),
    specifications: option.specifications ? localizeSpecifications(option.specifications) : undefined
  };
}

/**
 * Returns a localized display projection without mutating canonical data. Category,
 * subcategory and specification keys remain canonical so filters and business rules
 * keep stable machine keys; use the exported label helpers at presentation boundaries.
 */
export function localizeProduct<T extends ProductSummary>(product: T, locale: SiteLocale = DEFAULT_LOCALE): T {
  if (locale !== FRENCH_LOCALE) return product;

  const overlay = overlayFor(product);
  const localized: T = {
    ...product,
    name: overlay?.name ?? translateProductName(product.name),
    unit: FR_EXACT_VALUE[product.unit] ?? product.unit,
    dimensions: formatDisplayMeasurement(translateValue(product.dimensions), FRENCH_LOCALE),
    finish: translateFinish(product.finish),
    colorName: translateFinish(product.colorName) ?? product.colorName,
    images: product.images.map(localizeImage),
    finishOptions: product.finishOptions?.map(localizeFinishOption)
  };

  if (!("description" in product) || !("specifications" in product)) return localized;

  const source = product as unknown as ProductDetail;
  return {
    ...localized,
    description: overlay?.description ?? translateGeneratedContent(source.description),
    productHighlights: overlay?.productHighlights
      ? [...overlay.productHighlights]
      : source.productHighlights?.map(translateGeneratedContent),
    specifications: localizeSpecifications(source.specifications, overlay?.specifications),
    documents: source.documents?.map((document) => ({
      ...document,
      label: FR_DOCUMENT_LABELS[document.label] ?? document.label,
      type: document.type
    })),
    packageQuantity: source.packageQuantity?.displayLabel
      ? {
          ...source.packageQuantity,
          displayLabel: source.packageQuantity.displayLabel
            .replace(/^(\d+) lengths per package$/i, "$1 longueurs par emballage")
            .replace(/Each\s+(\d+)/gi, "Unité $1")
            .replace(/Inner Pack\s+(\d+)/gi, "Emballage intérieur $1")
            .replace(/Case\s+(\d+)/gi, "Caisse $1")
            .replace(/Pallet\s+(\d+)/gi, "Palette $1")
        }
      : source.packageQuantity,
    questions: overlay?.questions ? [...overlay.questions] : source.questions
  } as T;
}

export function localizeProducts<T extends ProductSummary>(products: readonly T[], locale: SiteLocale = DEFAULT_LOCALE): T[] {
  return locale === FRENCH_LOCALE ? products.map((product) => localizeProduct(product, locale)) : [...products];
}

export function localizeProductTaxonomyLabel(value: string, locale: SiteLocale = DEFAULT_LOCALE) {
  if (locale !== FRENCH_LOCALE) return value === "Handle series" ? "Handle Series" : value;
  return FR_CA_CATEGORY_LABELS[value as keyof typeof FR_CA_CATEGORY_LABELS]
    ?? FR_CA_SUBCATEGORY_LABELS[value as keyof typeof FR_CA_SUBCATEGORY_LABELS]
    ?? value;
}

const KNOWN_CATEGORY_DISPLAY_NAMES = new Set([
  ...Object.values(CATEGORY_DISPLAY_NAME_BY_SLUG),
  ...Object.keys(FR_CA_CATEGORY_LABELS)
]);

/** Human-readable category for public copy. Returns null when only a slug is known. */
export function humanReadableProductCategory(
  category: string | null | undefined,
  locale: SiteLocale = DEFAULT_LOCALE
): string | null {
  if (!category) return null;
  const trimmed = category.trim();
  if (!trimmed) return null;
  const displayName = CATEGORY_DISPLAY_NAME_BY_SLUG[trimmed] ?? trimmed;
  if (!KNOWN_CATEGORY_DISPLAY_NAMES.has(displayName)) return null;
  return localizeProductTaxonomyLabel(displayName, locale);
}

export function localizeSpecificationLabel(value: string, locale: SiteLocale = DEFAULT_LOCALE) {
  return locale === FRENCH_LOCALE
    ? FR_CA_SPECIFICATION_LABELS[value as keyof typeof FR_CA_SPECIFICATION_LABELS] ?? value
    : value;
}

export function localizeDocumentType(type: ProductDocument["type"], locale: SiteLocale = DEFAULT_LOCALE) {
  if (locale === FRENCH_LOCALE) return FR_DOCUMENT_TYPES[type];
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function localizeProductUnit(unit: string, locale: SiteLocale = DEFAULT_LOCALE) {
  return locale === FRENCH_LOCALE ? FR_EXACT_VALUE[unit] ?? unit : unit;
}

export function localizePackageQuantityLabel(label: string, locale: SiteLocale = DEFAULT_LOCALE) {
  if (locale !== FRENCH_LOCALE) return label;
  return ({ Each: "Unité", "Inner Pack": "Emballage intérieur", Case: "Caisse", Pallet: "Palette" } as const)[
    label as "Each" | "Inner Pack" | "Case" | "Pallet"
  ] ?? label;
}

export function localizeSpecificationRows<T>(
  rows: readonly (readonly [string, T])[],
  locale: SiteLocale = DEFAULT_LOCALE,
  productCategory?: string
): Array<[string, T]> {
  const isCabinet = /cabinet|vanit/i.test(productCategory ?? "");
  return rows.map(([label, value]) => [
    locale === FRENCH_LOCALE && label === "Fulfillment" && !isCabinet
      ? "Préparation de la commande"
      : localizeSpecificationLabel(label, locale),
    value
  ]);
}

function modelNumber(product: ProductDetail) {
  return product.manufacturerPartNumber ?? product.specifications["Manufacturer Part #"] ?? product.sku;
}

export function createFrCaDefaultQuestions(product: ProductDetail): ProductQuestion[] {
  const name = product.name;
  const quotedProduct = `produit « ${name} »`;
  const model = modelNumber(product);
  const category = `${product.category} ${product.subCategory ?? ""}`.toLowerCase();
  const delivery: ProductQuestion = {
    id: "dealer-delivery-timing",
    question: `Comment organise-t-on le ramassage ou la livraison du ${quotedProduct}?`,
    answer: `Le détaillant local sélectionné confirme la disponibilité du modèle nº ${model} et coordonne son ramassage ou sa livraison. Le délai et les frais de livraison applicables à votre emplacement sont confirmés après la commande.`
  };

  if (category.includes("vanit")) {
    const includesTop = /(?:^|-)TOP(?:$|-)/i.test(model);
    return [
      {
        id: "vanity-countertop-included",
        question: `Le produit « ${name} », modèle nº ${model}, comprend-il un comptoir?`,
        answer: includesTop
          ? `Oui. Le suffixe TOP du modèle nº ${model} indique que cette configuration comprend le meuble-lavabo et le comptoir.`
          : `Non. Le modèle nº ${model} comprend uniquement le meuble-lavabo, sans comptoir. Choisissez un modèle portant le suffixe TOP si un comptoir est requis.`
      },
      {
        id: "vanity-included-components",
        question: `Quels éléments sont compris avec le produit « ${name} », modèle nº ${model}?`,
        answer: `Cette configuration comprend ${includesTop ? "le meuble-lavabo et le comptoir" : "le meuble-lavabo seulement"}. Le lavabo, le robinet, le dosseret, les poignées, la quincaillerie de fixation et l’installation sont compris uniquement s’ils figurent dans les spécifications.`
      },
      {
        id: "vanity-size-installation",
        question: `Que faut-il vérifier avant d’installer le produit « ${name} »?`,
        answer: `Le modèle nº ${model} mesure ${formatDisplayMeasurement(product.dimensions, FRENCH_LOCALE)}. Vérifiez l’espace mural, l’emplacement de la plomberie ainsi que le dégagement des portes et des tiroirs avant de commander.`
      },
      delivery
    ];
  }

  if (category.includes("baseboard") || category.includes("moulding") || category.includes("casing")) {
    const productType = category.includes("casing") ? "moulure de cadrage" : "plinthe";
    return [
      {
        id: "trim-size-profile",
        question: `Quelles sont les dimensions de la ${productType} « ${name} », modèle nº ${model}?`,
        answer: `Cette ${productType} mesure ${formatDisplayMeasurement(product.dimensions, FRENCH_LOCALE)}. Vérifiez le profil, la longueur et l’épaisseur nécessaires à votre projet avant de commander.`
      },
      {
        id: "trim-material-finish",
        question: `Quel matériau et quel fini sont utilisés pour la ${productType} « ${name} »?`,
        answer: `Consultez les spécifications et les images de la ${productType} « ${name} », modèle nº ${model}, pour confirmer le matériau, le profil et le fini qui conviennent à votre projet.`
      },
      {
        id: "trim-installation",
        question: `Que faut-il vérifier avant d’installer la ${productType} « ${name} »?`,
        answer: `Avant l’installation du modèle nº ${model}, confirmez les mesures de la section à couvrir, les coupes et raccords nécessaires, la surface de fixation ainsi que les produits de fixation et de finition compatibles.`
      },
      delivery
    ];
  }

  if (category.includes("handle")) {
    return [
      {
        id: "handle-size-fit",
        question: `Quelles sont les dimensions de la poignée « ${name} », modèle nº ${model}?`,
        answer: `La poignée « ${name} », modèle nº ${model}, a la dimension indiquée de ${formatDisplayMeasurement(product.dimensions, FRENCH_LOCALE)}. Vérifiez l’entraxe existant ainsi que l’épaisseur de la porte ou du tiroir avant de commander.`
      },
      {
        id: "handle-material-finish",
        question: `Quel matériau et quel fini sont utilisés pour la poignée « ${name} »?`,
        answer: `Consultez les spécifications et les images de la poignée « ${name} », modèle nº ${model}, pour confirmer le matériau et le fini qui conviennent à votre projet.`
      },
      {
        id: "handle-installation-parts",
        question: `Les vis d’installation sont-elles comprises avec la poignée « ${name} »?`,
        answer: `Les vis et autres pièces d’installation sont comprises uniquement si elles figurent dans les spécifications. Confirmez la longueur de vis et l’épaisseur de panneau compatibles avec votre détaillant local.`
      },
      delivery
    ];
  }

  return [
    {
      id: "product-dimensions",
      question: `Quelles sont les dimensions du produit « ${name} », modèle nº ${model}?`,
      answer: `Ce modèle mesure ${formatDisplayMeasurement(product.dimensions, FRENCH_LOCALE)}. Vérifiez l’ouverture, les dégagements et l’orientation nécessaires à votre projet avant de commander.`
    },
    {
      id: "product-included-components",
      question: `Quels éléments sont compris avec le produit « ${name} », modèle nº ${model}?`,
      answer: `Cette configuration comprend le produit décrit dans cette fiche. Les comptoirs, électroménagers, accessoires décoratifs, fileurs, moulures et matériaux d’installation sont compris uniquement s’ils figurent dans les spécifications.`
    },
    {
      id: "product-installation",
      question: `Que faut-il confirmer avant d’installer le produit « ${name} »?`,
      answer: `Avant l’installation du modèle nº ${model}, confirmez les dimensions, la surface de fixation, les dégagements requis, les éléments compatibles du projet et les exigences d’assemblage.`
    },
    delivery
  ];
}
