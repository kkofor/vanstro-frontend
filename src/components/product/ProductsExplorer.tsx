"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Heart, SlidersHorizontal, X } from "lucide-react";
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
import { HorizontalScrollRail } from "@/components/ui/HorizontalScrollRail";
import {
  BATHROOM_VANITY_FEATURED_SKUS,
  CATALOG_PAGE_SIZE,
  CatalogCategoryOption,
  getCatalogCategoryOptions,
  getCatalogSortOptions,
  getCatalogSubcategoryOptions,
  getCatalogWidthOptions
} from "@/lib/product/catalog-config";
import { formatProductSize } from "@/lib/product/product-display";
import { formatUnitPrice } from "@/lib/i18n/display-format";
import { resolveProductVariant } from "@/lib/product/product-variants";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { localizeProductTaxonomyLabel } from "@/lib/product/product-localization";

type ProductsExplorerProps = {
  products: ProductSummary[];
  locale: SiteLocale;
};

type FacetKey = "subCategory" | "width" | "finish" | "brand";

type FacetOption = {
  id: string;
  label: string;
  count: number;
  matches: (product: ProductSummary) => boolean;
};

const CATALOG_COPY = {
  "en-CA": {
    title: "Products", home: "Home", products: "products", items: "items",
    categoryLabel: "Product categories", categoryHint: "Swipe or use the arrow buttons to view more categories.",
    filters: "Filters", sort: "Sort", sortBy: "Sort by", sortProducts: "Sort products",
    skip: "Skip to products", closeFilters: "Close product filters", clear: "Clear", clearFilters: "Clear filters",
    view: "View", results: "product results", pages: "Product pages", next: "Next", sku: "SKU",
    noResults: "No products found", noResultsHelp: "Try a different category, SKU, size, finish or fulfillment filter.",
    viewAll: "View all products", clearSearch: "Clear search", favoriteAdd: "Save", favoriteRemove: "Remove",
    facetLabels: { subCategory: "Product categories", width: "Width", finish: "Finish", brand: "Brand" }
  },
  "fr-CA": {
    title: "Produits", home: "Accueil", products: "produits", items: "articles",
    categoryLabel: "Catégories de produits", categoryHint: "Balayez ou utilisez les flèches pour voir plus de catégories.",
    filters: "Filtres", sort: "Trier", sortBy: "Trier par", sortProducts: "Trier les produits",
    skip: "Passer aux produits", closeFilters: "Fermer les filtres de produits", clear: "Effacer", clearFilters: "Effacer les filtres",
    view: "Voir", results: "résultats de produits", pages: "Pages de produits", next: "Suivant", sku: "UGS",
    noResults: "Aucun produit trouvé", noResultsHelp: "Essayez une autre catégorie, UGS, dimension, finition ou option de réception.",
    viewAll: "Voir tous les produits", clearSearch: "Effacer la recherche", favoriteAdd: "Ajouter", favoriteRemove: "Retirer",
    facetLabels: { subCategory: "Catégories de produits", width: "Largeur", finish: "Fini", brand: "Marque" }
  }
} as const;

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

function makeFacetOptions(products: ProductSummary[], locale: SiteLocale): Record<FacetKey, FacetOption[]> {
  const subCategories = getCatalogSubcategoryOptions(locale).map((option) => ({
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
    width: getCatalogWidthOptions(locale).map((option) => ({
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
  locale,
  imagePriority = false
}: {
  product: ProductSummary;
  locale: SiteLocale;
  imagePriority?: boolean;
}) {
  const { isFavorite, toggleFavorite } = useStorefront();
  const saved = isFavorite(product.id);
  const effectivePrice = getEffectivePrice(product);
  const compareAtPrice = getCompareAtPrice(product);
  const primaryPromotion = getPrimaryPromotion(product);
  const savingsLabel = getSavingsLabel(product, locale);
  const french = locale === "fr-CA";
  const localizedSavingsLabel = savingsLabel;
  const localizedPromotionLabel = french && primaryPromotion
    ? primaryPromotion.label
        .replace(/Special offer/gi, "Offre spéciale")
        .replace(/Limited time/gi, "Durée limitée")
        .replace(/Clearance/gi, "Liquidation")
    : primaryPromotion?.label;
  const copy = CATALOG_COPY[locale];
  const productHref = localeHref(`/products/${product.slug}?sku=${encodeURIComponent(product.sku)}`, locale);

  return (
    <article className="catalog-product-card">
      <Link
        className="catalog-product-image"
        href={productHref}
        prefetch={false}
        aria-hidden="true"
        tabIndex={-1}
      >
        {localizedSavingsLabel || localizedPromotionLabel ? (
          <span className="catalog-promo-badge">
            {localizedSavingsLabel || localizedPromotionLabel}
          </span>
        ) : null}
        <img
          src={product.images[0].url}
          alt=""
          width={product.images[0].width}
          height={product.images[0].height}
          loading={imagePriority ? "eager" : "lazy"}
          fetchPriority={imagePriority ? "high" : "auto"}
          decoding="async"
        />
      </Link>
      <div className="catalog-product-body">
        <div className="catalog-card-topline">
          <span>{localizeProductTaxonomyLabel(product.category, locale)}</span>
          <button
            className={saved ? "catalog-save saved" : "catalog-save"}
            type="button"
            aria-label={saved
              ? `${copy.favoriteRemove} ${product.name} ${locale === "fr-CA" ? "des favoris" : "from favorites"}`
              : `${copy.favoriteAdd} ${product.name}${locale === "fr-CA" ? " aux favoris" : ""}`}
            aria-pressed={saved}
            onClick={() => toggleFavorite(product)}
          >
            <Heart size={17} strokeWidth={2} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <h2>
          <Link href={productHref} prefetch={false}>{product.name}</Link>
        </h2>
        <p>{copy.sku} : {product.sku}</p>
        <p className="catalog-key-spec">{formatProductSize(product.dimensions, locale)}</p>
        <div className="catalog-card-footer">
          <div className="catalog-price">
            {compareAtPrice ? <del>{formatMoney(compareAtPrice, locale)}</del> : null}
            <strong>{formatUnitPrice(effectivePrice, product.unit, locale)}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductsExplorer({ products, locale }: ProductsExplorerProps) {
  const copy = CATALOG_COPY[locale];
  const categoryOptions = getCatalogCategoryOptions(locale);
  const sortOptions = getCatalogSortOptions(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category") ?? "all";
  const queryParam = searchParams.get("q") ?? "";
  const sortParam = searchParams.get("sort") ?? "featured";
  const availableCategories = categoryOptions.filter(
    (category) => productCount(products, category) > 0
  );
  const activeCategory =
    availableCategories.find((category) => category.id === categoryParam) ??
    availableCategories[0] ??
    categoryOptions[0];
  const activeSort = sortOptions.some((option) => option.id === sortParam)
    ? sortParam
    : "featured";

  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFilterDialogRef = useRef<HTMLDivElement>(null);
  const mobileFilterTriggerRef = useRef<HTMLButtonElement>(null);
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
    if (!mobileFiltersOpen) return;

    const dialog = mobileFilterDialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

    dialog?.focus();
    document.body.classList.add("catalog-filter-drawer-open");

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileFiltersOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("catalog-filter-drawer-open");
      (previouslyFocused ?? mobileFilterTriggerRef.current)?.focus();
    };
  }, [mobileFiltersOpen]);

  const normalizedQuery = normalize(queryParam);
  const categoryProducts = useMemo(
    () => products.filter((product) => matchesCategory(product, activeCategory)),
    [activeCategory, products]
  );
  const facetOptions = useMemo(() => makeFacetOptions(categoryProducts, locale), [categoryProducts, locale]);

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

    if (activeCategory.id === "bathroom-vanities" && !normalizedQuery) {
      const featuredRank = new Map<string, number>(
        BATHROOM_VANITY_FEATURED_SKUS.map((sku, index) => [sku, index])
      );
      return [...nextProducts].sort(
        (a, b) =>
          (featuredRank.get(a.sku) ?? Number.POSITIVE_INFINITY) -
          (featuredRank.get(b.sku) ?? Number.POSITIVE_INFINITY)
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
  const selectedFacetCount = Object.values(selectedFacets).reduce(
    (total, values) => total + values.length,
    0
  );

  function renderFilterControls(idPrefix: string) {
    return (
      <>
        <div className="catalog-filter-section">
          <button
            type="button"
            aria-expanded={openSections.categories}
            aria-controls={`${idPrefix}-categories`}
            onClick={() => toggleSection("categories")}
          >
            {copy.filters === "Filtres" ? "Catégories" : "Categories"}
            <ChevronDown size={15} strokeWidth={2.3} />
          </button>
            <div className="catalog-filter-options" id={`${idPrefix}-categories`} hidden={!openSections.categories}>
            {availableCategories.map((category) => (
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
              aria-controls={`${idPrefix}-${facetKey}`}
              onClick={() => toggleSection(facetKey)}
            >
              {copy.facetLabels[facetKey]}
              <ChevronDown size={15} strokeWidth={2.3} />
            </button>
            <div className="catalog-filter-options" id={`${idPrefix}-${facetKey}`} hidden={!openSections[facetKey]}>
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
      </>
    );
  }

  return (
    <div className="catalog-shell">
      <h1 className="visually-hidden">{copy.title}</h1>
      <div className="catalog-heading">
        <PageBreadcrumb items={[{ label: copy.home, href: "/" }, { label: copy.title }]} />
        <strong>{products.length} {copy.products}</strong>
      </div>

      <HorizontalScrollRail
        className="catalog-category-showcase"
        label={copy.categoryLabel}
        hint={copy.categoryHint}
        previousLabel={locale === "fr-CA" ? "Catégories de produits précédentes" : "Previous product categories"}
        nextLabel={locale === "fr-CA" ? "Catégories de produits suivantes" : "Next product categories"}
        activeKey={activeCategory.id}
      >
        {availableCategories.map((category) => {
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
                <small>{count} {copy.items}</small>
              </span>
            </button>
          );
        })}
      </HorizontalScrollRail>

      <div className="catalog-mobile-controls">
        <button
          ref={mobileFilterTriggerRef}
          className="catalog-mobile-filter-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={mobileFiltersOpen}
          onClick={() => setMobileFiltersOpen(true)}
        >
          <SlidersHorizontal aria-hidden="true" size={18} strokeWidth={2.2} />
          {copy.filters}{selectedFacetCount ? ` (${selectedFacetCount})` : ""}
        </button>
        <label className="catalog-mobile-sort" htmlFor="catalog-mobile-sort">
          <span>{copy.sort}</span>
          <select
            id="catalog-mobile-sort"
            value={activeSort}
            aria-label={copy.sortProducts}
            onChange={(event) => updateFilters({ sort: event.target.value })}
          >
            {sortOptions.map((option) => (
              <option value={option.id} key={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" size={15} strokeWidth={2.3} />
        </label>
        <a className="catalog-skip-results" href="#catalog-product-results">
          {copy.skip}
        </a>
      </div>

      {mobileFiltersOpen ? (
        <div className="catalog-filter-drawer" role="presentation">
          <button
            className="catalog-filter-backdrop"
            type="button"
            aria-label={copy.closeFilters}
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div
            ref={mobileFilterDialogRef}
            className="catalog-filter-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-mobile-filter-title"
            tabIndex={-1}
          >
            <header className="catalog-filter-dialog-head">
              <span>
                <strong id="catalog-mobile-filter-title">{copy.filters}</strong>
                <small>{filteredProducts.length} {copy.products}</small>
              </span>
              <button type="button" aria-label={copy.closeFilters} onClick={() => setMobileFiltersOpen(false)}>
                <X aria-hidden="true" size={20} strokeWidth={2.2} />
              </button>
            </header>
            <div className="catalog-filter-dialog-body">{renderFilterControls("catalog-mobile-filter")}</div>
            <footer className="catalog-filter-dialog-actions">
              <button className="button button-secondary" type="button" onClick={clearAllFacets}>
                {copy.clearFilters}
              </button>
              <button className="button button-primary" type="button" onClick={() => setMobileFiltersOpen(false)}>
                {copy.view} {filteredProducts.length} {copy.products}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      <div className="catalog-layout">
        <aside className="catalog-filter-panel" aria-label={copy.filters}>
          <div className="catalog-filter-head">
            <strong>{copy.filters}{selectedFacetCount ? ` (${selectedFacetCount})` : ""}</strong>
            <button type="button" onClick={clearAllFacets}>
              {copy.clear}
            </button>
          </div>

          <div className="catalog-filter-sort">
            <label htmlFor="catalog-sort">{copy.sortBy}</label>
            <div>
              <select
                id="catalog-sort"
                value={activeSort}
                aria-label={copy.sortProducts}
                onChange={(event) => updateFilters({ sort: event.target.value })}
              >
                {sortOptions.map((option) => (
                  <option value={option.id} key={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} strokeWidth={2.3} aria-hidden="true" />
            </div>
          </div>

          {renderFilterControls("catalog-filter")}
        </aside>

        <div
          className="catalog-results"
          id="catalog-product-results"
          role="region"
          aria-labelledby="catalog-product-results-title"
          tabIndex={-1}
        >
          <h2 className="visually-hidden" id="catalog-product-results-title">
            {filteredProducts.length} {copy.results}
          </h2>
          {filteredProducts.length ? (
            <>
              <div className="catalog-product-grid">
                {visibleProducts.map((product, index) => (
                  <CatalogProductCard
                    product={product}
                    locale={locale}
                    imagePriority={activePage === 1 && index < 4}
                    key={product.id}
                  />
                ))}
              </div>
              {totalPages > 1 ? (
                <nav className="catalog-pagination" aria-label={copy.pages}>
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
                      <span key={item}>{locale === "fr-CA" ? "…" : "..."}</span>
                    )
                  )}
                  <button
                    type="button"
                    disabled={activePage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  >
                    {copy.next}
                  </button>
                </nav>
              ) : null}
            </>
          ) : (
            <div className="empty-panel catalog-empty">
              <h2>{copy.noResults}</h2>
              <p>{copy.noResultsHelp}</p>
              <div className="button-row">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    clearAllFacets();
                    updateFilters({ category: null, q: null, sort: null });
                  }}
                >
                  {copy.viewAll}
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => updateFilters({ q: null })}
                >
                  {copy.clearSearch}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
