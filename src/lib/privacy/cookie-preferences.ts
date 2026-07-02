export const COOKIE_PREFERENCES_KEY = "vanstro-cookie-preferences-v1";
export const LEGACY_COOKIE_CHOICE_KEY = "vanstro-cookie-choice";
export const COOKIE_PREFERENCES_OPEN_EVENT = "vanstro:open-cookie-preferences";
export const COOKIE_PREFERENCES_SAVED_EVENT = "vanstro:cookie-preferences-saved";

export type CookiePreferences = {
  strictlyNecessary: true;
  functional: boolean;
  analytics: boolean;
  targeting: boolean;
  updatedAt: string;
  source: "accept-all" | "custom" | "essential-only";
};

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  strictlyNecessary: true,
  functional: true,
  analytics: true,
  targeting: true,
  updatedAt: "",
  source: "custom"
};

export function makeCookiePreferences(
  input: Partial<Omit<CookiePreferences, "strictlyNecessary" | "updatedAt">>
): CookiePreferences {
  return {
    ...DEFAULT_COOKIE_PREFERENCES,
    ...input,
    strictlyNecessary: true,
    updatedAt: new Date().toISOString()
  };
}

export function readCookiePreferences() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(COOKIE_PREFERENCES_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    window.localStorage.removeItem(COOKIE_PREFERENCES_KEY);
    return null;
  }
}

export function hasCookiePreferenceRecord() {
  if (typeof window === "undefined") return true;
  return Boolean(
    window.localStorage.getItem(COOKIE_PREFERENCES_KEY) ||
      window.localStorage.getItem(LEGACY_COOKIE_CHOICE_KEY)
  );
}

export function writeCookiePreferences(preferences: CookiePreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
  window.localStorage.removeItem(LEGACY_COOKIE_CHOICE_KEY);
}
