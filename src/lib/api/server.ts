import {
  articleDetails,
  articles,
  banners,
  dealers,
  mockCart,
  mockFavorites,
  productDetails,
  products,
  productsWithCommerce
} from "@/lib/data/mock-data";
import { API_ENDPOINTS } from "@/lib/api/api-contract";
import type {
  ApiResult,
  CategorySummary,
  CurrencyCode,
  StorefrontDealerSummary,
  ImageAsset,
  ProductDetail,
  ProductRatingSummary,
  ProductReview,
  ProductSummary,
  WebsiteApiProduct
} from "@/lib/api/api-contract";
import { applyReviewSeed, applyReviewSeedToSummary } from "@/lib/product/product-reviews-seed";
import {
  arrayOf,
  objectValue,
  RuntimeValidator,
  validateApiResult,
  validateCategorySummary,
  validateWebsiteApiProduct
} from "@/lib/api/runtime-validation";
import { fetchCompleteCatalog } from "@/lib/api/catalog-pagination";
import { assetPath } from "@/lib/assets";
import { selectHomeFeaturedProducts } from "@/lib/product/home-featured-products";
import productImageDimensionsData from "@/lib/data/product-image-dimensions.json";
import { FRENCH_LOCALE, type SiteLocale } from "@/lib/i18n/locale";
import {
  localizeProduct,
  localizeProducts,
  localizeProductTaxonomyLabel
} from "@/lib/product/product-localization";
import {
  getFallbackCatalogCategoryOptions,
  isSeedFixtureCategory,
  localizeCatalogCategoryOption,
  toCatalogCategoryOptions,
  toCatalogFilterableCategoryOptions,
  type CatalogCategoryOption
} from "@/lib/product/catalog-config";

const productImageDimensions = productImageDimensionsData as unknown as Record<
  string,
  [number, number]
>;

const serverApiBaseUrl =
  process.env.VANSTRO_WEBSITE_API_BASE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const fixtureCatalogEnabled =
  process.env.NODE_ENV !== "production" || process.env.VANSTRO_ALLOW_FIXTURE_CATALOG === "true";

function getStaticHomeProducts() {
  return selectHomeFeaturedProducts(productsWithCommerce);
}

function asCurrencyCode(currency?: string): CurrencyCode {
  return currency === "USD" ? "USD" : "CAD";
}

async function fetchWebsiteApiResult<T>(
  path: string,
  validateData: RuntimeValidator<T>,
  options?: { notFoundAsUndefined?: boolean }
): Promise<ApiResult<T> | undefined> {
  if (!serverApiBaseUrl) return undefined;

  const response = await fetch(`${serverApiBaseUrl}${path}`, {
    headers: { Accept: "application/json" }
  });

  if (response.status === 404 && options?.notFoundAsUndefined) return undefined;
  if (!response.ok) {
    throw new Error(`Website API request ${path} failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  return validateApiResult(payload, validateData);
}

async function fetchWebsiteApi<T>(path: string, validateData: RuntimeValidator<T>) {
  return (await fetchWebsiteApiResult(path, validateData))?.data;
}

function specificationRecord(product: WebsiteApiProduct) {
  if (!product.specifications) return {};
  if (!Array.isArray(product.specifications)) return product.specifications;
  return Object.fromEntries(
    product.specifications.map((specification) => [
      specification.key,
      specification.value
    ])
  );
}

function mapImages(product: WebsiteApiProduct) {
  const apiImages =
    product.assets
      ?.filter((asset) => asset.kind === "image" && Boolean(asset.url))
      .map<ImageAsset>((asset) => ({
        url: assetPath(asset.url),
        alt: asset.altText ?? product.name
      })) ?? [];

  if (apiImages.length > 0) return apiImages;

  return [
    {
      url: assetPath("/assets/generated/vanstro-hero-white-v1.webp"),
      alt: product.name
    }
  ];
}

function withImageDimensions(image: ImageAsset): ImageAsset {
  const dimensions = productImageDimensions[image.url];

  return dimensions
    ? { ...image, width: dimensions[0], height: dimensions[1] }
    : image;
}

function withProductImageDimensions<T extends ProductSummary>(product: T): T {
  return {
    ...product,
    images: product.images.map(withImageDimensions),
    finishOptions: product.finishOptions?.map((option) => ({
      ...option,
      image: option.image ? withImageDimensions(option.image) : undefined,
      images: option.images?.map(withImageDimensions)
    }))
  };
}

function mapWebsiteProductToSummary(product: WebsiteApiProduct): ProductSummary {
  const specifications = specificationRecord(product);
  const price = {
    amount: product.price?.amount ?? 0,
    currency: asCurrencyCode(product.price?.currency)
  };
  const category = typeof product.category === "string"
    ? product.category
    : product.category?.name ?? "Catalog";
  const categorySlug = typeof product.category === "object" && product.category?.slug
    ? product.category.slug
    : undefined;
  const sku = product.primarySku?.skuCode ?? product.id;
  const dimensions =
    product.dimensions ??
    specifications.Dimensions ??
    (specifications.Width ? `${specifications.Width} W` : undefined) ??
    staticProductDimensions({ sku, id: product.id }) ??
    "Dimensions pending";

  return {
    id: product.id,
    slug: product.slug,
    sku,
    name: product.name,
    category,
    categorySlug,
    price,
    commerce: {
      pricing: {
        source: "catalog",
        basePrice: price,
        currentPrice: price,
        updatedAt: "website-api"
      },
      promotions: []
    },
    unit: "each",
    dimensions,
    images: mapImages(product),
    inStock: true,
    brand: "VanStro",
    manufacturerPartNumber: product.manufacturerPartNumber ?? `VS-${sku}`,
    variantSkus: product.variantSkus,
    finish: specifications.Finish,
    colorName: specifications.Color,
    finishOptions: product.finishOptions
  };
}

function staticFinishOptions(product: ProductSummary) {
  const match = productsWithCommerce.find((row) => row.sku === product.sku || row.id === product.id);
  return match?.finishOptions;
}

/**
 * Dimensions fallback for Website API catalog rows whose list payload omits
 * the dimensions field AND the "Dimensions" specification key (observed for
 * e.g. B15/B30 and the 3DB12–3DB30 ladder, plus handles/casings/baseboards).
 * The same SKU resolves real dimensions on the product-detail payload, so the
 * list stays consistent with the PDP by reusing the fixture catalog's value
 * for the SKU. API-supplied dimensions always win; this only fills the gap.
 */
function staticProductDimensions(product: { sku: string; id: string }) {
  const match = productsWithCommerce.find((row) => row.sku === product.sku || row.id === product.id);
  return match?.dimensions;
}

function projectFinishOptions(product: ProductSummary): ProductSummary["finishOptions"] {
  const options = product.finishOptions?.length ? product.finishOptions : staticFinishOptions(product);
  return options?.map((option) => ({
    name: option.name,
    sku: option.sku,
    manufacturerPartNumber: option.manufacturerPartNumber,
    configuration: option.configuration,
    colorName: option.colorName,
    colorHex: option.colorHex,
    image: option.image
      ? withImageDimensions(option.image)
      : option.images?.[0]
        ? withImageDimensions(option.images[0])
        : undefined,
    price: option.price,
    dimensions: option.dimensions,
    active: option.active
  }));
}

function projectProductCard(product: ProductSummary, locale: SiteLocale = "en-CA"): ProductSummary {
  const image = product.images[0];

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    brand: product.brand,
    manufacturerPartNumber: product.manufacturerPartNumber,
    variantSkus: product.variantSkus,
    name: product.name,
    category: localizeProductTaxonomyLabel(product.category, locale),
    categorySlug: product.categorySlug,
    subCategory: product.subCategory
      ? localizeProductTaxonomyLabel(product.subCategory, locale)
      : undefined,
    price: product.price,
    commerce: product.commerce,
    unit: product.unit,
    dimensions: product.dimensions,
    finish: product.finish,
    colorName: product.colorName,
    colorHex: product.colorHex,
    images: image ? [withImageDimensions(image)] : [],
    inStock: product.inStock,
    finishOptions: projectFinishOptions(product)
  };
}

function projectCatalogProduct(product: ProductSummary): ProductSummary {
  return {
    ...projectProductCard(product),
    finishOptions: product.finishOptions?.map((option) => ({
      name: option.name,
      sku: option.sku,
      manufacturerPartNumber: option.manufacturerPartNumber,
      configuration: option.configuration,
      colorHex: option.colorHex,
      image: option.image
        ? withImageDimensions(option.image)
        : option.images?.[0]
          ? withImageDimensions(option.images[0])
          : undefined,
      price: option.price,
      dimensions: option.dimensions,
      active: option.active
    }))
  };
}

function mapWebsiteProductToDetail(
  product: WebsiteApiProduct,
  locale: SiteLocale = "en-CA"
): ProductDetail {
  const summary = mapWebsiteProductToSummary(product);
  const specifications = {
    ...specificationRecord(product),
    SKU: summary.sku,
    Category: summary.category,
    Dimensions: summary.dimensions
  };

  // Seed rule: reviews are English-only and must never surface on /fr/ pages.
  // The detail payload is shared by EN and FR, so the FR gate lives here in the
  // locale-aware data layer (NOT in PDP components). FR consumers get a clean
  // ratingSummary fallback (count 0) and an empty review list -> "Aucun avis
  // publié" on the PDP review section and buy panel. EN behavior is unchanged.
  const french = locale === FRENCH_LOCALE;

  return {
    ...summary,
    description:
      product.description ??
      product.shortDescription ??
      `${product.name} is managed from the VanStro Website API catalog.`,
    productHighlights: [],
    documents: [],
    supportLinks: [],
    ratingSummary: french ? undefined : product.ratingSummary,
    reviews: french ? [] : product.reviews,
    specifications,
    inventory: []
  };
}

// TEMPORARY COMPATIBILITY (plan 260813 §5): production still contains the
// recovery-fixture demo rows (category slug "seed-cat-prod", product slug
// "seed-prod-prod", primary SKU code "SEED-SKU-PROD"). They must never reach
// the storefront — homepage, catalog, sitemap source, static product routes
// and JSON-LD all share this single precise identity check. The filter is
// exact-match, NOT a broad "seed-" prefix: a future legitimate business
// category that merely starts with "seed-" is never hidden. Physical deletion
// of the demo rows stays a separate, independently authorized task.
const SEED_FIXTURE_PRODUCT_SLUGS = new Set(["seed-prod-prod"]);
const SEED_FIXTURE_SKU_CODES = new Set(["SEED-SKU-PROD"]);

function isSeedFixtureProduct(product: WebsiteApiProduct): boolean {
  return (
    SEED_FIXTURE_PRODUCT_SLUGS.has(product.slug) ||
    (product.category !== null && typeof product.category === "object" && isSeedFixtureCategory(product.category.slug)) ||
    (product.primarySku != null && SEED_FIXTURE_SKU_CODES.has(product.primarySku.skuCode))
  );
}

async function getApiProducts() {
  if (!serverApiBaseUrl) return undefined;

  const data = await fetchCompleteCatalog(async (limit, offset) => {
    const result = await fetchWebsiteApiResult<WebsiteApiProduct[]>(
      `${API_ENDPOINTS.products}?limit=${limit}&offset=${offset}`,
      arrayOf(validateWebsiteApiProduct)
    );

    if (!result) {
      throw new Error("Catalog API is not configured.");
    }
    return result;
  });

  // Demo-seed rows (exact fixture identity) must never surface on the
  // storefront: they carry no real catalog data. Shared by homepage, catalog,
  // static product params and PDP lookup below.
  return data.filter((product) => !isSeedFixtureProduct(product)).map(mapWebsiteProductToSummary);
}

/**
 * Active storefront categories from the Website API `/categories` endpoint —
 * the single business source for category identity, slugs, names, order and
 * active state. Demo-seed categories are excluded with the same exact
 * identity set used for products. Falls back to the static fixture list only
 * when no API is configured (local/fixture builds).
 */
export async function getCatalogCategories(): Promise<CatalogCategoryOption[]> {
  if (serverApiBaseUrl) {
    const categories = await fetchWebsiteApi<CategorySummary[]>(
      API_ENDPOINTS.categories,
      arrayOf(validateCategorySummary)
    );
    if (categories) {
      return toCatalogCategoryOptions(categories);
    }
  }
  if (fixtureCatalogEnabled) return getFallbackCatalogCategoryOptions();
  throw new Error(
    "VANSTRO_WEBSITE_API_BASE_URL must be configured for a production catalog build."
  );
}

/**
 * The full set of category options a product can be matched against via
 * `?category=<slug>` — parents AND children (see
 * `toCatalogFilterableCategoryOptions` for why this must differ from
 * `getCatalogCategories`, which stays parent-only for nav/home/footer).
 * Falls back to the same fixture list as `getCatalogCategories` when no API
 * is configured, since the fixture catalog has no parent/child category
 * split to begin with.
 */
export async function getCatalogFilterableCategories(): Promise<CatalogCategoryOption[]> {
  if (serverApiBaseUrl) {
    const categories = await fetchWebsiteApi<CategorySummary[]>(
      API_ENDPOINTS.categories,
      arrayOf(validateCategorySummary)
    );
    if (categories) {
      return toCatalogFilterableCategoryOptions(categories);
    }
  }
  if (fixtureCatalogEnabled) return getFallbackCatalogCategoryOptions();
  throw new Error(
    "VANSTRO_WEBSITE_API_BASE_URL must be configured for a production catalog build."
  );
}

export async function getHomePageData(locale: SiteLocale = "en-CA") {
  const [apiProducts, categories] = await Promise.all([getApiProducts(), getCatalogCategories()]);
  const apiDealers = await fetchWebsiteApi<unknown[]>(
    API_ENDPOINTS.dealers,
    arrayOf((value, path) => objectValue(value, path))
  );

  const sourceProducts = apiProducts
    ? selectHomeFeaturedProducts(apiProducts)
    : (fixtureCatalogEnabled
      ? getStaticHomeProducts()
      : (() => {
          throw new Error(
            "VANSTRO_WEBSITE_API_BASE_URL must be configured for a production homepage build."
          );
        })());

  const banner = locale === "fr-CA"
    ? {
        ...banners[0],
        title: "Armoires de cuisine, meubles-lavabos et matériaux résidentiels offerts dans les zones de service participantes",
        subtitle: "Magasinez en ligne des armoires, des meubles-lavabos, des moulures et des fournitures de rénovation prêtes à commander.",
        href: "/fr/products",
        image: {
          ...banners[0].image,
          alt: "Armoires de cuisine VanStro blanches et portes-échantillons en salle d’exposition"
        }
      }
    : banners[0];

  return {
    banner,
    categories: locale === "fr-CA"
      ? categories.map((category) => localizeCatalogCategoryOption(category, locale))
      : categories,
    products: localizeProducts(sourceProducts, locale).map((product) =>
      applyReviewSeedToSummary(projectProductCard(product, locale), locale)
    ),
    articles,
    dealers: apiDealers ? mapWebsiteDealers(apiDealers) : dealers
  };
}

async function getCatalogSourceProducts() {
  const apiProducts = await getApiProducts();
  if (apiProducts) return apiProducts;
  if (fixtureCatalogEnabled) return productsWithCommerce;
  throw new Error(
    "VANSTRO_WEBSITE_API_BASE_URL must be configured for a production catalog build."
  );
}

export async function getProductsForCatalog(locale?: SiteLocale) {
  const sourceProducts = await getCatalogSourceProducts();
  return localizeProducts(sourceProducts, locale).map((product) =>
    applyReviewSeedToSummary(projectCatalogProduct(product), locale)
  );
}

export async function getProductStaticParams() {
  return (await getCatalogSourceProducts()).map(({ slug }) => ({ slug }));
}

export function getCartSuggestions(locale: SiteLocale = "en-CA") {
  return localizeProducts(productsWithCommerce.slice(0, 2), locale).map((product) =>
    projectProductCard(product, locale)
  );
}

export async function getProductBySlug(slug: string, locale?: SiteLocale) {
  const apiResult = await fetchWebsiteApiResult<WebsiteApiProduct>(
    API_ENDPOINTS.productDetail(slug),
    validateWebsiteApiProduct,
    { notFoundAsUndefined: true }
  );

  if (apiResult) {
    // Shared seed-fixture semantics: a demo-seed product resolves as missing
    // (404 + no JSON-LD + no metadata), exactly like the catalog filter.
    if (isSeedFixtureProduct(apiResult.data)) return undefined;
    return applyReviewSeed(
      withProductImageDimensions(
        localizeProduct(mapWebsiteProductToDetail(apiResult.data, locale), locale)
      ),
      locale
    );
  }
  if (serverApiBaseUrl) return undefined;
  if (!fixtureCatalogEnabled) {
    throw new Error(
      "VANSTRO_WEBSITE_API_BASE_URL must be configured for a production product build."
    );
  }
  if (SEED_FIXTURE_PRODUCT_SLUGS.has(slug)) return undefined;

  const product = productDetails.find(
    (candidate) => candidate.slug === slug || candidate.id === slug
  );
  return product
    ? applyReviewSeed(withProductImageDimensions(localizeProduct(product, locale)), locale)
    : undefined;
}

export async function getArticleBySlug(slug: string) {
  return (
    articleDetails.find((article) => article.slug === slug || article.id === slug) ??
    articleDetails[0]
  );
}

export async function getCartPreview() {
  return mockCart;
}

export async function getFavoritesPreview() {
  return mockFavorites;
}

export async function getDealersPreview() {
  const apiDealers = await fetchWebsiteApi<unknown[]>(
    API_ENDPOINTS.dealers,
    arrayOf((value, path) => objectValue(value, path))
  );

  return apiDealers ? mapWebsiteDealers(apiDealers) : dealers;
}

function mapWebsiteDealers(rawDealers: unknown[]): StorefrontDealerSummary[] {
  return rawDealers.flatMap((rawDealer) => {
    if (!rawDealer || typeof rawDealer !== "object") return [];

    const dealer = rawDealer as {
      id?: unknown;
      code?: unknown;
      name?: unknown;
      status?: unknown;
      phone?: unknown;
      email?: unknown;
      website?: unknown;
      locations?: Array<{
        id?: unknown;
        code?: unknown;
        name?: unknown;
        addressLine1?: unknown;
        city?: unknown;
        province?: unknown;
        postalCode?: unknown;
        latitude?: unknown;
        longitude?: unknown;
        pickupAvailable?: unknown;
        deliveryAvailable?: unknown;
      }>;
    };
    const dealerId = typeof dealer.id === "string" ? dealer.id : undefined;
    const dealerName = typeof dealer.name === "string" ? dealer.name : undefined;

    // A Dealer master is directory-visible as soon as it is active, even with
    // zero locations. Missing identity fields still drop the row (malformed).
    if (!dealerId || !dealerName) return [];

    const locations = (Array.isArray(dealer.locations) ? dealer.locations : []).flatMap((location) => {
      const locationId = typeof location.id === "string" ? location.id : undefined;
      if (!locationId) return [];
      const locationName = typeof location.name === "string" ? location.name : undefined;
      const multipleLocations = Array.isArray(dealer.locations) && dealer.locations.length > 1;
      return [{
        id: locationId,
        dealerId,
        dealerLocationId: locationId,
        code: typeof location.code === "string"
          ? location.code
          : typeof dealer.code === "string" ? dealer.code : undefined,
        name: locationName && multipleLocations ? `${dealerName} — ${locationName}` : dealerName,
        address: typeof location.addressLine1 === "string" ? location.addressLine1 : "Address pending",
        city: typeof location.city === "string" ? location.city : "",
        province: typeof location.province === "string" ? location.province : "",
        postalCode: typeof location.postalCode === "string" ? location.postalCode : "",
        phone: typeof dealer.phone === "string" ? dealer.phone : "",
        email: typeof dealer.email === "string" ? dealer.email : undefined,
        website: typeof dealer.website === "string" ? dealer.website : undefined,
        latitude: typeof location.latitude === "number" ? location.latitude : undefined,
        longitude: typeof location.longitude === "number" ? location.longitude : undefined,
        availableForPickup: Boolean(location.pickupAvailable),
        availableForDelivery: Boolean(location.deliveryAvailable)
      }];
    });

    return [{
      id: dealerId,
      code: typeof dealer.code === "string" ? dealer.code : undefined,
      name: dealerName,
      status: typeof dealer.status === "string" ? dealer.status : "active",
      phone: typeof dealer.phone === "string" ? dealer.phone : undefined,
      email: typeof dealer.email === "string" ? dealer.email : undefined,
      website: typeof dealer.website === "string" ? dealer.website : undefined,
      locations
    }];
  });
}
