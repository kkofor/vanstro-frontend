/**
 * lib/session-ua.ts — reduce a raw User-Agent string to a short device/browser label pair.
 * We never persist the raw UA (PIPEDA / Law 25 data minimization) — only these two short names.
 */
export type SessionBrowser = "Chrome" | "Safari" | "Firefox" | "Edge" | "Other"
export type SessionDevice = "iPhone" | "Android" | "macOS" | "Windows" | "Linux" | "Other"

export function parseBrowser(ua: string | null | undefined): SessionBrowser {
  const s = ua ?? ""
  if (/Edg\//i.test(s)) return "Edge"
  if (/Chrome\//i.test(s) && !/Edg\//i.test(s)) return "Chrome"
  if (/Firefox\//i.test(s)) return "Firefox"
  if (/Safari\//i.test(s) && !/Chrome\//i.test(s)) return "Safari"
  return "Other"
}

export function parseDevice(ua: string | null | undefined): SessionDevice {
  const s = ua ?? ""
  if (/iPhone/i.test(s)) return "iPhone"
  if (/Android/i.test(s)) return "Android"
  if (/Macintosh|Mac OS X/i.test(s)) return "macOS"
  if (/Windows/i.test(s)) return "Windows"
  if (/Linux/i.test(s)) return "Linux"
  return "Other"
}
