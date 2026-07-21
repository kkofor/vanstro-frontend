import type {
  Money,
  PackageQuantity,
  ProductDetail,
  ProductDocument,
  ProductQuestion,
  ProductRatingSummary,
  ProductReview,
  ProductSummary
} from "@/lib/api/api-contract";
import {
  getCompareAtPrice,
  getEffectivePrice,
  getProductPricing,
  getPromotionBadges,
  getSavingsLabel
} from "@/lib/commerce/product-commerce";
import { formatProductSize } from "@/lib/product/product-display";

export type SpecificationRow = [label: string, value: string];
export type PackageQuantityRow = [label: string, value: number];

export type ProductDetailViewModel = {
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

export function buildSpecRows(specifications: Record<string, string>): SpecificationRow[] {
  const preferredOrder = [
    "Brand",
    "Category",
    "SKU",
    "Item #",
    "Manufacturer Part #",
    "Dimensions",
    "Width",
    "Height",
    "Depth",
    "Depth / Thickness",
    "Length",
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
    const value = specifications[label];
    if (!value) return [];
    consumedLabels.add(label);
    return [[label, value] as SpecificationRow];
  });
  const remainingRows = Object.entries(specifications).filter(([label]) => !consumedLabels.has(label)) as SpecificationRow[];

  return [...orderedRows, ...remainingRows];
}

function createDefaultQuestions(product: ProductDetail): ProductQuestion[] {
  return [
    {
      id: "confirm-before-checkout",
      question: "What should I confirm before checkout?",
      answer: "Confirm the selected dealer, pickup or delivery method, finish, dimensions and any project pieces that are not included with this item."
    },
    {
      id: "included-project-pieces",
      question: "Is the sink, top or hardware included?",
      answer: product.category.toLowerCase().includes("vanit")
        ? "Sink, top and faucet selections are not included in this cabinet listing. Confirm those project pieces with your dealer."
        : "Project add-ons such as countertops, fillers, trim and hardware should be confirmed separately before checkout."
    },
    {
      id: "dealer-delivery-timing",
      question: "Can my dealer confirm delivery timing?",
      answer: "Yes. The selected VanStro dealer confirms pickup or local delivery timing after the order is placed."
    }
  ];
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
  allProducts: ProductSummary[]
): ProductDetailViewModel {
  const brandName = product.brand ?? "VanStro";
  const manufacturerPartNumber =
    product.manufacturerPartNumber ?? product.specifications["Manufacturer Part #"] ?? product.sku;
  const colorName = product.colorName ?? product.finish ?? product.specifications.Color ?? "Standard finish";
  const colorHex = product.colorHex ?? product.finishOptions?.find((option) => option.active)?.colorHex ?? "#f4f2ee";
  const documents = product.documents ?? [];
  const packageRows = formatPackageQuantity(product.packageQuantity);
  const displayDimensions = formatProductSize(product.specifications.Dimensions ?? product.dimensions);
  const specRows = buildSpecRows({
    ...product.specifications,
    Dimensions: displayDimensions
  });
  const pricing = getProductPricing(product);

  return {
    product,
    categoryFilter: categoryToProductFilter(product.category),
    brandName,
    manufacturerPartNumber,
    colorName,
    colorHex,
    activeFinishName: product.finishOptions?.find((option) => option.active)?.name ?? colorName,
    documents,
    packageRows,
    specRows,
    featuredSpecRows: specRows.slice(0, 6),
    technicalSpecRows: specRows.slice(6, 14),
    pricing,
    effectivePrice: getEffectivePrice(product),
    compareAtPrice: getCompareAtPrice(product),
    promotionBadges: getPromotionBadges(product),
    savingsLabel: getSavingsLabel(product),
    productHighlights: product.productHighlights ?? [],
    reviewSummary: product.ratingSummary ?? {
      average: 0,
      count: 0,
      sourceLabel: "No published reviews.",
      writeReviewEnabled: true
    },
    reviews: product.reviews ?? [],
    questions: product.questions ?? createDefaultQuestions(product),
    completeProjectProducts: selectCompleteProjectProducts(product, allProducts)
  };
}
