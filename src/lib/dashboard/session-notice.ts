import { dashboardSessionExpiredNotice } from "./f0-shell.ts";
import type { DashboardFoundationState } from "./f0-shell.ts";

/**
 * Tab-scoped "session expired" login notice lifecycle.
 *
 * A non-sensitive, short-TTL marker persisted in sessionStorage lets the
 * Dashboard login page keep showing "会话已过期，请重新登录" across shell
 * remounts, route remounts and full reloads that follow an authenticated →
 * anonymous transition caused by session expiry/revocation (not explicit
 * logout).
 *
 * Storage contract — the ONLY value ever persisted is:
 *   { "type": "expired", "createdAt": <epoch ms>, "version": 1 }
 * No cookie, access token, user id, email, returnTo, request content or PII
 * is ever written. Reads fail closed on malformed/expired records and clear
 * them; every storage access degrades safely when storage is unavailable
 * (SSR, disabled storage, private mode) without ever throwing into the login
 * flow.
 */

export const SESSION_NOTICE_STORAGE_KEY = "vanstro.dashboard.session-notice.v1" as const;
export const SESSION_NOTICE_TYPE = "expired" as const;
export const SESSION_NOTICE_VERSION = 1 as const;
/** Short TTL: the notice stays meaningful only for a brief re-login window. */
export const SESSION_NOTICE_TTL_MS = 5 * 60 * 1000;
/** Fail closed on createdAt values lying in the future beyond small clock skew. */
const SESSION_NOTICE_MAX_FUTURE_SKEW_MS = 60 * 1000;

export type DashboardSessionNotice = {
  type: typeof SESSION_NOTICE_TYPE;
  createdAt: number;
  version: typeof SESSION_NOTICE_VERSION;
};

/** Minimal Storage surface the lifecycle needs; null = storage unavailable. */
export type SessionNoticeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;

export function parseSessionNotice(value: unknown): DashboardSessionNotice | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.type !== SESSION_NOTICE_TYPE) return null;
  if (record.version !== SESSION_NOTICE_VERSION) return null;
  if (typeof record.createdAt !== "number" || !Number.isFinite(record.createdAt)) return null;
  return { type: SESSION_NOTICE_TYPE, createdAt: record.createdAt, version: SESSION_NOTICE_VERSION };
}

export function browserSessionNoticeStorage(): SessionNoticeStorage {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Non-destructive read: a valid notice is returned as-is; malformed or
 * expired records are cleared (fail closed). Storage failures return null
 * without throwing.
 */
export function readSessionNotice(now: number, storage: SessionNoticeStorage): DashboardSessionNotice | null {
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(SESSION_NOTICE_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearSessionNotice(storage);
    return null;
  }
  const notice = parseSessionNotice(parsed);
  if (!notice) {
    clearSessionNotice(storage);
    return null;
  }
  if (now - notice.createdAt > SESSION_NOTICE_TTL_MS || notice.createdAt > now + SESSION_NOTICE_MAX_FUTURE_SKEW_MS) {
    clearSessionNotice(storage);
    return null;
  }
  return notice;
}

export function writeSessionNotice(now: number, storage: SessionNoticeStorage): void {
  if (!storage) return;
  const payload = JSON.stringify({ type: SESSION_NOTICE_TYPE, createdAt: now, version: SESSION_NOTICE_VERSION });
  try {
    storage.setItem(SESSION_NOTICE_STORAGE_KEY, payload);
  } catch {
    // Storage unavailable: the notice simply degrades to in-memory only.
  }
}

export function clearSessionNotice(storage: SessionNoticeStorage): void {
  if (!storage) return;
  try {
    storage.removeItem(SESSION_NOTICE_STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

/**
 * What the shell should do with its in-memory notice state after one effect
 * run: "show" (recently expired, or restored from a still-valid persisted
 * notice), "hide" (re-auth / explicit logout / nothing persisted) or "keep"
 * (transient statuses and repeated StrictMode runs must never flip state).
 */
export type SessionNoticeAction = "show" | "hide" | "keep";

export type SessionNoticeLifecycleInput = {
  /** Status observed by the previous effect run; null on the very first run of a fresh mount. */
  previousStatus: DashboardFoundationState["status"] | null;
  currentStatus: DashboardFoundationState["status"];
  loggingOut: boolean;
  now: number;
  storage: SessionNoticeStorage;
};

/**
 * Lifecycle decision for one shell effect run, mirroring the effect
 * contract: previousStatus is the status observed by the previous run, the
 * current committed foundation status and whether the anonymous transition
 * was user-initiated. Performs the storage side effects (write on
 * authenticated → anonymous without logout, clear on logout/re-auth, clear
 * on malformed/expired reads) and returns the action for the shell's notice
 * state.
 */
export function sessionNoticeAction(input: SessionNoticeLifecycleInput): SessionNoticeAction {
  const { previousStatus, currentStatus, loggingOut, now, storage } = input;
  // Fresh mount: restore a still-valid persisted notice without consuming
  // it — later remounts and reloads within the TTL must see it again until
  // re-auth, explicit logout, TTL expiry or malformed data clears it. When
  // the restore later lands on an authenticated status, the ready branch
  // clears both the storage record and the in-memory notice.
  if (previousStatus === null) {
    if (currentStatus === "ready") {
      clearSessionNotice(storage);
      return "hide";
    }
    return readSessionNotice(now, storage) !== null ? "show" : "hide";
  }
  if (currentStatus === "ready") {
    // Re-authenticated: any persisted expiry notice is moot.
    clearSessionNotice(storage);
    return "hide";
  }
  if (currentStatus === "anonymous") {
    if (dashboardSessionExpiredNotice(previousStatus, currentStatus, loggingOut)) {
      // Authenticated → anonymous without explicit logout: persist the
      // notice so shell remounts, route remounts and reloads within the TTL
      // keep surfacing it.
      writeSessionNotice(now, storage);
      return "show";
    }
    if (loggingOut) {
      // Explicit logout: never show the expired notice, persisted or not.
      clearSessionNotice(storage);
      return "hide";
    }
    // anonymous → anonymous (or a restore that never authenticated):
    // keep the current notice state.
    return "keep";
  }
  // Transient restore/failure states never mutate the persisted notice.
  return "keep";
}
