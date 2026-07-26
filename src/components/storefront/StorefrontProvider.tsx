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
import { CartItem, Dealer, ProductSummary } from "@/lib/api/api-contract";
import {
  getEffectivePrice,
  withEffectiveProductPrice
} from "@/lib/commerce/product-commerce";
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

export type CartLine = {
  product: ProductSummary;
  quantity: number;
};

export type CheckoutOrder = {
  id: string;
  createdAt: string;
  status: "paid" | "reserved" | "dealer_accepted" | "fulfilling" | "delivered";
  dealerId: string;
  dealerName: string;
  fulfillment: "pickup" | "delivery";
  paymentMethod: "pos" | "cash";
  items: CartLine[];
  subtotal: number;
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
  selectedDealerName: string;
  postalCode: string;
  cartCount: number;
  favoriteCount: number;
  cartSubtotal: number;
  cartState: StorefrontAsyncState;
  favoritesState: StorefrontAsyncState;
  mutationState: StorefrontAsyncState & { action?: StorefrontAction };
  persistenceReady: boolean;
  setSelectedDealer: (dealer: Dealer) => void;
  setPostalCode: (postalCode: string) => void;
  addToCart: (product: ProductSummary, quantity?: number) => Promise<StorefrontActionResult>;
  updateCartQuantity: (productId: string, quantity: number) => Promise<StorefrontActionResult>;
  removeFromCart: (productId: string) => Promise<StorefrontActionResult>;
  clearCart: () => Promise<StorefrontActionResult>;
  toggleFavorite: (product: ProductSummary) => Promise<StorefrontActionResult>;
  removeFavorite: (productId: string) => Promise<StorefrontActionResult>;
  refreshFavorites: () => void;
  isFavorite: (productId: string) => boolean;
  createOrder: (input: {
    fulfillment: "pickup" | "delivery";
    paymentMethod: "pos" | "cash";
  }) => CheckoutOrder;
  getOrder: (orderId: string) => CheckoutOrder | undefined;
};

const STORAGE_KEY = "vanstro-storefront-v1";
const DEFAULT_DEALER_ID = "winnipeg";
const DEFAULT_DEALER_NAME = "Yuan Construction Ltd.";
const STORAGE_VERSION = 2;

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

function makeOrderId() {
  return `VS-${Date.now().toString(36).toUpperCase()}`;
}

function formatCartItems(items: CartItem[]): CartLine[] {
  return items.map((item) => ({
    product: {
      id: item.product.id,
      slug: item.product.slug,
      sku: item.product.sku,
      name: item.product.name,
      price: item.unitPrice,
      category: item.product.category ?? "Catalog",
      unit: item.product.unit,
      dimensions: item.product.dimensions,
      images: item.product.images,
      inStock: item.product.inStock
    },
    quantity: item.quantity
  }));
}

function actionError(error: unknown, locale: "en-CA" | "fr-CA", fallback: string) {
  return localizeApiError(error, locale, fallback);
}

function storedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
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

  return {
    orders: Array.isArray(state.orders) ? state.orders as CheckoutOrder[] : [],
    selectedDealerId: storedString(state.selectedDealerId) ?? DEFAULT_DEALER_ID,
    selectedDealerName: storedString(state.selectedDealerName) ?? DEFAULT_DEALER_NAME,
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
  const [favoriteItems, setFavoriteItems] = useState<ProductSummary[]>([]);
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState(DEFAULT_DEALER_ID);
  const [selectedDealerName, setSelectedDealerName] = useState(DEFAULT_DEALER_NAME);
  const [postalCode, setPostalCodeState] = useState("");
  const [productIdentityAliases, setProductIdentityAliases] = useState<Record<string, string>>({});
  const [functionalConsent, setFunctionalConsent] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [cartState, setCartState] = useState<StorefrontAsyncState>({ status: "loading" });
  const [favoritesState, setFavoritesState] = useState<StorefrontAsyncState>({ status: "loading" });
  const [mutationState, setMutationState] = useState<StorefrontContextValue["mutationState"]>({
    status: "idle"
  });

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
    void vanstroApi.getCart().then((response) => {
      setCartItems(formatCartItems(response.data.items));
      setCartState({ status: "success" });
    }).catch((error) => setCartState({ status: "error", error: actionError(error, localizationRef.current.locale, localizationRef.current.requestError) }));
    const syncFunctionalConsent = () => {
      const nextFunctionalConsent = Boolean(readCookiePreferences()?.functional);
      setFunctionalConsent(nextFunctionalConsent);

      if (!nextFunctionalConsent) {
        clearFunctionalStorage();
        setOrders([]);
        setSelectedDealerId(DEFAULT_DEALER_ID);
        setSelectedDealerName(DEFAULT_DEALER_NAME);
        setPostalCodeState("");
        setProductIdentityAliases({});
      }
    };

    refreshFavorites();
    const refreshCart = () => {
      void vanstroApi.getCart().then((response) => {
        setCartItems(formatCartItems(response.data.items));
        setCartState({ status: "success" });
      }).catch((error) => setCartState({ status: "error", error: actionError(error, localizationRef.current.locale, localizationRef.current.requestError) }));
    };
    window.addEventListener("vanstro-authenticated", refreshFavorites);
    window.addEventListener("vanstro-authenticated", refreshCart);
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
      window.removeEventListener("vanstro-authenticated", refreshCart);
      window.removeEventListener(COOKIE_PREFERENCES_SAVED_EVENT, syncFunctionalConsent);
      window.removeEventListener("storage", syncCrossTabConsent);
    };
  }, [refreshFavorites]);

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
          postalCode,
          productIdentityAliases
        })
      );
    } catch {}
  }, [
    orders,
    selectedDealerId,
    selectedDealerName,
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

  const cartSubtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + getEffectivePrice(item.product).amount * item.quantity,
        0
      ),
    [cartItems]
  );

  const value = useMemo<StorefrontContextValue>(
    () => ({
      cartItems,
      favoriteItems,
      orders,
      selectedDealerId,
      selectedDealerName,
      postalCode,
      cartCount: cartItems.reduce((total, item) => total + item.quantity, 0),
      favoriteCount: favoriteItems.length,
      cartSubtotal,
      cartState,
      favoritesState,
      mutationState,
      persistenceReady: hydrated,
      setSelectedDealer(dealer) {
        setSelectedDealerId(dealer.id);
        setSelectedDealerName(dealer.name);
      },
      setPostalCode(nextPostalCode) {
        setPostalCodeState(nextPostalCode.trim().toUpperCase());
      },
      async addToCart(product, quantity = 1) {
        const pricedProduct = withEffectiveProductPrice(product);
        return runMutation("add-cart", async () => {
          const response = await vanstroApi.addCartProduct(pricedProduct, quantity);
            setCartItems(formatCartItems(response.data.items));
            setCartState({ status: "success" });
            window.dispatchEvent(
              new CustomEvent("vanstro-cart-added", {
                detail: { product: pricedProduct, quantity }
              })
            );
        });
      },
      updateCartQuantity(productId, quantity) {
        return runMutation("update-cart", async () => {
          const response = await vanstroApi.setCartProductQuantity(productId, Math.max(1, quantity));
          setCartItems(formatCartItems(response.data.items));
          setCartState({ status: "success" });
        });
      },
      removeFromCart(productId) {
        return runMutation("remove-cart", async () => {
          const response = await vanstroApi.removeCartProduct(productId);
          setCartItems(formatCartItems(response.data.items));
          setCartState({ status: "success" });
        });
      },
      clearCart() {
        return runMutation("clear-cart", async () => {
          await vanstroApi.clearCart();
          setCartItems([]);
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
        return order;
      },
      getOrder(orderId) {
        return orders.find((order) => order.id === orderId);
      }
    }),
    [
      cartItems,
      favoriteItems,
      orders,
      selectedDealerId,
      selectedDealerName,
      postalCode,
      cartSubtotal,
      cartState,
      favoritesState,
      mutationState,
      hydrated,
      productIdentityAliases,
      runMutation,
      refreshFavorites,
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
