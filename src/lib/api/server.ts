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
  CurrencyCode,
  Dealer,
  ImageAsset,
  ProductDetail,
  ProductRatingSummary,
  ProductReview,
  ProductSummary
} from "@/lib/api/api-contract";
import { assetPath } from "@/lib/assets";
import { HOME_PRODUCT_LIMIT } from "@/lib/product/catalog-config";

type WebsiteApiProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  category?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  primarySku?: {
    id: string;
    skuCode: string;
    name: string;
    attributes?: unknown;
  } | null;
  price?: {
    amount: number;
    amountCents: number;
    currency: string;
  } | null;
  assets?: Array<{
    id: string;
    url: string;
    altText?: string | null;
    kind: string;
    sortOrder: number;
  }>;
  specifications?: Array<{ key: string; value: string }>;
  ratingSummary?: ProductRatingSummary;
  reviews?: ProductReview[];
};

const serverApiBaseUrl =
  process.env.VANSTRO_WEBSITE_API_BASE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

const STATIC_HOME_FEATURED_SKUS = [
  "011780130",
  "013780130",
  "015010130",
  "017550130",
  "023021411",
  "011950130",
  "034114222",
  "060101111"
];

function getStaticHomeProducts() {
  const featured = STATIC_HOME_FEATURED_SKUS.map((sku) =>
    productsWithCommerce.find((product) => product.sku === sku)
  ).filter((product): product is ProductSummary => Boolean(product));

  return featured.length === HOME_PRODUCT_LIMIT
    ? featured
    : productsWithCommerce.slice(0, HOME_PRODUCT_LIMIT);
}

function asCurrencyCode(currency?: string): CurrencyCode {
  return currency === "USD" ? "USD" : "CAD";
}

async function fetchWebsiteApi<T>(path: string) {
  if (!serverApiBaseUrl) return undefined;

  try {
    const response = await fetch(`${serverApiBaseUrl}${path}`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) return undefined;

    const payload = (await response.json()) as ApiResult<T>;

    return payload.data;
  } catch {
    return undefined;
  }
}

function findMockProduct(product: WebsiteApiProduct) {
  return productsWithCommerce.find(
    (candidate) =>
      candidate.slug === product.slug ||
      candidate.id === product.id ||
      candidate.sku === product.primarySku?.skuCode
  );
}

function findMockProductDetail(product: WebsiteApiProduct) {
  return productDetails.find(
    (candidate) =>
      candidate.slug === product.slug ||
      candidate.id === product.id ||
      candidate.sku === product.primarySku?.skuCode
  );
}

function specificationRecord(product: WebsiteApiProduct) {
  return Object.fromEntries(
    (product.specifications ?? []).map((specification) => [
      specification.key,
      specification.value
    ])
  );
}

function mapImages(product: WebsiteApiProduct, fallback?: ProductSummary) {
  const apiImages =
    product.assets
      ?.filter((asset) => asset.kind === "image" && Boolean(asset.url))
      .map<ImageAsset>((asset) => ({
        url: assetPath(asset.url),
        alt: asset.altText ?? product.name
      })) ?? [];

  if (apiImages.length > 0) return apiImages;
  if (fallback?.images.length) return fallback.images;

  return [
    {
      url: assetPath("/assets/generated/vanstro-hero-white-v1.png"),
      alt: product.name
    }
  ];
}

function mapWebsiteProductToSummary(product: WebsiteApiProduct): ProductSummary {
  const fallback = findMockProduct(product);
  const specifications = specificationRecord(product);
  const price = {
    amount: product.price?.amount ?? fallback?.price.amount ?? 0,
    currency: asCurrencyCode(product.price?.currency ?? fallback?.price.currency)
  };
  const category = product.category?.name ?? fallback?.category ?? "Catalog";
  const sku = product.primarySku?.skuCode ?? fallback?.sku ?? product.id;
  const dimensions =
    specifications.Dimensions ??
    (specifications.Width ? `${specifications.Width} W` : undefined) ??
    fallback?.dimensions ??
    "Dimensions pending";

  return {
    ...fallback,
    id: product.id,
    slug: product.slug,
    sku,
    name: product.name,
    category,
    price,
    commerce: {
      pricing: {
        source: "catalog",
        basePrice: price,
        currentPrice: price,
        updatedAt: "website-api"
      },
      promotions: fallback?.commerce?.promotions ?? []
    },
    unit: fallback?.unit ?? "each",
    dimensions,
    images: mapImages(product, fallback),
    inStock: fallback?.inStock ?? true,
    brand: fallback?.brand ?? "VanStro",
    manufacturerPartNumber: fallback?.manufacturerPartNumber ?? `VS-${sku}`,
    finish: fallback?.finish ?? specifications.Finish,
    colorName: fallback?.colorName ?? specifications.Color,
    colorHex: fallback?.colorHex,
    packageQuantity: fallback?.packageQuantity,
    finishOptions: fallback?.finishOptions,
    certificationRequired: fallback?.certificationRequired
  };
}

function mapWebsiteProductToDetail(product: WebsiteApiProduct): ProductDetail {
  const summary = mapWebsiteProductToSummary(product);
  const fallback = findMockProductDetail(product);
  const specifications = {
    ...(fallback?.specifications ?? {}),
    ...specificationRecord(product),
    SKU: summary.sku,
    Category: summary.category,
    Dimensions: summary.dimensions
  };

  return {
    ...fallback,
    ...summary,
    description:
      product.description ??
      fallback?.description ??
      product.shortDescription ??
      `${product.name} is managed from the VanStro Website API catalog.`,
    productHighlights:
      fallback?.productHighlights ??
      [
        "Product master data is managed in the VanStro Dashboard.",
        "Pricing is read from the Website API catalog.",
        "ERP SKU mapping is maintained separately for fulfillment."
      ],
    documents: fallback?.documents ?? [],
    supportLinks: fallback?.supportLinks ?? [],
    ratingSummary: product.ratingSummary ?? fallback?.ratingSummary,
    reviews: product.reviews ?? fallback?.reviews,
    questions: fallback?.questions,
    recommendations: fallback?.recommendations,
    specifications,
    inventory: fallback?.inventory ?? []
  };
}

async function getApiProducts(limit = 100) {
  const data = await fetchWebsiteApi<WebsiteApiProduct[]>(
    `${API_ENDPOINTS.products}?limit=${limit}`
  );

  return data?.map(mapWebsiteProductToSummary);
}

export async function getHomePageData() {
  const apiProducts = await fetchWebsiteApi<WebsiteApiProduct[]>(
    `${API_ENDPOINTS.homeProducts}?limit=${HOME_PRODUCT_LIMIT}`
  );
  const apiDealers = await fetchWebsiteApi<unknown[]>(API_ENDPOINTS.dealers);

  return {
    banner: banners[0],
    products:
      apiProducts?.map(mapWebsiteProductToSummary).slice(0, HOME_PRODUCT_LIMIT) ??
      getStaticHomeProducts(),
    articles,
    dealers: apiDealers ? mapWebsiteDealers(apiDealers) : dealers
  };
}

export async function getProductsForCatalog() {
  return (await getApiProducts()) ?? productsWithCommerce;
}

export async function getProductBySlug(slug: string) {
  const apiProduct = await fetchWebsiteApi<WebsiteApiProduct>(
    API_ENDPOINTS.productDetail(slug)
  );

  if (apiProduct) return mapWebsiteProductToDetail(apiProduct);

  return (
    productDetails.find((product) => product.slug === slug || product.id === slug) ??
    productDetails[0]
  );
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
  const apiDealers = await fetchWebsiteApi<unknown[]>(API_ENDPOINTS.dealers);

  return apiDealers ? mapWebsiteDealers(apiDealers) : dealers;
}

function mapWebsiteDealers(rawDealers: unknown[]): Dealer[] {
  return rawDealers.flatMap((rawDealer) => {
    if (!rawDealer || typeof rawDealer !== "object") return [];

    const dealer = rawDealer as {
      id?: unknown;
      name?: unknown;
      phone?: unknown;
      locations?: Array<{
        addressLine1?: unknown;
        city?: unknown;
        province?: unknown;
        postalCode?: unknown;
        pickupAvailable?: unknown;
      }>;
    };
    const firstLocation = dealer.locations?.[0];
    const id = typeof dealer.id === "string" ? dealer.id : undefined;
    const name = typeof dealer.name === "string" ? dealer.name : undefined;

    if (!id || !name) return [];

    return [
      {
        id,
        name,
        address:
          typeof firstLocation?.addressLine1 === "string"
            ? firstLocation.addressLine1
            : "Address pending",
        city:
          typeof firstLocation?.city === "string" ? firstLocation.city : "Winnipeg",
        province:
          typeof firstLocation?.province === "string"
            ? firstLocation.province
            : "MB",
        postalCode:
          typeof firstLocation?.postalCode === "string"
            ? firstLocation.postalCode
            : "",
        phone: typeof dealer.phone === "string" ? dealer.phone : "",
        availableForPickup: Boolean(firstLocation?.pickupAvailable)
      }
    ];
  });
}
