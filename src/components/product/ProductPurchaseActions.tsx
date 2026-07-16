"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { Dealer, ProductSummary } from "@/lib/api/api-contract";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { useProductVariant } from "@/components/product/ProductVariantContext";
import { ProductDealerSelector } from "@/components/product/ProductDealerSelector";
import {
  canFulfillQuantity,
  getAvailableQuantity,
  getInventoryLabel,
  getInventoryLocation,
  getInventoryStatusClass
} from "@/lib/commerce/product-inventory";
import {
  formatMoney,
  getEffectivePrice
} from "@/lib/commerce/product-commerce";
import { resolveProductVariant } from "@/lib/product/product-variants";

type ProductPurchaseActionsProps = {
  product: ProductSummary;
  dealers: Dealer[];
};

export function ProductPurchaseActions({ product, dealers }: ProductPurchaseActionsProps) {
  const {
    addToCart,
    isFavorite,
    selectedDealerId,
    selectedDealerName,
    toggleFavorite
  } = useStorefront();
  const productVariant = useProductVariant();
  const [quantity, setQuantity] = useState(1);
  const [quantityNotice, setQuantityNotice] = useState("");
  const [addFeedback, setAddFeedback] = useState(false);
  const purchaseProduct = useMemo(
    () => resolveProductVariant(product, productVariant?.selectedFinishName),
    [product, productVariant?.selectedFinishName]
  );
  const saved = isFavorite(purchaseProduct.id);

  const selectedDealer = useMemo(
    () =>
      dealers.find((dealer) => dealer.id === selectedDealerId) ??
      dealers.find((dealer) => dealer.name === selectedDealerName) ??
      dealers[0],
    [dealers, selectedDealerId, selectedDealerName]
  );

  const selectedInventory = getInventoryLocation(product, selectedDealer.id);
  const selectedStock = getAvailableQuantity(product, selectedDealer.id);
  const canBuy = canFulfillQuantity(product, selectedDealer.id, quantity);
  const inventoryClass = getInventoryStatusClass(selectedInventory);
  const inventoryLabel = canBuy
    ? `${getInventoryLabel(selectedInventory)} at selected dealer`
    : "Not available at selected dealer";
  const effectivePrice = formatMoney(getEffectivePrice(purchaseProduct));

  function updateQuantity(nextQuantity: number) {
    const quantityKnown = selectedInventory?.quantityKnown !== false;
    const stockCap = quantityKnown ? (selectedStock > 0 ? selectedStock : 1) : Number.MAX_SAFE_INTEGER;
    const clampedQuantity = Math.min(stockCap, Math.max(1, nextQuantity));
    setQuantity(clampedQuantity);

    if (quantityKnown && nextQuantity > stockCap && selectedStock > 0) {
      setQuantityNotice(`Only ${selectedStock} available at ${selectedDealer.city}.`);
      return;
    }

    if (nextQuantity < 1) {
      setQuantityNotice("Minimum quantity is 1.");
      return;
    }

    setQuantityNotice("");
  }

  function handleAddToCart() {
    if (!canBuy) return;
    addToCart(purchaseProduct, quantity);
    setAddFeedback(true);
    window.setTimeout(() => setAddFeedback(false), 650);
  }

  return (
    <div className="pdp-purchase-actions">
      <div className="pdp-cart-control-row">
        <div className="quantity-stepper detail" aria-label={`Quantity for ${product.name}`}>
          <button
            type="button"
            onClick={() => updateQuantity(quantity - 1)}
            aria-label="Decrease quantity"
          >
            <Minus size={15} strokeWidth={2} />
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            onClick={() => updateQuantity(quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus size={15} strokeWidth={2} />
          </button>
        </div>

        <button
          className={addFeedback ? "button button-accent add-cart-button added" : "button button-accent add-cart-button"}
          type="button"
          disabled={!canBuy}
          onClick={handleAddToCart}
        >
          <ShoppingCart size={18} strokeWidth={2} />
          Add to cart
        </button>
      </div>

      <div className="pdp-quantity-row">
        <button
          className={saved ? "button button-soft pdp-save-button saved" : "button button-soft pdp-save-button"}
          type="button"
          aria-pressed={saved}
          onClick={() => toggleFavorite(purchaseProduct)}
        >
          <Heart size={18} strokeWidth={2} fill={saved ? "currentColor" : "none"} />
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {quantityNotice ? (
        <p className="quantity-limit-note" aria-live="polite">
          {quantityNotice}
        </p>
      ) : null}

      {product.certificationRequired ? (
        <p className="purchase-certification">
          <AlertCircle size={15} strokeWidth={2.4} />
          Dealer confirmation is required before cabinet fulfillment is released.
        </p>
      ) : null}

      <h3 className="pdp-how-get-title">How to get it:</h3>

      <ProductDealerSelector
        dealers={dealers}
        product={product}
        selectedDealer={selectedDealer}
      />

      <p className="purchase-note">
        <CheckCircle2 size={15} strokeWidth={2.4} />
        Checkout reserves stock under {selectedDealer.name}.
      </p>

      <div className="pdp-mobile-buy-bar" role="region" aria-label="Mobile purchase bar">
        <span>
          <strong>{effectivePrice}</strong>
          <small className={inventoryClass}>{inventoryLabel}</small>
        </span>
        <button
          className={addFeedback ? "button button-accent add-cart-button added" : "button button-accent add-cart-button"}
          type="button"
          disabled={!canBuy}
          onClick={handleAddToCart}
        >
          <ShoppingCart size={18} strokeWidth={2} />
          Add to cart
        </button>
      </div>

      <div className="pdp-desktop-buy-bar" role="region" aria-label="Sticky purchase bar">
        <span>
          <strong>{product.name}</strong>
          <small className={inventoryClass}>{inventoryLabel}</small>
        </span>
        <em>{effectivePrice}</em>
        <div className="quantity-stepper compact" aria-label={`Quantity for ${product.name}`}>
          <button
            type="button"
            onClick={() => updateQuantity(quantity - 1)}
            aria-label="Decrease quantity"
          >
            <Minus size={15} strokeWidth={2} />
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            onClick={() => updateQuantity(quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus size={15} strokeWidth={2} />
          </button>
        </div>
        <button
          className={addFeedback ? "button button-accent add-cart-button added" : "button button-accent add-cart-button"}
          type="button"
          disabled={!canBuy}
          onClick={handleAddToCart}
        >
          <ShoppingCart size={18} strokeWidth={2} />
          Add to cart
        </button>
      </div>
    </div>
  );
}
