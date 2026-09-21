import { useMemo } from "react";
import type { DashboardCopy } from "../../lib/i18n/dashboard-copy";

export interface ErpApiOverviewPanelProps {
  copy: DashboardCopy;
  apiBaseUrl: string | null;
  className?: string;
}

const ERP_API_ENDPOINTS: Array<{ method: string; path: string; summary: string }> = [
  { method: "GET", path: "/v1/openapi", summary: "OpenAPI 3.0.3 文档（唯一 Contract 生成）" },
  { method: "GET", path: "/v1/products", summary: "产品/SKU 列表（updatedSince/cursor 分页）" },
  { method: "GET", path: "/v1/products/:erpSkuKey", summary: "产品详情" },
  { method: "POST", path: "/v1/products/batch", summary: "批量创建/更新（dry-run/commit，逐项结果）" },
  { method: "POST", path: "/v1/products/unlist", summary: "批量下架（软归档，无物理删除）" },
  { method: "GET", path: "/v1/sync-jobs", summary: "同步任务列表" },
  { method: "GET", path: "/v1/sync-jobs/:id", summary: "同步任务详情" },
  { method: "POST", path: "/v1/sync-jobs/:id/retry", summary: "重试失败任务" },
  { method: "POST", path: "/v1/connection-test", summary: "Service Account 自检" },
  { method: "GET", path: "/v1/webhooks", summary: "Webhook 配置列表" },
  { method: "POST", path: "/v1/webhooks", summary: "创建 Webhook 配置" },
  { method: "DELETE", path: "/v1/webhooks/:id", summary: "删除 Webhook 配置" }
];

export function ErpApiOverviewPanel(props: ErpApiOverviewPanelProps) {
  const baseUrl = props.apiBaseUrl ?? "";
  const openApiUrl = useMemo(() => (baseUrl ? baseUrl.replace(/\/integrations\/erp$/, "/dashboard/erp/openapi") : null), [baseUrl]);
  return (
    <section className={props.className} data-testid="erp-api-overview-panel">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">ERP 集成 API v1</h2>
        <p className="text-sm text-dashboard-muted">机器 Service Account 访问的生产集成接口；OpenAPI 文档由唯一运行时 Contract 生成与验证，无手写第二事实源。</p>
      </div>
      <dl className="mb-4 grid gap-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-dashboard-muted">版本</dt>
          <dd>1.0.0（basePath /api/v1/integrations/erp）</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-dashboard-muted">Base URL</dt>
          <dd className="break-all">{props.apiBaseUrl ? props.apiBaseUrl : "未配置（运行时配置未发布）"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-dashboard-muted">认证</dt>
          <dd>Service Account Bearer token（cli.access）</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-dashboard-muted">幂等</dt>
          <dd>requestHash 使用 AsyncJob 幂等账本；correlationId 绑定任务 requestId</dd>
        </div>
      </dl>
      {openApiUrl ? (
        <p className="mb-4 text-sm">
          OpenAPI 文档（Dashboard 授权代理）：<a className="underline" href={openApiUrl} rel="noreferrer" target="_blank">{openApiUrl}</a>
        </p>
      ) : null}
      <h3 className="mb-2 text-sm font-semibold">端点</h3>
      <table className="w-full border-t text-left text-xs">
        <thead>
          <tr>
            <th className="w-16 py-1">方法</th>
            <th className="py-1">路径</th>
            <th className="py-1">说明</th>
          </tr>
        </thead>
        <tbody>
          {ERP_API_ENDPOINTS.map((endpoint) => (
            <tr className="border-b" key={`${endpoint.method}-${endpoint.path}`}>
              <td className="py-1 font-mono">{endpoint.method}</td>
              <td className="py-1 font-mono">{endpoint.path}</td>
              <td className="py-1 text-dashboard-muted">{endpoint.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
