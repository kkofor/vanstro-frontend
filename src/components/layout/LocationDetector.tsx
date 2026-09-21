"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { dealerMapLocations } from "@/lib/data/dealer-map-locations";
import { matchDealerForMapLocation, nearestDealerLocation } from "@/lib/dealer/nearest-dealer-location";

const ASKED_KEY = "vanstro.geo-asked";

/**
 * Ask once per browser session for location, then match the nearest map
 * pin onto a Header dealer. Denied / timeout / missing API leave Winnipeg.
 */
export function LocationDetector() {
  const { dealers } = useLocale();
  const { setSelectedDealer } = useStorefront();
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const askedRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const apply = (lat: number, lng: number) => {
      coordsRef.current = { lat, lng };
      const nearest = nearestDealerLocation(lat, lng, dealerMapLocations);
      if (!nearest) return;
      const dealer = matchDealerForMapLocation(nearest, dealers);
      if (dealer) setSelectedDealer(dealer);
    };

    const request = (interactive: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (position) => apply(position.coords.latitude, position.coords.longitude),
        () => {
          if (interactive) {
            try {
              sessionStorage.setItem(ASKED_KEY, "denied");
            } catch {
              /* private mode */
            }
          }
        },
        { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8_000 }
      );
    };

    if (askedRef.current) {
      if (coordsRef.current) apply(coordsRef.current.lat, coordsRef.current.lng);
      return;
    }

    let asked = "";
    try {
      asked = sessionStorage.getItem(ASKED_KEY) ?? "";
    } catch {
      asked = "";
    }

    const start = (state?: PermissionState) => {
      if (state === "granted") {
        askedRef.current = true;
        request(false);
        return;
      }
      if (state === "denied") return;
      if (asked) return;
      askedRef.current = true;
      try {
        sessionStorage.setItem(ASKED_KEY, "asked");
      } catch {
        /* private mode */
      }
      request(true);
    };

    const permissions = navigator.permissions;
    if (permissions && typeof permissions.query === "function") {
      permissions
        .query({ name: "geolocation" })
        .then((status) => start(status.state))
        .catch(() => start());
      return;
    }
    start();
  }, [dealers, setSelectedDealer]);

  return null;
}
