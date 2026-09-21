"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./DashboardF0Shell.module.css";

/**
 * V11-3 user menu: one place for the identity summary and the logout action
 * (no duplicate user info, no second logout button). Standard button + menu
 * semantics: trigger exposes aria-haspopup/expanded/controls; opening moves
 * focus to the first menu item; Escape closes and returns focus to the
 * trigger; outside pointerdown closes without hijacking the target click;
 * Tab/Shift+Tab exits the menu naturally (focusout close); after logout the
 * menu closes without attempting to focus a trigger that is about to unmount.
 */
export function ShellUserMenu({
  displayLabel,
  roleSummary,
  loggingOut,
  onLogout
}: {
  displayLabel: string;
  roleSummary?: string;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((reason: "escape" | "outside" | "action") => {
    setOpen(false);
    // Focus returns to the trigger only for keyboard-initiated closure;
    // outside pointerdown and actions keep the natural focus flow.
    if (reason === "escape") triggerRef.current?.focus();
  }, []);

  // Opening moves focus into the first menu item.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [open]);

  // Escape closes the menu and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close("escape");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Outside pointerdown closes without hijacking the target click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close("outside");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // Tab/Shift+Tab: standard menu exit — closing when focus leaves the menu
  // root keeps tab order natural and never traps the user.
  useEffect(() => {
    if (!open) return;
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (rootRef.current && !rootRef.current.contains(next)) setOpen(false);
    };
    rootRef.current?.addEventListener("focusout", onFocusOut);
    return () => rootRef.current?.removeEventListener("focusout", onFocusOut);
  }, [open]);

  const handleLogoutClick = () => {
    // Logout unmounts this trigger (anonymous state); never refocus it.
    setOpen(false);
    onLogout();
  };

  return (
    <div className={styles.userMenu} ref={rootRef}>
      <button
        aria-controls="shell-user-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="用户菜单"
        className={styles.userMenuTrigger}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span className={styles.userMenuLabel}>{displayLabel}</span>
        <span aria-hidden="true" className={styles.userMenuChevron}>
          ▾
        </span>
      </button>
      {open ? (
        <div className={styles.userMenuPopup} id="shell-user-menu" ref={menuRef} role="menu" aria-label="用户菜单">
          <div className={styles.userMenuSummary} role="presentation">
            <strong>{displayLabel}</strong>
            {roleSummary ? <span>{roleSummary}</span> : null}
          </div>
          <button
            className={styles.userMenuLogout}
            disabled={loggingOut}
            onClick={handleLogoutClick}
            role="menuitem"
            type="button"
          >
            {loggingOut ? "正在退出…" : "退出登录"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
