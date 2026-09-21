"use client";

import type { RefObject } from "react";
import type { ShellNavEntry } from "@/lib/dashboard/shell-navigation";
import { ShellNavigation } from "./ShellNavigation";
import styles from "./DashboardF0Shell.module.css";

export type DrawerCloseReason = "escape" | "backdrop" | "close-button" | "navigation" | "breakpoint";

/**
 * V11-3 mobile navigation drawer: presentation-only extraction of the V11-2
 * drawer JSX. The focus-trap/scroll-lock/breakpoint behavior stays in
 * DashboardF0Shell (useModalFocus + body scroll lock + matchMedia), so this
 * component never re-implements a second navigation model. The drawer
 * declares aria-modal/dialog/title, a 44px+ close control, scrollable body
 * without horizontal overflow, and the same module input as the desktop
 * sidebar.
 */
export function MobileNavigationDrawer({
  open,
  onClose,
  onNav,
  modules,
  activeModule,
  localePrefix,
  drawerRef,
  modalRootRef
}: {
  open: boolean;
  onClose: (reason: DrawerCloseReason) => void;
  onNav?: (href: string) => void;
  modules: readonly ShellNavEntry[];
  activeModule: string | null;
  localePrefix: string;
  drawerRef: RefObject<HTMLElement | null>;
  modalRootRef: RefObject<HTMLDivElement | null>;
}) {
  if (!open) return null;
  return (
    <div className={styles.modalRoot} ref={modalRootRef}>
      <button aria-label="关闭导航" className={styles.backdrop} onClick={() => onClose("backdrop")} type="button" />
      <aside
        aria-labelledby="dashboard-f0-drawer-title"
        aria-modal="true"
        className={styles.mobileDrawer}
        id="dashboard-f0-mobile-navigation"
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className={styles.drawerHeader}>
          <h2 id="dashboard-f0-drawer-title">功能导航</h2>
          <button aria-label="关闭导航" className={styles.drawerClose} onClick={() => onClose("close-button")} type="button">
            关闭
          </button>
        </header>
        <ShellNavigation
          activeModule={activeModule}
          localePrefix={localePrefix}
          modules={modules}
          onNavigate={(href) => { onClose("navigation"); onNav?.(href); }}
        />
      </aside>
    </div>
  );
}
