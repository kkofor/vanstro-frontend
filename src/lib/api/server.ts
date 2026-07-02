import {
  articleDetails,
  articles,
  banners,
  dealers,
  mockCart,
  mockFavorites,
  productDetails,
  products
} from "@/lib/data/mock-data";

export async function getHomePageData() {
  return {
    banner: banners[0],
    products,
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
