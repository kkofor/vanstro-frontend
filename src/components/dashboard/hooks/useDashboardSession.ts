"use client";

import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import { dispatchDashboardSessionChanged } from "@/lib/dashboard/session-event";
import type { DashboardUser } from "@/lib/dashboard/types";

type ApiResult<T> = { data: T };

export function useDashboardSession() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(false);

  const restoreSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${DASHBOARD_API_BASE_URL}/auth/me`, { credentials: "include" });
      const payload = (await response.json()) as ApiResult<{ user: DashboardUser }>;
      if (!response.ok) throw new Error("session expired");

      setToken("cookie-session");
      setUser(payload.data.user);
      return true;
    } catch {
      setToken("");
      setUser(null);
      dispatchDashboardSessionChanged("anonymous");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const response = await fetch(`${DASHBOARD_API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
      const payload = (await response.json()) as ApiResult<{ user: DashboardUser }>;
      if (!response.ok) throw new Error("login failed");

      setToken("cookie-session");
      setUser(payload.data.user);
      dispatchDashboardSessionChanged("authenticated");
      return "cookie-session";
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch(`${DASHBOARD_API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include"
    }).catch(() => undefined);
    setToken("");
    setUser(null);
    dispatchDashboardSessionChanged("anonymous");
  }

  return { token, user, loading, login, logout, restoreSession, setLoading };
}
