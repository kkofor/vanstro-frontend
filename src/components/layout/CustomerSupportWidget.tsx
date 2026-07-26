"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { FloatingSupportWidget } from "@/components/layout/FloatingSupportWidget";
import {
  COOKIE_PREFERENCES_SAVED_EVENT,
  isCookiePreferencesStorageEvent,
  readCookiePreferences
} from "@/lib/privacy/cookie-preferences";
import {
  createQueuedTiledesk,
  createTiledeskLoadGuard,
  isTiledeskSdkReady,
  teardownTiledesk,
  TiledeskWindow
} from "@/lib/support/tiledesk-lifecycle";

const tiledeskProjectId = process.env.NEXT_PUBLIC_TILEDESK_PROJECT_ID?.trim();
const tiledeskDepartmentId = process.env.NEXT_PUBLIC_TILEDESK_DEPARTMENT_ID?.trim();
const tiledeskWidgetUrl =
  process.env.NEXT_PUBLIC_TILEDESK_WIDGET_URL?.trim() ||
  "https://widget.tiledesk.com/v6/launch.js";

export function CustomerSupportWidget() {
  const { copy, locale } = useLocale();
  const pathname = usePathname();
  const { selectedDealerName } = useStorefront();
  const [allowThirdPartySupport, setAllowThirdPartySupport] = useState(false);
  const [thirdPartySupportReady, setThirdPartySupportReady] = useState(false);
  const consentAllowedRef = useRef(false);
  const loadGuardRef = useRef(createTiledeskLoadGuard());

  const customAttributes = useMemo(
    () => ({
      currentPath: pathname,
      selectedDealerName
    }),
    [pathname, selectedDealerName]
  );

  useEffect(() => {
    const syncConsent = () => {
      const functionalConsent = readCookiePreferences()?.functional === true;
      consentAllowedRef.current = functionalConsent;
      if (!functionalConsent) {
        loadGuardRef.current.invalidate();
        setThirdPartySupportReady(false);
        teardownTiledesk(window as TiledeskWindow);
      }
      setAllowThirdPartySupport(functionalConsent);
    };

    syncConsent();
    const syncCrossTabConsent = (event: StorageEvent) => {
      // Cross-origin provider storage is outside this document's boundary and is never guessed at.
      if (isCookiePreferencesStorageEvent(event)) syncConsent();
    };
    window.addEventListener(COOKIE_PREFERENCES_SAVED_EVENT, syncConsent);
    window.addEventListener("storage", syncCrossTabConsent);

    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_SAVED_EVENT, syncConsent);
      window.removeEventListener("storage", syncCrossTabConsent);
    };
  }, []);

  useEffect(() => {
    const windowRef = window as TiledeskWindow;
    if (!allowThirdPartySupport) {
      setThirdPartySupportReady(false);
      teardownTiledesk(windowRef);
      return;
    }
    if (!tiledeskProjectId) return;

    windowRef.tiledeskSettings = {
      projectid: tiledeskProjectId,
      departmentID: tiledeskDepartmentId || undefined,
      widgetTitle: copy.supportWidget.assistantLabel,
      welcomeTitle: copy.supportWidget.assistantLabel,
      welcomeMsg: copy.supportWidget.openingGeneral,
      calloutTitle: copy.supportWidget.launcherTitle,
      calloutMsg: copy.supportWidget.disclaimer,
      themeColor: "#003f3f",
      themeForegroundColor: "#ffffff",
      align: "right",
      marginX: "24px",
      marginY: "24px",
      mobileMarginX: "14px",
      mobileMarginY: "14px",
      size: "max",
      singleConversation: true,
      startFromHome: false,
      preChatForm: false,
      lang: locale === "fr-CA" ? "fr" : "en",
      customAttributes
    };

    createQueuedTiledesk(windowRef);

    if (isTiledeskSdkReady(windowRef)) {
      windowRef.Tiledesk?.("reInit");
      setThirdPartySupportReady(true);
      return;
    }

    // An element alone does not prove that the SDK loaded. Replace an orphaned or
    // still-loading script so readiness is tied to this generation's verified load.
    document.getElementById("tiledesk-jssdk")?.remove();
    setThirdPartySupportReady(false);
    const isCurrentLoad = loadGuardRef.current.begin();
    let disposed = false;
    const script = document.createElement("script");
    script.id = "tiledesk-jssdk";
    script.async = true;
    script.src = tiledeskWidgetUrl;
    script.onload = () => {
      if (disposed || !isCurrentLoad() || !consentAllowedRef.current) return;
      if (!isTiledeskSdkReady(windowRef)) {
        setThirdPartySupportReady(false);
        return;
      }
      setThirdPartySupportReady(true);
    };
    script.onerror = () => {
      if (disposed || !isCurrentLoad()) return;
      setThirdPartySupportReady(false);
      teardownTiledesk(windowRef);
    };
    document.head.appendChild(script);

    return () => {
      disposed = true;
      loadGuardRef.current.invalidate();
      script.onload = null;
      script.onerror = null;
    };
  }, [allowThirdPartySupport, copy.supportWidget, customAttributes, locale]);

  useEffect(() => {
    return () => teardownTiledesk(window as TiledeskWindow);
  }, []);

  useEffect(() => {
    if (!tiledeskProjectId || !allowThirdPartySupport) return;

    function handleSupportRequest() {
      const windowRef = window as TiledeskWindow;
      windowRef.Tiledesk?.("show");
      windowRef.Tiledesk?.("open");
    }

    window.addEventListener("vanstro:support-request", handleSupportRequest);
    window.addEventListener("vanstro:human-support-request", handleSupportRequest);

    return () => {
      window.removeEventListener("vanstro:support-request", handleSupportRequest);
      window.removeEventListener("vanstro:human-support-request", handleSupportRequest);
    };
  }, [allowThirdPartySupport]);

  if (tiledeskProjectId && allowThirdPartySupport && thirdPartySupportReady) return null;

  return <FloatingSupportWidget />;
}
