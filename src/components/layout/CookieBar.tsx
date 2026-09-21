"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  COOKIE_PREFERENCES_SAVED_EVENT,
  hasCookiePreferenceRecord,
  isCurrentCookiePreferences,
  makeCookiePreferences,
  recordCookiePreferences,
  requestCookiePreferencesOpen,
  writeCookiePreferences
} from "@/lib/privacy/cookie-preferences";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { vanstroApi } from "@/lib/api/api-client";
import { getLocaleRoutePair, localeHref } from "@/lib/i18n/routes";

export function CookieBar() {
  const { copy, locale } = useLocale();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [failedPreferences, setFailedPreferences] = useState<ReturnType<typeof makeCookiePreferences> | null>(null);

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
    requestCookiePreferencesOpen();
  };

  const saveChoice = (preferences: ReturnType<typeof makeCookiePreferences>) => {
    writeCookiePreferences(preferences);
    setFailedPreferences(null);
    void recordCookiePreferences(preferences, vanstroApi.recordConsentEvent).catch(() => {
      if (isCurrentCookiePreferences(preferences)) setFailedPreferences(preferences);
    });
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_SAVED_EVENT));
    setVisible(false);
  };

  const acceptAll = () => {
    saveChoice(
      makeCookiePreferences({
        functional: true,
        analytics: true,
        targeting: true,
        source: "accept-all"
      })
    );
  };

  const closeWithEssentialOnly = () => {
    saveChoice(
      makeCookiePreferences({
        functional: false,
        analytics: false,
        targeting: false,
        source: "reject-all"
      })
    );
  };

  const normalizedPathname = pathname.replace(/\/$/, "") || "/";
  const routePair = getLocaleRoutePair(normalizedPathname);
  const isCookieSettingsRoute = routePair?.en === "/cookie-settings";

  const cookieCopy = copy.cookies;
  const retryConsentRecord = async () => {
    if (!failedPreferences || !isCurrentCookiePreferences(failedPreferences)) {
      setFailedPreferences(null);
      return;
    }
    try {
      await recordCookiePreferences(failedPreferences, vanstroApi.recordConsentEvent);
      setFailedPreferences(null);
    } catch {
      // Keep the localized retry notice visible while the local choice remains effective.
    }
  };

  if ((!visible && !failedPreferences) || isCookieSettingsRoute) return null;

  return (
    <aside
      className="cookie-bar"
      role="region"
      aria-labelledby={visible ? "cookie-notice-title" : undefined}
      aria-label={!visible ? cookieCopy.saveError : undefined}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="cookie-inner">
        {failedPreferences && !visible ? (
          <div className="cookie-copy">
            <p role="alert">{cookieCopy.saveError}</p>
            <button className="cookie-button ghost" type="button" onClick={() => void retryConsentRecord()}>
              {cookieCopy.retry}
            </button>
          </div>
        ) : null}
        {visible ? <>
        <button
          className="cookie-close"
          type="button"
          aria-label={cookieCopy.rejectAndClose}
          onClick={closeWithEssentialOnly}
        >
          <X size={20} strokeWidth={2.2} />
        </button>
        <div className="cookie-copy">
          <h2 id="cookie-notice-title">{cookieCopy.title}</h2>
          <p>
            {cookieCopy.bodyBeforeLink}
            <Link href={localeHref("/cookie-settings", locale)}>
              {cookieCopy.policyLink}
            </Link>.
          </p>
        </div>
        <div className="cookie-actions">
          <button className="cookie-button equal" type="button" onClick={closeWithEssentialOnly}>
            {cookieCopy.rejectAll}
          </button>
          <button className="cookie-button ghost" type="button" onClick={openPreferences}>
            {cookieCopy.customize}
          </button>
          <button className="cookie-button equal" type="button" onClick={acceptAll}>
            {cookieCopy.acceptAll}
          </button>
        </div>
        </> : null}
      </div>
    </aside>
  );
}
