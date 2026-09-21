import type { ProductDocument } from "@/lib/api/api-contract";

export type ResourceCategory = "catalog" | "installation" | "warranty";

export type ResourceDocument = {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  href: string;
  sourceUrl: string;
  fileSize: string;
  pages: number;
  language: string;
  appliesTo?: string;
  skuPrefixes?: string[];
};

export const resourceDocuments: ResourceDocument[] = [
  {
    id: "cabinet-catalog-2026",
    title: "Cabinet Product Catalog — Summer 2026",
    description: "Product catalog for VanStro kitchen cabinets and bathroom vanities.",
    category: "catalog",
    href: "/resources/vanstro-cabinet-product-catalog-spring-2026.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/product_catalogs_Cabinet_Product_Catalog_Spring2026_1781187909.pdf",
    fileSize: "19.0 MB",
    pages: 40,
    language: "English / Français",
    appliesTo: "Kitchen cabinets and bathroom vanities"
  },
  {
    id: "trim-catalog-2026",
    title: "Baseboard, Casing & Moulding Catalog — Spring 2026",
    description: "Profiles and product information for VanStro interior trim and mouldings.",
    category: "catalog",
    href: "/resources/vanstro-trim-moulding-catalog-spring-2026.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/product_catalogs_Baseboard_Casing_Moulding_Catalog_Spring2026_1781187909.pdf",
    fileSize: "1.4 MB",
    pages: 2,
    language: "English / Français",
    appliesTo: "Baseboards, casing and mouldings"
  },
  {
    id: "pvc-wall-panel-finishes-part-1",
    title: "AG4-1PVC Finish_V2026-1_0",
    description: "Metallic film finish samples for VanStro PVC wall panels.",
    category: "catalog",
    href: "/resources/vanstro-pvc-wall-panel-finishes-part-1.pdf",
    sourceUrl: "",
    fileSize: "166 MB",
    pages: 344,
    language: "English",
    appliesTo: "PVC wall panels"
  },
  {
    id: "pvc-wall-panel-finishes-part-2",
    title: "AG4-2PVC Finish_V2026-1_0",
    description: "Wood grain finish samples for VanStro PVC wall panels.",
    category: "catalog",
    href: "/resources/vanstro-pvc-wall-panel-finishes-part-2.pdf",
    sourceUrl: "",
    fileSize: "89.8 MB",
    pages: 111,
    language: "English",
    appliesTo: "PVC wall panels"
  },
  {
    id: "pvc-wall-panel-finishes-part-3",
    title: "AG4-3PVC Finish_V2026-1_2",
    description: "Stone-look finish samples for VanStro PVC wall panels.",
    category: "catalog",
    href: "/resources/vanstro-pvc-wall-panel-finishes-part-3.pdf",
    sourceUrl: "",
    fileSize: "44.7 MB",
    pages: 93,
    language: "English",
    appliesTo: "PVC wall panels"
  },
  {
    id: "pvc-wall-panel-finishes-part-4",
    title: "AG4-4PVC Finish_V2026-1_2",
    description: "Additional wood grain finish samples with colour codes.",
    category: "catalog",
    href: "/resources/vanstro-pvc-wall-panel-finishes-part-4.pdf",
    sourceUrl: "",
    fileSize: "45.4 MB",
    pages: 231,
    language: "English",
    appliesTo: "PVC wall panels"
  },
  {
    id: "fluted-wall-panel-catalog-v2026-1-0",
    title: "Vanstro-Fluted-Wall-Panel-Catalog-V2026-1-0",
    description: "Product catalog for VanStro fluted wall panels.",
    category: "catalog",
    href: "/resources/Vanstro-Fluted-Wall-Panel-Catalog-V2026-1-0.pdf",
    sourceUrl: "",
    fileSize: "2.7 MB",
    pages: 12,
    language: "English / Français",
    appliesTo: "Fluted wall panels"
  },
  {
    id: "vanity-install-vs24-vs27-vs30",
    title: "Vanity Installation Guide — VS24, VS27 & VS30",
    description: "Assembly and installation instructions for the listed two-door vanity families.",
    category: "installation",
    href: "/resources/vanstro-vanity-installation-guide-vs24-vs27-vs30.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/installation_guides_SKU022421011-14_022721011-14_023021011-14_1781189806.pdf",
    fileSize: "2.1 MB",
    pages: 12,
    language: "English / Français",
    appliesTo: "SKU 022421011–014, 022721011–014 and 023021011–014",
    skuPrefixes: ["02242101", "02272101", "02302101"]
  },
  {
    id: "vanity-install-v3021stdr",
    title: "Vanity Installation Guide — V3021STDR",
    description: "Assembly and installation instructions for the right-hand single-door, two-drawer vanity family.",
    category: "installation",
    href: "/resources/vanstro-vanity-installation-guide-v3021stdr.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/installation_guides_SKU023021211-14_1781189806.pdf",
    fileSize: "2.7 MB",
    pages: 18,
    language: "English / Français",
    appliesTo: "SKU 023021211–214",
    skuPrefixes: ["02302121"]
  },
  {
    id: "vanity-install-v3021stdl",
    title: "Vanity Installation Guide — V3021STDL",
    description: "Assembly and installation instructions for the left-hand single-door, two-drawer vanity family.",
    category: "installation",
    href: "/resources/vanstro-vanity-installation-guide-v3021stdl.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/installation_guides_SKU023021311-14_1781189806.pdf",
    fileSize: "2.7 MB",
    pages: 18,
    language: "English / Français",
    appliesTo: "SKU 023021311–314",
    skuPrefixes: ["02302131"]
  },
  {
    id: "vanity-install-v3021tdr-v3621tdr",
    title: "Vanity Installation Guide — V3021TDR & V3621TDR",
    description: "Assembly and installation instructions for right-hand double-door, two-drawer vanity families.",
    category: "installation",
    href: "/resources/vanstro-vanity-installation-guide-v3021tdr-v3621tdr.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/installation_guides_SKU023021411-14_023621411-14_1781189806.pdf",
    fileSize: "2.9 MB",
    pages: 18,
    language: "English / Français",
    appliesTo: "SKU 023021411–414 and 023621411–414",
    skuPrefixes: ["02302141", "02362141"]
  },
  {
    id: "vanity-install-v3021tdl-v3621tdl",
    title: "Vanity Installation Guide — V3021TDL & V3621TDL",
    description: "Assembly and installation instructions for left-hand double-door, two-drawer vanity families.",
    category: "installation",
    href: "/resources/vanstro-vanity-installation-guide-v3021tdl-v3621tdl.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/installation_guides_SKU023021511-14_023621511-14_1781189806.pdf",
    fileSize: "2.7 MB",
    pages: 18,
    language: "English / Français",
    appliesTo: "SKU 023021511–514 and 023621511–514",
    skuPrefixes: ["02302151", "02362151"]
  },
  {
    id: "vanity-install-vs36",
    title: "Vanity Installation Guide — VS36",
    description: "Assembly and installation instructions for the 36-inch two-door vanity family.",
    category: "installation",
    href: "/resources/vanstro-vanity-installation-guide-vs36.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/installation_guides_SKU023621011-14_1781189806.pdf",
    fileSize: "2.1 MB",
    pages: 12,
    language: "English / Français",
    appliesTo: "SKU 023621011–014",
    skuPrefixes: ["02362101"]
  },
  {
    id: "vanity-install-v4221-v4821",
    title: "Vanity Installation Guide — V4221 & V4821",
    description: "Assembly and installation instructions for the double-door, six-drawer vanity families.",
    category: "installation",
    href: "/resources/vanstro-vanity-installation-guide-v4221-v4821.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/installation_guides_SKU024221611-14_024821611-14_1781189806.pdf",
    fileSize: "2.8 MB",
    pages: 17,
    language: "English / Français",
    appliesTo: "SKU 024221611–614 and 024821611–614",
    skuPrefixes: ["02422161", "02482161"]
  },
  {
    id: "vanity-install-v6621",
    title: "Vanity Installation Guide — SKU 026621711–714",
    description: "Assembly and installation instructions for the listed four-door, three-drawer vanity family.",
    category: "installation",
    href: "/resources/vanstro-vanity-installation-guide-v6621.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/installation_guides_SKU026621711-14_1781189806.pdf",
    fileSize: "3.7 MB",
    pages: 22,
    language: "English / Français",
    appliesTo: "SKU 026621711–714",
    skuPrefixes: ["02662171"]
  },
  {
    id: "cabinet-vanity-warranty-2026",
    title: "Cabinet & Vanity Limited 12-Month Warranty — 2026",
    description: "Current limited warranty terms, exclusions and claim requirements for eligible VanStro cabinet and vanity products.",
    category: "warranty",
    href: "/resources/vanstro-cabinet-vanity-warranty-2026-en-fr.pdf",
    sourceUrl: "https://vanstro.vip/data/resource_center/warranty_VanStro_Cabinet_Vanity_Warranty_Policy_EN-FR_V2026_1781221822.pdf",
    fileSize: "110 KB",
    pages: 6,
    language: "English / Français",
    appliesTo: "Eligible kitchen cabinets and bathroom vanities"
  }
];

export const resourceCategories = [
  { id: "catalog" as const, title: "Product catalogs", description: "Browse current product families, dimensions and available configurations." },
  { id: "installation" as const, title: "Installation guides", description: "Find the guide that matches the SKU shown on your product page or order." },
  { id: "warranty" as const, title: "Warranty information", description: "Review current coverage, exclusions and claim requirements before installation." }
];

export function getResourceCenterHref(resourceId: string) {
  return `/articles/#resource-${resourceId}`;
}

function isCabinetOrVanity(category: string) {
  const normalized = category.toLowerCase();
  return normalized.includes("kitchen cabinet") || normalized.includes("bathroom vanit");
}

export function getProductResourceDocuments(product: { sku: string; category: string }): ProductDocument[] {
  const documents: ProductDocument[] = [];
  const normalizedCategory = product.category.toLowerCase();

  if (isCabinetOrVanity(product.category)) {
    const catalog = resourceDocuments.find((resource) => resource.id === "cabinet-catalog-2026");
    const warranty = resourceDocuments.find((resource) => resource.id === "cabinet-vanity-warranty-2026");
    if (catalog) documents.push({ label: catalog.title, type: "specification", href: getResourceCenterHref(catalog.id) });
    if (warranty) documents.push({ label: warranty.title, type: "warranty", href: getResourceCenterHref(warranty.id) });
  } else if (normalizedCategory.includes("baseboard") || normalizedCategory.includes("moulding")) {
    const catalog = resourceDocuments.find((resource) => resource.id === "trim-catalog-2026");
    if (catalog) documents.push({ label: catalog.title, type: "specification", href: getResourceCenterHref(catalog.id) });
  }

  const installationGuide = resourceDocuments.find(
    (resource) => resource.category === "installation" && resource.skuPrefixes?.some((prefix) => product.sku.startsWith(prefix))
  );
  if (installationGuide) {
    documents.unshift({ label: installationGuide.title, type: "installation", href: getResourceCenterHref(installationGuide.id) });
  }

  return documents;
}
