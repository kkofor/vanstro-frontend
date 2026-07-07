"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { FloatingSupportWidget } from "@/components/layout/FloatingSupportWidget";

type TiledeskCommand = (...args: unknown[]) => void;

type TiledeskWindow = Window & {
  Tiledesk?: TiledeskCommand & {
    q?: unknown[][];
    c?: (args: unknown[]) => void;
  };
  tiledeskSettings?: Record<string, unknown>;
};

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
  const { cartCount, selectedDealerName, postalCode } = useStorefront();

  const customAttributes = useMemo(
    () => ({
      source: "vanstro-web",
      currentPath: pathname,
      selectedDealerName,
      postalCode,
      cartCount
    }),
    [cartCount, pathname, postalCode, selectedDealerName]
  );

  useEffect(() => {
    if (!tiledeskProjectId) return;

    const windowRef = window as TiledeskWindow;
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
  }, [customAttributes]);

  useEffect(() => {
    if (!tiledeskProjectId) return;

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
  }, []);

  if (tiledeskProjectId) return null;

  return <FloatingSupportWidget />;
}
