"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CookieSettingsClient } from "@/components/layout/CookieSettingsClient";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import { COOKIE_PREFERENCES_OPEN_EVENT } from "@/lib/privacy/cookie-preferences";

export function CookiePreferenceDrawer() {
  const [open, setOpen] = useState(false);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  const closeDrawer = useCallback(() => {
    setOpen(false);
    if (window.location.hash === "#cookie-preferences") {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      );
    }
  }, []);

  useEffect(() => {
    const openDrawer = () => {
      setOpen(true);
    };
    const openFromHash = () => {
      if (window.location.hash === "#cookie-preferences") setOpen(true);
    };
    document.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openDrawer);
    window.addEventListener("hashchange", openFromHash);
    openFromHash();

    return () => {
      document.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openDrawer);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("cookie-drawer-open", open);

    return () => {
      document.body.classList.remove("cookie-drawer-open");
    };
  }, [open]);

  useModalFocus({
    active: open,
    containerRef: drawerRef,
    modalRootRef: backdropRef,
    onEscape: closeDrawer
  });

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="cookie-preference-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDrawer();
      }}
    >
      <aside
        ref={drawerRef}
        className="cookie-preference-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Cookie Preferences"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <CookieSettingsClient onClose={closeDrawer} onSaved={closeDrawer} />
      </aside>
    </div>
  );
}
