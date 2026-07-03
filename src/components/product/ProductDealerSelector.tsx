"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, MapPin, Navigation, PackageCheck, Truck, X } from "lucide-react";
import type { Dealer, ProductSummary } from "@/lib/api/api-contract";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import {
  getAvailableQuantity,
  getInventoryLabel,
  getInventoryLocation,
  getInventoryStatusClass
} from "@/lib/commerce/product-inventory";

type ProductDealerSelectorProps = {
  dealers: Dealer[];
  product: ProductSummary;
  selectedDealer: Dealer;
};

type DealerGeo = {
  lat: number;
  lng: number;
};

const DEALER_COORDINATES: Record<string, DealerGeo> = {
  toronto: { lat: 43.769, lng: -79.381 },
  vancouver: { lat: 49.183, lng: -123.077 },
  calgary: { lat: 50.98, lng: -114.039 },
  montreal: { lat: 45.487, lng: -73.699 }
};

const DEFAULT_USER_LOCATION: DealerGeo = { lat: 43.653, lng: -79.383 };

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
  selectedDealer
}: ProductDealerSelectorProps) {
  const { setSelectedDealer } = useStorefront();
  const [open, setOpen] = useState(false);
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
          inventoryLabel: getInventoryLabel(inventory),
          quantity
        };
      }),
    [dealers, product]
  );
  const selectedInventory = getInventoryLocation(product, selectedDealer.id);
  const selectedInventoryClass = getInventoryStatusClass(selectedInventory);
  const selectedInventoryLabel = getInventoryLabel(selectedInventory);

  function chooseDealer(dealer: Dealer) {
    setSelectedDealer(dealer);
    setOpen(false);
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
            <strong data-dealer-pickup-label>Pick-Up</strong>
            <small data-dealer-fulfillment-title>{selectedDealer.name}</small>
            <small className={selectedInventoryClass} data-dealer-inventory-label>
              {selectedInventoryLabel} at selected dealer
            </small>
            <small data-dealer-address-label>{selectedDealer.address}</small>
          </span>
          <em className="pdp-fulfillment-change" aria-label="Change dealer">
            <ChevronDown size={14} strokeWidth={2.4} />
          </em>
        </span>
        <span className="pdp-fulfillment-row pdp-fulfillment-card">
          <Truck size={22} strokeWidth={2.2} />
          <span>
            <strong>Delivery</strong>
            <small>Dealer confirms timing after checkout.</small>
            <small data-dealer-city-label>
              From {selectedDealer.city}, {selectedDealer.province} {selectedDealer.postalCode}
            </small>
          </span>
        </span>
      </button>

      <div
        className="pdp-dealer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdp-dealer-modal-title"
        hidden={!open}
      >
          <button
            className="pdp-dealer-backdrop"
            type="button"
            aria-label="Close dealer selector"
            onClick={() => setOpen(false)}
          />
          <section className="pdp-dealer-sheet">
            <header className="pdp-dealer-sheet-head">
              <span>
                <small>Dealer fulfillment</small>
                <h3 id="pdp-dealer-modal-title">Choose pickup dealer</h3>
              </span>
              <button
                type="button"
                aria-label="Close dealer selector"
                data-dealer-close
                onClick={() => setOpen(false)}
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>
            <p className="pdp-dealer-distance-note">
              Distances are estimated from your current browsing region. Choose a dealer manually if location looks off.
            </p>
            <div className="pdp-dealer-list">
              {dealerChoices.map(({ dealer, distanceKm, inventoryClass, inventoryLabel, quantity }) => {
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
                        {typeof distanceKm === "number" ? `~${distanceKm} km away` : "Distance pending"}
                      </small>
                    </span>
                    <span className="pdp-dealer-option-stock">
                      <strong>{quantity}</strong>
                      <small>stock</small>
                    </span>
                    {selected ? (
                      <span className="pdp-dealer-option-check" aria-label="Selected dealer">
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
