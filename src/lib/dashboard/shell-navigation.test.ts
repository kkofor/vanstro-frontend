import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DASHBOARD_FOUNDATION_MODULE_STATE } from "../api/api-contract.ts";
import {
  SHELL_COMING_SOON_FEATURES,
  SHELL_NAV_GROUP_LABELS,
  SHELL_NAV_GROUP_ORDER,
  shellBreadcrumbModel,
  shellNavGroups,
  shellNavVisible
} from "./shell-navigation.ts";

// Shared module matrix: 11 available + 11 coming-soon across six groups.
test("module matrix keeps 11 available + 11 coming-soon in six groups", () => {
  const modules = [...DASHBOARD_FOUNDATION_MODULE_STATE];
  assert.equal(modules.filter((m) => m.status === "available").length, 11);
  assert.equal(modules.filter((m) => m.status === "coming_soon").length, 11);
  assert.deepEqual([...new Set(modules.map((m) => m.group))].sort(), [...SHELL_NAV_GROUP_ORDER].sort());
});

test("six nav groups render in the closed order with fixed labels", () => {
  const groups = shellNavGroups(DASHBOARD_FOUNDATION_MODULE_STATE);
  assert.deepEqual(groups.map((g) => g.key), [...SHELL_NAV_GROUP_ORDER]);
  for (const group of groups) {
    assert.equal(SHELL_NAV_GROUP_LABELS[group.key], group.label);
  }
  assert.equal(groups.length, 6);
  // every module lands in exactly one group
  const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
  assert.equal(total, 22);
});

test("nav visibility: coming-soon always visible; denied available hidden", () => {
  const comingSoon = { module: "x", label: "X", group: "platform", status: "coming_soon" as const, route: "/dashboard/x" };
  const allowed = { module: "y", label: "Y", group: "platform", status: "available" as const, route: "/dashboard/y", readAllowed: true };
  const denied = { ...allowed, module: "z", label: "Z", readAllowed: false };
  assert.equal(shellNavVisible(comingSoon), true);
  assert.equal(shellNavVisible(allowed), true);
  assert.equal(shellNavVisible(denied), false);
});

test("breadcrumb: ready non-overview links the first level to locale Overview", () => {
  const crumbs = shellBreadcrumbModel({ localePrefix: "", state: "ready", activeModuleKey: "orders", activeLabel: "订单" });
  assert.deepEqual(crumbs, [
    { key: "root", label: "管理后台", href: "/dashboard" },
    { key: "current", label: "订单", current: true }
  ]);
});

test("breadcrumb: fr locale prefix applies to the Overview link", () => {
  const crumbs = shellBreadcrumbModel({ localePrefix: "/fr", state: "ready", activeModuleKey: "products", activeLabel: "产品" });
  assert.equal(crumbs[0].href, "/fr/dashboard");
});

test("breadcrumb: Overview page never duplicates the current page link", () => {
  const crumbs = shellBreadcrumbModel({ localePrefix: "", state: "ready", activeModuleKey: "overview", activeLabel: "工作台" });
  assert.equal(crumbs[0].href, undefined);
  assert.equal(crumbs[1].label, "工作台");
  assert.equal(crumbs[1].current, true);
});

test("breadcrumb: coming-soon / forbidden / unknown use accurate labels", () => {
  const comingSoon = shellBreadcrumbModel({ localePrefix: "", state: "coming-soon", comingSoonLabel: "支付" });
  assert.equal(comingSoon[0].href, undefined);
  assert.equal(comingSoon[1].label, "支付");
  const forbidden = shellBreadcrumbModel({ localePrefix: "", state: "forbidden" });
  assert.equal(forbidden[1].label, "没有读取权限");
  const unknown = shellBreadcrumbModel({ localePrefix: "", state: "unknown" });
  assert.equal(unknown[1].label, "无可用模块");
});

test("coming-soon global entries are inert text, never controls", async () => {
  assert.deepEqual([...SHELL_COMING_SOON_FEATURES], ["全局搜索", "工作队列"]);
  const source = await readFile(new URL("../../components/dashboard/ShellNavigation.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /<button[^>]*disabled[^>]*>全局搜索/);
  assert.doesNotMatch(source, /<button[^>]*disabled[^>]*>工作队列/);
});
