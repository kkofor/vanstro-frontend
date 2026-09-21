"use client";

import { requestCookiePreferencesOpen } from "@/lib/privacy/cookie-preferences";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";

export function CookiePreferencesButton() {
  const { copy } = useLocale();
  const openPreferences = () => {
    requestCookiePreferencesOpen();
  };

  return (
    <Button asChild variant="link" className="footer-legal-link">
      <a href="#cookie-preferences" onClick={openPreferences}>
        {copy.footer.cookiePreferences}
      </a>
    </Button>
  );
}
