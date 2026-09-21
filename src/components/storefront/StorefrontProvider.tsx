"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { Dealer, Money, ProductSummary, StorefrontConfigProjection } from "@/lib/api/api-contract";
import { withEffectiveProductPrice } from "@/lib/commerce/product-commerce";
import { CartLine } from "@/components/storefront/cart-view-model";
import { vanstroApi } from "@/lib/api/api-client";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import { localizeApiError, normalizeApiErrorCode } from "@/lib/i18n/api-error-localization";
import {
  COOKIE_PREFERENCES_SAVED_EVENT,
  clearFunctionalStorage,
  isCookiePreferencesStorageEvent,
  readCookiePreferences
} from "@/lib/privacy/cookie-preferences";

export type { CartLine } from "@/components/storefront/cart-view-model";

export type CheckoutOrder = {
  id: string;
  createdAt: string;
  status: "paid" | "reserved" | "dealer_accepted" | "fulfilling" | "delivered";
  dealerId: string;
  dealerName: string;
  fulfillment: "pickup" | "delivery";
  paymentMethod: "pos" | "cash";
  items: CartLine[];
  subtotal: Money;
  timeline: Array<{
    label: string;
    detail: string;
    complete: boolean;
  }>;
};

export type StorefrontAsyncState = {
  status: "idle" | "loading" | "success" | "error";
  error?: string;
  errorCode?: ReturnType<typeof normalizeApiErrorCode>;
};

export type StorefrontConfigState = {
  status: "loading" | "ready" | "degraded" | "error";
  publishedGeneration: number;
  projectionState: "compiled_default" | "published";
  effective: StorefrontConfigProjection["effective"];
};

export type StorefrontAction =
  | "add-cart"
  | "update-cart"
  | "remove-cart"
  | "clear-cart"
  | "add-favorite"
  | "remove-favorite";

export type StorefrontActionResult =
  | { ok: true }
  | { ok: false; error: string };

type StorefrontContextValue = {
  cartItems: CartLine[];
  favoriteItems: ProductSummary[];
  orders: CheckoutOrder[];
  selectedDealerId: string;
  selectedDealerLocationId: string;
  selectedDealerName: string;
  /** Live-directory dealer `code` (e.g. "AB10"), used to map to the ERP-snapshot stock id. */
  selectedDealerCode: string;
  postalCode: string;
  cartCount: number;
  favoriteCount: number;
  cartSubtotal: Money;
  cartState: StorefrontAsyncState;
  favoritesState: StorefrontAsyncState;
  mutationState: StorefrontAsyncState & { action?: StorefrontAction };
  persistenceReady: boolean;
  storefrontConfigState: StorefrontConfigState;
  setSelectedDealer: (dealer: Dealer) => void;
  setPostalCode: (postalCode: string) => void;
  addToCart: (product: ProductSummary, quantity?: number) => Promise<StorefrontActionResult>;
  updateCartQuantity: (cartItemId: string, quantity: number) => Promise<StorefrontActionResult>;
  removeFromCart: (cartItemId: string) => Promise<StorefrontActionResult>;
  clearCart: () => Promise<StorefrontActionResult>;
  toggleFavorite: (product: ProductSummary) => Promise<StorefrontActionResult>;
  removeFavorite: (productId: string) => Promise<StorefrontActionResult>;
  refreshFavorites: () => void;
  refreshCart: () => void;
  isFavorite: (productId: string) => boolean;
  createOrder: (input: {
    fulfillment: "pickup" | "delivery";
    paymentMethod: "pos" | "cash";
  }) => CheckoutOrder;
  getOrder: (orderId: string) => CheckoutOrder | undefined;
};

const CART_STORAGE_KEY = "vs.cart";
const STORAGE_KEY = "vanstro-storefront-v1";

type LocalCartItem = {
  sku: string;
  name: string;
  meta: string;
  unit: number;
  qty: number;
  img: string;
};

type LocalCartState = {
  items: LocalCartItem[];
  saved?: LocalCartItem[];
  promo?: string | null;
  prov?: string;
  at?: string;
};

function localCartLine(item: LocalCartItem): CartLine {
  const unitPrice = { amount: item.unit / 100, currency: "CAD" as const };
  const product: ProductSummary = {
    id: item.sku,
    slug: item.sku,
    sku: item.sku,
    name: item.name,
    category: "Catalog",
    price: unitPrice,
    unit: "each",
    dimensions: item.meta,
    images: item.img ? [{ url: item.img, alt: item.name }] : [],
    inStock: true
  };
  return {
    cartItemId: item.sku,
    skuId: item.sku,
    product,
    quantity: item.qty,
    unitPrice,
    lineTotal: { amount: unitPrice.amount * item.qty, currency: "CAD" }
  };
}

function readLocalCart(): LocalCartState {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as Partial<LocalCartState>;
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
    const normalize = (value: unknown): LocalCartItem | undefined => {
      if (!value || typeof value !== "object") return undefined;
      const item = value as Partial<LocalCartItem>;
      if (typeof item.sku !== "string" || !item.sku) return undefined;
      if (typeof item.name !== "string" || typeof item.meta !== "string") return undefined;
      const unit = item.unit;
      const qty = item.qty;
      if (typeof unit !== "number" || !Number.isInteger(unit) || unit <= 0) return undefined;
      if (typeof qty !== "number" || !Number.isInteger(qty) || qty <= 0) return undefined;
      return { sku: item.sku, name: item.name, meta: item.meta, unit, qty, img: typeof item.img === "string" ? item.img : "" };
    };
    return {
      ...parsed,
      items: parsed.items.map(normalize).filter((item): item is LocalCartItem => Boolean(item)),
      saved: Array.isArray(parsed.saved) ? parsed.saved.map(normalize).filter((item): item is LocalCartItem => Boolean(item)) : []
    };
  } catch {
    return { items: [] };
  }
}

function writeLocalCart(items: LocalCartItem[], current?: LocalCartState) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ ...current, items, at: new Date().toISOString() }));
}

function productToLocalCartItem(product: ProductSummary, quantity: number): LocalCartItem {
  const pricedProduct = withEffectiveProductPrice(product);
  return {
    sku: String(pricedProduct.sku),
    name: pricedProduct.name,
    meta: pricedProduct.finish ?? pricedProduct.colorName ?? pricedProduct.sku,
    unit: Math.round(pricedProduct.price.amount * 100),
    qty: Math.max(1, Math.round(quantity)),
    img: pricedProduct.images[0]?.url ?? ""
  };
}

function localCartSnapshot(items: LocalCartItem[]): { items: CartLine[]; subtotal: Money } {
  const lines = items.map(localCartLine);
  return {
    items: lines,
    subtotal: { amount: lines.reduce((total, item) => total + item.lineTotal.amount, 0), currency: "CAD" }
  };
}
const DEFAULT_DEALER_ID = "MB-YUAN";
const DEFAULT_DEALER_NAME = "Yuan Construction Ltd.";
const DEFAULT_DEALER_LOCATION_ID = "MB-YUAN";
const DEFAULT_DEALER_CODE = "MB01";
const STORAGE_VERSION = 2;

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

function makeOrderId() {
  return `VS-${Date.now().toString(36).toUpperCase()}`;
}

function actionError(error: unknown, locale: "en-CA" | "fr-CA", fallback: string) {
  return localizeApiError(error, locale, fallback);
}

function storedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/** Only the old hardcoded literal (the pre-#17 stale default, before dealer ids were
 *  corrected to real snapshot/live-directory values) must be discarded on read. Any other
 *  non-empty stored id is a legitimate returning-user selection — including a live
 *  Website-API dealer UUID, which is NOT present in dealers-snapshot.json (that snapshot
 *  only has ERP-facing ids like "AB-CGY"/"MB-YUAN"). Rejecting every id absent from the
 *  snapshot (the previous behavior here) silently discarded every returning non-Yuan
 *  dealer selection and reset the whole persisted dealer identity back to Yuan on every
 *  reload — the id-to-ERP-snapshot mapping is toStockDealerId()'s job (useProductInventory),
 *  and any id it can't map fails closed to dealer_no_stock downstream in lib/stock.ts, so
 *  this provider does not need to (and must not) gate persistence on snapshot membership. */
const LEGACY_STALE_DEALER_IDS = new Set(["winnipeg"]);
function isValidStoredDealerId(id: string) {
  return !LEGACY_STALE_DEALER_IDS.has(id);
}

function parseStoredState(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const state = value as Record<string, unknown>;
  const aliases = state.productIdentityAliases;
  const productIdentityAliases = aliases && typeof aliases === "object" && !Array.isArray(aliases)
    ? Object.fromEntries(
        Object.entries(aliases).filter(
          (entry): entry is [string, string] => Boolean(entry[0]) && storedString(entry[1]) !== undefined
        )
      )
    : {};

  // A previously stored dealer id that is the old stale literal (see LEGACY_STALE_DEALER_IDS)
  // must never be kept as-is: it silently makes every stock lookup miss and fall into
  // dealer_no_stock even though the displayed name still says Yuan Construction Ltd.
  // Any other non-empty stored id (ERP-snapshot id OR a live Website-API dealer UUID) is
  // trusted and kept — mapping it to something /api/stock understands is
  // useProductInventory's/toStockDealerId's job, not this provider's.
  const storedDealerId = storedString(state.selectedDealerId);
  const validDealerId = storedDealerId && isValidStoredDealerId(storedDealerId) ? storedDealerId : undefined;

  return {
    orders: Array.isArray(state.orders) ? state.orders as CheckoutOrder[] : [],
    selectedDealerId: validDealerId ?? DEFAULT_DEALER_ID,
    selectedDealerName: validDealerId ? (storedString(state.selectedDealerName) ?? DEFAULT_DEALER_NAME) : DEFAULT_DEALER_NAME,
    selectedDealerLocationId: validDealerId ? (storedString(state.selectedDealerLocationId) ?? DEFAULT_DEALER_LOCATION_ID) : DEFAULT_DEALER_LOCATION_ID,
    // The stored dealer `code` (e.g. "AB10") is only trustworthy alongside a valid stored
    // dealer id; a code without any id would silently mis-map stock lookups.
    selectedDealerCode: validDealerId ? (storedString(state.selectedDealerCode) ?? DEFAULT_DEALER_CODE) : DEFAULT_DEALER_CODE,
    postalCode: typeof state.postalCode === "string" ? state.postalCode : "",
    productIdentityAliases
  };
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const copy = getCommerceCopy(locale);
  const localizationRef = useRef({ locale, requestError: copy.storefront.requestError });
  localizationRef.current = { locale, requestError: copy.storefront.requestError };
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [cartSubtotal, setCartSubtotal] = useState<Money>({ amount: 0, currency: "CAD" });
  const [favoriteItems, setFavoriteItems] = useState<ProductSummary[]>([]);
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState(DEFAULT_DEALER_ID);
  const [selectedDealerName, setSelectedDealerName] = useState(DEFAULT_DEALER_NAME);
  const [selectedDealerLocationId, setSelectedDealerLocationId] = useState(DEFAULT_DEALER_LOCATION_ID);
  const [selectedDealerCode, setSelectedDealerCode] = useState(DEFAULT_DEALER_CODE);
  const [postalCode, setPostalCodeState] = useState("");
  const [productIdentityAliases, setProductIdentityAliases] = useState<Record<string, string>>({});
  const [functionalConsent, setFunctionalConsent] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [cartState, setCartState] = useState<StorefrontAsyncState>({ status: "loading" });
  const [favoritesState, setFavoritesState] = useState<StorefrontAsyncState>({ status: "loading" });
  const [mutationState, setMutationState] = useState<StorefrontContextValue["mutationState"]>({
    status: "idle"
  });
  const [storefrontConfigState, setStorefrontConfigState] = useState<StorefrontConfigState>({
    status: "loading",
    publishedGeneration: 0,
    projectionState: "compiled_default",
    effective: {
      siteDisplayName: "VanStro Global Supply",
      brandName: "VanStro",
      announcementRule: { enabled: false, message: "" },
      contact: { email: "", phone: "" },
      logoMedia: null,
      defaultDealer: null,
      defaultLocation: null
    }
  });
  const storefrontConfigRef = useRef<StorefrontConfigState>(storefrontConfigState);
  storefrontConfigRef.current = storefrontConfigState;

  const refreshCart = useCallback(() => {
    setCartState({ status: "loading" });
    try {
      const snapshot = localCartSnapshot(readLocalCart().items);
      setCartItems(snapshot.items);
      setCartSubtotal(snapshot.subtotal);
      setCartState({ status: "success" });
    } catch (error) {
      setCartState({
        status: "error",
        error: actionError(error, localizationRef.current.locale, localizationRef.current.requestError)
      });
    }
  }, []);

  const refreshFavorites = useCallback(() => {
    setFavoritesState({ status: "loading" });
    void vanstroApi.getFavorites()
      .then((response) => {
        setFavoriteItems(response.data.map((item) => item.product));
        setFavoritesState({ status: "success" });
      })
      .catch((error) => setFavoritesState({
        status: "error",
        error: actionError(error, localizationRef.current.locale, localizationRef.current.requestError),
        errorCode: normalizeApiErrorCode(error)
      }));
  }, []);

  useEffect(() => {
    const allowsFunctionalStorage = Boolean(readCookiePreferences()?.functional);
    setFunctionalConsent(allowsFunctionalStorage);

    if (allowsFunctionalStorage) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = parseStoredState(JSON.parse(raw));
          if (!parsed) throw new Error("Stored storefront state is invalid.");
          setOrders(parsed.orders);
          setSelectedDealerId(parsed.selectedDealerId);
          setSelectedDealerName(parsed.selectedDealerName);
          setSelectedDealerLocationId(parsed.selectedDealerLocationId);
          setSelectedDealerCode(parsed.selectedDealerCode);
          setPostalCodeState(parsed.postalCode.trim().toUpperCase());
          setProductIdentityAliases(parsed.productIdentityAliases);
        }
      } catch {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }
    } else {
      clearFunctionalStorage();
    }
    refreshCart();
    const syncFunctionalConsent = () => {
      const nextFunctionalConsent = Boolean(readCookiePreferences()?.functional);
      setFunctionalConsent(nextFunctionalConsent);

      if (!nextFunctionalConsent) {
        clearFunctionalStorage();
        setOrders([]);
        setSelectedDealerId(DEFAULT_DEALER_ID);
        setSelectedDealerName(DEFAULT_DEALER_NAME);
        setSelectedDealerLocationId(DEFAULT_DEALER_LOCATION_ID);
        setSelectedDealerCode(DEFAULT_DEALER_CODE);
        setPostalCodeState("");
        setProductIdentityAliases({});
      }
    };

    refreshFavorites();
    window.addEventListener("vanstro-authenticated", refreshFavorites);
    const syncCrossTabCart = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) refreshCart();
    };
    window.addEventListener("storage", syncCrossTabCart);
    const syncCrossTabConsent = (event: StorageEvent) => {
      // Storage events do not cross origin boundaries; provider-owned storage is the only
      // state this tab may clear. Embedded third-party provider storage is not guessed at.
      if (isCookiePreferencesStorageEvent(event)) syncFunctionalConsent();
    };
    window.addEventListener(COOKIE_PREFERENCES_SAVED_EVENT, syncFunctionalConsent);
    window.addEventListener("storage", syncCrossTabConsent);
    setHydrated(true);
    return () => {
      window.removeEventListener("vanstro-authenticated", refreshFavorites);
      window.removeEventListener("storage", syncCrossTabCart);
      window.removeEventListener(COOKIE_PREFERENCES_SAVED_EVENT, syncFunctionalConsent);
      window.removeEventListener("storage", syncCrossTabConsent);
    };
  }, [refreshCart, refreshFavorites]);

  useEffect(() => {
    const controller = new AbortController();
    let generationFence = 0;
    let settled = false;
    const settle = (next: StorefrontConfigState) => {
      if (settled) return;
      settled = true;
      setStorefrontConfigState(next);
    };
    // Static demo export has no real API; keep the compiled fallback and
    // never fire an external request. A live deployment (server mode or
    // production-configured static export with a real API base) fetches the
    // published projection on the client.
    if (process.env.NEXT_PUBLIC_DEMO_READ_ONLY === "true") {
      settle({
        status: "degraded",
        publishedGeneration: 0,
        projectionState: "compiled_default",
        effective: { siteDisplayName: "VanStro Global Supply", brandName: "VanStro", announcementRule: { enabled: false, message: "" }, contact: { email: "", phone: "" }, logoMedia: null, defaultDealer: null, defaultLocation: null }
      });
      return () => controller.abort();
    }
    setStorefrontConfigState((current) => ({ ...current, status: "loading" }));
    void vanstroApi.getStorefrontConfig(locale).then((projection) => {
      if (controller.signal.aborted) return;
      generationFence += 1;
      const appliedGeneration = generationFence;
      settle({
        status: "degraded",
        publishedGeneration: projection.data.publishedGeneration,
        projectionState: projection.data.projectionState,
        effective: projection.data.effective
      });
      if (projection.data.publishedGeneration === 0) return;
      void vanstroApi.getS02SettingsReadiness(projection.data.publishedGeneration)
        .then((readiness) => {
          if (controller.signal.aborted || appliedGeneration !== generationFence) return;
          const exact = readiness.data.consumerGeneration === projection.data.publishedGeneration
            && readiness.data.publishedGeneration === projection.data.publishedGeneration
            && readiness.data.state === "ready";
          settle({
            status: exact ? "ready" : "degraded",
            publishedGeneration: projection.data.publishedGeneration,
            projectionState: projection.data.projectionState,
            effective: projection.data.effective
          });
        })
        .catch(() => {
          if (controller.signal.aborted || appliedGeneration !== generationFence) return;
          settle({
            status: "degraded",
            publishedGeneration: projection.data.publishedGeneration,
            projectionState: projection.data.projectionState,
            effective: projection.data.effective
          });
        });
    }).catch(() => {
      if (controller.signal.aborted) return;
      settle({
        status: "error",
        publishedGeneration: 0,
        projectionState: "compiled_default",
        effective: storefrontConfigRef.current.effective
      });
    });
    return () => controller.abort();
  }, [locale]);

  useEffect(() => {
    if (!hydrated || !functionalConsent) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          orders,
          storageVersion: STORAGE_VERSION,
          selectedDealerId,
          selectedDealerName,
          selectedDealerLocationId,
          selectedDealerCode,
          postalCode,
          productIdentityAliases
        })
      );
    } catch {}
  }, [
    orders,
    selectedDealerId,
    selectedDealerName,
    selectedDealerLocationId,
    selectedDealerCode,
    postalCode,
    productIdentityAliases,
    hydrated,
    functionalConsent
  ]);

  const runMutation = useCallback(async (
    action: StorefrontAction,
    operation: () => Promise<void>
  ): Promise<StorefrontActionResult> => {
    setMutationState({ action, status: "loading" });
    try {
      await operation();
      setMutationState({ action, status: "success" });
      return { ok: true };
    } catch (error) {
      const message = actionError(error, localizationRef.current.locale, localizationRef.current.requestError);
      setMutationState({ action, status: "error", error: message });
      return { ok: false, error: message };
    }
  }, []);

  const value = useMemo<StorefrontContextValue>(
    () => ({
      cartItems,
      favoriteItems,
      orders,
      selectedDealerId,
      selectedDealerName,
      selectedDealerLocationId,
      selectedDealerCode,
      postalCode,
      cartCount: cartItems.reduce((total, item) => total + item.quantity, 0),
      favoriteCount: favoriteItems.length,
      cartSubtotal,
      cartState,
      favoritesState,
      mutationState,
      persistenceReady: hydrated,
      storefrontConfigState,
      setSelectedDealer(dealer) {
        setSelectedDealerId(dealer.id);
        setSelectedDealerName(dealer.name);
        setSelectedDealerLocationId(dealer.dealerLocationId ?? "");
        setSelectedDealerCode(dealer.code ?? "");
      },
      setPostalCode(nextPostalCode) {
        setPostalCodeState(nextPostalCode.trim().toUpperCase());
      },
      async addToCart(product, quantity = 1) {
        const pricedProduct = withEffectiveProductPrice(product);
        return runMutation("add-cart", async () => {
          const current = readLocalCart();
          const incoming = productToLocalCartItem(pricedProduct, quantity);
          const existing = current.items.find((item) => item.sku === incoming.sku);
          const items = existing
            ? current.items.map((item) => item.sku === incoming.sku ? { ...incoming, qty: item.qty + incoming.qty } : item)
            : [...current.items, incoming];
          writeLocalCart(items, current);
          const snapshot = localCartSnapshot(items);
          setCartItems(snapshot.items);
          setCartSubtotal(snapshot.subtotal);
          setCartState({ status: "success" });
          const addedItem = snapshot.items.find((item) => item.skuId === incoming.sku);
          if (addedItem) {
            window.dispatchEvent(
              new CustomEvent("vanstro-cart-added", {
                detail: {
                  product: pricedProduct,
                  quantity,
                  unitPrice: addedItem.unitPrice,
                  addedTotal: { amount: incoming.unit * incoming.qty / 100, currency: "CAD" }
                }
              })
            );
          }
        });
      },
      updateCartQuantity(cartItemId, quantity) {
        return runMutation("update-cart", async () => {
          const current = readLocalCart();
          const items = current.items.map((item) => item.sku === cartItemId ? { ...item, qty: Math.max(1, Math.round(quantity)) } : item);
          writeLocalCart(items, current);
          const snapshot = localCartSnapshot(items);
          setCartItems(snapshot.items);
          setCartSubtotal(snapshot.subtotal);
          setCartState({ status: "success" });
        });
      },
      removeFromCart(cartItemId) {
        return runMutation("remove-cart", async () => {
          const current = readLocalCart();
          const items = current.items.filter((item) => item.sku !== cartItemId);
          writeLocalCart(items, current);
          const snapshot = localCartSnapshot(items);
          setCartItems(snapshot.items);
          setCartSubtotal(snapshot.subtotal);
          setCartState({ status: "success" });
        });
      },
      clearCart() {
        return runMutation("clear-cart", async () => {
          const current = readLocalCart();
          writeLocalCart([], current);
          setCartItems([]);
          setCartSubtotal({ amount: 0, currency: "CAD" });
          setCartState({ status: "success" });
        });
      },
      async toggleFavorite(product) {
        const pricedProduct = withEffectiveProductPrice(product);
        const canonicalId = productIdentityAliases[pricedProduct.id];
        if (favoriteItems.some((item) => item.id === pricedProduct.id || item.id === canonicalId)) {
          return runMutation("remove-favorite", async () => {
            const result = await vanstroApi.removeFavoriteProduct(pricedProduct);
            setFavoriteItems((current) => current.filter(
              (item) => item.id !== pricedProduct.id && item.id !== result.productId
            ));
            setFavoritesState({ status: "success" });
          });
        }
        return runMutation("add-favorite", async () => {
          const response = await vanstroApi.addFavoriteProduct(pricedProduct);
          setProductIdentityAliases((current) => ({
            ...current,
            [pricedProduct.id]: response.canonicalProductId
          }));
          setFavoriteItems((current) => [pricedProduct, ...current]);
          setFavoritesState({ status: "success" });
        });
      },
      removeFavorite(productId) {
        return runMutation("remove-favorite", async () => {
          await vanstroApi.removeFavorite(productId);
          setFavoriteItems((current) => current.filter((item) => item.id !== productId));
          setFavoritesState({ status: "success" });
        });
      },
      refreshFavorites,
      refreshCart,
      isFavorite(productId) {
        const canonicalId = productIdentityAliases[productId];
        return favoriteItems.some((item) => item.id === productId || item.id === canonicalId);
      },
      createOrder(input) {
        const order: CheckoutOrder = {
          id: makeOrderId(),
          createdAt: new Date().toISOString(),
          status: "reserved",
          dealerId: selectedDealerId,
          dealerName: selectedDealerName,
          fulfillment: input.fulfillment,
          paymentMethod: input.paymentMethod,
          items: cartItems,
          subtotal: cartSubtotal,
          timeline: [
            {
              label: copy.storefront.timeline.paid,
              detail: copy.storefront.timeline.paidDetail,
              complete: true
            },
            {
              label: copy.storefront.timeline.reserved,
              detail: copy.storefront.timeline.reservedDetail(selectedDealerName),
              complete: true
            },
            {
              label: copy.storefront.timeline.accepted,
              detail: copy.storefront.timeline.acceptedDetail,
              complete: false
            },
            {
              label: copy.storefront.timeline.delivered,
              detail: copy.storefront.timeline.deliveredDetail,
              complete: false
            }
          ]
        };
        setOrders((current) => [order, ...current]);
        setCartItems([]);
        setCartSubtotal({ amount: 0, currency: cartSubtotal.currency });
        return order;
      },
      getOrder(orderId) {
        return orders.find((order) => order.id === orderId);
      }
    }),
    [
      cartItems,
      favoriteItems,
      selectedDealerId,
      selectedDealerName,
      selectedDealerLocationId,
      selectedDealerCode,
      postalCode,
      cartSubtotal,
      cartState,
      favoritesState,
      mutationState,
      hydrated,
      productIdentityAliases,
      storefrontConfigState,
      runMutation,
      refreshFavorites,
      refreshCart,
      copy
    ]
  );

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error("useStorefront must be used inside StorefrontProvider");
  }
  return context;
}
