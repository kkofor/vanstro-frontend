"use client";

import { useEffect } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { dealers } from "@/lib/data/mock-data";

const LOCATION_REQUEST_KEY = "vanstro-location-request-v1";

const DEALER_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  toronto: { latitude: 43.7615, longitude: -79.4104 },
  vancouver: { latitude: 49.1666, longitude: -123.1336 },
  calgary: { latitude: 50.9829, longitude: -114.0369 },
  montreal: { latitude: 45.487, longitude: -73.693 }
};

function distanceInKm(
  origin: { latitude: number; longitude: number },
  target: { latitude: number; longitude: number }
) {
  const earthRadiusKm = 6371;
  const deltaLatitude = ((target.latitude - origin.latitude) * Math.PI) / 180;
  const deltaLongitude = ((target.longitude - origin.longitude) * Math.PI) / 180;
  const originLatitude = (origin.latitude * Math.PI) / 180;
  const targetLatitude = (target.latitude * Math.PI) / 180;

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(targetLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function findNearestDealer(latitude: number, longitude: number) {
  return dealers.reduce((nearest, dealer) => {
    const coordinates = DEALER_COORDINATES[dealer.id];
    if (!coordinates) return nearest;

    const distance = distanceInKm({ latitude, longitude }, coordinates);
    if (!nearest || distance < nearest.distance) {
      return { dealer, distance };
    }

    return nearest;
  }, null as null | { dealer: (typeof dealers)[number]; distance: number });
}

export function LocationDetector() {
  const { setPostalCode, setSelectedDealer } = useStorefront();

  useEffect(() => {
    if (window.localStorage.getItem(LOCATION_REQUEST_KEY)) return;

    const requestTimer = window.setTimeout(() => {
      if (!("geolocation" in navigator)) {
        window.localStorage.setItem(
          LOCATION_REQUEST_KEY,
          JSON.stringify({ status: "unavailable", updatedAt: new Date().toISOString() })
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nearest = findNearestDealer(
            position.coords.latitude,
            position.coords.longitude
          );

          if (nearest) {
            setSelectedDealer(nearest.dealer);
            setPostalCode(nearest.dealer.postalCode);
          }

          window.localStorage.setItem(
            LOCATION_REQUEST_KEY,
            JSON.stringify({
              status: "granted",
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              dealerId: nearest?.dealer.id ?? null,
              updatedAt: new Date().toISOString()
            })
          );
        },
        (error) => {
          window.localStorage.setItem(
            LOCATION_REQUEST_KEY,
            JSON.stringify({
              status: error.code === error.PERMISSION_DENIED ? "denied" : "error",
              message: error.message,
              updatedAt: new Date().toISOString()
            })
          );
        },
        {
          enableHighAccuracy: false,
          maximumAge: 30 * 60 * 1000,
          timeout: 10000
        }
      );
    }, 800);

    return () => window.clearTimeout(requestTimer);
  }, [setPostalCode, setSelectedDealer]);

  return null;
}
