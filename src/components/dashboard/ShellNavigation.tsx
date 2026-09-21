"use client";

import Link from "next/link";
import { SHELL_COMING_SOON_FEATURES, shellNavGroups, type ShellNavEntry } from "@/lib/dashboard/shell-navigation";
import styles from "./DashboardF0Shell.module.css";

/**
 * V11-3 shell navigation: six-group desktop/mobile navigation fed by the
 * shared V11-1 module registry (never a second route table). Available
 * modules render as Links with aria-current on the active module; coming-soon
 * entries render as inert spans (no href, not focusable); disabled global
 * entries (search/work queue) render as inert text in their own group — never
 * as disabled buttons that imply a possible action.
 */
export function ShellNavigation({
  modules,
  activeModule,
  localePrefix,
  onNavigate,
  activeLinkRef
}: {
  modules: readonly ShellNavEntry[];
  activeModule: string | null;
  localePrefix: string;
  onNavigate?: (href: string) => void;
  activeLinkRef?: (link: HTMLAnchorElement | null) => void;
}) {
  const groups = shellNavGroups(modules);
  return (
    <nav aria-label="管理后台主要导航" className={styles.nav}>
      {groups.map((group) => (
        <section className={styles.navGroup} key={group.key}>
          <h3>{group.label}</h3>
          {group.entries.map((entry) =>
            entry.status === "coming_soon" ? (
              <span className={styles.comingSoonNav} key={entry.module}>
                {entry.label}
                <small>即将推出</small>
              </span>
            ) : (
              <Link
                aria-current={entry.module === activeModule ? "page" : undefined}
                href={`${localePrefix}${entry.route}`}
                key={entry.module}
                onClick={(event) => {
                  // V11-R1 P0: Next Link on generateStaticParams pages can
                  // push the URL without re-rendering React; navigate through
                  // the router explicitly so one click always syncs.
                  event.preventDefault();
                  onNavigate?.(`${localePrefix}${entry.route}`);
                }}
                ref={entry.module === activeModule ? activeLinkRef : undefined}
              >
                {entry.label}
              </Link>
            )
          )}
        </section>
      ))}
      <section aria-label="未开放功能" className={styles.navGroup}>
        <h3>即将推出</h3>
        {SHELL_COMING_SOON_FEATURES.map((feature) => (
          <span className={styles.comingSoonFeature} key={feature}>
            {feature}
          </span>
        ))}
      </section>
    </nav>
  );
}
