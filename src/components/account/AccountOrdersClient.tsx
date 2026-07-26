"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountShell } from "@/components/account/AccountShell";
import { vanstroApi } from "@/lib/api/api-client";
import type { AccountOrder } from "@/lib/api/api-contract";
import { formatMoney } from "@/lib/commerce/product-commerce";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

export function AccountOrdersClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const [orders, setOrders] = useState<AccountOrder[] | null>(null);

  useEffect(() => {
    void vanstroApi.getAccountOrders()
      .then((response) => setOrders(response.data))
      .catch(() => setOrders([]));
  }, []);

  return (
    <AccountShell active="orders" locale={locale}>
      <div className="form-panel">
        <h3>{copy.account.orders}</h3>
        {orders === null ? <p>{copy.account.loading}</p> : null}
        {orders && orders.length === 0 ? <p>{copy.account.noOrders}</p> : null}
        {orders && orders.length > 0 ? (
          <ul className="account-summary-list">
            {orders.map((order) => {
              const statusLabel =
                copy.order.statusLabels[order.status as keyof typeof copy.order.statusLabels] ?? order.status;
              const fulfillmentLabel =
                copy.order.fulfillment[order.fulfillment as keyof typeof copy.order.fulfillment] ?? order.fulfillment;
              return (
                <li key={order.id}>
                  <strong>{order.id}</strong>
                  <p>
                    {new Date(order.createdAt).toLocaleString(locale)}
                    {" — "}
                    <span className="status-badge">{statusLabel}</span>
                    {" — "}
                    {fulfillmentLabel}
                    {" — "}
                    {formatMoney(order.total, locale)}
                  </p>
                  {order.shipment?.trackingNumber ? (
                    <p className="product-meta">
                      {copy.order.trackingNumber}: {order.shipment.trackingNumber}
                      {" — "}
                      {copy.order.statusLabels[order.shipment.status as keyof typeof copy.order.statusLabels] ??
                        order.shipment.status}
                    </p>
                  ) : null}
                  <Link className="section-link" href={localeHref(`/orders/${order.id}`, locale)}>
                    {copy.account.viewOrder}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </AccountShell>
  );
}
