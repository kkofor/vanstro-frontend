"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function DocumentLanguage() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = pathname.startsWith("/zh/") ? "zh-CN" : "en-CA";
  }, [pathname]);

  return null;
}
