"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountShell } from "@/components/account/AccountShell";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { vanstroApi } from "@/lib/api/api-client";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

export function AccountOverviewClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const { favoriteCount } = useStorefront();
  const [orderCount, setOrderCount] = useState<number | null>(null);

  useEffect(() => {
    void vanstroApi.getAccountOrders()
      .then((response) => setOrderCount(response.data.length))
      .catch(() => setOrderCount(0));
  }, []);

  return (
    <AccountShell active="overview" locale={locale}>
      <div className="form-panel">
        <h3>{copy.account.overview}</h3>
        <p>{copy.account.intro}</p>
        <ul className="account-summary-list">
          <li>
            <Link href={localeHref("/account/orders", locale)}>
              {orderCount === null ? copy.account.loading : copy.account.orderCount(orderCount)}
            </Link>
          </li>
          <li>
            <Link href={localeHref("/favorites", locale)}>{copy.account.favoriteCount(favoriteCount)}</Link>
          </li>
          <li>
            <Link href={localeHref("/account/profile", locale)}>{copy.account.profile}</Link>
          </li>
          <li>
            <Link href={localeHref("/account/addresses", locale)}>{copy.account.addresses}</Link>
          </li>
        </ul>
      </div>
    </AccountShell>
  );
}
