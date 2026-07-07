"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  COOKIE_PREFERENCES_SAVED_EVENT,
  DEFAULT_COOKIE_PREFERENCES,
  makeCookiePreferences,
  readCookiePreferences,
  writeCookiePreferences
} from "@/lib/privacy/cookie-preferences";

type OptionalPreference = "functional" | "analytics" | "targeting";

const preferenceRows: Array<{
  key: "strictlyNecessary" | OptionalPreference;
  title: string;
  description: string;
}> = [
  {
    key: "strictlyNecessary",
    title: "Strictly Necessary Cookies",
    description:
      "Required for cart, checkout, account security and core site operation."
  },
  {
    key: "functional",
    title: "Functional Cookies",
    description:
      "Remember store selection, language choices and support preferences."
  },
  {
    key: "analytics",
    title: "Analytics and Performance Cookies",
    description:
      "Help us understand page usage and improve product discovery flows."
  },
  {
    key: "targeting",
    title: "Targeting Cookies",
    description:
      "Support more relevant product offers, dealer updates and campaign measurement."
  }
];

type CookieSettingsClientProps = {
  onClose?: () => void;
  onSaved?: () => void;
};

export function CookieSettingsClient({ onClose, onSaved }: CookieSettingsClientProps) {
  const [preferences, setPreferences] = useState({
    functional: DEFAULT_COOKIE_PREFERENCES.functional,
    analytics: DEFAULT_COOKIE_PREFERENCES.analytics,
    targeting: DEFAULT_COOKIE_PREFERENCES.targeting
  });
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
    setPreferences((current) => ({
      ...current,
      [key]: !current[key]
    }));
  };

  const savePreferences = () => {
    writeCookiePreferences(
      makeCookiePreferences({
        ...preferences,
        source: "custom"
      })
    );
    setSaved(true);
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_SAVED_EVENT));
    onSaved?.();
  };

  return (
    <>
      <div className="cookie-drawer-scroll">
        <button
          className="cookie-drawer-close"
          type="button"
          aria-label="Close cookie preferences"
          onClick={onClose}
        >
          <X size={22} strokeWidth={2.2} />
        </button>
        <div className="cookie-settings-copy">
          <h2>Cookie Preferences</h2>
          <p>
            We use cookies and similar technologies that are required for VanStro to
            function. Optional cookies help improve product browsing, local dealer
            selection, support workflows and marketing relevance.
          </p>
        </div>

        <div className="cookie-preference-panel" aria-label="Cookie preference controls">
          <h3>Manage Cookie Preferences</h3>
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
                    <em className="preference-always">Always Active</em>
                  ) : (
                    <button
                      className={`preference-toggle ${enabled ? "is-on" : ""}`}
                      type="button"
                      aria-label={`${enabled ? "Disable" : "Enable"} ${row.title}`}
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
        {saved ? <span>Preferences saved.</span> : <span />}
        <button className="button button-accent" type="button" onClick={savePreferences}>
          Save My Preferences
        </button>
      </div>
    </>
  );
}
