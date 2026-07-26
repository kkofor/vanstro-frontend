"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { vanstroApi } from "@/lib/api/api-client";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  COOKIE_PREFERENCES_SAVED_EVENT,
  readCookiePreferences
} from "@/lib/privacy/cookie-preferences";

const ANALYTICS_SESSION_KEY = "vs_analytics_session_v1";

function getOrCreateSessionId() {
  try {
    const existing = window.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(ANALYTICS_SESSION_KEY, created);
    return created;
  } catch {
    return `anon-${Date.now()}`;
  }
}

function readUtm(searchParams: URLSearchParams) {
  return {
    utmSource: searchParams.get("utm_source") ?? undefined,
    utmMedium: searchParams.get("utm_medium") ?? undefined,
    utmCampaign: searchParams.get("utm_campaign") ?? undefined
  };
}

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useLocale();

  useEffect(() => {
    let cancelled = false;

    async function track() {
      const preferences = readCookiePreferences();
      if (!preferences?.analytics) return;
      if (!pathname || pathname.startsWith("/dashboard") || pathname.startsWith("/fr/dashboard")) return;

      try {
        await vanstroApi.trackPageView({
          path: pathname,
          sessionId: getOrCreateSessionId(),
          consentAnalytics: true,
          referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
          locale,
          ...readUtm(searchParams)
        });
      } catch {
        // Analytics must never block browsing.
      }
    }

    void track();

    function onConsentSaved() {
      if (!cancelled) void track();
    }

    window.addEventListener(COOKIE_PREFERENCES_SAVED_EVENT, onConsentSaved);
    return () => {
      cancelled = true;
      window.removeEventListener(COOKIE_PREFERENCES_SAVED_EVENT, onConsentSaved);
    };
  }, [pathname, searchParams, locale]);

  return null;
}
