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

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<ProductSummary[]>([]);
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState("toronto");
  const [selectedDealerName, setSelectedDealerName] = useState("VanStro Toronto");
  const [postalCode, setPostalCodeState] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setCartItems(parsed.cartItems ?? []);
        setFavoriteItems(parsed.favoriteItems ?? []);
        setOrders(parsed.orders ?? []);
        setSelectedDealerId(parsed.selectedDealerId ?? "toronto");
        setSelectedDealerName(parsed.selectedDealerName ?? "VanStro Toronto");
        setPostalCodeState(parsed.postalCode ?? "");
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cartItems,
        favoriteItems,
        orders,
        selectedDealerId,
        selectedDealerName,
        postalCode
      })
    );
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
        setCartItems((current) => {
          const existing = current.find((item) => item.product.id === pricedProduct.id);
          if (existing) {
            return current.map((item) =>
              item.product.id === pricedProduct.id
                ? { ...item, product: pricedProduct, quantity: item.quantity + quantity }
                : item
            );
          }
          return [...current, { product: pricedProduct, quantity }];
        });
        window.dispatchEvent(
          new CustomEvent("vanstro-cart-added", {
            detail: {
              product: pricedProduct,
              quantity
            }
          })
        );
      },
      updateCartQuantity(productId, quantity) {
        setCartItems((current) =>
          current
            .map((item) =>
              item.product.id === productId
                ? { ...item, quantity: Math.max(1, quantity) }
                : item
            )
            .filter((item) => item.quantity > 0)
        );
      },
      removeFromCart(productId) {
        setCartItems((current) =>
          current.filter((item) => item.product.id !== productId)
        );
      },
      clearCart() {
        setCartItems([]);
      },
      toggleFavorite(product) {
        const pricedProduct = withEffectiveProductPrice(product);
        setFavoriteItems((current) => {
          if (current.some((item) => item.id === pricedProduct.id)) {
            return current.filter((item) => item.id !== pricedProduct.id);
          }
          return [pricedProduct, ...current];
        });
      },
      removeFavorite(productId) {
        setFavoriteItems((current) => current.filter((item) => item.id !== productId));
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
