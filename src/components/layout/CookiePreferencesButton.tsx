"use client";

import { requestCookiePreferencesOpen } from "@/lib/privacy/cookie-preferences";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function CookiePreferencesButton() {
  const { copy } = useLocale();
  const openPreferences = () => {
    requestCookiePreferencesOpen();
  };

  return (
    <a
      className="footer-legal-link"
      href="#cookie-preferences"
      onClick={openPreferences}
    >
      {copy.footer.cookiePreferences}
    </a>
  );
}
