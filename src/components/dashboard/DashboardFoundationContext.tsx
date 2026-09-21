"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { DashboardAuthorization } from "@/lib/api/api-contract";
import { validateApiResult, validateDashboardAuthorization, validateDashboardFoundation } from "@/lib/api/runtime-validation";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { classifySessionRestore, dashboardSessionRequest } from "@/lib/dashboard/auth-session";
import { assertFreshDashboardAuthorization, assertMatchingDashboardActors, dashboardAuthorizationRequest, projectAuthorizedFoundation } from "@/lib/dashboard/p02-authorization";
import { subscribeToDashboardSessionChanged } from "@/lib/dashboard/session-event";
import {
  classifyDashboardFoundation,
  createDashboardFoundationRequestCoordinator,
  dashboardFoundationLoadingState,
  dashboardFoundationRequest,
  DashboardFoundationRequestError,
  isDashboardPath,
  isFoundationAuthFailure,
  shouldRevalidateDashboardOnResume,
  type DashboardFoundationState
} from "@/lib/dashboard/f0-shell";

export type { DashboardFoundationState } from "@/lib/dashboard/f0-shell";

type DashboardFoundationContextValue = DashboardFoundationState & {
  authorization: DashboardAuthorization | null;
  refreshFailure: string | null;
  retry: () => void;
  refresh: () => void;
  invalidateSession: () => void;
};

const DashboardFoundationContext = createContext<DashboardFoundationContextValue | null>(null);

/** Revalidation trigger windows for window/tab resume. These only decide when
 *  to refresh — they never extend the server-issued authorization lifetime
 *  (AUTHORIZATION_TTL_MS = 60s), which `assertFreshDashboardAuthorization`
 *  still enforces. Skew is a small early-revalidate margin, never the full TTL. */
const RESUME_STALE_AFTER_MS = 30_000;
const RESUME_EXPIRY_SKEW_MS = 5_000;

export function DashboardFoundationBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dashboardPath = isDashboardPath(pathname);
  const [state, setState] = useState<DashboardFoundationState>({ status: "idle", foundation: null, failure: null });
  const [authorization, setAuthorization] = useState<DashboardAuthorization | null>(null);

  const [refreshFailure, setRefreshFailure] = useState<string | null>(null);

  const requestCoordinator = useRef(createDashboardFoundationRequestCoordinator());
  const startedForPath = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const authorizationExpiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuccessfulAtRef = useRef<number | null>(null);
  const stateRef = useRef<DashboardFoundationState>({ status: "idle", foundation: null, failure: null });
  const authorizationRef = useRef<DashboardAuthorization | null>(null);
  const wasHiddenRef = useRef(false);

  const load = useCallback(async (options?: { force?: boolean; presentation?: "blocking" | "background" }) => {
    const force = options?.force === true;
    const presentation = options?.presentation ?? "blocking";
    const generation = requestCoordinator.current.begin(!force);
    if (generation === null) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (presentation === "blocking") {
      setState(dashboardFoundationLoadingState());
      setAuthorization(null);
      clearTimeout(authorizationExpiryRef.current ?? undefined);
      authorizationExpiryRef.current = null;
    }
    try {
      const payload = await dashboardFoundationRequest(DASHBOARD_API_BASE_URL, controller.signal);
      const foundation = validateApiResult(payload, validateDashboardFoundation).data;
      const disposition = classifyDashboardFoundation({ foundation });
      if (disposition.status !== "ready") {
        // The legacy shell is still a Dashboard surface: unlike the ready
        // path, its foundation response can be a successful 200 even when
        // the session is anonymous. Reuse the strict V11-2 /auth/me DTO and
        // dashboard.access gate before allowing the legacy mount.
        const session = await dashboardSessionRequest(DASHBOARD_API_BASE_URL, controller.signal);
        const restore = classifySessionRestore(session.status, session.payload);
        if (restore.phase !== "authenticated") {
          if (!requestCoordinator.current.isCurrent(generation)) return;
          authorizationRef.current = null;
          setAuthorization(null);
          setRefreshFailure(null);
          clearTimeout(authorizationExpiryRef.current ?? undefined);
          authorizationExpiryRef.current = null;
          lastSuccessfulAtRef.current = null;
          const status = restore.phase === "anonymous"
            ? "anonymous"
            : restore.phase === "forbidden"
              ? "forbidden"
              : restore.phase === "invalid-response"
                ? "invalid"
                : "unavailable";
          setState({ status, foundation: null, failure: status === "invalid" ? "invalid-response" : status });
          return;
        }
        if (!requestCoordinator.current.isCurrent(generation)) return;
        // Server explicitly returned a non-ready (legacy) Foundation: drop the
        // old authorization + refs + expiry timer atomically so a stale
        // authorization can never coexist with a non-ready Foundation.
        authorizationRef.current = null;
        setAuthorization(null);
        setRefreshFailure(null);
        clearTimeout(authorizationExpiryRef.current ?? undefined);
        authorizationExpiryRef.current = null;
        lastSuccessfulAtRef.current = null;
        setState(disposition);
        return;
      }
      const authorizationPayload = await dashboardAuthorizationRequest(DASHBOARD_API_BASE_URL, controller.signal);
      const nextAuthorization = validateApiResult(authorizationPayload, validateDashboardAuthorization).data;
      if (nextAuthorization.status === "unavailable") throw new DashboardFoundationRequestError("unavailable");
      assertFreshDashboardAuthorization(nextAuthorization);
      assertMatchingDashboardActors(foundation, nextAuthorization);
      if (!requestCoordinator.current.isCurrent(generation)) return;
      const nextState = classifyDashboardFoundation({ foundation: projectAuthorizedFoundation(foundation, nextAuthorization) });
      setAuthorization(nextAuthorization);
      setState(nextState);
      setRefreshFailure(null);
      lastSuccessfulAtRef.current = Date.now();
      clearTimeout(authorizationExpiryRef.current ?? undefined);
      authorizationExpiryRef.current = setTimeout(
        () => void load({ force: true, presentation: "background" }),
        Math.max(0, Date.parse(nextAuthorization.expiresAt) - Date.now() - RESUME_EXPIRY_SKEW_MS)
      );
    } catch (error) {
      if (!requestCoordinator.current.isCurrent(generation)) return;
      const authInvalidating = isFoundationAuthFailure(error);
      const previous = authorizationRef.current;
      const previousStillValid = previous !== null && Date.parse(previous.expiresAt) > Date.now();
      const keep = presentation === "background" && !authInvalidating && previousStillValid;
      if (keep) {
        // Transient background failure (network/5xx/contract): keep the still
        // valid authorization and record a non-blocking refresh failure, but
        // re-schedule a fail-closed blocking load at the real expiry so the
        // authorization can never silently outlive its server-issued TTL.
        setRefreshFailure("后台刷新失败，仍显示上次数据。");
        clearTimeout(authorizationExpiryRef.current ?? undefined);
        authorizationExpiryRef.current = setTimeout(
          () => void load({ force: true, presentation: "blocking" }),
          Math.max(0, Date.parse(previous.expiresAt) - Date.now())
        );
      } else {
        setAuthorization(null);
        setRefreshFailure(null);
        clearTimeout(authorizationExpiryRef.current ?? undefined);
        authorizationExpiryRef.current = null;
        setState(classifyDashboardFoundation({ error }));
      }
    } finally {
      requestCoordinator.current.finish(generation);
    }
  }, []);

  useEffect(() => {
    if (!dashboardPath) {
      startedForPath.current = false;
      requestCoordinator.current.invalidate();
      controllerRef.current?.abort();
      clearTimeout(authorizationExpiryRef.current ?? undefined);
      authorizationExpiryRef.current = null;
      setState({ status: "idle", foundation: null, failure: null });
      setAuthorization(null);
      return;
    }
    if (startedForPath.current) return;
    startedForPath.current = true;
    void load();
  }, [dashboardPath, load]);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { authorizationRef.current = authorization; }, [authorization]);

  useEffect(() => {
    if (!dashboardPath) return;
    const maybeResume = () => {
      if (!wasHiddenRef.current) return;
      wasHiddenRef.current = false;
      const decision = shouldRevalidateDashboardOnResume({
        now: Date.now(),
        lastSuccessfulAt: lastSuccessfulAtRef.current,
        authorizationExpiresAt: authorizationRef.current?.expiresAt ?? null,
        currentState: stateRef.current.status,
        staleAfterMs: RESUME_STALE_AFTER_MS,
        expirySkewMs: RESUME_EXPIRY_SKEW_MS
      });
      if (decision.kind === "skip") return;
      void load({ presentation: decision.presentation });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") wasHiddenRef.current = true;
      else maybeResume();
    };
    const onFocus = () => {
      if (document.visibilityState === "visible") maybeResume();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [dashboardPath, load]);

  const retry = useCallback(() => { if (dashboardPath) void load({ force: true, presentation: "blocking" }); }, [dashboardPath, load]);
  const invalidateSession = useCallback(() => {
    requestCoordinator.current.invalidate();
    controllerRef.current?.abort();
    clearTimeout(authorizationExpiryRef.current ?? undefined);
    authorizationExpiryRef.current = null;
    lastSuccessfulAtRef.current = null;
    authorizationRef.current = null;
    stateRef.current = { status: "anonymous", foundation: null, failure: "anonymous" };
    setAuthorization(null);
    setRefreshFailure(null);
    setState({ status: "anonymous", foundation: null, failure: "anonymous" });
  }, []);

  useEffect(() => {
    if (!dashboardPath) return;
    return subscribeToDashboardSessionChanged(({ state: sessionState }) => {
      if (sessionState === "authenticated") void load({ force: true, presentation: "blocking" });
      else invalidateSession();
    });
  }, [dashboardPath, load, invalidateSession]);

  useEffect(() => {
    return () => {
      requestCoordinator.current.invalidate();
      controllerRef.current?.abort();
      clearTimeout(authorizationExpiryRef.current ?? undefined);
      authorizationExpiryRef.current = null;
    };
  }, []);

  const value = useMemo<DashboardFoundationContextValue>(
    () => ({ ...state, authorization, refreshFailure, retry, refresh: retry, invalidateSession }),
    [state, authorization, refreshFailure, retry, invalidateSession]
  );

  return (
    <DashboardFoundationContext.Provider value={value}>
      {children}
    </DashboardFoundationContext.Provider>
  );
}

export function useDashboardFoundation() {
  const value = useContext(DashboardFoundationContext);
  if (!value) throw new Error("useDashboardFoundation must be used within DashboardFoundationBoundary.");
  return value;
}
