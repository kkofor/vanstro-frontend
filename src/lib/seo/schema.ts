import { ProductDetail } from "@/lib/api/api-contract";
import { assetPath } from "@/lib/assets";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VanStro Global Supply",
    url: "https://vanstro.vip",
    logo: assetPath("/assets/vanstro-logo.png")
  };
}

export function productSchema(product: ProductDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    image: product.images.map((image) => image.url),
    description: product.description,
    offers: {
      "@type": "Offer",
      price: product.price.amount,
      priceCurrency: product.price.currency,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock"
    }
  };
}
