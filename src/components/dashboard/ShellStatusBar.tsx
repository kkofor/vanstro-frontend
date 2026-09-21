"use client";

import styles from "./DashboardF0Shell.module.css";

/**
 * V11-3 compact status row: one toolbar-level line for system status, access
 * mode, effective roles and readable-module count — no nested card stack, no
 * repeated per-page template copy.
 */
export function ShellStatusBar({
  systemStatus,
  accessMode,
  roles,
  readableCount,
  totalModules
}: {
  systemStatus: string;
  accessMode: string;
  roles: string;
  readableCount: number;
  totalModules: number;
}) {
  return (
    <dl aria-label="系统状态" className={styles.statusRow}>
      <div className={styles.statusRowItem}>
        <dt>系统状态</dt>
        <dd>{systemStatus}</dd>
      </div>
      <div className={styles.statusRowItem}>
        <dt>访问模式</dt>
        <dd>{accessMode}</dd>
      </div>
      <div className={styles.statusRowItem}>
        <dt>有效角色</dt>
        <dd>{roles}</dd>
      </div>
      <div className={styles.statusRowItem}>
        <dt>可读模块</dt>
        <dd>
          {readableCount} / {totalModules}
        </dd>
      </div>
    </dl>
  );
}
