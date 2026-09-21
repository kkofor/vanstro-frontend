"use client";

import type { ShellCrumb } from "@/lib/dashboard/shell-navigation";
import styles from "./DashboardF0Shell.module.css";

/**
 * V11-3 breadcrumb: renders the adjudicated crumb model (first level links to
 * the locale Overview only in the ready non-Overview state; the current crumb
 * is never a link and carries aria-current="page"). The root crumb navigates
 * through the unified dashboard onNavigate callback so one click syncs URL +
 * active nav + breadcrumb + H1 + panel without a page reload.
 */
export function ShellBreadcrumb({
  crumbs,
  onNavigate
}: {
  crumbs: readonly ShellCrumb[];
  onNavigate?: (href: string) => void;
}) {
  return (
    <nav aria-label="面包屑" className={styles.breadcrumb}>
      {crumbs.map((crumb, index) => (
        <span className={styles.breadcrumbItem} key={crumb.key}>
          {index > 0 ? (
            <span aria-hidden="true" className={styles.breadcrumbSeparator}>
              /
            </span>
          ) : null}
          {crumb.href ? (
            <a
              href={crumb.href}
              onClick={(event) => {
                if (!onNavigate) return;
                event.preventDefault();
                onNavigate(crumb.href!);
              }}
            >
              {crumb.label}
            </a>
          ) : (
            <span aria-current={crumb.current ? "page" : undefined}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
