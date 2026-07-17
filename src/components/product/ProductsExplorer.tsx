"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Grid2X2,
  Heart,
  List,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductSummary } from "@/lib/api/api-contract";
import {
  formatMoney,
  getCompareAtPrice,
  getEffectivePrice,
  getPrimaryPromotion,
  getSavingsLabel
} from "@/lib/commerce/product-commerce";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import {
  CATALOG_CATEGORY_OPTIONS,
  CATALOG_PAGE_SIZE,
  CATALOG_SORT_OPTIONS,
  CATALOG_SUBCATEGORY_OPTIONS,
  CATALOG_WIDTH_OPTIONS,
  CatalogCategoryOption
} from "@/lib/product/catalog-config";
import { formatProductSize } from "@/lib/product/product-display";
import { resolveProductVariant } from "@/lib/product/product-variants";

type ProductsExplorerProps = {
  products: ProductSummary[];
};

type FacetKey = "subCategory" | "width" | "finish" | "brand";

type FacetOption = {
  id: string;
  label: string;
  count: number;
  matches: (product: ProductSummary) => boolean;
};

type CatalogView = "grid" | "list";

const facetLabels: Record<FacetKey, string> = {
  subCategory: "Product categories",
  width: "Width",
  finish: "Finish",
  brand: "Brand"
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesCategory(product: ProductSummary, category: CatalogCategoryOption) {
  if (category.id === "all") return true;
  return category.matches.includes(product.category);
}

function matchesQuery(product: ProductSummary, query: string) {
  if (!query) return true;
  const finishOptionText = product.finishOptions
    ?.flatMap((option) => [option.name, option.sku ?? "", option.manufacturerPartNumber ?? ""])
    .join(" ") ?? "";
  const haystack = [
    product.name,
    product.sku,
    product.category,
    product.subCategory ?? "",
    product.dimensions,
    product.finish ?? "",
    product.colorName ?? "",
    finishOptionText
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function resolveExactQueryVariant(product: ProductSummary, query: string) {
  if (!query) return product;
  const option = product.finishOptions?.find(
    (candidate) =>
      normalize(candidate.sku ?? "") === query ||
      normalize(candidate.manufacturerPartNumber ?? "") === query
  );

  return option ? resolveProductVariant(product, option.name) : product;
}

function productCount(products: ProductSummary[], category: CatalogCategoryOption) {
  if (category.id === "all") return products.length;
  return products.filter((product) => matchesCategory(product, category)).length;
}

function getRepresentativeImage(products: ProductSummary[], category: CatalogCategoryOption) {
  const representative =
    category.id === "all"
      ? products[0]
      : products.find((product) => matchesCategory(product, category));

  return representative?.images[0];
}

function getPrimaryWidth(product: ProductSummary) {
  const match = product.dimensions.match(/(\d+(?:\.\d+)?)\s*in/i);
  return match ? Number(match[1]) : null;
}

function makeFacetOptions(products: ProductSummary[]): Record<FacetKey, FacetOption[]> {
  const subCategories = CATALOG_SUBCATEGORY_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
    count: products.filter((product) =>
      product.subCategory ? option.matches.includes(product.subCategory) : false
    ).length,
    matches: (product: ProductSummary) =>
      product.subCategory ? option.matches.includes(product.subCategory) : false
  }));

  const getFinishNames = (product: ProductSummary) =>
    product.finishOptions?.length
      ? product.finishOptions.map((option) => option.name)
      : [
          product.subCategory === "Accessories"
            ? product.finish ?? product.colorName ?? "Standard finish"
            : product.colorName ?? product.finish ?? "Standard finish"
        ];
  const finishes = Array.from(new Set(products.flatMap(getFinishNames))).map((finish) => ({
    id: finish,
    label: finish,
    count: products.filter((product) => getFinishNames(product).includes(finish)).length,
    matches: (product: ProductSummary) => getFinishNames(product).includes(finish)
  }));

  return {
    subCategory: subCategories,
    width: CATALOG_WIDTH_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      count: products.filter((product) => {
        const width = getPrimaryWidth(product);
        return width !== null && width >= option.min && width <= option.max;
      }).length,
      matches: (product) => {
        const width = getPrimaryWidth(product);
        return width !== null && width >= option.min && width <= option.max;
      }
    })),
    finish: finishes.slice(0, 7),
    brand: [
      {
        id: "VanStro",
        label: "VanStro",
        count: products.length,
        matches: () => true
      }
    ]
  };
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return pages.flatMap<(number | string)>((page, index) => {
    const previous = pages[index - 1];
    return previous && page - previous > 1 ? [`ellipsis-${previous}`, page] : [page];
  });
}

function CatalogProductCard({
  product,
  imagePriority = false
}: {
  product: ProductSummary;
  imagePriority?: boolean;
}) {
  const { isFavorite, toggleFavorite } = useStorefront();
  const saved = isFavorite(product.id);
  const effectivePrice = getEffectivePrice(product);
  const compareAtPrice = getCompareAtPrice(product);
  const primaryPromotion = getPrimaryPromotion(product);
  const savingsLabel = getSavingsLabel(product);
  const statusLabel = product.category === "Baseboards & Mouldings" ? "Trim profile" : "Project item";
  const productHref = `/products/${product.slug}?sku=${encodeURIComponent(product.sku)}`;

  return (
    <article className="catalog-product-card">
      <Link className="catalog-product-image" href={productHref} prefetch={false}>
        {savingsLabel || primaryPromotion ? (
          <span className="catalog-promo-badge">
            {savingsLabel ?? primaryPromotion?.label}
          </span>
        ) : null}
        <img
          src={product.images[0].url}
          alt={product.images[0].alt}
          width={product.images[0].width}
          height={product.images[0].height}
          loading={imagePriority ? "eager" : "lazy"}
          fetchPriority={imagePriority ? "high" : "auto"}
          decoding="async"
        />
      </Link>
      <div className="catalog-product-body">
        <div className="catalog-card-topline">
          <span>{product.category}</span>
          <button
            className={saved ? "catalog-save saved" : "catalog-save"}
            type="button"
            aria-label={saved ? `Remove ${product.name} from favorites` : `Save ${product.name}`}
            aria-pressed={saved}
            onClick={() => toggleFavorite(product)}
          >
            <Heart size={17} strokeWidth={2} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <h3>
          <Link href={productHref} prefetch={false}>{product.name}</Link>
        </h3>
        <p>SKU: {product.sku}</p>
        <p className="catalog-key-spec">{formatProductSize(product.dimensions)}</p>
        <div className="catalog-card-footer">
          <div className="catalog-price">
            {compareAtPrice ? <del>{formatMoney(compareAtPrice)}</del> : null}
            <strong>{formatMoney(effectivePrice)}</strong>
            <span>/ {product.unit}</span>
          </div>
          <span className="catalog-status">{statusLabel}</span>
        </div>
      </div>
    </article>
  );
}

export function ProductsExplorer({ products }: ProductsExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category") ?? "all";
  const queryParam = searchParams.get("q") ?? "";
  const sortParam = searchParams.get("sort") ?? "featured";
  const activeCategory =
    CATALOG_CATEGORY_OPTIONS.find((category) => category.id === categoryParam) ??
    CATALOG_CATEGORY_OPTIONS[0];
  const activeSort = CATALOG_SORT_OPTIONS.some((option) => option.id === sortParam)
    ? sortParam
    : "featured";

  const [draftQuery, setDraftQuery] = useState(queryParam);
  const [currentPage, setCurrentPage] = useState(1);
  const [catalogView, setCatalogView] = useState<CatalogView>("grid");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    subCategory: true,
    width: true,
    finish: true,
    brand: true
  });
  const [selectedFacets, setSelectedFacets] = useState<Record<FacetKey, string[]>>({
    subCategory: [],
    width: [],
    finish: [],
    brand: []
  });

  useEffect(() => {
    setDraftQuery(queryParam);
  }, [queryParam]);

  const normalizedQuery = normalize(queryParam);
  const categoryProducts = useMemo(
    () => products.filter((product) => matchesCategory(product, activeCategory)),
    [activeCategory, products]
  );
  const facetOptions = useMemo(() => makeFacetOptions(categoryProducts), [categoryProducts]);

  const filteredProducts = useMemo(() => {
    const nextProducts = categoryProducts
      .filter((product) => matchesQuery(product, normalizedQuery))
      .filter((product) =>
        (Object.entries(selectedFacets) as Array<[FacetKey, string[]]>).every(([facetKey, values]) => {
          if (!values.length) return true;
          const options = facetOptions[facetKey].filter((option) => values.includes(option.id));
          return options.some((option) => option.matches(product));
        })
      );

    if (activeSort === "price-asc") {
      return [...nextProducts].sort(
        (a, b) => getEffectivePrice(a).amount - getEffectivePrice(b).amount
      );
    }

    if (activeSort === "price-desc") {
      return [...nextProducts].sort(
        (a, b) => getEffectivePrice(b).amount - getEffectivePrice(a).amount
      );
    }

    return nextProducts;
  }, [activeCategory, activeSort, categoryProducts, facetOptions, normalizedQuery, selectedFacets]);

  function updateFilters(next: Record<string, string | null>) {
    setCurrentPage(1);
    if (Object.hasOwn(next, "category")) {
      setSelectedFacets({
        subCategory: [],
        width: [],
        finish: [],
        brand: []
      });
    }
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === "all" || (key === "sort" && value === "featured")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilters({ q: draftQuery.trim() || null });
  }

  function toggleFacet(facetKey: FacetKey, optionId: string) {
    setCurrentPage(1);
    setSelectedFacets((current) => {
      const activeValues = current[facetKey];
      const nextValues = activeValues.includes(optionId)
        ? activeValues.filter((value) => value !== optionId)
        : [...activeValues, optionId];

      return {
        ...current,
        [facetKey]: nextValues
      };
    });
  }

  function clearAllFacets() {
    setCurrentPage(1);
    setSelectedFacets({
      subCategory: [],
      width: [],
      finish: [],
      brand: []
    });
  }

  function toggleSection(section: string) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  }

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / CATALOG_PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * CATALOG_PAGE_SIZE;
  const visibleProducts = filteredProducts
    .slice(pageStart, pageStart + CATALOG_PAGE_SIZE)
    .map((product) => resolveExactQueryVariant(product, normalizedQuery));
  const paginationItems = getPaginationItems(activePage, totalPages);
  return (
    <div className="catalog-shell">
      <div className="catalog-heading">
        <div>
          <PageBreadcrumb items={[{ label: "Home", href: "/" }, { label: "Products" }]} />
          <h1>Products</h1>
        </div>
        <strong>{products.length} products</strong>
      </div>

      <div className="catalog-category-showcase" aria-label="Product categories">
        {CATALOG_CATEGORY_OPTIONS.map((category) => {
          const count = productCount(products, category);
          const active = category.id === activeCategory.id;
          const image = getRepresentativeImage(products, category);

          return (
            <button
              className={active ? "catalog-category-tile active" : "catalog-category-tile"}
              type="button"
              aria-pressed={active}
              onClick={() => updateFilters({ category: category.id })}
              key={category.id}
            >
              {image ? (
                <img
                  src={image.url}
                  alt=""
                  aria-hidden="true"
                  width={image.width}
                  height={image.height}
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
              <span>
                <strong>{category.label}</strong>
                <small>{category.comingSoon ? "Staging" : `${count} items`}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="catalog-layout">
        <aside className="catalog-filter-panel" aria-label="Product filters" tabIndex={0}>
          <div className="catalog-filter-head">
            <strong>Filters</strong>
            <button type="button" onClick={clearAllFacets}>
              Clear
            </button>
          </div>

          <div className="catalog-filter-section">
            <button
              type="button"
              aria-expanded={openSections.categories}
              aria-controls="catalog-filter-categories"
              onClick={() => toggleSection("categories")}
            >
              Categories
              <ChevronDown size={15} strokeWidth={2.3} />
            </button>
            <div className="catalog-filter-options" id="catalog-filter-categories" hidden={!openSections.categories}>
              {CATALOG_CATEGORY_OPTIONS.filter((category) => !category.comingSoon).map((category) => (
                <button
                  className={category.id === activeCategory.id ? "filter-link active" : "filter-link"}
                  type="button"
                  onClick={() => updateFilters({ category: category.id })}
                  key={category.id}
                >
                  <span>{category.shortLabel}</span>
                  <em>{productCount(products, category)}</em>
                </button>
              ))}
            </div>
          </div>

          {(Object.entries(facetOptions) as Array<[FacetKey, FacetOption[]]>).map(
            ([facetKey, options]) => (
              <div className="catalog-filter-section" key={facetKey}>
                <button
                  type="button"
                  aria-expanded={openSections[facetKey]}
                  aria-controls={`catalog-filter-${facetKey}`}
                  onClick={() => toggleSection(facetKey)}
                >
                  {facetLabels[facetKey]}
                  <ChevronDown size={15} strokeWidth={2.3} />
                </button>
                <div className="catalog-filter-options" id={`catalog-filter-${facetKey}`} hidden={!openSections[facetKey]}>
                  {options
                    .filter((option) => option.count > 0)
                    .slice(0, facetKey === "subCategory" ? options.length : 6)
                    .map((option) => (
                      <label className="catalog-checkbox" key={option.id}>
                        <input
                          type="checkbox"
                          checked={selectedFacets[facetKey].includes(option.id)}
                          onChange={() => toggleFacet(facetKey, option.id)}
                        />
                        <span>{option.label}</span>
                        <em>{option.count}</em>
                      </label>
                    ))}
                </div>
              </div>
            )
          )}
        </aside>

        <div
          className="catalog-results"
          role="region"
          aria-label="Product results"
          tabIndex={0}
        >
          <div className="catalog-toolbar" aria-label="Product search and sort">
            <form className="catalog-search" onSubmit={handleSearchSubmit}>
              <Search size={18} strokeWidth={2.2} aria-hidden="true" />
              <input
                name="q"
                value={draftQuery}
                placeholder="Search within products, SKU or size"
                aria-label="Search product catalog"
                onChange={(event) => setDraftQuery(event.target.value)}
              />
              {queryParam ? (
                <button
                  className="catalog-clear"
                  type="button"
                  aria-label="Clear search"
                  onClick={() => updateFilters({ q: null })}
                >
                  <X size={16} strokeWidth={2.4} />
                </button>
              ) : null}
              <button className="small-button dark" type="submit">
                Search
              </button>
            </form>

            <label className="catalog-sort">
              <SlidersHorizontal size={17} strokeWidth={2.2} aria-hidden="true" />
              <span>Sort</span>
              <select
                value={activeSort}
                aria-label="Sort products"
                onChange={(event) => updateFilters({ sort: event.target.value })}
              >
                {CATALOG_SORT_OPTIONS.map((option) => (
                  <option value={option.id} key={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="catalog-sort-chevron"
                size={16}
                strokeWidth={2.3}
                aria-hidden="true"
              />
            </label>

            <div className="catalog-view-toggle" aria-label="View options">
              <button
                className={catalogView === "grid" ? "active" : undefined}
                type="button"
                aria-label="Grid view"
                aria-pressed={catalogView === "grid"}
                onClick={() => setCatalogView("grid")}
              >
                <Grid2X2 size={17} strokeWidth={2.1} />
              </button>
              <button
                className={catalogView === "list" ? "active" : undefined}
                type="button"
                aria-label="List view"
                aria-pressed={catalogView === "list"}
                onClick={() => setCatalogView("list")}
              >
                <List size={18} strokeWidth={2.1} />
              </button>
            </div>
          </div>

          {filteredProducts.length ? (
            <>
              <div className={`catalog-product-grid ${catalogView === "list" ? "list-view" : ""}`}>
                {visibleProducts.map((product, index) => (
                  <CatalogProductCard
                    product={product}
                    imagePriority={activePage === 1 && index < 4}
                    key={product.id}
                  />
                ))}
              </div>
              {totalPages > 1 ? (
                <nav className="catalog-pagination" aria-label="Product pages">
                  {paginationItems.map((item) =>
                    typeof item === "number" ? (
                      <button
                        className={item === activePage ? "active" : undefined}
                        type="button"
                        aria-current={item === activePage ? "page" : undefined}
                        onClick={() => setCurrentPage(item)}
                        key={item}
                      >
                        {item}
                      </button>
                    ) : (
                      <span key={item}>...</span>
                    )
                  )}
                  <button
                    type="button"
                    disabled={activePage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </>
          ) : (
            <div className="empty-panel catalog-empty">
              <h2>
                {activeCategory.comingSoon
                  ? `${activeCategory.label} is being staged`
                  : "No products found"}
              </h2>
              <p>
                {activeCategory.comingSoon
                  ? "This category is already wired from the homepage and ready for backend catalog expansion."
                  : "Try a different category, SKU, size, finish or fulfillment filter."}
              </p>
              <div className="button-row">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    clearAllFacets();
                    updateFilters({ category: null, q: null, sort: null });
                  }}
                >
                  View all products
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => updateFilters({ q: null })}
                >
                  Clear search
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
