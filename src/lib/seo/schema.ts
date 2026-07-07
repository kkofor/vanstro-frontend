import { ProductDetail } from "@/lib/api/api-contract";
import { assetPath } from "@/lib/assets";
import { getEffectivePrice } from "@/lib/commerce/product-commerce";
import { getTotalAvailable } from "@/lib/commerce/product-inventory";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VanStro Global Supply",
    url: "https://vanstro.ca",
    logo: assetPath("/assets/vanstro-logo.png")
  };
}

export function productSchema(product: ProductDetail) {
  const price = getEffectivePrice(product);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    image: product.images.map((image) => image.url),
    description: product.description,
    offers: {
      "@type": "Offer",
      price: price.amount,
      priceCurrency: price.currency,
      availability: getTotalAvailable(product) > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock"
    }
  };
}
