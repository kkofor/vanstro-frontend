"use client";

import { COOKIE_PREFERENCES_OPEN_EVENT } from "@/lib/privacy/cookie-preferences";

export function CookiePreferencesButton() {
  const openPreferences = () => {
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN_EVENT));
  };

  return (
    <button
      className="footer-legal-link"
      type="button"
      onClick={openPreferences}
    >
      Cookie Preferences
    </button>
  );
}
