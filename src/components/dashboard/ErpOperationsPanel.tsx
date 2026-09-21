import { useCallback, useEffect, useState } from "react";
import type { DashboardCopy } from "../../lib/i18n/dashboard-copy";

export type BatchApiFetch = <T,>(path: string, init?: RequestInit) => Promise<T>;

export interface ErpOperationsPanelProps {
  copy: DashboardCopy;
  apiFetch: BatchApiFetch;
  className?: string;
}

interface WebhookSummary {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastStatus: string | null;
  lastAttemptAt: string | null;
  retryCount: number;
}

interface ConnectionTestResult {
  configured: boolean;
  maskedUrl: string;
  lastTestedAt: string;
  status: number;
  reachable: boolean;
}

export function ErpOperationsPanel(props: ErpOperationsPanelProps) {
  const [webhooks, setWebhooks] = useState<WebhookSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("");
  const [secret, setSecret] = useState("");
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [connection, setConnection] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const payload = await props.apiFetch<{ data?: { items: WebhookSummary[] } }>("/dashboard/erp/webhooks");
      setWebhooks(payload?.data?.items ?? []);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, [props]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    setCreating(true);
    setOneTimeSecret(null);
    try {
      const payload = await props.apiFetch<{ data?: { id: string; url: string; events: string[]; active: boolean; secret: string } }>("/dashboard/erp/webhooks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), events: events.split(",").map((entry) => entry.trim()).filter(Boolean), secret }),
        allowWrite: true
      } as RequestInit & { allowWrite: boolean });
      if (payload?.data?.secret) setOneTimeSecret(payload.data.secret);
      setUrl("");
      setEvents("");
      setSecret("");
      await load();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setCreating(false);
    }
  }, [props, url, events, secret, load]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await props.apiFetch(`/dashboard/erp/webhooks/${id}`, { method: "DELETE", allowWrite: true } as RequestInit & { allowWrite: boolean });
        await load();
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : String(error));
      }
    },
    [props, load]
  );

  const testConnection = useCallback(async () => {
    setTesting(true);
    try {
      const payload = await props.apiFetch<{ data?: ConnectionTestResult }>("/dashboard/erp/connection-test", { method: "POST", allowWrite: true } as RequestInit & { allowWrite: boolean });
      setConnection(payload?.data ?? null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setTesting(false);
    }
  }, [props]);

  return (
    <section className={props.className} data-testid="erp-operations-panel">
      <h2 className="mb-3 text-lg font-semibold">ERP 运营</h2>
      {loadError ? <p className="mb-3 text-sm text-dashboard-danger">{loadError}</p> : null}
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-semibold">连接测试</h3>
        <button className="rounded bg-dashboard-accent px-3 py-1.5 text-sm text-white disabled:opacity-50" disabled={testing} onClick={() => void testConnection()}>
          {testing ? "测试中…" : "测试 ERP API 连通性"}
        </button>
        {connection ? (
          <dl className="mt-2 grid gap-1 text-xs text-dashboard-muted">
            <div className="flex gap-2"><dt className="w-24">已配置</dt><dd>{connection.configured ? "是" : "否"}</dd></div>
            <div className="flex gap-2"><dt className="w-24">Base URL</dt><dd className="break-all">{connection.maskedUrl}</dd></div>
            <div className="flex gap-2"><dt className="w-24">状态</dt><dd>{connection.status} {connection.reachable ? "（可达）" : "（不可达）"}</dd></div>
            <div className="flex gap-2"><dt className="w-24">测试时间</dt><dd>{connection.lastTestedAt}</dd></div>
          </dl>
        ) : null}
      </div>
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-semibold">Webhook 配置</h3>
        <div className="mb-2 grid gap-2 text-sm">
          <input className="rounded border px-2 py-1" placeholder="https://…/erp-hook" value={url} onChange={(event) => setUrl(event.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="事件（逗号分隔）：sync.completed,sync.failed" value={events} onChange={(event) => setEvents(event.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="签名密钥（至少 16 字符，仅显示一次）" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} />
          <button className="rounded bg-dashboard-accent px-3 py-1.5 text-sm text-white disabled:opacity-50" disabled={creating || !url || !events || secret.length < 16} onClick={() => void create()}>
            {creating ? "创建中…" : "创建 Webhook"}
          </button>
        </div>
        {oneTimeSecret ? (
          <p className="mb-2 rounded border border-dashboard-warning p-2 text-xs" data-testid="one-time-secret">
            一次性密钥（请立即保存，不再显示）：<code className="break-all">{oneTimeSecret}</code>
          </p>
        ) : null}
        {webhooks && webhooks.length > 0 ? (
          <table className="w-full border-t text-left text-xs">
            <thead>
              <tr><th className="py-1">URL</th><th className="py-1">事件</th><th className="py-1">状态</th><th className="py-1">重试</th><th className="py-1">操作</th></tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr className="border-b" key={webhook.id}>
                  <td className="max-w-48 truncate py-1">{webhook.url}</td>
                  <td className="py-1">{webhook.events.join(", ")}</td>
                  <td className="py-1">{webhook.active ? "启用" : "停用"} {webhook.lastStatus ? `（上次 ${webhook.lastStatus}）` : ""}</td>
                  <td className="py-1">{webhook.retryCount}</td>
                  <td className="py-1"><button className="text-dashboard-danger" onClick={() => void remove(webhook.id)} type="button">删除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-dashboard-muted">暂无 Webhook 配置。</p>
        )}
      </div>
      <p className="text-xs text-dashboard-muted">
        速率限制：机器端点按 Service Account 限流；超限返回 429 与 Retry-After 头。调用日志见审计面板（action dashboard.erp.webhook.*）。
      </p>
    </section>
  );
}
