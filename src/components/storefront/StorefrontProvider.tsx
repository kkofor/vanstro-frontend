"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Dealer, ProductSummary } from "@/lib/api/api-contract";
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
  setSelectedDealer: (dealer: Dealer) => void;
  setPostalCode: (postalCode: string) => void;
  addToCart: (product: ProductSummary, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleFavorite: (product: ProductSummary) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  createOrder: (input: {
    fulfillment: "pickup" | "delivery";
    paymentMethod: "pos" | "cash";
  }) => CheckoutOrder;
  getOrder: (orderId: string) => CheckoutOrder | undefined;
};

const STORAGE_KEY = "vanstro-storefront-v1";

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

function makeOrderId() {
  return `VS-${Date.now().toString(36).toUpperCase()}`;
}

function formatCartItems(items: Array<{
  product: ProductSummary;
  quantity: number;
  unitPrice: { amount: number };
}>) {
  return items.map((item) => ({
    product: {
      ...item.product,
      price: item.unitPrice,
      images: item.product.images ?? [],
      dimensions: item.product.dimensions ?? "",
      unit: item.product.unit ?? "each",
      inStock: item.product.inStock ?? true
    } as ProductSummary,
    quantity: item.quantity
  }));
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<ProductSummary[]>([]);
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState("toronto");
  const [selectedDealerName, setSelectedDealerName] = useState("VanStro Toronto");
  const [postalCode, setPostalCodeState] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setOrders(parsed.orders ?? []);
        setSelectedDealerId(parsed.selectedDealerId ?? "toronto");
        setSelectedDealerName(parsed.selectedDealerName ?? "VanStro Toronto");
        setPostalCodeState(parsed.postalCode ?? "");
      }
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    void vanstroApi.getCart().then((response) => {
      setCartItems(formatCartItems(response.data.items));
    }).catch(() => {});
    const refreshFavorites = () => {
      void vanstroApi.getFavorites()
        .then((response) => setFavoriteItems(response.data.map((item) => item.product)))
        .catch(() => setFavoriteItems([]));
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
          selectedDealerId,
          selectedDealerName,
          postalCode
        })
      );
    } catch {}
  }, [
    cartItems,
    favoriteItems,
    orders,
    selectedDealerId,
    selectedDealerName,
    postalCode,
    hydrated
  ]);

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
      setSelectedDealer(dealer) {
        setSelectedDealerId(dealer.id);
        setSelectedDealerName(dealer.name);
      },
      setPostalCode(nextPostalCode) {
        setPostalCodeState(nextPostalCode.trim().toUpperCase());
      },
      addToCart(product, quantity = 1) {
        const pricedProduct = withEffectiveProductPrice(product);
        void vanstroApi.addCartItem({ productId: pricedProduct.id, quantity })
          .then((response) => {
            setCartItems(formatCartItems(response.data.items));
            window.dispatchEvent(
              new CustomEvent("vanstro-cart-added", {
                detail: { product: pricedProduct, quantity }
              })
            );
          })
          .catch(() => {});
      },
      updateCartQuantity(productId, quantity) {
        void vanstroApi.setCartProductQuantity(productId, Math.max(1, quantity))
          .then((response) => setCartItems(formatCartItems(response.data.items)))
          .catch(() => {});
      },
      removeFromCart(productId) {
        void vanstroApi.removeCartProduct(productId)
          .then((response) => setCartItems(formatCartItems(response.data.items)))
          .catch(() => {});
      },
      clearCart() {
        void vanstroApi.clearCart()
          .then(() => setCartItems([]))
          .catch(() => {});
      },
      toggleFavorite(product) {
        const pricedProduct = withEffectiveProductPrice(product);
        if (favoriteItems.some((item) => item.id === pricedProduct.id)) {
          void vanstroApi.removeFavorite(pricedProduct.id)
            .then(() => setFavoriteItems((current) => current.filter((item) => item.id !== pricedProduct.id)))
            .catch(() => {});
          return;
        }
        void vanstroApi.addFavorite(pricedProduct.id)
          .then((response) => setFavoriteItems((current) => [response.data.product, ...current]))
          .catch(() => {});
      },
      removeFavorite(productId) {
        void vanstroApi.removeFavorite(productId)
          .then(() => setFavoriteItems((current) => current.filter((item) => item.id !== productId)))
          .catch(() => {});
      },
      isFavorite(productId) {
        return favoriteItems.some((item) => item.id === productId);
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
