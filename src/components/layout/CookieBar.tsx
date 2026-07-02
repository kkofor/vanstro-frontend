"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  COOKIE_PREFERENCES_OPEN_EVENT,
  COOKIE_PREFERENCES_SAVED_EVENT,
  hasCookiePreferenceRecord,
  makeCookiePreferences,
  writeCookiePreferences
} from "@/lib/privacy/cookie-preferences";

export function CookieBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasCookiePreferenceRecord());

    const closeNotice = () => {
      setVisible(false);
    };

    window.addEventListener(COOKIE_PREFERENCES_SAVED_EVENT, closeNotice);

    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_SAVED_EVENT, closeNotice);
    };
  }, []);

  const openPreferences = () => {
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN_EVENT));
  };

  const acceptAll = () => {
    writeCookiePreferences(
      makeCookiePreferences({
        functional: true,
        analytics: true,
        targeting: true,
        source: "accept-all"
      })
    );
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_SAVED_EVENT));
    setVisible(false);
  };

  const closeWithEssentialOnly = () => {
    writeCookiePreferences(
      makeCookiePreferences({
        functional: false,
        analytics: false,
        targeting: false,
        source: "essential-only"
      })
    );
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_SAVED_EVENT));
    setVisible(false);
  };

  if (!visible || pathname === "/cookie-settings") return null;

  return (
    <aside className="cookie-bar" role="dialog" aria-labelledby="cookie-notice-title">
      <div className="cookie-inner">
        <button
          className="cookie-close"
          type="button"
          aria-label="Close cookie notice"
          onClick={closeWithEssentialOnly}
        >
          <X size={20} strokeWidth={2.2} />
        </button>
        <div className="cookie-copy">
          <h2 id="cookie-notice-title">How We Use Cookies</h2>
          <p>
            We use cookies and similar technologies which are required for our
            website to function. Optional cookies help us understand how people
            use VanStro, improve services and personalize product offers. For
            more information, see our <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
        <div className="cookie-actions">
          <button className="cookie-button ghost" type="button" onClick={openPreferences}>
            Manage Cookie Preferences
          </button>
          <button className="cookie-button primary" type="button" onClick={acceptAll}>
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}
