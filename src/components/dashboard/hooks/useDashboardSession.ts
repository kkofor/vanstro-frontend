"use client";

import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_API_BASE_URL, clearStoredToken, readStoredToken, storeToken } from "@/lib/dashboard/api";
import type { DashboardUser } from "@/lib/dashboard/types";

type ApiResult<T> = { data: T };

export function useDashboardSession() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(false);

  const restoreSession = useCallback(async () => {
    const storedToken = readStoredToken();
    if (!storedToken) return false;

    setLoading(true);
    try {
      const response = await fetch(`${DASHBOARD_API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      const payload = (await response.json()) as ApiResult<{ user: DashboardUser }>;
      if (!response.ok) throw new Error("session expired");

      setToken(storedToken);
      setUser(payload.data.user);
      return true;
    } catch {
      clearStoredToken();
      setToken("");
      setUser(null);
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
        body: JSON.stringify({ email, password })
      });
      const payload = (await response.json()) as ApiResult<{ accessToken: string; user: DashboardUser }>;
      if (!response.ok) throw new Error("login failed");

      setToken(payload.data.accessToken);
      setUser(payload.data.user);
      storeToken(payload.data.accessToken);
      return payload.data.accessToken;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (token) {
      await fetch(`${DASHBOARD_API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => undefined);
    }
    clearStoredToken();
    setToken("");
    setUser(null);
  }

  return { token, user, loading, login, logout, restoreSession, setLoading };
}
