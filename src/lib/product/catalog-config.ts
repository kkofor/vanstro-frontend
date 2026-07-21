export const HOME_PRODUCT_LIMIT = 8;

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
