"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  COOKIE_PREFERENCES_SAVED_EVENT,
  DEFAULT_COOKIE_PREFERENCES,
  isCurrentCookiePreferences,
  makeCookiePreferences,
  readCookiePreferences,
  recordCookiePreferences,
  writeCookiePreferences
} from "@/lib/privacy/cookie-preferences";
import { vanstroApi } from "@/lib/api/api-client";
import { useLocale } from "@/components/i18n/LocaleProvider";

type OptionalPreference = "functional" | "analytics" | "targeting";

type CookieSettingsClientProps = {
  onClose?: () => void;
  onSaved?: () => void;
};

export function CookieSettingsClient({ onClose, onSaved }: CookieSettingsClientProps) {
  const { copy } = useLocale();
  const cookieCopy = copy.cookies;
  const preferenceRows = cookieCopy.rows;
  const [preferences, setPreferences] = useState({
    functional: DEFAULT_COOKIE_PREFERENCES.functional,
    analytics: DEFAULT_COOKIE_PREFERENCES.analytics,
    targeting: DEFAULT_COOKIE_PREFERENCES.targeting
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const existing = readCookiePreferences();
    if (!existing) return;

    setPreferences({
      functional: existing.functional,
      analytics: existing.analytics,
      targeting: existing.targeting
    });
  }, []);

  const togglePreference = (key: OptionalPreference) => {
    setSaveStatus("idle");
    setPreferences((current) => ({
      ...current,
      [key]: !current[key]
    }));
  };

  const savePreferences = async () => {
    const savedPreferences = makeCookiePreferences({ ...preferences, source: "custom" });
    writeCookiePreferences(savedPreferences);
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_SAVED_EVENT));
    setSaveStatus("saving");

    try {
      await recordCookiePreferences(savedPreferences, vanstroApi.recordConsentEvent);
      if (!isCurrentCookiePreferences(savedPreferences)) return;
      setSaveStatus("saved");
      onSaved?.();
    } catch {
      if (isCurrentCookiePreferences(savedPreferences)) setSaveStatus("error");
    }
  };

  return (
    <>
      <div className="cookie-drawer-scroll">
        <button
          className="cookie-drawer-close"
          type="button"
          aria-label={cookieCopy.closePreferences}
          onClick={onClose}
        >
          <X size={22} strokeWidth={2.2} />
        </button>
        <div className="cookie-settings-copy">
          <h2>{cookieCopy.preferencesTitle}</h2>
          <p>{cookieCopy.intro}</p>
        </div>

        <div className="cookie-preference-panel" aria-label={cookieCopy.controlsLabel}>
          <h3>{cookieCopy.manageTitle}</h3>
          <div className="cookie-preference-list">
            {preferenceRows.map((row) => {
              const isNecessary = row.key === "strictlyNecessary";
              const enabled = isNecessary || preferences[row.key as OptionalPreference];

              return (
                <div className="cookie-preference-row" key={row.key}>
                  <span className="preference-expand" aria-hidden="true" />
                  <div className="preference-text">
                    <strong>{row.title}</strong>
                    <span>{row.description}</span>
                  </div>
                  {isNecessary ? (
                    <em className="preference-always">{cookieCopy.alwaysActive}</em>
                  ) : (
                    <button
                      className={`preference-toggle ${enabled ? "is-on" : ""}`}
                      type="button"
                      aria-label={`${enabled ? cookieCopy.disable : cookieCopy.enable} ${row.title}`}
                      aria-pressed={enabled}
                      onClick={() => togglePreference(row.key as OptionalPreference)}
                    >
                      <span className="toggle-check" aria-hidden="true">
                        <Check size={14} strokeWidth={3} />
                      </span>
                      <span className="toggle-knob" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="cookie-settings-save">
        <span role="status" aria-live="polite" aria-atomic="true">
          {saveStatus === "saved"
            ? cookieCopy.saved
            : saveStatus === "error"
              ? cookieCopy.saveError
              : ""}
        </span>
        <button
          className="button button-accent"
          type="button"
          disabled={saveStatus === "saving"}
          onClick={() => void savePreferences()}
        >
          {saveStatus === "error" ? cookieCopy.retry : cookieCopy.save}
        </button>
      </div>
    </>
  );
}
