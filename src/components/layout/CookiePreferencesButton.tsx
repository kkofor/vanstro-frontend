"use client";

import { requestCookiePreferencesOpen } from "@/lib/privacy/cookie-preferences";

export function CookiePreferencesButton() {
  const openPreferences = () => {
    requestCookiePreferencesOpen();
  };

  return (
    <a
      className="footer-legal-link"
      href="#cookie-preferences"
      onClick={openPreferences}
    >
      Cookie Preferences
    </a>
  );
}
