/**
 * V11-2 Dashboard authentication & session — pure, testable helpers.
 *
 * The Dashboard reuses the existing cookie-based customer auth API
 * (POST /auth/login, GET /auth/me, POST /auth/logout) and never creates a
 * token体系: no localStorage/sessionStorage auth token is read or written,
 * and the browser keeps the HttpOnly cookie as the only credential holder.
 *
 * This module is deliberately free of React: the view wires these helpers
 * into the DashboardFoundationBoundary state, and every decision here is
 * exercised by unit tests.
 */

import { DASHBOARD_FOUNDATION_MODULE_STATE, type DashboardModuleStatus } from "../api/api-contract.ts";
import { arrayOf, objectValue, stringValue } from "../api/runtime-validation.ts";
import {
  resolveDashboardFoundationRoute,
  type DashboardRouteMatchSource,
  type DashboardRouteModuleLike,
  type DashboardRouteUnknownReason
} from "./f0-shell.ts";

// ---------------------------------------------------------------------------
// Strict /auth/me user DTO
// ---------------------------------------------------------------------------

export type DashboardSessionUser = {
  id: string;
  email: string;
  kind: string;
  status: string;
  roles: string[];
  permissions: string[];
};

function strictKeys(record: Record<string, unknown>, required: readonly string[], path: string): void {
  const actual = Object.keys(record).sort();
  const expected = [...required].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${path} must contain exactly ${required.join(", ")}.`);
  }
}

/**
 * Strict validation of the GET /auth/me body (`{ data: { user } }`). The
 * backend SessionUser carries exactly id/email/kind/status/roles/permissions;
 * anything else (extra keys, missing keys, non-string role/permission
 * entries) fails closed as invalid-response, never as a session grant.
 */
export function validateDashboardSessionUser(value: unknown, path = "session"): DashboardSessionUser {
  const body = objectValue(value, path);
  const data = objectValue(body.data, `${path}.data`);
  const user = objectValue(data.user, `${path}.data.user`);
  strictKeys(user, ["id", "email", "kind", "status", "roles", "permissions"], `${path}.data.user`);
  const id = stringValue(user.id, `${path}.data.user.id`);
  const email = stringValue(user.email, `${path}.data.user.email`);
  const kind = stringValue(user.kind, `${path}.data.user.kind`);
  const status = stringValue(user.status, `${path}.data.user.status`);
  const roles = arrayOf((entry, entryPath) => stringValue(entry, entryPath))(user.roles, `${path}.data.user.roles`);
  const permissions = arrayOf((entry, entryPath) => stringValue(entry, entryPath))(user.permissions, `${path}.data.user.permissions`);
  return { id, email, kind, status, roles, permissions };
}

/**
 * Dashboard access gate mirroring the backend permission rule
 * (GET /dashboard/foundation → dashboard.access). The backend additionally
 * requires kind === "admin" at the dashboard middleware; the client enforces
 * the same three facts before mounting any business surface: admin kind,
 * active status and the dashboard.access permission grant.
 */
export function dashboardAccessAllowed(user: DashboardSessionUser): boolean {
  return user.kind === "admin" && user.status === "active" && user.permissions.includes("dashboard.access");
}

// ---------------------------------------------------------------------------
// Phase model (session machine)
// ---------------------------------------------------------------------------

export type DashboardAuthPhase =
  | "restoring"
  | "anonymous"
  | "authenticating"
  | "authenticated"
  | "forbidden"
  | "expired"
  | "unavailable"
  | "invalid-response"
  | "logging-out";

export type DashboardAuthEvent =
  | { type: "RESTORE_START" }
  | { type: "RESTORE_ANONYMOUS" }
  | { type: "RESTORE_FORBIDDEN" }
  | { type: "RESTORE_UNAVAILABLE" }
  | { type: "RESTORE_INVALID" }
  | { type: "RESTORE_AUTHENTICATED" }
  | { type: "LOGIN_START" }
  | { type: "LOGIN_INVALID" }
  | { type: "LOGIN_UNAVAILABLE" }
  | { type: "LOGIN_INVALID_RESPONSE" }
  | { type: "LOGIN_FORBIDDEN" }
  | { type: "SESSION_ESTABLISHED" }
  | { type: "SESSION_EXPIRED" }
  | { type: "LOGOUT_START" }
  | { type: "LOGOUT_DONE" };

/**
 * Deterministic session machine. Transitions are only accepted from the
 * phases that legitimately own the event; anything else fails closed by
 * returning the current phase unchanged (this is what fences stale events,
 * e.g. an old restore result landing after a login started).
 */
export function dashboardAuthMachine(phase: DashboardAuthPhase, event: DashboardAuthEvent): DashboardAuthPhase {
  switch (event.type) {
    case "RESTORE_START":
      // A retry may restart from any failure surface that offers Retry
      // (anonymous, expired, unavailable, invalid-response).
      return phase === "restoring" || phase === "anonymous" || phase === "expired"
        || phase === "unavailable" || phase === "invalid-response" ? "restoring" : phase;
    case "RESTORE_ANONYMOUS":
      return phase === "restoring" || phase === "expired" || phase === "anonymous" ? "anonymous" : phase;
    case "RESTORE_FORBIDDEN":
      // authenticating covers the post-login Foundation/Authorization 403:
      // the session was verified but the boundary denies it.
      return phase === "restoring" || phase === "expired" || phase === "authenticating" ? "forbidden" : phase;
    case "RESTORE_UNAVAILABLE":
      return phase === "restoring" || phase === "expired" || phase === "authenticating" ? "unavailable" : phase;
    case "RESTORE_INVALID":
      return phase === "restoring" || phase === "expired" || phase === "authenticating" ? "invalid-response" : phase;
    case "RESTORE_AUTHENTICATED":
      return phase === "restoring" || phase === "expired" ? "authenticated" : phase;
    case "LOGIN_START":
      return phase === "anonymous" || phase === "unavailable" || phase === "invalid-response" ? "authenticating" : phase;
    case "LOGIN_INVALID":
    case "LOGIN_UNAVAILABLE":
    case "LOGIN_INVALID_RESPONSE":
      return phase === "authenticating" ? (event.type === "LOGIN_INVALID" ? "anonymous" : event.type === "LOGIN_UNAVAILABLE" ? "unavailable" : "invalid-response") : phase;
    case "LOGIN_FORBIDDEN":
      return phase === "authenticating" ? "forbidden" : phase;
    case "SESSION_ESTABLISHED":
      return phase === "authenticating" ? "authenticated" : phase;
    case "SESSION_EXPIRED":
      return phase === "authenticated" ? "expired" : phase;
    case "LOGOUT_START":
      return phase === "authenticated" || phase === "forbidden" ? "logging-out" : phase;
    case "LOGOUT_DONE":
      return phase === "logging-out" || phase === "forbidden" ? "anonymous" : phase;
    default:
      return phase;
  }
}

// ---------------------------------------------------------------------------
// Response classification
// ---------------------------------------------------------------------------

export type DashboardSessionRestore =
  | { phase: "authenticated"; user: DashboardSessionUser }
  | { phase: "anonymous" | "forbidden" | "unavailable" | "invalid-response"; user: null };

/**
 * Classifies a GET /auth/me result. status === null means the transport
 * failed (network/abort): unavailable. 401 → anonymous; 403 → forbidden
 * (defensive; the endpoint does not gate kind); other non-2xx → unavailable;
 * malformed body → invalid-response; valid body without dashboard access →
 * forbidden.
 */
export function classifySessionRestore(status: number | null, payload: unknown): DashboardSessionRestore {
  if (status === null) return { phase: "unavailable", user: null };
  if (status === 401) return { phase: "anonymous", user: null };
  if (status === 403) return { phase: "forbidden", user: null };
  if (status < 200 || status >= 300) return { phase: "unavailable", user: null };
  let user: DashboardSessionUser;
  try {
    user = validateDashboardSessionUser(payload);
  } catch {
    return { phase: "invalid-response", user: null };
  }
  return dashboardAccessAllowed(user)
    ? { phase: "authenticated", user }
    : { phase: "forbidden", user: null };
}

export type DashboardLoginSubmitOutcome = "ok" | "invalid-credentials" | "unavailable";

/**
 * Classifies a POST /auth/login status. 400/401 are invalid credentials
 * (the backend returns the same public envelope for missing input and wrong
 * credentials — enumeration-safe). 429 is retryable server pressure →
 * unavailable. Everything else non-2xx → unavailable. The login body is
 * never trusted for navigation: the caller must re-fetch /auth/me.
 */
export function classifyLoginSubmit(status: number | null): DashboardLoginSubmitOutcome {
  if (status === 400 || status === 401) return "invalid-credentials";
  if (status === null || status < 200 || status >= 300) return "unavailable";
  return "ok";
}

// ---------------------------------------------------------------------------
// Safe returnTo
// ---------------------------------------------------------------------------

const DASHBOARD_RETURN_TO_MAX_LENGTH = 2048;
const DASHBOARD_SENSITIVE_QUERY_TOKENS = ["token", "password", "secret", "credential", "signature", "access_token"];

function hasMalformedPercentEncoding(input: string): boolean {
  for (let i = 0; i < input.length; i += 1) {
    if (input.charCodeAt(i) !== 37 /* % */) continue;
    const high = input.charCodeAt(i + 1);
    const low = input.charCodeAt(i + 2);
    const isHexDigit = (code: number) => (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
    if (!isHexDigit(high) || !isHexDigit(low)) return true;
  }
  return false;
}

/**
 * Validates a preserved Dashboard location before login redirect. Accepts
 * exactly `/dashboard`, `/dashboard/...`, `/fr/dashboard`, `/fr/dashboard/...`
 * (with query) and rejects: absolute URLs, protocol-relative URLs, non
 * Dashboard paths, backslashes/control characters, malformed percent
 * encoding, repeated locale prefixes, sensitive query keys, overlong values
 * and the login page itself (self-loop). Returns null → callers fall back to
 * the default Dashboard href. Never decoded, never used with window.location.
 */
export function safeDashboardReturnTo(input: string): string | null {
  if (typeof input !== "string" || input.length === 0 || input.length > DASHBOARD_RETURN_TO_MAX_LENGTH) return null;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return null;
  }
  if (input.includes("\\")) return null;
  if (input.includes("#")) return null;
  if (hasMalformedPercentEncoding(input)) return null;
  if (input.startsWith("//")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(input)) return null;
  if (!input.startsWith("/")) return null;

  const questionIndex = input.indexOf("?");
  const pathname = questionIndex === -1 ? input : input.slice(0, questionIndex);
  const search = questionIndex === -1 ? "" : input.slice(questionIndex + 1);

  let stripped = pathname;
  if (pathname === "/fr" || pathname.startsWith("/fr/")) {
    stripped = pathname.slice(3) || "/";
    if (stripped === "/fr" || stripped.startsWith("/fr/")) return null;
  }
  // Decode each path segment before membership and self-loop checks so URL
  // normalization cannot turn an accepted returnTo into another route after
  // login. Empty interior segments, encoded dot segments and decoded slashes
  // are rejected; trailing slashes are the only normalized empty segment.
  while (stripped.length > 1 && stripped.endsWith("/")) stripped = stripped.slice(0, -1);
  const rawSegments = stripped.split("/");
  const decodedSegments = rawSegments.map((segment) => decodeURIComponent(segment));
  if (rawSegments.slice(1).some((segment) => segment.length === 0)) return null;
  if (decodedSegments.some((segment) => segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\") || segment.includes("?") || segment.includes("#"))) return null;
  const normalizedPath = decodedSegments.join("/");
  if (normalizedPath !== "/dashboard" && !normalizedPath.startsWith("/dashboard/")) return null;
  if (normalizedPath === "/dashboard/login") return null;

  for (const [key] of new URLSearchParams(search)) {
    const lower = key.toLowerCase();
    if (DASHBOARD_SENSITIVE_QUERY_TOKENS.some((token) => lower.includes(token))) return null;
  }
  return input;
}

// ---------------------------------------------------------------------------
// returnTo Authority adjudication (V11-1 runtime selector resolver)
// ---------------------------------------------------------------------------

export type DashboardReturnToAdjudication =
  | {
      kind: "known";
      source: DashboardRouteMatchSource;
      module: string;
      status: DashboardModuleStatus;
      denied: boolean;
    }
  | { kind: "unknown"; reason: DashboardRouteUnknownReason };

/**
 * Classifies a safe Dashboard location through the authoritative V11-1
 * runtime selector resolver. Consumes either the live Foundation projection
 * modules or the shared mechanical registry — never a second route registry.
 * known → canonical/alias (path_exact)/query (query_value/legacy_tab)/prefix
 * ownership is preserved for post-login navigation (the ready shell then
 * adjudicates coming-soon and available-deny itself); unknown → the caller
 * falls back to the locale Overview.
 */
export function adjudicateDashboardReturnTo(
  input: string,
  modules: readonly DashboardRouteModuleLike[]
): DashboardReturnToAdjudication {
  const resolution = resolveDashboardFoundationRoute(input, modules);
  if (resolution.kind === "unknown") return { kind: "unknown", reason: resolution.reason };
  const module = modules.find((entry) => entry.module === resolution.owner);
  if (!module) return { kind: "unknown", reason: "no_match" };
  return {
    kind: "known",
    source: resolution.source,
    module: module.module,
    status: module.status,
    denied: module.readAllowed === false
  };
}

/**
 * Reads the explicit returnTo parameter from a Dashboard login page query
 * (`/dashboard/login?returnTo=<encoded>` and the `/fr` equivalent).
 * URLSearchParams percent-decodes once; the returned value is re-validated
 * by the caller's two layers. Returns null when absent, empty or ambiguous
 * (conflicting duplicate keys fail closed). The login page's own query is
 * never a return target — only this decoded value can be.
 */
export function dashboardReturnToFromLoginQuery(search: string): string | null {
  const params = new URLSearchParams(search);
  const values = params.getAll("returnTo");
  if (values.length === 0) return null;
  if (values.length > 1 && new Set(values).size > 1) return null;
  const value = values[0] ?? "";
  return value === "" ? null : value;
}

/**
 * Two-layer returnTo resolution for post-login navigation:
 * 1. safeDashboardReturnTo — the input safety layer (external,
 *    protocol-relative, backslash/control, malformed percent, dot/decoded
 *    slash, sensitive query, overlong, self-loop);
 * 2. adjudicateDashboardReturnTo — Authority attribution through the shared
 *    V11-1 runtime selector resolver.
 * Known targets are preserved verbatim (the ready shell adjudicates
 * coming-soon and available-deny after login); unknown/malformed/absent
 * targets fall back to the locale Overview (`/dashboard` or
 * `/fr/dashboard`). `modules` defaults to the shared mechanical registry
 * when no Foundation projection is available (e.g. anonymous visits).
 */
export function dashboardReturnToTarget(
  input: string | null,
  locale: string,
  modules?: readonly DashboardRouteModuleLike[]
): string {
  if (input === null) return dashboardDefaultHref(locale);
  const safe = safeDashboardReturnTo(input);
  if (safe === null) return dashboardDefaultHref(locale);
  const adjudication = adjudicateDashboardReturnTo(safe, modules ?? DASHBOARD_FOUNDATION_MODULE_STATE);
  return adjudication.kind === "known" ? safe : dashboardDefaultHref(locale);
}

// ---------------------------------------------------------------------------
// Dashboard hrefs
// ---------------------------------------------------------------------------

export function dashboardLoginHref(locale: string) {
  return locale === "fr-CA" ? "/fr/dashboard/login" : "/dashboard/login";
}

export function dashboardDefaultHref(locale: string) {
  return locale === "fr-CA" ? "/fr/dashboard" : "/dashboard";
}

// ---------------------------------------------------------------------------
// Transport (cookie credentials only; never tokens in storage)
// ---------------------------------------------------------------------------

export type DashboardHttpResult = { status: number | null; payload: unknown };

/**
 * Shared AbortError detection for the Dashboard auth transports. An abort
 * (component unmount, generation fencing) propagates so the caller can stop
 * silently; every other transport failure collapses into
 * `{ status: null }`.
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function dashboardSessionRequest(baseUrl: string, signal?: AbortSignal): Promise<DashboardHttpResult> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/auth/me`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { status: null, payload: null };
  }
  return { status: response.status, payload: await response.json().catch(() => null) };
}

export async function dashboardLoginRequest(
  baseUrl: string,
  email: string,
  password: string,
  signal?: AbortSignal
): Promise<DashboardHttpResult> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: email.trim(), password }),
      signal
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { status: null, payload: null };
  }
  return { status: response.status, payload: await response.json().catch(() => null) };
}

/**
 * Logs out through the existing POST /auth/logout endpoint. The local state
 * is cleared regardless of the network result (the caller dispatches the
 * anonymous session event after this settles).
 */
export async function dashboardLogout(baseUrl: string): Promise<void> {
  try {
    await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
  } catch {
    // Network failure must not prevent local invalidation.
  }
}
