"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/api/api-contract";
import { vanstroApi } from "@/lib/api/api-client";

type CustomerSessionContextValue = {
  status: "loading" | "authenticated" | "anonymous";
  user?: AuthUser;
  logout: () => Promise<void>;
};

const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(null);

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CustomerSessionContextValue["status"]>("loading");
  const [user, setUser] = useState<AuthUser>();

  const restoreSession = useCallback(() => {
    setStatus("loading");
    void vanstroApi.getCurrentSession()
      .then((response) => {
        setUser(response.data.user);
        setStatus("authenticated");
      })
      .catch(() => {
        setUser(undefined);
        setStatus("anonymous");
      });
  }, []);

  useEffect(() => {
    restoreSession();
    window.addEventListener("vanstro-authenticated", restoreSession);
    window.addEventListener("vanstro-logged-out", restoreSession);
    return () => {
      window.removeEventListener("vanstro-authenticated", restoreSession);
      window.removeEventListener("vanstro-logged-out", restoreSession);
    };
  }, [restoreSession]);

  const logout = useCallback(async () => {
    setUser(undefined);
    setStatus("anonymous");
    try {
      await vanstroApi.logout();
    } catch {
      // The API client always removes the local token, even if server revocation fails.
    }
  }, []);

  const value = useMemo<CustomerSessionContextValue>(() => ({ status, user, logout }), [logout, status, user]);

  return <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>;
}

export function useCustomerSession() {
  const context = useContext(CustomerSessionContext);
  if (!context) throw new Error("useCustomerSession must be used inside CustomerSessionProvider");
  return context;
}
