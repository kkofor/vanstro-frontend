export const HOME_PRODUCT_LIMIT = 6;

export const CATALOG_PAGE_SIZE = 24;

export type CatalogCategoryOption = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  matches: string[];
  image?: string;
  comingSoon?: boolean;
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
    id: "baseboards",
    label: "Trim and baseboards",
    shortLabel: "Trim",
    description: "Primed mouldings and profiles",
    matches: ["Baseboards & Mouldings"]
  },
  {
    id: "flooring",
    label: "Flooring",
    shortLabel: "Flooring",
    description: "Laminate and vinyl catalog",
    matches: [],
    comingSoon: true
  },
  {
    id: "doors-windows",
    label: "Doors and windows",
    shortLabel: "Doors",
    description: "Interior and exterior openings",
    matches: [],
    comingSoon: true
  }
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
