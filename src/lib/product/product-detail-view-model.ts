import type {
  Money,
  PackageQuantity,
  ProductDetail,
  ProductDocument,
  ProductQuestion,
  ProductRatingSummary,
  ProductReview,
  ProductSummary
} from "../api/api-contract.ts";
import {
  getCompareAtPrice,
  getEffectivePrice,
  getProductPricing,
  getPromotionBadges,
  getSavingsLabel
} from "../commerce/product-commerce.ts";
import { formatProductSize } from "./product-display.ts";
import type { SiteLocale } from "../i18n/locale.ts";
import { DEFAULT_LOCALE, FRENCH_LOCALE } from "../i18n/locale.ts";
import {
  createFrCaDefaultQuestions,
  localizeProducts,
  localizeSpecificationRows
} from "./product-localization.ts";

export type SpecificationRow = [label: string, value: string];
export type PackageQuantityRow = [label: string, value: number];

export type ProductDetailViewModel = {
  locale: SiteLocale;
  product: ProductDetail;
  categoryFilter: string;
  brandName: string;
  manufacturerPartNumber: string;
  colorName: string;
  colorHex: string;
  activeFinishName: string;
  documents: ProductDocument[];
  packageRows: PackageQuantityRow[];
  specRows: SpecificationRow[];
  featuredSpecRows: SpecificationRow[];
  technicalSpecRows: SpecificationRow[];
  pricing: ReturnType<typeof getProductPricing>;
  effectivePrice: Money;
  compareAtPrice?: Money;
  promotionBadges: ReturnType<typeof getPromotionBadges>;
  savingsLabel: string;
  productHighlights: string[];
  reviewSummary: ProductRatingSummary;
  reviews: ProductReview[];
  questions: ProductQuestion[];
  completeProjectProducts: ProductSummary[];
};

export function categoryToProductFilter(category: string) {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory.includes("bathroom")) return "bathroom-vanities";
  if (normalizedCategory.includes("handle")) return "handle-series";
  if (normalizedCategory.includes("baseboard") || normalizedCategory.includes("moulding")) {
    return "baseboards";
  }

  return "kitchen-cabinets";
}

export function formatPackageQuantity(packageQuantity?: PackageQuantity): PackageQuantityRow[] {
  const quantity = packageQuantity ?? { each: 1 };

  return [
    ["Each", quantity.each],
    ["Inner Pack", quantity.innerPack],
    ["Case", quantity.case],
    ["Pallet", quantity.pallet]
  ].filter(([, value]) => typeof value === "number") as PackageQuantityRow[];
}

const INTERNAL_SPECIFICATION_LABELS = new Set(["option name"]);

const HIDDEN_SPECIFICATIONS_BY_SUBCATEGORY: Record<string, Set<string>> = {
  "Open End Shelf": new Set(["door", "hardware"]),
  "3-Drawer Base": new Set(["door", "hardware"]),
  "Wall Cabinet": new Set(["hardware"]),
  "Wall Cabinet (GD)": new Set(["hardware"]),
  "Diagonal Corner Wall": new Set(["hardware"]),
  "Microwave Cabinet": new Set(["hardware"])
};

export function getPublicSpecifications(product: Pick<ProductDetail, "specifications" | "subCategory">) {
  const hiddenLabels = HIDDEN_SPECIFICATIONS_BY_SUBCATEGORY[product.subCategory ?? ""] ?? new Set<string>();

  return Object.fromEntries(
    Object.entries(product.specifications).filter(([label]) => {
      const normalizedLabel = label.toLowerCase();
      return !INTERNAL_SPECIFICATION_LABELS.has(normalizedLabel) && !hiddenLabels.has(normalizedLabel);
    })
  );
}

export function getPublicProductHighlights(product: Pick<ProductDetail, "productHighlights" | "subCategory">) {
  const hiddenLabels = HIDDEN_SPECIFICATIONS_BY_SUBCATEGORY[product.subCategory ?? ""] ?? new Set<string>();

  return (product.productHighlights ?? []).filter((highlight) => {
    const label = highlight.split(":", 1)[0]?.trim().toLowerCase();
    return label !== "dimensions" && !INTERNAL_SPECIFICATION_LABELS.has(label) && !hiddenLabels.has(label);
  });
}

export function buildSpecRows(
  specifications: Record<string, string>,
  subCategory?: string
): SpecificationRow[] {
  const publicSpecifications = getPublicSpecifications({ specifications, subCategory });
  const preferredOrder = [
    "Brand",
    "Category",
    "Source category",
    "SKU",
    "Source product ID",
    "Item #",
    "Manufacturer Part #",
    "Dimensions",
    "Width",
    "Height",
    "Depth",
    "Depth / Thickness",
    "Length",
    "Center to Center",
    "Center-to-Center",
    "Hole Spacing",
    "Overall Length",
    "Projection",
    "Bar Width",
    "Bar Thickness",
    "Cabinet Type",
    "Product Type",
    "Material",
    "Box Material",
    "Exterior Material",
    "Finish",
    "Finish Family",
    "Color",
    "Door Configuration",
    "Drawer Configuration",
    "Shelf Count",
    "Profile",
    "Application",
    "Unit",
    "Use",
    "Assembly",
    "Fulfillment",
    "Warranty"
  ];
  const consumedLabels = new Set<string>();
  const orderedRows = preferredOrder.flatMap((label) => {
    const value = publicSpecifications[label];
    if (!value) return [];
    consumedLabels.add(label);
    return [[label, value] as SpecificationRow];
  });
  const remainingRows = Object.entries(publicSpecifications).filter(([label]) => !consumedLabels.has(label)) as SpecificationRow[];

  return [...orderedRows, ...remainingRows];
}

function getModelNumber(product: ProductDetail) {
  return product.manufacturerPartNumber ?? product.specifications["Manufacturer Part #"] ?? product.sku;
}

function getSpecifiedValue(product: ProductDetail, labels: string[]) {
  const entry = Object.entries(product.specifications).find(([label]) =>
    labels.some((candidate) => label.toLowerCase() === candidate.toLowerCase())
  );

  return entry?.[1];
}

function formatHardwareDescription(hardware: string) {
  return hardware
    .replace(/6-Way\s+Adj\.Soft-Close\s+Hinges&\s+Drawer Slides/gi, "six-way adjustable soft-close hinges and drawer slides")
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

function createDeliveryQuestion(productName: string, modelNumber: string): ProductQuestion {
  return {
    id: "dealer-delivery-timing",
    question: `How are pickup and delivery arranged for ${productName}?`,
    answer: `Your selected local dealer confirms availability and coordinates pickup or delivery for ${productName}, Model #${modelNumber}. Timing and any delivery charges are confirmed for your location after the order is placed.`
  };
}

function createVanityQuestions(product: ProductDetail, productName: string, modelNumber: string) {
  const includesTop = /(?:^|-)TOP(?:$|-)/i.test(modelNumber);
  const assembly = getSpecifiedValue(product, ["Assembly", "Assembly Required"]);
  const configuration = includesTop
    ? "the vanity cabinet and countertop"
    : "the vanity cabinet only; a countertop is not included";

  return [
    {
      id: "vanity-countertop-included",
      question: `Does ${productName}, Model #${modelNumber}, include a countertop?`,
      answer: includesTop
        ? `Yes. The TOP suffix in Model #${modelNumber} identifies this configuration of ${productName} as including the vanity cabinet and countertop.`
        : `No. ${productName}, Model #${modelNumber}, is the vanity cabinet-only configuration and does not include a countertop. Choose a Model # with the TOP suffix when a countertop is required.`
    },
    {
      id: "vanity-included-components",
      question: `What is included with ${productName}, Model #${modelNumber}?`,
      answer: `${productName}, Model #${modelNumber}, includes ${configuration}. A sink, faucet, backsplash, handles, mounting hardware and installation are included only when they are specifically listed in the product specifications. Confirm any unlisted components with your local dealer before ordering.`
    },
    {
      id: "vanity-size-installation",
      question: `What should I verify before installing ${productName}?`,
      answer: `${productName}, Model #${modelNumber}, measures ${formatProductSize(product.dimensions)}. Confirm the available wall space, plumbing locations, countertop and sink openings, door and drawer clearances${assembly ? `, and the listed assembly requirement (${assembly})` : " and whether assembly is required"} before ordering.`
    },
    createDeliveryQuestion(productName, modelNumber)
  ];
}

function createHandleQuestions(product: ProductDetail, productName: string, modelNumber: string) {
  const centerToCenter = getSpecifiedValue(product, ["Center-to-Center", "Center to Center", "Hole Spacing"]);
  const material = getSpecifiedValue(product, ["Material"]);
  const finish = getSpecifiedValue(product, ["Finish", "Color"]);

  return [
    {
      id: "handle-size-fit",
      question: `What size is ${productName}, Model #${modelNumber}?`,
      answer: `${productName}, Model #${modelNumber}, has ${centerToCenter ? `a ${centerToCenter} centre-to-centre hole spacing` : `the listed size of ${formatProductSize(product.dimensions)}`}. Confirm the existing hole spacing and door or drawer thickness before ordering.`
    },
    {
      id: "handle-material-finish",
      question: `What material and finish does ${productName} use?`,
      answer: `${productName}, Model #${modelNumber}, is listed${material ? ` in ${material}` : " with the material shown in its specifications"}${finish ? ` and a ${finish} finish` : ""}. Review the product images and specifications to confirm the finish for your project.`
    },
    {
      id: "handle-installation-parts",
      question: `Are installation screws included with ${productName}?`,
      answer: `Screws and other installation parts are included with ${productName}, Model #${modelNumber}, only when they are specifically listed in the product specifications. Confirm the required screw length and compatible panel thickness with your local dealer before installation.`
    },
    createDeliveryQuestion(productName, modelNumber)
  ];
}

function createGeneralProductQuestions(product: ProductDetail, productName: string, modelNumber: string) {
  const publicSpecifications = getPublicSpecifications(product);
  const hardware = publicSpecifications.Hardware;
  const hardwareDescription = hardware ? formatHardwareDescription(hardware) : undefined;
  const assembly = getSpecifiedValue(product, ["Assembly", "Assembly Required"]);

  return [
    {
      id: "product-dimensions",
      question: `What are the dimensions of ${productName}, Model #${modelNumber}?`,
      answer: `${productName}, Model #${modelNumber}, measures ${formatProductSize(product.dimensions)}. Confirm the opening, clearances and orientation required for your project before ordering.`
    },
    {
      id: "product-included-components",
      question: `What is included with ${productName}, Model #${modelNumber}?`,
      answer: `${productName}, Model #${modelNumber}, includes the product described in this listing${hardwareDescription ? ` with the listed hardware: ${hardwareDescription}` : ""}. Countertops, appliances, decorative hardware, fillers, trim and installation materials are included only when specifically listed in the product specifications.`
    },
    {
      id: "product-installation",
      question: `What should I confirm before installing ${productName}?`,
      answer: `Before installing ${productName}, Model #${modelNumber}, confirm the dimensions, mounting surface, required clearances, compatible project pieces${assembly ? ` and the listed assembly requirement (${assembly})` : ", whether assembly is required"}. Ask your local dealer about any requirement not stated in the specifications.`
    },
    createDeliveryQuestion(productName, modelNumber)
  ];
}

export function createDefaultQuestions(product: ProductDetail): ProductQuestion[] {
  const productName = product.name;
  const modelNumber = getModelNumber(product);
  const normalizedCategory = `${product.category} ${product.subCategory ?? ""}`.toLowerCase();

  if (normalizedCategory.includes("vanit")) {
    return createVanityQuestions(product, productName, modelNumber);
  }

  if (normalizedCategory.includes("handle")) {
    return createHandleQuestions(product, productName, modelNumber);
  }

  return createGeneralProductQuestions(product, productName, modelNumber);
}

function selectConfiguredProducts(productIds: string[] | undefined, allProducts: ProductSummary[]) {
  if (!productIds?.length) return [];
  const productByIdOrSlug = new Map<string, ProductSummary>();
  allProducts.forEach((product) => {
    productByIdOrSlug.set(product.id, product);
    productByIdOrSlug.set(product.slug, product);
    productByIdOrSlug.set(product.sku, product);
  });

  return productIds.flatMap((id) => {
    const product = productByIdOrSlug.get(id);
    return product ? [product] : [];
  });
}

function selectCompleteProjectProducts(product: ProductDetail, allProducts: ProductSummary[]) {
  const configuredProducts = selectConfiguredProducts(
    product.recommendations?.completeProjectProductIds,
    allProducts
  );
  if (configuredProducts.length) return configuredProducts.slice(0, 3);

  const otherProducts = allProducts.filter((railProduct) => railProduct.id !== product.id);
  return [
    ...otherProducts.filter((railProduct) => railProduct.category === product.category),
    ...otherProducts.filter((railProduct) => railProduct.category !== product.category)
  ].slice(0, 3);
}

export function createProductDetailViewModel(
  product: ProductDetail,
  allProducts: ProductSummary[],
  locale: SiteLocale = DEFAULT_LOCALE
): ProductDetailViewModel {
  const brandName = product.brand ?? "VanStro";
  const manufacturerPartNumber =
    product.manufacturerPartNumber ?? product.specifications["Manufacturer Part #"] ?? product.sku;
  const colorName = product.colorName ?? product.finish ?? product.specifications.Color ?? "Standard finish";
  const colorHex = product.colorHex ?? product.finishOptions?.find((option) => option.active)?.colorHex ?? "#f4f2ee";
  const documents = product.documents ?? [];
  const packageRows = formatPackageQuantity(product.packageQuantity);
  const displayDimensions = formatProductSize(product.specifications.Dimensions ?? product.dimensions, locale);
  const specRows = buildSpecRows(
    {
      ...product.specifications,
      Dimensions: displayDimensions
    },
    product.subCategory
  );
  const localizedSpecRows = localizeSpecificationRows(
    specRows,
    locale,
    `${product.category} ${product.subCategory ?? ""}`
  );
  const pricing = getProductPricing(product);

  return {
    locale,
    product,
    categoryFilter: categoryToProductFilter(product.category),
    brandName,
    manufacturerPartNumber,
    colorName,
    colorHex,
    activeFinishName: product.finishOptions?.find((option) => option.active)?.name ?? colorName,
    documents,
    packageRows,
    specRows: localizedSpecRows,
    featuredSpecRows: localizedSpecRows.slice(0, 6),
    technicalSpecRows: localizedSpecRows.slice(6, 14),
    pricing,
    effectivePrice: getEffectivePrice(product),
    compareAtPrice: getCompareAtPrice(product),
    promotionBadges: getPromotionBadges(product),
    savingsLabel: getSavingsLabel(product, locale),
    productHighlights: product.productHighlights ?? [],
    reviewSummary: product.ratingSummary ?? {
      average: 0,
      count: 0,
      sourceLabel: "No published reviews.",
      writeReviewEnabled: true
    },
    reviews: product.reviews ?? [],
    questions: product.questions ?? (locale === FRENCH_LOCALE ? createFrCaDefaultQuestions(product) : createDefaultQuestions(product)),
    completeProjectProducts: localizeProducts(selectCompleteProjectProducts(product, allProducts), locale)
  };
}
