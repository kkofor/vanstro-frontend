"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CookieSettingsClient } from "@/components/layout/CookieSettingsClient";
import { COOKIE_PREFERENCES_OPEN_EVENT } from "@/lib/privacy/cookie-preferences";

export function CookiePreferenceDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const closeDrawer = useCallback(() => {
    setOpen(false);

    if (pathname === "/cookie-settings") {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.replace("/");
      }
    }
  }, [pathname, router]);

  useEffect(() => {
    const openDrawer = () => setOpen(true);
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openDrawer);

    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openDrawer);
    };
  }, []);

  useEffect(() => {
    if (pathname === "/cookie-settings") {
      setOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("cookie-drawer-open", open);

    return () => {
      document.body.classList.remove("cookie-drawer-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeDrawer, open]);

  if (!open) return null;

  return (
    <div
      className="cookie-preference-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDrawer();
      }}
    >
      <aside
        className="cookie-preference-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Cookie Preferences"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <CookieSettingsClient onClose={closeDrawer} onSaved={closeDrawer} />
      </aside>
    </div>
  );
}
