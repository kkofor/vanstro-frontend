import type { ProductDetail } from "@/lib/api/api-contract";
import { getEffectivePrice } from "@/lib/commerce/product-commerce";
import { getProductInventory } from "@/lib/commerce/product-inventory";
import { publicAssetUrl, publicUrl } from "@/lib/seo/site";
export { serializeJsonLd } from "@/lib/seo/json-ld";

type ProductVariantSchema = Record<string, unknown> & { sku: string };

function availabilityUrl(product: ProductDetail) {
  const status = getProductInventory(product).status;

  if (status === "in_stock" || status === "low_stock") {
    return "https://schema.org/InStock";
  }
  if (status === "backorder") return "https://schema.org/BackOrder";
  return "https://schema.org/OutOfStock";
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

export function productSchema(product: ProductDetail) {
  const productUrl = publicUrl(`/products/${product.slug}`);
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

    return [{
      "@type": "Product",
      name: `${product.name} - ${option.name}`,
      sku,
      ...(option.manufacturerPartNumber || product.manufacturerPartNumber
        ? { mpn: option.manufacturerPartNumber ?? product.manufacturerPartNumber }
        : {}),
      description: option.description ?? product.description,
      ...(imageUrls.length ? { image: imageUrls } : {}),
      color: option.name,
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
