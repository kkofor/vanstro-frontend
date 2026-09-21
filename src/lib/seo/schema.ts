import type { ProductDetail } from "@/lib/api/api-contract";
import { inferFinishColorName, inferFinishConfiguration } from "@/lib/product/product-finish-options";
import { getEffectivePrice } from "@/lib/commerce/product-commerce";
import { getProductInventory } from "@/lib/commerce/product-inventory";
import { publicAssetUrl, publicUrl } from "@/lib/seo/site";
export { serializeJsonLd } from "@/lib/seo/json-ld";

type ProductVariantSchema = Record<string, unknown> & { sku: string };

function availabilityUrl(product: ProductDetail) {
  // Storefront copy is "availability confirmed at checkout". Do not emit
  // site-wide OutOfStock just because no dealer is selected on the PDP.
  if (product.inStock) {
    return "https://schema.org/InStock";
  }
  const status = getProductInventory(product).status;
  if (status === "in_stock" || status === "low_stock") {
    return "https://schema.org/InStock";
  }
  if (status === "backorder") return "https://schema.org/BackOrder";
  return undefined;
}

export function articleSchema(input: {
  title: string;
  description: string;
  path: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  inLanguage: "en-CA" | "fr-CA";
}) {
  const url = publicUrl(input.path);
  if (!url) return null;
  const image = input.image ? publicAssetUrl(input.image) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url,
    mainEntityOfPage: url,
    inLanguage: input.inLanguage,
    ...(image ? { image } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {})
  };
}

export function organizationSchema() {
  const url = publicUrl("/");
  const logo = publicAssetUrl("/assets/vanstro-logo.png");
  if (!url || !logo) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VanStro Global Supply",
    url,
    logo
  };
}

export function productSchema(product: ProductDetail, path = `/products/${product.slug}`) {
  const productUrl = publicUrl(path);
  const availability = availabilityUrl(product);
  const options = product.finishOptions?.length ? product.finishOptions : [];
  const variesBy = ["https://schema.org/color"];
  if (options.some((option) => option.dimensions && option.dimensions !== product.dimensions)) {
    variesBy.push("https://schema.org/size");
  }
  const variants: ProductVariantSchema[] = options.flatMap((option) => {
    const sku = option.sku ?? (option.active ? product.sku : undefined);
    if (!sku) return [];

    const images = option.images?.length
      ? option.images
      : option.image
        ? [option.image]
        : product.images;
    const imageUrls = images.flatMap((image) => {
      const url = publicAssetUrl(image.url);
      return url ? [url] : [];
    });
    const price = option.price ?? getEffectivePrice(product);
    const variantUrl = productUrl ? `${productUrl}?sku=${encodeURIComponent(sku)}` : undefined;

    const colorName = inferFinishColorName(option);
    const configuration = inferFinishConfiguration(option);
    return [{
      "@type": "Product",
      name: `${product.name} - ${colorName}`,
      sku,
      ...(option.manufacturerPartNumber || product.manufacturerPartNumber
        ? { mpn: option.manufacturerPartNumber ?? product.manufacturerPartNumber }
        : {}),
      description: option.description ?? product.description,
      ...(imageUrls.length ? { image: imageUrls } : {}),
      color: colorName,
      ...(configuration
        ? {
            additionalProperty: {
              "@type": "PropertyValue",
              name: "configuration",
              value: configuration
            }
          }
        : {}),
      offers: {
        "@type": "Offer",
        price: price.amount,
        priceCurrency: price.currency,
        availability,
        ...(variantUrl ? { url: variantUrl } : {})
      }
    }];
  });

  if (!variants.some((variant) => variant.sku === product.sku)) {
    const price = getEffectivePrice(product);
    const imageUrls = product.images.flatMap((image) => {
      const url = publicAssetUrl(image.url);
      return url ? [url] : [];
    });
    variants.unshift({
      "@type": "Product",
      name: product.name,
      sku: product.sku,
      ...(product.manufacturerPartNumber ? { mpn: product.manufacturerPartNumber } : {}),
      description: product.description,
      ...(imageUrls.length ? { image: imageUrls } : {}),
      offers: {
        "@type": "Offer",
        price: price.amount,
        priceCurrency: price.currency,
        availability,
        ...(productUrl ? { url: productUrl } : {})
      }
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: product.name,
    productGroupID: product.id,
    description: product.description,
    ...(productUrl ? { url: productUrl } : {}),
    variesBy,
    hasVariant: variants
  };
}
