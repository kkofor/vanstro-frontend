"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { FloatingSupportWidget } from "@/components/layout/FloatingSupportWidget";
import {
  COOKIE_PREFERENCES_SAVED_EVENT,
  readCookiePreferences
} from "@/lib/privacy/cookie-preferences";

type TiledeskCommand = (...args: unknown[]) => void;

type TiledeskWindow = Window & {
  Tiledesk?: TiledeskCommand & {
    q?: unknown[][];
    c?: (args: unknown[]) => void;
  };
  tiledeskSettings?: Record<string, unknown>;
};

function teardownTiledesk(windowRef: TiledeskWindow) {
  windowRef.Tiledesk?.("hide");
  windowRef.Tiledesk?.("destroy");
  document.getElementById("tiledesk-jssdk")?.remove();
  document
    .querySelectorAll('[id^="tiledesk"], iframe[src*="tiledesk.com"]')
    .forEach((element) => element.remove());
  delete windowRef.Tiledesk;
  delete windowRef.tiledeskSettings;
}

const tiledeskProjectId = process.env.NEXT_PUBLIC_TILEDESK_PROJECT_ID?.trim();
const tiledeskDepartmentId = process.env.NEXT_PUBLIC_TILEDESK_DEPARTMENT_ID?.trim();
const tiledeskWidgetUrl =
  process.env.NEXT_PUBLIC_TILEDESK_WIDGET_URL?.trim() ||
  "https://widget.tiledesk.com/v6/launch.js";

function createQueuedTiledesk(windowRef: TiledeskWindow) {
  if (windowRef.Tiledesk) return;

  const queuedCommand = ((...args: unknown[]) => {
    queuedCommand.c?.(args);
  }) as TiledeskCommand & {
    q?: unknown[][];
    c?: (args: unknown[]) => void;
  };

  queuedCommand.q = [];
  queuedCommand.c = (args: unknown[]) => {
    queuedCommand.q?.push(args);
  };

  windowRef.Tiledesk = queuedCommand;
}

export function CustomerSupportWidget() {
  const pathname = usePathname();
  const { selectedDealerName } = useStorefront();
  const [allowThirdPartySupport, setAllowThirdPartySupport] = useState(false);

  const customAttributes = useMemo(
    () => ({
      currentPath: pathname,
      selectedDealerName
    }),
    [pathname, selectedDealerName]
  );

  useEffect(() => {
    const syncConsent = () => {
      const preferences = readCookiePreferences();
      setAllowThirdPartySupport(Boolean(preferences?.functional));
    };

    syncConsent();
    window.addEventListener(COOKIE_PREFERENCES_SAVED_EVENT, syncConsent);

    return () => window.removeEventListener(COOKIE_PREFERENCES_SAVED_EVENT, syncConsent);
  }, []);

  useEffect(() => {
    const windowRef = window as TiledeskWindow;
    if (!allowThirdPartySupport) {
      teardownTiledesk(windowRef);
      return;
    }
    if (!tiledeskProjectId) return;

    windowRef.tiledeskSettings = {
      projectid: tiledeskProjectId,
      departmentID: tiledeskDepartmentId || undefined,
      widgetTitle: "VanStro assistant",
      welcomeTitle: "VanStro assistant",
      welcomeMsg:
        "Ask about products, checkout, dealer fulfillment or becoming a VanStro dealer.",
      calloutTitle: "Need help?",
      calloutMsg: "VanStro AI can start the conversation.",
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
      lang: "en",
      customAttributes
    };

    createQueuedTiledesk(windowRef);

    if (document.getElementById("tiledesk-jssdk")) {
      windowRef.Tiledesk?.("reInit");
      return;
    }

    const script = document.createElement("script");
    script.id = "tiledesk-jssdk";
    script.async = true;
    script.src = tiledeskWidgetUrl;
    document.head.appendChild(script);
  }, [allowThirdPartySupport, customAttributes]);

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

  if (tiledeskProjectId && allowThirdPartySupport) return null;

  return <FloatingSupportWidget />;
}
