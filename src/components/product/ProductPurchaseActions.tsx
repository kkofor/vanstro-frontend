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
import { useProductInventory } from "@/components/product/useProductInventory";
import { resolveProductVariant } from "@/lib/product/product-variants";
import type { SiteLocale } from "@/lib/i18n/locale";

type ProductPurchaseActionsProps = {
  product: ProductSummary;
  dealers: Dealer[];
  locale?: SiteLocale;
};

/** EN short month e.g. "Sep 8"; FR "8 sept." — architect-approved wording, from ERP `updatedAt`.
 *  `updatedAt` normally arrives here as an ISO string (lib/stock.ts converts ERP's Unix-seconds
 *  `updated_at` once, at the source). The 10-digit-seconds guard below is defensive only, in
 *  case a raw ERP timestamp ever reaches this component directly. Rendered in the dealer's own
 *  timezone (America/Winnipeg) so the date never depends on the visitor's browser TZ. */
function formatShortDate(iso: string | undefined, french: boolean): string {
  if (!iso) return "";
  let date = new Date(iso);
  if (Number.isNaN(date.getTime()) && /^\d{10}$/.test(iso)) {
    date = new Date(Number(iso) * 1000);
  }
  if (Number.isNaN(date.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "America/Winnipeg" };
  return french
    ? date.toLocaleDateString("fr-CA", options).replace(".", ".")
    : date.toLocaleDateString("en-CA", options).replace(/(\d+) (\w+)/, "$2 $1");
}

/**
 * Four mutually exclusive PDP stock lines (architect-approved copy, seq 8/9). Dealer name is
 * always dynamic (`selectedDealerName`, never hardcoded). ERP-sourced rows show the ERP
 * `updatedAt` date; manual-fallback rows say "manually maintained" instead (no ERP date to show).
 */
function formatStockLine(
  reason: string | undefined,
  qty: number,
  dealerName: string,
  source: string | undefined,
  updatedAt: string | undefined,
  french: boolean
): string | undefined {
  if (!reason) return undefined;
  if (reason === "out_of_stock") {
    return french ? "Rupture de stock — commande indisponible" : "Out of stock — not available to order";
  }
  if (reason === "dealer_no_stock") {
    return french
      ? "Aucune donnée de stock pour ce détaillant — commande indisponible"
      : "No stock data for this dealer — not available to order";
  }
  if (reason === "unavailable") {
    return french ? "Stock indisponible pour le moment" : "Stock unavailable right now";
  }
  // in_stock — quantity only (user decision 2026-09-08 21:27 local: drop dealer name and date
  // from this line; the other three states below keep their reason copy because it explains
  // why the item can't be ordered). Source (erp vs manual) and the ERP date are intentionally
  // not rendered here anymore; formatShortDate above is kept in case this is reinstated later.
  return french ? `${qty} en stock` : `${qty} in stock`;
}

export function ProductPurchaseActions({ product, dealers, locale = "en-CA" }: ProductPurchaseActionsProps) {
  const french = locale === "fr-CA";
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
  const [actionError, setActionError] = useState("");
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

  const { inventory, reason: stockReason, source: stockSource } = useProductInventory(product.slug, purchaseProduct.sku);
  const selectedInventory =
    inventory?.locations.find(
      (location) => location.dealerLocationId === selectedDealer.dealerLocationId || location.dealerId === selectedDealerId
    ) ?? inventory?.locations[0];
  const selectedStock = selectedInventory?.quantity ?? 0;

  // Ruled qty stepper cap (live stock when known; otherwise unconstrained so the
  // stepper clamps only on real inventory). Mirrors the clamp inside updateQuantity.
  const quantityKnown = selectedInventory?.quantityKnown !== false;
  const quantityCap = quantityKnown ? (selectedStock > 0 ? selectedStock : 1) : Number.MAX_SAFE_INTEGER;

  // Four mutually exclusive PDP stock states from /api/stock's `reason` (lib/stock.ts):
  // in_stock / out_of_stock / dealer_no_stock / unavailable. `insufficient` is checkout-time-only
  // (assertStock) and never appears here. `stockBlocked` disables add-to-cart with a visible
  // reason; `unavailable` (ERP outage) never blocks — it only shows a softer notice.
  const stockBlocked = stockReason === "out_of_stock" || stockReason === "dealer_no_stock";
  const stockLine = useMemo(
    () => formatStockLine(stockReason, selectedStock, selectedDealer.name, stockSource, selectedInventory?.updatedAt, french),
    [stockReason, selectedStock, selectedDealer.name, stockSource, selectedInventory?.updatedAt, french]
  );

  function updateQuantity(nextQuantity: number) {
    const quantityKnown = selectedInventory?.quantityKnown !== false;
    const stockCap = quantityKnown ? (selectedStock > 0 ? selectedStock : 1) : Number.MAX_SAFE_INTEGER;
    const clampedQuantity = Math.min(stockCap, Math.max(1, nextQuantity));
    setQuantity(clampedQuantity);

    if (quantityKnown && nextQuantity > stockCap && selectedStock > 0) {
      setQuantityNotice(french
        ? `Seulement ${selectedStock} unités sont disponibles à ${selectedDealer.city}.`
        : `Only ${selectedStock} available at ${selectedDealer.city}.`);
      return;
    }

    if (nextQuantity < 1) {
      setQuantityNotice(french ? "La quantité minimale est de 1." : "Minimum quantity is 1.");
      return;
    }

    setQuantityNotice("");
  }

  function handleQuantityInput(event: React.ChangeEvent<HTMLInputElement>) {
    const parsed = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(parsed)) return;
    updateQuantity(parsed);
  }

  async function handleAddToCart() {
    setActionError("");
    if (stockBlocked) {
      setActionError(stockLine ?? (french ? "Commande indisponible pour ce détaillant." : "Not available to order at this dealer."));
      return;
    }
    const result = await addToCart(purchaseProduct, quantity);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setAddFeedback(true);
    window.setTimeout(() => setAddFeedback(false), 650);
  }

  return (
    <div className="pdp-purchase-actions">
      <div className="buy__row">
        <div
          className="qty"
          role="group"
          aria-label={french ? `Quantité de ${product.name}` : `Quantity for ${product.name}`}
        >
          <button
            type="button"
            onClick={() => updateQuantity(quantity - 1)}
            aria-label={french ? "Réduire la quantité" : "Decrease quantity"}
          >
            <Minus size={15} strokeWidth={2} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={quantityCap === Number.MAX_SAFE_INTEGER ? undefined : quantityCap}
            value={quantity}
            onChange={handleQuantityInput}
            aria-label={french ? `Quantité de ${product.name}` : `Quantity for ${product.name}`}
          />
          <button
            type="button"
            onClick={() => updateQuantity(quantity + 1)}
            aria-label={french ? "Augmenter la quantité" : "Increase quantity"}
          >
            <Plus size={15} strokeWidth={2} />
          </button>
        </div>

        <button
          className={
            addFeedback
              ? "btn btn--primary is-added"
              : "btn btn--primary"
          }
          type="button"
          onClick={handleAddToCart}
          disabled={stockBlocked}
          aria-disabled={stockBlocked}
        >
          <ShoppingCart size={18} strokeWidth={2} />
          {french ? "Ajouter au panier" : "Add to cart"}
        </button>

        <button
          className={
            saved
              ? "icon-btn save is-on"
              : "icon-btn save"
          }
          type="button"
          aria-pressed={saved}
          aria-label={saved ? (french ? "Enregistré" : "Saved") : (french ? "Garder pour plus tard" : "Save for later")}
          title={saved ? (french ? "Enregistré" : "Saved") : (french ? "Garder pour plus tard" : "Save for later")}
          onClick={() => {
            setActionError("");
            void toggleFavorite(purchaseProduct).then((result) => {
              if (!result.ok) setActionError(result.error);
            });
          }}
        >
          <Heart size={20} strokeWidth={2} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <p
        className={
          stockBlocked
            ? "buy__foot pdp-stock-line pdp-stock-line-blocked"
            : "buy__foot pdp-stock-line"
        }
        role={stockBlocked ? "alert" : "status"}
        aria-live="polite"
      >
        {stockLine ? <b>{stockLine}</b> : null}
      </p>

      {quantityNotice ? (
        <p className="quantity-limit-note" aria-live="polite">
          {quantityNotice}
        </p>
      ) : null}
      {actionError ? (
        <p className="quantity-limit-note" role="alert">
          {actionError}
        </p>
      ) : null}

      {product.certificationRequired ? (
        <p className="purchase-certification">
          <AlertCircle size={15} strokeWidth={2.4} />
          {french
            ? "La confirmation du détaillant local est requise avant la préparation de l’armoire."
            : "Local dealer confirmation is required before cabinet fulfillment is released."}
        </p>
      ) : null}

      <div className="get">
        <h2 className="pdp-how-get-title">{french ? "Comment le recevoir :" : "How to get it:"}</h2>

        <ProductDealerSelector
          dealers={dealers}
          product={purchaseProduct}
          selectedDealer={selectedDealer}
          dynamicInventory={inventory}
          locale={locale}
        />

        <p className="purchase-note">
          <CheckCircle2 size={15} strokeWidth={2.4} />
          {french
            ? `Le passage à la caisse demande la réservation du stock auprès de votre détaillant local : ${selectedDealer.name}`
            : `Checkout requests stock reservation with your local dealer: ${selectedDealer.name}`}
        </p>
      </div>
    </div>
  );
}
