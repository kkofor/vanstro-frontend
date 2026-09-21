"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DASHBOARD_API_ENDPOINTS } from "@/lib/api/dashboard-contract";
import { dashboardHref } from "@/lib/dashboard/routes";
import { formatDate } from "@/lib/dashboard/format";
import type { DashboardCopy } from "@/lib/i18n/dashboard-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { DashboardDataRequestError } from "./hooks/useDashboardData";
import { PanelHeader } from "./shared/primitives";

type ApiFetch = <T>(path: string, init?: RequestInit & { allowWrite?: boolean }) => Promise<T>;

// V11-R1 P0-5: the formal "从 ERP 同步商品" dashboard surface replaces the
// removed manual JSON batch-import UI. Every request reuses the existing
// dashboard ERP endpoints (connection self-test, catalog sync run ledger and
// sync trigger); no second sync system exists and the idempotency key is
// system-managed.
export interface ErpConnectionState {
  configured: boolean;
  maskedUrl: string;
  lastTestedAt: string;
  status: number;
  reachable: boolean;
}

export interface CatalogSyncRun {
  id: string;
  status: string;
  source: string;
  productsUpserted: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ErpCatalogSyncResult {
  imported: number;
  updated: number;
  skipped: number;
  categoriesImported: number;
  categoriesUpdated: number;
  errors: string[];
  finishedAt: string;
  syncRunId?: string;
}

const SYNC_SCOPE_ITEMS = [
  "scopeProducts",
  "scopeCategories",
  "scopeSpecifications",
  "scopeOptions",
  "scopeSkus",
  "scopeStatus",
  "scopeMappings",
  "scopePricesInventory"
] as const;

export function ErpSyncProductsPanel(props: {
  readOnly?: boolean;
  canEdit?: boolean;
  copy: DashboardCopy;
  locale: SiteLocale;
  apiFetch: ApiFetch;
  className?: string;
  onReload: () => Promise<void>;
}) {
  const [connection, setConnection] = useState<ErpConnectionState | null>(null);
  const [connectionUnavailable, setConnectionUnavailable] = useState(false);
  const [latestRun, setLatestRun] = useState<CatalogSyncRun | null>(null);
  const [runUnavailable, setRunUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ErpCatalogSyncResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const payload = await props.apiFetch<{ data?: ErpConnectionState }>(DASHBOARD_API_ENDPOINTS.erpConnectionTest, {
        method: "POST",
        allowWrite: true
      });
      setConnection(payload?.data ?? null);
      setConnectionUnavailable(false);
    } catch {
      setConnection(null);
      setConnectionUnavailable(true);
    }
    try {
      const payload = await props.apiFetch<{ data?: CatalogSyncRun | null }>(DASHBOARD_API_ENDPOINTS.catalogSyncLatest);
      setLatestRun(payload?.data ?? null);
      setRunUnavailable(false);
    } catch {
      setLatestRun(null);
      setRunUnavailable(true);
    }
  }, [props.apiFetch]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const canSync = Boolean(props.canEdit) && !props.readOnly;

  const startSync = useCallback(async () => {
    if (!canSync || busy) return;
    setBusy(true);
    setActionError(null);
    setResult(null);
    try {
      const payload = await props.apiFetch<{ data?: ErpCatalogSyncResult }>(DASHBOARD_API_ENDPOINTS.catalogSyncFromErp, {
        method: "POST",
        allowWrite: true,
        body: JSON.stringify({ syncCategories: true })
      });
      setResult(payload?.data ?? null);
      await loadStatus();
      await props.onReload();
    } catch (error) {
      if (error instanceof DashboardDataRequestError && error.status === 409) {
        setActionError(props.copy.erpSync.alreadyRunning);
      } else {
        setActionError(props.copy.erpSync.startFailed);
      }
    } finally {
      setBusy(false);
    }
  }, [canSync, busy, props.apiFetch, props.copy.erpSync.alreadyRunning, props.copy.erpSync.startFailed, props.onReload, loadStatus]);

  const runStatusLabel = latestRun == null
    ? props.copy.erpSync.neverSynced
    : latestRun.status === "succeeded"
      ? props.copy.erpSync.succeeded
      : latestRun.status === "running"
        ? props.copy.erpSync.running
        : props.copy.erpSync.failed;

  return (
    <section className={props.className} data-testid="erp-sync-products-panel">
      <PanelHeader title={props.copy.erpSync.title} copy={props.copy.erpSync.copy} />
      <section className="dashboard-card erp-sync-connection-card" data-testid="erp-sync-connection" aria-label={props.copy.erpSync.connectionTitle}>
        <h3>{props.copy.erpSync.connectionTitle}</h3>
        {connectionUnavailable ? (
          <p>{props.copy.erpSync.connectionUnavailable}</p>
        ) : connection == null ? (
          <p>{props.copy.erpSync.connectionNotConfigured}</p>
        ) : (
          <dl className="erp-sync-detail">
            <div><dt>{props.copy.erpSync.maskedUrl}</dt><dd className="break-all">{connection.maskedUrl}</dd></div>
            <div><dt>{props.copy.erpSync.health}</dt><dd>{connection.reachable ? props.copy.erpSync.healthReachable : props.copy.erpSync.healthUnreachable}</dd></div>
            <div><dt>{props.copy.erpSync.lastTested}</dt><dd>{formatDate(connection.lastTestedAt, props.locale)}</dd></div>
          </dl>
        )}
      </section>
      <section className="dashboard-card erp-sync-last-run-card" data-testid="erp-sync-last-run" aria-label={props.copy.erpSync.lastSyncTitle}>
        <h3>{props.copy.erpSync.lastSyncTitle}</h3>
        {runUnavailable ? (
          <p>{props.copy.erpSync.runUnavailable}</p>
        ) : latestRun == null ? (
          <p>{props.copy.erpSync.neverSynced}</p>
        ) : (
          <dl className="erp-sync-detail">
            <div><dt>{props.copy.common.status}</dt><dd>{runStatusLabel}</dd></div>
            <div><dt>{props.copy.erpSync.startedAt}</dt><dd>{formatDate(latestRun.startedAt, props.locale)}</dd></div>
            <div><dt>{props.copy.erpSync.finishedAt}</dt><dd>{latestRun.finishedAt ? formatDate(latestRun.finishedAt, props.locale) : "-"}</dd></div>
            <div><dt>{props.copy.erpSync.productsUpserted}</dt><dd>{latestRun.productsUpserted}</dd></div>
            {latestRun.error ? <div><dt>{props.copy.erpSync.runError}</dt><dd>{latestRun.error}</dd></div> : null}
          </dl>
        )}
      </section>
      <section className="dashboard-card erp-sync-preview-card" data-testid="erp-sync-preview" aria-label={props.copy.erpSync.previewTitle}>
        <h3>{props.copy.erpSync.previewTitle}</h3>
        <p>{props.copy.erpSync.previewCopy}</p>
        <ul className="erp-sync-scope-list">
          {SYNC_SCOPE_ITEMS.map((key) => (
            <li key={key}>{props.copy.erpSync[key]}</li>
          ))}
        </ul>
        <p className="erp-sync-awaiting" data-testid="erp-sync-awaiting-integration">{props.copy.erpSync.awaitingIntegration}</p>
      </section>
      <section className="dashboard-card erp-sync-controls-card" data-testid="erp-sync-controls" aria-label={props.copy.erpSync.start}>
        {canSync ? (
          <button
            className="button button-secondary"
            data-testid="erp-sync-start"
            disabled={busy || latestRun?.status === "running"}
            type="button"
            onClick={() => void startSync()}
          >
            {busy ? props.copy.erpSync.syncing : latestRun?.status === "failed" ? props.copy.erpSync.retryLastSync : props.copy.erpSync.start}
          </button>
        ) : null}
        <Link className="button button-secondary" href={dashboardHref("erpSyncJobs", props.locale)}>
          {props.copy.erpSync.jobsLink}
        </Link>
      </section>
      {busy ? (
        <section aria-busy="true" className="dashboard-card erp-sync-progress-card" data-testid="erp-sync-progress" role="status">
          <h3>{props.copy.erpSync.syncing}</h3>
          <p>{props.copy.erpSync.progressCopy}</p>
        </section>
      ) : null}
      {actionError ? (
        <section className="dashboard-card erp-sync-error-card" data-testid="erp-sync-action-error" role="alert">
          {actionError}
        </section>
      ) : null}
      {result ? (
        <section className="dashboard-card erp-sync-result-card" data-testid="erp-sync-result">
          <h3>{props.copy.erpSync.resultTitle}</h3>
          <p>{props.copy.messages.catalogSynced}</p>
          <dl className="erp-sync-stats">
            <div><dt>{props.copy.erpSync.imported}</dt><dd>{result.imported}</dd></div>
            <div><dt>{props.copy.erpSync.updated}</dt><dd>{result.updated}</dd></div>
            <div><dt>{props.copy.erpSync.skipped}</dt><dd>{result.skipped}</dd></div>
            <div><dt>{props.copy.erpSync.failedCount}</dt><dd>{result.errors.length}</dd></div>
            <div><dt>{props.copy.erpSync.categoriesImported}</dt><dd>{result.categoriesImported}</dd></div>
            <div><dt>{props.copy.erpSync.categoriesUpdated}</dt><dd>{result.categoriesUpdated}</dd></div>
          </dl>
          <p className="erp-sync-conflict-note">{props.copy.erpSync.conflictNote}</p>
          {result.errors.length ? (
            <div className="erp-sync-failure-reasons" data-testid="erp-sync-failure-reasons">
              <h4>{props.copy.erpSync.failureReasons}</h4>
              <ul>
                {result.errors.map((reason, index) => (
                  <li key={`${index}-${reason}`}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            className="button button-secondary"
            data-testid="erp-sync-view-products"
            type="button"
            onClick={() => void props.onReload()}
          >
            {props.copy.erpSync.viewProducts}
          </button>
        </section>
      ) : null}
    </section>
  );
}
