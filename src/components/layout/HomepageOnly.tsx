"use client";

import { usePathname } from "next/navigation";

export function HomepageOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "");
  const routePath = basePath && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length) || "/"
    : pathname;

  return routePath === "/" ? children : null;
}
