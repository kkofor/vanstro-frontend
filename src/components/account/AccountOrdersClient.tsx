"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, PackageCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccountShell } from "@/components/account/AccountShell";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { CommercePageSkeleton, CommerceStatePanel } from "@/components/ui/CommerceStatePanel";
import { vanstroApi } from "@/lib/api/api-client";
import type { AccountOrder } from "@/lib/api/api-contract";
import { formatMoney } from "@/lib/commerce/product-commerce";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getAccountCopy } from "@/lib/i18n/account-copy";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";
import { handleCanonicalCatalogClick } from "@/lib/i18n/canonical-catalog";

const PAGE_SIZE = 10;

export function AccountOrdersClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const accountCopy = getAccountCopy(locale);
  const numberFormatter = new Intl.NumberFormat(locale);
  const session = useCustomerSession();
  const requestGeneration = useRef(0);
  const loadedUserId = useRef<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "success"; orders: AccountOrder[]; total: number; totalPages: number; refreshing?: boolean }
    | { status: "error" }
  >({ status: "loading" });

  const loadOrders = useCallback(() => {
    const generation = ++requestGeneration.current;
    setState((current) => current.status === "success" ? { ...current, refreshing: true } : { status: "loading" });
    void vanstroApi.getAccountOrders({ page, pageSize: PAGE_SIZE })
      .then((response) => {
        if (generation !== requestGeneration.current) return;
        const total = response.meta?.total ?? response.data.length;
        const totalPages = response.meta?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (total > 0 && response.data.length === 0 && page > totalPages) {
          setPage(totalPages);
          return;
        }
        setState({ status: "success", orders: response.data, total, totalPages });
      })
      .catch(() => {
        if (generation === requestGeneration.current) setState({ status: "error" });
      });
  }, [page]);

  useEffect(() => {
    if (session.status !== "authenticated" || !session.user?.id) {
      requestGeneration.current += 1;
      loadedUserId.current = undefined;
      setPage(1);
      setState({ status: "loading" });
      return;
    }
    if (loadedUserId.current !== session.user.id) {
      loadedUserId.current = session.user.id;
      if (page !== 1) {
        requestGeneration.current += 1;
        setState({ status: "loading" });
        setPage(1);
        return;
      }
    }
    loadOrders();
    return () => {
      requestGeneration.current += 1;
    };
  }, [loadOrders, session.status, session.user?.id]);

  return (
    <AccountShell active="orders" locale={locale}>
      <header className="account-section-heading account-section-heading-rich">
        <div><h2>{accountCopy.orders.title}</h2><p>{accountCopy.orders.intro}</p></div>
        {state.status === "success" && state.orders.length > 0 ? <span className="account-count-badge">{accountCopy.orders.showing((page - 1) * PAGE_SIZE + 1, (page - 1) * PAGE_SIZE + state.orders.length, state.total)}</span> : null}
      </header>

      {state.status === "loading" ? <CommercePageSkeleton rows={3} label={copy.account.loading} /> : null}
      {state.status === "error" ? <CommerceStatePanel tone="error" title={copy.account.loadErrorTitle} body={copy.account.loadErrorBody} actions={<button className="button button-primary" type="button" onClick={loadOrders}>{copy.account.retry}</button>} /> : null}
      {state.status === "success" && state.orders.length === 0 ? <CommerceStatePanel title={copy.account.ordersEmptyTitle} body={copy.account.ordersEmptyBody} actions={<Link className="button button-primary" href={canonicalCatalogUrl(locale)} prefetch={false} onClick={handleCanonicalCatalogClick(locale)}>{copy.common.shopProducts}</Link>} /> : null}
      {state.status === "success" && state.orders.length > 0 ? (
        <>
          <div className="order-list" aria-busy={state.refreshing}>
            {state.orders.map((order) => {
              const statusLabel = copy.order.statusLabels[order.status as keyof typeof copy.order.statusLabels] ?? (locale === "fr-CA" ? "État non disponible" : "Status unavailable");
              const fulfillmentLabel = copy.order.fulfillment[order.fulfillment as keyof typeof copy.order.fulfillment] ?? (locale === "fr-CA" ? "Détails non disponibles" : "Details unavailable");
              const firstItem = order.items[0];
              const updateDate = order.shipment?.updatedAt ?? order.statusEvents?.at(-1)?.createdAt ?? order.createdAt;
              return (
                <article className="order-card" key={order.id}>
                  <header>
                    <div className="order-card-id"><PackageCheck size={21} strokeWidth={2} aria-hidden="true" /><span><small>{copy.order.order}</small><strong>{order.id}</strong></span></div>
                    <span className={`status-badge status-${order.status}`}>{statusLabel}</span>
                  </header>
                  <div className="order-card-product-summary">
                    <strong>{firstItem?.productName ?? copy.common.items}</strong>
                    {order.items.length > 1 ? <span>{accountCopy.orders.moreItems(order.items.length - 1)}</span> : null}
                    {firstItem?.skuCode ? <small>{copy.order.sku}: {firstItem.skuCode}</small> : null}
                  </div>
                  <dl className="order-card-facts">
                    <div><dt>{copy.order.placedOn}</dt><dd>{new Date(order.createdAt).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}</dd></div>
                    <div><dt>{copy.order.fulfillmentDetails}</dt><dd>{fulfillmentLabel}</dd></div>
                    <div><dt>{copy.common.total}</dt><dd>{formatMoney(order.total, locale)}</dd></div>
                  </dl>
                  <div className="order-card-context">
                    <span><strong>{accountCopy.orders.latestUpdate}</strong>{new Date(updateDate).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}</span>
                  </div>
                  <Link className="order-card-link" href={`${localeHref("/orders/lookup", locale)}?order=${encodeURIComponent(order.id)}`}>{copy.account.viewOrder}<ArrowUpRight size={17} strokeWidth={2} aria-hidden="true" /></Link>
                </article>
              );
            })}
          </div>
          {state.totalPages > 1 ? (
            <nav className="account-pagination" aria-label={copy.account.orders}>
              <button type="button" disabled={page <= 1 || state.refreshing} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={17} aria-hidden="true" />{locale === "fr-CA" ? "Précédent" : "Previous"}</button>
              <span role="status" aria-live="polite" aria-atomic="true">{locale === "fr-CA" ? `Page ${numberFormatter.format(page)} sur ${numberFormatter.format(state.totalPages)}` : `Page ${numberFormatter.format(page)} of ${numberFormatter.format(state.totalPages)}`}</span>
              <button type="button" disabled={page >= state.totalPages || state.refreshing} onClick={() => setPage((current) => current + 1)}>{locale === "fr-CA" ? "Suivant" : "Next"}<ChevronRight size={17} aria-hidden="true" /></button>
            </nav>
          ) : null}
        </>
      ) : null}
    </AccountShell>
  );
}
