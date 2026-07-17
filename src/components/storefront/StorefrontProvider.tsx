"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { CartItem, Dealer, ProductSummary } from "@/lib/api/api-contract";
import {
  getEffectivePrice,
  withEffectiveProductPrice
} from "@/lib/commerce/product-commerce";
import { vanstroApi } from "@/lib/api/api-client";

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

function actionError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "The request could not be completed. Please try again.";
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
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<ProductSummary[]>([]);
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState(DEFAULT_DEALER_ID);
  const [selectedDealerName, setSelectedDealerName] = useState(DEFAULT_DEALER_NAME);
  const [postalCode, setPostalCodeState] = useState("");
  const [productIdentityAliases, setProductIdentityAliases] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [cartState, setCartState] = useState<StorefrontAsyncState>({ status: "loading" });
  const [favoritesState, setFavoritesState] = useState<StorefrontAsyncState>({ status: "loading" });
  const [mutationState, setMutationState] = useState<StorefrontContextValue["mutationState"]>({
    status: "idle"
  });

  useEffect(() => {
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
    void vanstroApi.getCart().then((response) => {
      setCartItems(formatCartItems(response.data.items));
      setCartState({ status: "success" });
    }).catch((error) => setCartState({ status: "error", error: actionError(error) }));
    const refreshFavorites = () => {
      setFavoritesState({ status: "loading" });
      void vanstroApi.getFavorites()
        .then((response) => {
          setFavoriteItems(response.data.map((item) => item.product));
          setFavoritesState({ status: "success" });
        })
        .catch((error) => setFavoritesState({ status: "error", error: actionError(error) }));
    };
    refreshFavorites();
    window.addEventListener("vanstro-authenticated", refreshFavorites);
    setHydrated(true);
    return () => window.removeEventListener("vanstro-authenticated", refreshFavorites);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
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
    hydrated
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
      const message = actionError(error);
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
              label: "Paid",
              detail: "Payment recorded to the platform.",
              complete: true
            },
            {
              label: "Inventory reserved",
              detail: `${selectedDealerName} stock is frozen for this order.`,
              complete: true
            },
            {
              label: "Dealer accepted",
              detail: "Dealer fulfillment will be handled in Admin ERP.",
              complete: false
            },
            {
              label: "Delivered",
              detail: "Delivery triggers invoice and settlement events.",
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
      cartSubtotal
      ,cartState
      ,favoritesState
      ,mutationState
      ,hydrated
      ,productIdentityAliases
      ,runMutation
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
