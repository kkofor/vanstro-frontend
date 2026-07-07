"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CookieSettingsClient } from "@/components/layout/CookieSettingsClient";
import { COOKIE_PREFERENCES_OPEN_EVENT } from "@/lib/privacy/cookie-preferences";

export function CookiePreferenceDrawer() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const closeDrawer = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const openDrawer = () => {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    };
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openDrawer);

    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openDrawer);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("cookie-drawer-open", open);

    return () => {
      document.body.classList.remove("cookie-drawer-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    window.setTimeout(() => {
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(focusableSelector);
      firstFocusable?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
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
        ref={drawerRef}
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
