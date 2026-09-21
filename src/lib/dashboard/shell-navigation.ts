// V11-3 global shell navigation — pure view-model helpers.
// Kept JSX-free so the shell's navigation/breadcrumb semantics are unit
// testable at runtime with node:test (no transpiler). The shell components
// render only these models; there is no second route registry here — the
// module matrix stays the V11-1 shared registry (DASHBOARD_FOUNDATION_MODULE_STATE
// / foundation.modules) and the breadcrumb is derived from the adjudicated
// active module, never from hand-written route tables.

export type ShellNavStatus = "available" | "coming_soon";

export type ShellNavEntry = {
  module: string;
  label: string;
  group: string;
  status: ShellNavStatus;
  route: string;
  readAllowed?: boolean;
};

export type ShellNavGroup = {
  key: string;
  label: string;
  entries: ShellNavEntry[];
};

export const SHELL_NAV_GROUP_ORDER = ["workspace", "catalog", "commerce", "organization", "engagement", "platform"] as const;

export const SHELL_NAV_GROUP_LABELS: Record<string, string> = {
  workspace: "概览",
  catalog: "商品",
  commerce: "交易",
  organization: "组织",
  engagement: "客户互动",
  platform: "平台"
};

/** Group order/labels are a closed six-group model shared by desktop and mobile. */
export function shellNavGroups(modules: readonly ShellNavEntry[]): ShellNavGroup[] {
  return SHELL_NAV_GROUP_ORDER
    .map((key) => ({ key, label: SHELL_NAV_GROUP_LABELS[key], entries: modules.filter((entry) => entry.group === key) }))
    .filter((group) => group.entries.length > 0);
}

/** Navigation visibility: coming-soon always visible, denied available hidden. */
export function shellNavVisible(entry: ShellNavEntry): boolean {
  return entry.status === "coming_soon" || entry.readAllowed !== false;
}

export type ShellCrumbState = "ready" | "coming-soon" | "forbidden" | "unknown";

export type ShellCrumb = {
  key: "root" | "current";
  label: string;
  href?: string;
  current?: boolean;
};

/**
 * Breadcrumb model derived from the adjudicated module/route state — the
 * first level ("管理后台") links to the locale Overview only in the ready
 * state and only when the current module is not Overview itself; the current
 * crumb is never a link and carries aria-current. coming-soon/forbidden/
 * unknown use accurate fixed labels and never leak internal route keys.
 */
export function shellBreadcrumbModel(opts: {
  localePrefix: string;
  state: ShellCrumbState;
  activeModuleKey?: string | null;
  activeLabel?: string | null;
  comingSoonLabel?: string | null;
}): ShellCrumb[] {
  const root: ShellCrumb =
    opts.state === "ready" && opts.activeModuleKey !== "overview"
      ? { key: "root", label: "管理后台", href: `${opts.localePrefix}/dashboard` }
      : { key: "root", label: "管理后台" };
  const current: ShellCrumb =
    opts.state === "ready"
      ? { key: "current", label: opts.activeLabel ?? "无可用模块", current: true }
      : opts.state === "coming-soon"
        ? { key: "current", label: opts.comingSoonLabel ?? "即将推出", current: true }
        : opts.state === "forbidden"
          ? { key: "current", label: "没有读取权限", current: true }
          : { key: "current", label: "无可用模块", current: true };
  return [root, current];
}

/** Disabled global entries render as inert text, never as focusable controls. */
export const SHELL_COMING_SOON_FEATURES = ["全局搜索", "工作队列"] as const;
