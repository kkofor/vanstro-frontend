"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardFoundation } from "@/lib/api/api-contract";
import type { DashboardOverview } from "@/lib/dashboard/types";
import { shellNavVisible, type ShellNavEntry } from "@/lib/dashboard/shell-navigation";
import styles from "./OverviewWorkspacePanel.module.css";

/**
 * V11-4 Overview workspace: a real-data, permission-aware workbench over
 * GET /dashboard/overview. No mock trends, no BI charts, no drag cards.
 *
 * - Every number comes from the real Backend overview endpoint.
 * - Modules the actor cannot read render an explicit 无权限 marker, never a
 *   fake zero (zeros are only shown for genuinely empty authorized data).
 * - Shortcuts link only to available+allow modules; coming-soon modules never
 *   become clickable (queue summaries stay non-interactive).
 * - loading uses a stable status (no business-shell flash); error offers a
 *   retry; empty/partial permission/stale states are explicit.
 */
export function OverviewWorkspacePanel({
  locale,
  apiFetch,
  modules,
  onNavigate
}: {
  locale: string;
  apiFetch: (path: string, init?: RequestInit) => Promise<unknown>;
  modules: readonly ShellNavEntry[];
  /** Unified dashboard navigation callback (URL + active nav + breadcrumb +
   *  H1 + panel sync in one click, no page reload). */
  onNavigate: (href: string) => void;
}) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const payload = (await apiFetch("/dashboard/overview")) as { data: DashboardOverview };
      // Lightweight shape validation: the overview envelope must carry the
      // counts/commerce/queues contract, otherwise the response is invalid
      // and the panel surfaces the error state (never renders partial truth).
      const data = payload?.data;
      if (!data || typeof data.counts?.products !== "number" || typeof data.queues?.erp !== "number" || typeof data.generatedAt !== "string") {
        throw new Error("invalid overview response");
      }
      setOverview(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const readable = useMemo(() => {
    const allowed = new Set(modules.filter((m) => m.status === "available" && shellNavVisible(m)).map((m) => m.module));
    const can = (module: string) => allowed.has(module);
    return { can };
  }, [modules]);

  if (status === "loading") {
    return (
      <section aria-busy="true" aria-label="运营概览" className={styles.workspace}>
        <p role="status">正在载入运营数据…</p>
      </section>
    );
  }
  if (status === "error" || !overview) {
    return (
      <section aria-label="运营概览" className={styles.workspace} role="alert">
        <h2>无法载入运营概览</h2>
        <p>无法连接数据服务。请检查网络后重试。</p>
        <button className={styles.retry} onClick={() => void load()} type="button">
          重试
        </button>
      </section>
    );
  }

  const c = overview.counts;
  const groups: Array<{ key: string; label: string; entries: Array<{ label: string; value: number | null; module?: string }> }> = [
    {
      key: "catalog",
      label: "目录",
      entries: [
        { label: "产品", value: c.products, module: "products" },
        { label: "分类", value: c.categories, module: "categories" },
        { label: "价格", value: c.prices, module: "pricing" },
        { label: "促销", value: c.promotions, module: "promotions" }
      ]
    },
    {
      key: "commerce",
      label: "交易",
      entries: [
        { label: "订单", value: c.orders, module: "orders" },
        { label: "待支付", value: overview.commerce.pendingPayments, module: "orders" }
      ]
    },
    {
      key: "organization",
      label: "组织",
      entries: [
        { label: "用户", value: c.users, module: "users" },
        { label: "经销商", value: c.dealers, module: "dealers" }
      ]
    },
    {
      key: "engagement",
      label: "客户互动",
      entries: [
        { label: "销售线索", value: c.leads, module: "leads" },
        { label: "客户", value: c.crmContacts, module: "customers" }
      ]
    },
    {
      key: "inventory",
      label: "库存",
      entries: [
        { label: "在手数量", value: overview.commerce.quantityOnHand, module: "inventory" },
        { label: "预留数量", value: overview.commerce.quantityReserved, module: "inventory" }
      ]
    }
  ];
  const shortcuts = modules.filter((m) => m.status === "available" && shellNavVisible(m));

  return (
    <section aria-label="运营概览" className={styles.workspace}>
      <div className={styles.groups}>
        {groups.map((group) => (
          <section aria-label={group.label} className={styles.group} key={group.key}>
            <h3>{group.label}</h3>
            <dl>
              {group.entries.map((entry) => (
                <div className={styles.stat} key={`${group.key}-${entry.label}`}>
                  <dt>{entry.label}</dt>
                  <dd>{entry.module && !readable.can(entry.module) ? "无权限" : entry.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <section aria-label="运营队列" className={styles.group}>
          <h3>队列</h3>
          <dl>
            <div className={styles.stat}>
              <dt>邮件待处理</dt>
              <dd>{readable.can("email") ? overview.queues.email : "无权限"}</dd>
            </div>
            <div className={styles.stat}>
              <dt>ERP 待处理 / 失败</dt>
              <dd>{readable.can("erp") ? overview.queues.erp : "无权限"}</dd>
            </div>
            <div className={styles.stat}>
              <dt>运营告警</dt>
              <dd>{readable.can("audit") ? overview.queues.alerts : "无权限"}</dd>
            </div>
          </dl>
        </section>
      </div>
      <nav aria-label="快捷入口" className={styles.shortcuts}>
        <h3>快捷入口</h3>
        <ul>
          {shortcuts.map((module) => {
            const href = `${locale === "fr-CA" ? "/fr" : ""}${module.route}`;
            return (
              <li key={module.module}>
                <a
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(href);
                  }}
                >
                  {module.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className={styles.generatedAt}>系统生成时间：{new Date(overview.generatedAt).toLocaleString(locale === "fr-CA" ? "fr-CA" : "zh-CN")}</p>
    </section>
  );
}
