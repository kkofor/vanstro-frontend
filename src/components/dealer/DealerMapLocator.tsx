"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
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
  return `${dealer.code} - ${dealer.name}`;
}

function dealerAddress(dealer: DealerMapLocation) {
  return `${dealer.address}, ${dealer.city}, ${dealer.province} ${dealer.postalCode}`;
}

function popupContent(dealer: DealerMapLocation) {
  const phoneHref = dealer.phone.replace(/[^\d+]/g, "");

  return `
    <div class="dealer-map-popup">
      <strong>${escapeHtml(dealerLabel(dealer))}</strong>
      <dl>
        <div><dt>Contact:</dt><dd>${escapeHtml(dealer.contactName)}</dd></div>
        <div><dt>Phone:</dt><dd><a href="tel:${phoneHref}">${escapeHtml(dealer.phone)}</a></dd></div>
        <div><dt>Email:</dt><dd><a href="mailto:${escapeHtml(dealer.email)}">${escapeHtml(dealer.email)}</a></dd></div>
        <div><dt>Address:</dt><dd>${escapeHtml(dealerAddress(dealer))}</dd></div>
      </dl>
    </div>
  `;
}

export function DealerMapLocator() {
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
          zoomControl: true
        });
        leafletRef.current = L;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
            .bindPopup(popupContent(dealer), {
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
  }, []);

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
          <h2>Dealer locations</h2>
          <p>Select a marker to view dealer contact details.</p>
        </div>
        <span>{dealerMapLocations.length} dealer locations</span>
      </div>

      <div className="dealer-map-mobile-switch" aria-label="Dealer map view">
        <button
          aria-pressed={mobileView === "map"}
          className={mobileView === "map" ? "is-active" : undefined}
          onClick={() => setMobileView("map")}
          type="button"
        >
          Map
        </button>
        <button
          aria-pressed={mobileView === "list"}
          className={mobileView === "list" ? "is-active" : undefined}
          onClick={() => setMobileView("list")}
          type="button"
        >
          List
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
              <strong>Map temporarily unavailable</strong>
              <p>Use the dealer list to view locations and contact information.</p>
            </div>
          ) : null}
          <div
            aria-label="Interactive map showing VanStro dealer locations across Canada"
            className="dealer-map-canvas"
            ref={mapElementRef}
          />
        </div>

        <aside
          aria-label="Dealer location list"
          className={["dealer-map-list", mobileView === "map" ? "is-mobile-hidden" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <label className="dealer-map-search" htmlFor="dealer-map-search">
            <Search aria-hidden="true" size={19} />
            <input
              aria-label="Search dealer locations"
              id="dealer-map-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by city, province, or postal code"
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
                      {selected ? <em>Show on map</em> : null}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="dealer-map-empty">No dealer locations match your search.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
