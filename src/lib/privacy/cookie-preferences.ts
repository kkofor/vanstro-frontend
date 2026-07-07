export const COOKIE_PREFERENCES_KEY = "vs_consent_v1";
export const LEGACY_COOKIE_CHOICE_KEY = "vanstro-cookie-choice";
export const COOKIE_PREFERENCES_OPEN_EVENT = "vanstro:open-cookie-preferences";
export const COOKIE_PREFERENCES_SAVED_EVENT = "vanstro:cookie-preferences-saved";

export type CookiePreferences = {
  strictlyNecessary: true;
  functional: boolean;
  analytics: boolean;
  targeting: boolean;
  updatedAt: string;
  source: "accept-all" | "custom" | "reject-all" | "essential-only";
};

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  strictlyNecessary: true,
  functional: false,
  analytics: false,
  targeting: false,
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

  try {
    const raw = getCookieValue(COOKIE_PREFERENCES_KEY) ?? window.localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (!raw) return null;

    return JSON.parse(decodeURIComponent(raw)) as CookiePreferences;
  } catch {
    try {
      window.localStorage.removeItem(COOKIE_PREFERENCES_KEY);
    } catch {}
    try {
      document.cookie = `${COOKIE_PREFERENCES_KEY}=; Max-Age=0; path=/; SameSite=Lax`;
    } catch {}
    return null;
  }
}

export function hasCookiePreferenceRecord() {
  if (typeof window === "undefined") return true;
  try {
    return Boolean(
      getCookieValue(COOKIE_PREFERENCES_KEY) ||
      window.localStorage.getItem(COOKIE_PREFERENCES_KEY) ||
        window.localStorage.getItem(LEGACY_COOKIE_CHOICE_KEY)
    );
  } catch {
    return Boolean(getCookieValue(COOKIE_PREFERENCES_KEY));
  }
}

export function writeCookiePreferences(preferences: CookiePreferences) {
  if (typeof window === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(preferences));
  try {
    document.cookie = `${COOKIE_PREFERENCES_KEY}=${value}; Max-Age=31536000; path=/; SameSite=Lax`;
  } catch {}
  try {
    window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
    window.localStorage.removeItem(LEGACY_COOKIE_CHOICE_KEY);
  } catch {}
}

function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));

  return match ? match.slice(name.length + 1) : null;
}
