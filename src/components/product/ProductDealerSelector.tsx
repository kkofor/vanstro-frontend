"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, MapPin, Navigation, PackageCheck, Truck, X } from "lucide-react";
import type { Dealer, ProductSummary } from "@/lib/api/api-contract";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import {
  getAvailableQuantity,
  getInventoryLabel,
  getInventoryLocation,
  getInventoryStatusClass
} from "@/lib/commerce/product-inventory";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import type { SiteLocale } from "@/lib/i18n/locale";

type ProductDealerSelectorProps = {
  dealers: Dealer[];
  product: ProductSummary;
  selectedDealer: Dealer;
  locale?: SiteLocale;
};

type DealerGeo = {
  lat: number;
  lng: number;
};

const DEALER_COORDINATES: Record<string, DealerGeo> = {
  winnipeg: { lat: 49.909, lng: -97.203 }
};

const DEFAULT_USER_LOCATION: DealerGeo = { lat: 49.895, lng: -97.138 };

function estimateDistanceKm(from: DealerGeo, to?: DealerGeo) {
  if (!to) return undefined;

  const earthRadiusKm = 6371;
  const latDelta = ((to.lat - from.lat) * Math.PI) / 180;
  const lngDelta = ((to.lng - from.lng) * Math.PI) / 180;
  const fromLat = (from.lat * Math.PI) / 180;
  const toLat = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function ProductDealerSelector({
  dealers,
  product,
  selectedDealer,
  locale = "en-CA"
}: ProductDealerSelectorProps) {
  const french = locale === "fr-CA";
  const { setSelectedDealer } = useStorefront();
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const closeSelector = useCallback(() => setOpen(false), []);
  const dealerChoices = useMemo(
    () =>
      dealers.map((dealer) => {
        const inventory = getInventoryLocation(product, dealer.id);
        const quantity = getAvailableQuantity(product, dealer.id);
        const distanceKm = estimateDistanceKm(
          DEFAULT_USER_LOCATION,
          DEALER_COORDINATES[dealer.id]
        );

        return {
          dealer,
          distanceKm,
          inventory,
          inventoryClass: getInventoryStatusClass(inventory),
          inventoryLabel: getInventoryLabel(inventory, locale),
          quantity
        };
      }),
    [dealers, product]
  );
  const selectedInventory = getInventoryLocation(product, selectedDealer.id);
  const selectedInventoryClass = getInventoryStatusClass(selectedInventory);
  const selectedInventoryLabel = getInventoryLabel(selectedInventory, locale);

  useModalFocus({
    active: open,
    containerRef: sheetRef,
    modalRootRef: modalRef,
    onEscape: closeSelector
  });

  function chooseDealer(dealer: Dealer) {
    setSelectedDealer(dealer);
    closeSelector();
  }

  return (
    <>
      <button
        className="pdp-fulfillment-box pdp-dealer-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-selected-dealer-trigger
        onClick={() => setOpen(true)}
      >
        <span className="pdp-fulfillment-row pdp-fulfillment-card primary">
          <PackageCheck size={22} strokeWidth={2.2} />
          <span>
            <strong data-dealer-pickup-label>{french ? "Ramassage" : "Pick-Up"}</strong>
            <small data-dealer-fulfillment-title aria-live="polite" aria-atomic="true">
              {selectedDealer.name}
            </small>
            <small className={selectedInventoryClass} data-dealer-inventory-label>
              {french ? `${selectedInventoryLabel} chez le détaillant local sélectionné` : `${selectedInventoryLabel} at selected local dealer`}
            </small>
            <small data-dealer-address-label>{selectedDealer.address}</small>
          </span>
          <em className="pdp-fulfillment-change" aria-label={french ? "Changer de détaillant" : "Change dealer"}>
            <ChevronDown size={14} strokeWidth={2.4} />
          </em>
        </span>
        <span className="pdp-fulfillment-row pdp-fulfillment-card">
          <Truck size={22} strokeWidth={2.2} />
          <span>
            <strong>{french ? "Livraison" : "Delivery"}</strong>
            <small>{french ? "Votre détaillant local confirme le délai après le passage à la caisse." : "Your local dealer confirms timing after checkout."}</small>
            <small data-dealer-city-label>
              {french ? "Depuis" : "From"} {selectedDealer.city}, {selectedDealer.province} {selectedDealer.postalCode}
            </small>
          </span>
        </span>
      </button>

      <div
        ref={modalRef}
        className="pdp-dealer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdp-dealer-modal-title"
        hidden={!open}
      >
          <button
            className="pdp-dealer-backdrop"
            type="button"
            aria-label={french ? "Fermer le sélecteur de détaillant" : "Close dealer selector"}
            onClick={closeSelector}
          />
          <section ref={sheetRef} className="pdp-dealer-sheet" tabIndex={-1}>
            <header className="pdp-dealer-sheet-head">
              <span>
                <small>{french ? "Service local" : "Local fulfillment"}</small>
                <h3 id="pdp-dealer-modal-title">{french ? "Choisir un détaillant local" : "Choose a local dealer"}</h3>
              </span>
              <button
                type="button"
                aria-label={french ? "Fermer le sélecteur de détaillant" : "Close dealer selector"}
                data-dealer-close
                onClick={closeSelector}
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>
            <p className="pdp-dealer-distance-note">
              {french
                ? "Les distances sont estimées à partir de votre région de navigation. Choisissez manuellement un détaillant local si l’emplacement semble incorrect."
                : "Distances are estimated from your current browsing region. Choose a local dealer manually if the location looks incorrect."}
            </p>
            <div className="pdp-dealer-list">
              {dealerChoices.map(({ dealer, distanceKm, inventory, inventoryClass, inventoryLabel, quantity }) => {
                const selected = dealer.id === selectedDealer.id;

                return (
                  <button
                    className={selected ? "pdp-dealer-option selected" : "pdp-dealer-option"}
                    type="button"
                    key={dealer.id}
                    data-dealer-id={dealer.id}
                    data-dealer-name={dealer.name}
                    data-dealer-city={dealer.city}
                    data-dealer-province={dealer.province}
                    data-dealer-postal-code={dealer.postalCode}
                    data-dealer-address={dealer.address}
                    data-dealer-inventory-label={inventoryLabel}
                    data-dealer-inventory-class={inventoryClass}
                    onClick={() => chooseDealer(dealer)}
                  >
                    <span className="pdp-dealer-option-main">
                      <strong>{dealer.name}</strong>
                      <small>
                        {dealer.address}, {dealer.city}, {dealer.province}
                      </small>
                    </span>
                    <span className="pdp-dealer-option-meta">
                      <em className={inventoryClass}>{inventoryLabel}</em>
                      <small>
                        <Navigation size={13} strokeWidth={2.3} />
                        {typeof distanceKm === "number"
                          ? french ? `à environ ${distanceKm} km` : `~${distanceKm} km away`
                          : french ? "Distance à confirmer" : "Distance pending"}
                      </small>
                    </span>
                    <span className="pdp-dealer-option-stock">
                      {inventory?.quantityKnown === false ? (
                        <small>{french ? "Confirmé au passage à la caisse" : "Confirmed at checkout"}</small>
                      ) : (
                        <>
                          <strong>{quantity}</strong>
                          <small>{french ? "en stock" : "stock"}</small>
                        </>
                      )}
                    </span>
                    {selected ? (
                      <span className="pdp-dealer-option-check" aria-label={french ? "Détaillant sélectionné" : "Selected dealer"}>
                        <CheckCircle2 size={18} strokeWidth={2.4} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
    </>
  );
}
