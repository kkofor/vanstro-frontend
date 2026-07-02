"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { COOKIE_PREFERENCES_OPEN_EVENT } from "@/lib/privacy/cookie-preferences";

export function CookieSettingsRouteClient() {
  const router = useRouter();

  useEffect(() => {
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN_EVENT));
    router.replace("/");
  }, [router]);

  return null;
}
