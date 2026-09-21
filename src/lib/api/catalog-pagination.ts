export type CatalogPage<T> = {
  data: T[];
  meta?: {
    limit?: number;
    offset?: number;
    total?: number;
  };
};

type CatalogPageFetcher<T> = (limit: number, offset: number) => Promise<CatalogPage<T>>;

const CATALOG_PAGE_SIZE = 100;

export async function fetchCompleteCatalog<T extends { id: string }>(
  fetchPage: CatalogPageFetcher<T>
) {
  const products: T[] = [];
  const productIds = new Set<string>();
  let offset = 0;
  let expectedTotal: number | undefined;

  while (expectedTotal === undefined || products.length < expectedTotal) {
    const page = await fetchPage(CATALOG_PAGE_SIZE, offset);
    const { limit, offset: responseOffset, total } = page.meta ?? {};

    if (limit !== CATALOG_PAGE_SIZE || responseOffset !== offset || total === undefined) {
      throw new Error("Catalog API returned incomplete pagination metadata.");
    }
    if (expectedTotal !== undefined && total !== expectedTotal) {
      throw new Error("Catalog API total changed while pagination was in progress.");
    }

    expectedTotal = total;
    if (page.data.length > limit || (page.data.length === 0 && products.length < total)) {
      throw new Error("Catalog API returned an incomplete page.");
    }

    for (const product of page.data) {
      if (productIds.has(product.id)) {
        throw new Error(`Catalog API returned duplicate product ${product.id}.`);
      }
      productIds.add(product.id);
      products.push(product);
    }

    if (products.length > total) {
      throw new Error("Catalog API returned more products than its reported total.");
    }
    offset += limit;
  }

  if (products.length !== expectedTotal) {
    throw new Error("Catalog API pagination did not return every product.");
  }

  return products;
}
