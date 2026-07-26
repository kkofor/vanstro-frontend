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

export type CatalogCategoryOption = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  matches: string[];
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

export const CATALOG_CATEGORY_OPTIONS: CatalogCategoryOption[] = [
  {
    id: "all",
    label: "All products",
    shortLabel: "All",
    description: "Full VanStro catalog",
    matches: []
  },
  {
    id: "kitchen-cabinets",
    label: "Kitchen cabinets",
    shortLabel: "Kitchen",
    description: "Base, wall and pantry cabinets",
    matches: ["Kitchen Cabinets"]
  },
  {
    id: "bathroom-vanities",
    label: "Bathroom vanities",
    shortLabel: "Vanities",
    description: "Vanity cabinets and bath storage",
    matches: ["Bathroom Vanities"]
  },
  {
    id: "handle-series",
    label: "Handle series",
    shortLabel: "Handles",
    description: "Cabinet handles and hardware",
    matches: ["Handle series"]
  },
  {
    id: "baseboards",
    label: "Trim and baseboards",
    shortLabel: "Trim",
    description: "Primed mouldings and profiles",
    matches: ["Baseboards & Mouldings"]
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

const FR_CATEGORY_LABELS: Readonly<Record<string, Pick<CatalogCategoryOption, "label" | "shortLabel" | "description">>> = {
  all: { label: "Tous les produits", shortLabel: "Tous", description: "Catalogue VanStro complet" },
  "kitchen-cabinets": { label: "Armoires de cuisine", shortLabel: "Cuisine", description: "Armoires de base, murales et hautes" },
  "bathroom-vanities": { label: "Meubles-lavabos", shortLabel: "Meubles-lavabos", description: "Meubles-lavabos et rangement de salle de bain" },
  "handle-series": { label: "Collection de poignées", shortLabel: "Poignées", description: "Poignées et quincaillerie d’armoire" },
  baseboards: { label: "Moulures et plinthes", shortLabel: "Moulures", description: "Moulures et profilés apprêtés" }
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

export function getCatalogCategoryOptions(locale: CatalogLocale = "en-CA"): CatalogCategoryOption[] {
  return locale === "fr-CA"
    ? CATALOG_CATEGORY_OPTIONS.map((option) => ({ ...option, ...FR_CATEGORY_LABELS[option.id] }))
    : CATALOG_CATEGORY_OPTIONS;
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
