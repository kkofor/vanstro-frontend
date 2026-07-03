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
import { HOME_PRODUCT_LIMIT } from "@/lib/product/catalog-config";

export async function getHomePageData() {
  return {
    banner: banners[0],
    products: productsWithCommerce.slice(0, HOME_PRODUCT_LIMIT),
    articles,
    dealers
  };
}

export async function getProductBySlug(slug: string) {
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
  return dealers;
}
