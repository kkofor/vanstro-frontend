"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { SiteLocale } from "@/lib/i18n/locale";
import { getSiteCopy, type SiteCopy } from "@/lib/i18n/site-copy";
import {
  dealerMapLocations,
  type DealerMapLocation
} from "@/lib/data/dealer-map-locations";

const DEFAULT_DEALER_ID = "mb01";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function dealerLabel(dealer: DealerMapLocation) {
  return dealer.code === dealer.name ? dealer.code : `${dealer.code} - ${dealer.name}`;
}

function dealerStreetAddress(dealer: DealerMapLocation) {
  if (dealer.code === "MB01") return dealer.address;

  return dealer.address.replace(/^\s*\d+\s+/, "");
}

function dealerAddress(dealer: DealerMapLocation) {
  return `${dealerStreetAddress(dealer)}, ${dealer.city}, ${dealer.province} ${dealer.postalCode}`;
}

function popupContent(dealer: DealerMapLocation, copy: SiteCopy["dealerMap"]) {
  const phoneHref = dealer.phone.replace(/[^\d+]/g, "");

  return `
    <div class="dealer-map-popup">
      <strong>${escapeHtml(dealerLabel(dealer))}</strong>
      <dl>
        <div><dt>${escapeHtml(copy.popup.contact)}:</dt><dd>${escapeHtml(dealer.contactName)}</dd></div>
        <div><dt>${escapeHtml(copy.popup.phone)}:</dt><dd><a href="tel:${phoneHref}">${escapeHtml(dealer.phone)}</a></dd></div>
        <div><dt>${escapeHtml(copy.popup.email)}:</dt><dd><a href="mailto:${escapeHtml(dealer.email)}">${escapeHtml(dealer.email)}</a></dd></div>
        <div><dt>${escapeHtml(copy.popup.address)}:</dt><dd>${escapeHtml(dealerAddress(dealer))}</dd></div>
      </dl>
    </div>
  `;
}

export function DealerMapLocator({ locale: localeOverride }: { locale?: SiteLocale }) {
  const { locale: contextLocale, copy: contextCopy } = useLocale();
  const locale = localeOverride ?? contextLocale;
  const copy = localeOverride ? getSiteCopy(locale) : contextCopy;
  const mapCopy = copy.dealerMap;
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const [selectedDealerId, setSelectedDealerId] = useState(DEFAULT_DEALER_ID);
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    let active = true;

    async function initializeMap() {
      try {
        const L = await import("leaflet");
        if (!active || !mapElementRef.current) return;

        const map = L.map(mapElementRef.current, {
          center: [50.5, -96],
          zoom: 4,
          minZoom: 3,
          scrollWheelZoom: false,
          zoomControl: false
        });
        L.control.zoom({
          zoomInTitle: mapCopy.zoomIn,
          zoomOutTitle: mapCopy.zoomOut
        }).addTo(map);
        leafletRef.current = L;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: mapCopy.attribution,
          maxZoom: 18
        }).addTo(map);

        const bounds = L.latLngBounds([]);

        dealerMapLocations.forEach((dealer) => {
          const marker = L.marker([dealer.latitude, dealer.longitude], {
            title: dealerLabel(dealer),
            alt: `${dealerLabel(dealer)}, ${dealer.city}, ${dealer.province}`,
            icon: L.divIcon({
              className: "dealer-map-marker-shell",
              html: `<span class="dealer-map-marker${dealer.id === DEFAULT_DEALER_ID ? " is-selected" : ""}" aria-hidden="true"></span>`,
              iconSize: [36, 44],
              iconAnchor: [18, 42],
              popupAnchor: [0, -38]
            })
          })
            .bindPopup(popupContent(dealer, mapCopy), {
              className: "dealer-map-leaflet-popup",
              maxWidth: 300
            })
            .on("click", () => setSelectedDealerId(dealer.id))
            .addTo(map);

          markersRef.current.set(dealer.id, marker);
          bounds.extend([dealer.latitude, dealer.longitude]);
        });

        map.fitBounds(bounds, { padding: [34, 34] });
        mapRef.current = map;

        const initialMarker = markersRef.current.get(DEFAULT_DEALER_ID);
        initialMarker?.openPopup();
      } catch {
        if (active) setMapError(true);
      }
    }

    initializeMap();

    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markersRef.current.clear();
    };
  }, [mapCopy]);

  useEffect(() => {
    const L = leafletRef.current;
    if (!L) return;

    markersRef.current.forEach((marker, dealerId) => {
      marker.setIcon(
        L.divIcon({
          className: "dealer-map-marker-shell",
          html: `<span class="dealer-map-marker${dealerId === selectedDealerId ? " is-selected" : ""}" aria-hidden="true"></span>`,
          iconSize: [36, 44],
          iconAnchor: [18, 42],
          popupAnchor: [0, -38]
        })
      );
    });
  }, [selectedDealerId]);

  useEffect(() => {
    if (mobileView !== "map") return;

    const frame = requestAnimationFrame(() => mapRef.current?.invalidateSize());
    return () => cancelAnimationFrame(frame);
  }, [mobileView]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleDealers = normalizedQuery
    ? dealerMapLocations.filter((dealer) =>
        [
          dealer.code,
          dealer.name,
          dealer.address,
          dealer.city,
          dealer.province,
          dealer.postalCode
        ].some((value) => value.toLowerCase().includes(normalizedQuery))
      )
    : dealerMapLocations;

  function selectDealer(dealer: DealerMapLocation) {
    setSelectedDealerId(dealer.id);
    setMobileView("map");

    const map = mapRef.current;
    const marker = markersRef.current.get(dealer.id);
    if (!map || !marker) return;

    map.flyTo([dealer.latitude, dealer.longitude], Math.max(map.getZoom(), 8), {
      duration: 0.6
    });
    marker.openPopup();
  }

  return (
    <div className="dealer-map-locator">
      <div className="dealer-map-section-heading">
        <div>
          <h2>{mapCopy.title}</h2>
          <p>{mapCopy.description}</p>
        </div>
        <span>{mapCopy.locationCount(dealerMapLocations.length)}</span>
      </div>

      <div className="dealer-map-mobile-switch" aria-label={mapCopy.viewLabel}>
        <button
          aria-pressed={mobileView === "map"}
          className={mobileView === "map" ? "is-active" : undefined}
          onClick={() => setMobileView("map")}
          type="button"
        >
          {mapCopy.map}
        </button>
        <button
          aria-pressed={mobileView === "list"}
          className={mobileView === "list" ? "is-active" : undefined}
          onClick={() => setMobileView("list")}
          type="button"
        >
          {mapCopy.list}
        </button>
      </div>

      <div className="dealer-map-layout">
        <div
          className={["dealer-map-frame", mobileView === "list" ? "is-mobile-hidden" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          {mapError ? (
            <div className="dealer-map-error" role="status">
              <MapPin aria-hidden="true" size={28} />
              <strong>{mapCopy.unavailableTitle}</strong>
              <p>{mapCopy.unavailableBody}</p>
            </div>
          ) : null}
          <div
            aria-label={mapCopy.mapLabel}
            className="dealer-map-canvas"
            ref={mapElementRef}
          />
        </div>

        <aside
          aria-label={mapCopy.listLabel}
          className={["dealer-map-list", mobileView === "map" ? "is-mobile-hidden" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <label className="dealer-map-search" htmlFor="dealer-map-search">
            <Search aria-hidden="true" size={19} />
            <input
              aria-label={mapCopy.searchLabel}
              id="dealer-map-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mapCopy.searchPlaceholder}
              type="search"
              value={query}
            />
          </label>

          <div className="dealer-map-results" aria-live="polite">
            {visibleDealers.length ? (
              visibleDealers.map((dealer) => {
                const selected = dealer.id === selectedDealerId;

                return (
                  <button
                    aria-pressed={selected}
                    className={["dealer-map-row", selected ? "is-selected" : ""]
                      .filter(Boolean)
                      .join(" ")}
                    key={dealer.id}
                    onClick={() => selectDealer(dealer)}
                    type="button"
                  >
                    <MapPin aria-hidden="true" size={21} />
                    <span>
                      <strong>{dealerLabel(dealer)}</strong>
                      <small>
                        {dealer.city}, {dealer.province}
                      </small>
                      {selected ? <em>{mapCopy.showOnMap}</em> : null}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="dealer-map-empty">{mapCopy.noResults}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
