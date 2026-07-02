"use client";

import { COOKIE_PREFERENCES_OPEN_EVENT } from "@/lib/privacy/cookie-preferences";

export function CookiePreferencesButton() {
  return (
    <button
      className="footer-legal-link"
      type="button"
      onClick={() => window.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN_EVENT))}
    >
      Cookie Preferences
    </button>
  );
}
