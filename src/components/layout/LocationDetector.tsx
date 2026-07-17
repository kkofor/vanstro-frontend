"use client";

import { useEffect } from "react";
import {
  COOKIE_PREFERENCES_SAVED_EVENT,
  clearFunctionalStorage
} from "@/lib/privacy/cookie-preferences";

export function LocationDetector() {
  useEffect(() => {
    clearFunctionalStorage();
    const handlePreferencesSaved = () => clearFunctionalStorage();

    window.addEventListener(COOKIE_PREFERENCES_SAVED_EVENT, handlePreferencesSaved);
    return () => window.removeEventListener(COOKIE_PREFERENCES_SAVED_EVENT, handlePreferencesSaved);
  }, []);

  return null;
}
