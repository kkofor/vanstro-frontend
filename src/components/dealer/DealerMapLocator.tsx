"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { mappableDealerLocations } from "@/lib/dealer/dealer-projection";
import type { StorefrontDealerLocation, StorefrontDealerSummary } from "@/lib/api/api-contract";
import type { SiteLocale } from "@/lib/i18n/locale";
import { getSiteCopy, type SiteCopy } from "@/lib/i18n/site-copy";

type DealerMapLocation = StorefrontDealerLocation & { latitude: number; longitude: number };

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
  return dealer.code && dealer.code !== dealer.name ? `${dealer.code} - ${dealer.name}` : dealer.name;
}

/** Placeholder directory dealer = a VanStro site code used as its own name (AB10/BC10/ON10/QC10/SK10); real stores carry a distinct name (Yuan Construction Ltd.). */
function isPlaceholderDealer(dealer: { code?: string; name: string }) {
  return Boolean(dealer.code && dealer.code.trim().toUpperCase() === dealer.name.trim().toUpperCase());
}

function dealerAddress(dealer: DealerMapLocation) {
  return `${dealer.address}, ${dealer.city}, ${dealer.province} ${dealer.postalCode}`;
}

function popupContent(dealer: DealerMapLocation, copy: SiteCopy["dealerMap"]) {
  const phoneHref = dealer.phone.replace(/[^\d+]/g, "");

  return `
    <div class="dealer-map-popup">
      <strong>${escapeHtml(dealerLabel(dealer))}</strong>
      ${isPlaceholderDealer(dealer) ? `<em class="dealer-map-coming-soon">${escapeHtml(copy.comingSoon)}</em>` : ""}
      <dl>
        ${dealer.phone ? `<div><dt>${escapeHtml(copy.popup.phone)}:</dt><dd><a href="tel:${phoneHref}">${escapeHtml(dealer.phone)}</a></dd></div>` : ""}
        ${dealer.email ? `<div><dt>${escapeHtml(copy.popup.email)}:</dt><dd><a href="mailto:${escapeHtml(dealer.email)}">${escapeHtml(dealer.email)}</a></dd></div>` : ""}
        <div><dt>${escapeHtml(copy.popup.address)}:</dt><dd>${escapeHtml(dealerAddress(dealer))}</dd></div>
      </dl>
    </div>
  `;
}

export function DealerMapLocator({ locale: localeOverride }: { locale?: SiteLocale }) {
  const { locale: contextLocale, copy: contextCopy, dealerSummaries } = useLocale();
  const mappedDealers = useMemo(
    () => mappableDealerLocations(dealerSummaries),
    [dealerSummaries]
  );
  const defaultDealerId = mappedDealers[0]?.id ?? "";
  const locale = localeOverride ?? contextLocale;
  const copy = localeOverride ? getSiteCopy(locale) : contextCopy;
  const mapCopy = copy.dealerMap;
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const [selectedDealerId, setSelectedDealerId] = useState(defaultDealerId);
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

        if (!mappedDealers.length) {
          if (active) setMapError(true);
          return;
        }

        mappedDealers.forEach((dealer) => {
          const marker = L.marker([dealer.latitude, dealer.longitude], {
            title: dealerLabel(dealer),
            alt: `${dealerLabel(dealer)}, ${dealer.city}, ${dealer.province}`,
            icon: L.divIcon({
              className: "dealer-map-marker-shell",
              html: `<span class="dealer-map-marker${dealer.id === defaultDealerId ? " is-selected" : ""}" aria-hidden="true"></span>`,
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
  }, [defaultDealerId, mapCopy, mappedDealers]);

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

  // Directory-visible dealers without a mappable store location are dead
  // records (e.g. code=121 with no active location); the map/list must not
  // surface them as a selectable "No service locations" row.
  const dealersWithLocations = useMemo(
    () => dealerSummaries.filter((dealer) => mappableDealerLocations([dealer]).length > 0),
    [dealerSummaries]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleDealers = normalizedQuery
    ? dealersWithLocations.filter((dealer) =>
        [
          dealer.code,
          dealer.name,
          ...dealer.locations.flatMap((location) => [location.city, location.province, location.postalCode])
        ].some((value) => value?.toLowerCase().includes(normalizedQuery))
      )
    : dealersWithLocations;

  function selectDealer(dealer: StorefrontDealerSummary) {
    const mappable = mappableDealerLocations([dealer])[0];
    setMobileView("map");
    setSelectedDealerId(mappable ? mappable.id : dealer.id);
    if (!mappable) return;

    const map = mapRef.current;
    const marker = markersRef.current.get(mappable.id);
    if (!map || !marker) return;

    map.flyTo([mappable.latitude, mappable.longitude], Math.max(map.getZoom(), 8), {
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
        <span>{mapCopy.locationCount(mappedDealers.length)}</span>
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
                const mappable = mappableDealerLocations([dealer])[0];
                const selected = dealer.id === selectedDealerId || mappable?.id === selectedDealerId;

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
                      <strong>{dealer.code ?? dealer.name}</strong>
                      <small>
                        {mappable ? `${mappable.city}, ${mappable.province}` : mapCopy.noServiceLocation}
                      </small>
                      {isPlaceholderDealer(dealer) ? <em className="dealer-map-coming-soon">{mapCopy.comingSoon}</em> : null}
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
