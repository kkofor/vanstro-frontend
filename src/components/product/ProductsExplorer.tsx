"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Heart, SlidersHorizontal, Star, X } from "lucide-react";
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
import { useLocale } from "@/components/i18n/LocaleProvider";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { HorizontalScrollRail } from "@/components/ui/HorizontalScrollRail";
import {
  CATALOG_PAGE_SIZE,
  type CatalogCategoryOption,
  matchesCatalogCategory,
  getCatalogSortOptions,
  getCatalogSubcategoryOptions,
  getCatalogWidthOptions
} from "@/lib/product/catalog-config";
import { formatProductSize } from "@/lib/product/product-display";
import { formatUnitPrice } from "@/lib/i18n/display-format";
import { resolveProductVariant } from "@/lib/product/product-variants";
import { sortCatalogFeaturedProducts } from "@/lib/product/catalog-featured-sort";
import type { SiteLocale } from "@/lib/i18n/locale";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";
import { openCanonicalCatalog } from "@/lib/i18n/canonical-catalog";
import { localizeProductTaxonomyLabel, KITCHEN_CABINET_SUBCATEGORY_PARENT_SLUG, KITCHEN_CABINET_SUBCATEGORY_SLUGS } from "@/lib/product/product-localization";
import {
  parseCatalogSubcategoryFilter,
  serializeCatalogSubcategoryFilter
} from "@/lib/product/catalog-filter-state";

type ProductsExplorerProps = {
  products: ProductSummary[];
  categories: CatalogCategoryOption[];
  /**
   * Full set of options a product can be filtered/matched by via
   * `?category=<slug>` — parents AND their children (e.g. kitchen-cabinets
   * plus base-cabinets/wall-cabinets/tall-cabinets/cabinet-accessories).
   * Deliberately NOT runtime-revalidated (unlike `categories`/`useLocale()`,
   * which is parent-only) so a child-category URL keeps matching correctly
   * without depending on a client-side re-fetch landing first.
   */
  filterableCategories: CatalogCategoryOption[];
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
    allCategories: "All Products",
    categoryLabel: "Product Categories", categoryHint: "Swipe or use the arrow buttons to view more categories.",
    filters: "Filters", sort: "Sort", sortBy: "Sort by", sortProducts: "Sort products",
    skip: "Skip to products", closeFilters: "Close product filters", clear: "Clear", clearFilters: "Clear filters",
    view: "View", results: "product results", pages: "Product pages", next: "Next", sku: "SKU",
    noResults: "No Products Found", noResultsHelp: "Try a different category, SKU, size, finish or fulfillment filter.",
    viewAll: "View all products", clearSearch: "Clear search", favoriteAdd: "Save", favoriteRemove: "Remove",
    addToCart: "Add to cart", addedToCart: "Added",
    review: "review", reviews: "reviews",
    facetLabels: { subCategory: "Product Categories", width: "Width", finish: "Finish", brand: "Brand" }
  },
  "fr-CA": {
    title: "Produits", home: "Accueil", products: "produits", items: "articles",
    allCategories: "Tous les produits",
    categoryLabel: "Catégories de produits", categoryHint: "Balayez ou utilisez les flèches pour voir plus de catégories.",
    filters: "Filtres", sort: "Trier", sortBy: "Trier par", sortProducts: "Trier les produits",
    skip: "Passer aux produits", closeFilters: "Fermer les filtres de produits", clear: "Effacer", clearFilters: "Effacer les filtres",
    view: "Voir", results: "résultats de produits", pages: "Pages de produits", next: "Suivant", sku: "UGS",
    noResults: "Aucun produit trouvé", noResultsHelp: "Essayez une autre catégorie, UGS, dimension, finition ou option de réception.",
    viewAll: "Voir tous les produits", clearSearch: "Effacer la recherche", favoriteAdd: "Ajouter", favoriteRemove: "Retirer",
    addToCart: "Ajouter au panier", addedToCart: "Ajouté",
    review: "avis", reviews: "avis",
    facetLabels: { subCategory: "Catégories de produits", width: "Largeur", finish: "Fini", brand: "Marque" }
  }
} as const;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesCategory(
  product: ProductSummary,
  category: CatalogCategoryOption,
  locale: SiteLocale
) {
  return matchesCatalogCategory(product, category, locale);
}

function matchesQuery(product: ProductSummary, query: string) {
  if (!query) return true;
  const finishOptionText = product.finishOptions
    ?.flatMap((option) => [
      option.name,
      option.sku ?? "",
      option.manufacturerPartNumber ?? "",
      option.dimensions ?? ""
    ])
    .join(" ") ?? "";
  const haystack = [
    product.name,
    product.sku,
    product.manufacturerPartNumber ?? "",
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

function productCount(products: ProductSummary[], category: CatalogCategoryOption, locale: SiteLocale) {
  if (category.slug === "all") return products.length;
  return products.filter((product) => matchesCategory(product, category, locale)).length;
}

function getRepresentativeImage(
  products: ProductSummary[],
  category: CatalogCategoryOption,
  locale: SiteLocale
) {
  const representative =
    category.slug === "all"
      ? products[0]
      : products.find((product) => matchesCategory(product, category, locale));

  return representative?.images[0];
}

function getProductWidths(product: ProductSummary) {
  const dimensions = [
    product.dimensions,
    ...(product.finishOptions?.map((option) => option.dimensions ?? "") ?? [])
  ];
  return [...new Set(dimensions.flatMap((value) => {
    const match = value.match(/(\d+(?:\.\d+)?)\s*in/i);
    return match ? [Number(match[1])] : [];
  }))];
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
      count: products.filter((product) =>
        getProductWidths(product).some((width) => width >= option.min && width <= option.max)
      ).length,
      matches: (product) =>
        getProductWidths(product).some((width) => width >= option.min && width <= option.max)
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
  const { isFavorite, toggleFavorite, addToCart } = useStorefront();
  const saved = isFavorite(product.id);
  const [addState, setAddState] = useState<"idle" | "adding" | "added">("idle");
  async function handleAddToCart() {
    if (addState !== "idle") return;
    setAddState("adding");
    const result = await addToCart(product, 1);
    if (result.ok) {
      setAddState("added");
      window.setTimeout(() => setAddState("idle"), 1000);
    } else {
      setAddState("idle");
    }
  }
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
        {product.ratingSummary && product.ratingSummary.count > 0 ? (
          <p className="catalog-rating" aria-label={`${product.ratingSummary.average.toFixed(1)} out of 5 stars from ${product.ratingSummary.count} reviews`}>
            {[0, 1, 2, 3, 4].map((index) => (
              <Star
                className={index < Math.round(product.ratingSummary!.average) ? "rating-star filled" : "rating-star"}
                size={13}
                strokeWidth={2}
                fill="currentColor"
                aria-hidden="true"
                key={index}
              />
            ))}
            <small>{product.ratingSummary.count} {product.ratingSummary.count === 1 ? copy.review : copy.reviews}</small>
          </p>
        ) : null}
        <div className="catalog-card-footer">
          <div className="catalog-price">
            {compareAtPrice ? <del>{formatMoney(compareAtPrice, locale)}</del> : null}
            <strong>{formatUnitPrice(effectivePrice, product.unit, locale)}</strong>
          </div>
          <button
            className={addState === "added" ? "catalog-add-to-cart is-added" : "catalog-add-to-cart"}
            type="button"
            onClick={() => void handleAddToCart()}
            disabled={addState === "adding"}
            aria-live="polite"
          >
            {addState === "added" ? copy.addedToCart : copy.addToCart}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductsExplorer({ products, categories, filterableCategories, locale }: ProductsExplorerProps) {
  const copy = CATALOG_COPY[locale];
  // Prefer the runtime-revalidated categories from LocaleBoundary so a
  // dashboard category created after the static snapshot reaches the catalog
  // without a rebuild; the build-time prop is only the first-paint fallback.
  const { categories: runtimeCategories } = useLocale();
  const effectiveCategories = runtimeCategories.length ? runtimeCategories : categories;
  const categoryOptions = useMemo<CatalogCategoryOption[]>(
    () => [
      { id: "all", slug: "all", label: copy.allCategories, shortLabel: copy.allCategories, description: null },
      ...effectiveCategories
    ],
    [effectiveCategories, copy.allCategories]
  );
  const subcategoryOptions = getCatalogSubcategoryOptions(locale);
  const sortOptions = getCatalogSortOptions(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category") ?? "all";
  const queryParam = searchParams.get("q") ?? "";
  const subcategoryParam = searchParams.get("subcategory") ?? "";
  const sortParam = searchParams.get("sort") ?? "featured";
  // All active categories are selectable; an empty category is shown with an
  // explicit empty state instead of being hidden or falling back to "all".
  const availableCategories = categoryOptions;
  // Matching/filtering uses the full parent+child set (`filterableCategories`,
  // build-time only, never overwritten by the parent-only runtime
  // revalidation) so `?category=<child-slug>` resolves correctly. Unlike the
  // display-only `activeCategory` below, this deliberately has NO fallback:
  // an unrecognized slug must fall through to zero matched products and the
  // existing explicit empty state, not silently show every product.
  const filterableCategoryOptions = useMemo<CatalogCategoryOption[]>(
    () => [
      { id: "all", slug: "all", label: copy.allCategories, shortLabel: copy.allCategories, description: null },
      ...filterableCategories
    ],
    [filterableCategories, copy.allCategories]
  );
  const activeMatchCategory = filterableCategoryOptions.find(
    (category) => category.slug === categoryParam
  );
  // Kitchen Cabinets' four child categories, always rendered indented under
  // the Kitchen Cabinets parent in the left sidebar Categories list (per
  // architect/user decision: products-page sidebar only, always visible,
  // not a hover/expand interaction; nav dropdown, homepage cards and footer
  // are explicitly unchanged and stay parent-only).
  const kitchenSubcategoryOptions = useMemo(() => {
    const bySlug = new Map(filterableCategories.map((category) => [category.slug, category]));
    return ["base-cabinets", "wall-cabinets", "tall-cabinets", "cabinet-accessories"]
      .filter((slug) => KITCHEN_CABINET_SUBCATEGORY_SLUGS.has(slug))
      .map((slug) => bySlug.get(slug))
      .filter((category): category is CatalogCategoryOption => Boolean(category));
  }, [filterableCategories]);
  // Display-only: which parent-level chip/tile to highlight as "active" on
  // this page. Falls back to "All Products" for a child slug (not present in
  // the parent-only display set) or an unrecognized slug — this only affects
  // which chip looks selected, never which products are shown (that is
  // `activeMatchCategory` above, which has no fallback).
  const activeCategory =
    categoryOptions.find((category) => category.slug === categoryParam) ??
    categoryOptions[0];
  // H1 must reflect the selected category, not always read "Products" —
  // otherwise every ?category=<slug> URL renders an identical heading and
  // search engines/customers can't tell the pages apart (Mid item 1, SEO
  // audit). Falls back to the generic page title for `all`/no param/an
  // unrecognized slug, same fallback rule as `activeCategory` above.
  const pageHeading =
    activeMatchCategory && activeMatchCategory.slug !== "all"
      ? localizeProductTaxonomyLabel(activeMatchCategory.label, locale)
      : copy.title;
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
  const [selectedFacets, setSelectedFacets] = useState<Record<FacetKey, string[]>>(() => ({
    subCategory: parseCatalogSubcategoryFilter(
      subcategoryParam,
      subcategoryOptions.map((option) => option.id)
    ),
    width: [],
    finish: [],
    brand: []
  }));

  useEffect(() => {
    const nextSubcategories = parseCatalogSubcategoryFilter(
      subcategoryParam,
      subcategoryOptions.map((option) => option.id)
    );
    setSelectedFacets((current) => {
      if (
        current.subCategory.length === nextSubcategories.length &&
        current.subCategory.every((value, index) => value === nextSubcategories[index])
      ) {
        return current;
      }
      return { ...current, subCategory: nextSubcategories };
    });
  }, [locale, subcategoryParam]);

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
    () =>
      activeMatchCategory
        ? products.filter((product) => matchesCategory(product, activeMatchCategory, locale))
        : [],
    [activeMatchCategory, locale, products]
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
        (a, b) =>
          getEffectivePrice(a).amount - getEffectivePrice(b).amount ||
          a.sku.localeCompare(b.sku, "en-CA", { numeric: true })
      );
    }

    if (activeSort === "price-desc") {
      return [...nextProducts].sort(
        (a, b) =>
          getEffectivePrice(b).amount - getEffectivePrice(a).amount ||
          a.sku.localeCompare(b.sku, "en-CA", { numeric: true })
      );
    }

    return sortCatalogFeaturedProducts(nextProducts);
  }, [activeMatchCategory, activeSort, categoryProducts, facetOptions, normalizedQuery, selectedFacets]);

  function openCategory(categoryId: string) {
    // Category navigation builds a fresh URL from scratch: only the category is
    // carried, any previous q/sort/facet state is dropped. A full page load is
    // used because same-pathname client navigation in the static export can
    // otherwise restore stale search params.
    window.location.assign(
      categoryId === "all"
        ? canonicalCatalogUrl(locale)
        : localeHref(`/products?category=${categoryId}`, locale)
    );
  }

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
    if (Object.hasOwn(next, "category")) params.delete("subcategory");

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
    const activeValues = selectedFacets[facetKey];
    const nextValues = activeValues.includes(optionId)
      ? activeValues.filter((value) => value !== optionId)
      : [...activeValues, optionId];
    setSelectedFacets((current) => ({ ...current, [facetKey]: nextValues }));
    if (facetKey === "subCategory") {
      updateFilters({ subcategory: serializeCatalogSubcategoryFilter(nextValues) });
    }
  }

  function clearAllFacets() {
    setCurrentPage(1);
    setSelectedFacets({
      subCategory: [],
      width: [],
      finish: [],
      brand: []
    });
    openCanonicalCatalog(locale);
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
              <span className="catalog-filter-category-group" key={category.id}>
                <button
                  className={category.slug === activeCategory.slug ? "filter-link active" : "filter-link"}
                  type="button"
                  onClick={() => openCategory(category.slug)}
                >
                  <span>{localizeProductTaxonomyLabel(category.shortLabel, locale)}</span>
                  <em>{productCount(products, category, locale)}</em>
                </button>
                {category.slug === KITCHEN_CABINET_SUBCATEGORY_PARENT_SLUG
                  ? kitchenSubcategoryOptions.map((child) => (
                      <button
                        className={
                          child.slug === categoryParam
                            ? "filter-link filter-link-child active"
                            : "filter-link filter-link-child"
                        }
                        type="button"
                        onClick={() => openCategory(child.slug)}
                        key={child.id}
                      >
                        <span>{localizeProductTaxonomyLabel(child.shortLabel, locale)}</span>
                        <em>{productCount(products, child, locale)}</em>
                      </button>
                    ))
                  : null}
              </span>
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
      <div className="catalog-heading">
        <div className="catalog-heading-copy">
          <PageBreadcrumb items={[{ label: copy.home, href: "/" }, { label: pageHeading }]} />
          <h1>{pageHeading}</h1>
        </div>
        <strong>{filteredProducts.length} {copy.products}</strong>
      </div>

      <HorizontalScrollRail
        className="catalog-category-showcase"
        label={copy.categoryLabel}
        hint={copy.categoryHint}
        previousLabel={locale === "fr-CA" ? "Catégories de produits précédentes" : "Previous product categories"}
        nextLabel={locale === "fr-CA" ? "Catégories de produits suivantes" : "Next product categories"}
        activeKey={activeCategory.slug}
      >
        {availableCategories.map((category) => {
          const count = productCount(products, category, locale);
          const active = category.slug === activeCategory.slug;
          const image = getRepresentativeImage(products, category, locale);

          return (
            <button
              className={active ? "catalog-category-tile active" : "catalog-category-tile"}
              type="button"
              aria-pressed={active}
              onClick={() => openCategory(category.slug)}
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
                <strong>{localizeProductTaxonomyLabel(category.label, locale)}</strong>
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
                  onClick={() => openCanonicalCatalog(locale)}
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
