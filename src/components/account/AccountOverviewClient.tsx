"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Headphones,
  Heart,
  MapPin,
  PackageCheck,
  Phone,
  UserRound
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccountShell } from "@/components/account/AccountShell";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { vanstroApi } from "@/lib/api/api-client";
import type { AccountOrder, CustomerAccount, CustomerAddress } from "@/lib/api/api-contract";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getAccountCopy } from "@/lib/i18n/account-copy";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

type OverviewState =
  | { status: "loading" }
  | {
      status: "success";
      profile: CustomerAccount;
      addresses: CustomerAddress[];
      orders: AccountOrder[];
      orderTotal: number;
    }
  | { status: "error" };

export function AccountOverviewClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const accountCopy = getAccountCopy(locale);
  const { favoriteCount } = useStorefront();
  const session = useCustomerSession();
  const [state, setState] = useState<OverviewState>({ status: "loading" });
  const requestGeneration = useRef(0);

  const loadOverview = useCallback(() => {
    const generation = ++requestGeneration.current;
    setState({ status: "loading" });
    void Promise.all([
      vanstroApi.getAccountMe(),
      vanstroApi.getAccountAddresses(),
      vanstroApi.getAccountOrders({ page: 1, pageSize: 3 })
    ])
      .then(([profileResponse, addressResponse, orderResponse]) => {
        if (generation !== requestGeneration.current) return;
        setState({
          status: "success",
          profile: profileResponse.data,
          addresses: addressResponse.data,
          orders: orderResponse.data,
          orderTotal: orderResponse.meta?.total ?? orderResponse.data.length
        });
      })
      .catch(() => {
        if (generation === requestGeneration.current) setState({ status: "error" });
      });
  }, []);

  useEffect(() => {
    if (session.status !== "authenticated" || !session.user?.id) {
      requestGeneration.current += 1;
      setState({ status: "loading" });
      return;
    }
    loadOverview();
    return () => {
      requestGeneration.current += 1;
    };
  }, [loadOverview, session.status, session.user?.id]);

  const profile = state.status === "success" ? state.profile : undefined;
  const defaultAddress = state.status === "success"
    ? state.addresses.find((address) => address.isDefault)
    : undefined;
  const latestOrder = state.status === "success" ? state.orders[0] : undefined;
  const profileReady = Boolean(profile?.firstName?.trim() && profile.lastName?.trim() && profile.phone?.trim());
  const modules = [
    {
      href: "/account/orders",
      title: copy.account.orders,
      body: copy.account.overviewOrders,
      value: state.status === "success" ? copy.account.orderCount(state.orderTotal) : undefined,
      icon: BookOpenCheck
    },
    {
      href: "/account/favorites",
      title: copy.account.favorites,
      body: copy.account.overviewFavorites,
      value: copy.account.favoriteCount(favoriteCount),
      icon: Heart
    }
  ];

  return (
    <AccountShell active="overview" locale={locale}>
      <header className="account-section-heading account-section-heading-rich">
        <div>
          <h2>{accountCopy.overview.title}</h2>
          <p>{accountCopy.overview.intro}</p>
        </div>
      </header>

      {state.status === "error" ? (
        <div className="account-inline-status" role="status">
          <span>{copy.account.loadErrorBody}</span>
          <button type="button" onClick={loadOverview}>{copy.account.retry}</button>
        </div>
      ) : null}

      {state.status === "success" ? <div className="account-readiness-grid" aria-label={accountCopy.overview.title}>
        <Link href={localeHref("/account/profile", locale)}>
          <span className="account-readiness-icon"><Phone size={20} aria-hidden="true" /></span>
          <span>
            <strong>{profileReady ? accountCopy.overview.profileReady : accountCopy.overview.profileIncomplete}</strong>
            <small>{profileReady ? accountCopy.overview.profileBodyReady : accountCopy.overview.profileBodyIncomplete}</small>
          </span>
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link href={localeHref("/account/addresses", locale)}>
          <span className="account-readiness-icon"><MapPin size={20} aria-hidden="true" /></span>
          <span>
            <strong>{defaultAddress ? accountCopy.overview.addressReady : accountCopy.overview.addressMissing}</strong>
            <small>{defaultAddress
              ? `${defaultAddress.addressLine1}, ${defaultAddress.city}, ${defaultAddress.province} ${defaultAddress.postalCode}`
              : accountCopy.overview.addressMissingBody}</small>
          </span>
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div> : null}

      <section className="account-activity" aria-labelledby="account-activity-title">
        <header>
          <div>
            <h3 id="account-activity-title">{accountCopy.overview.activityTitle}</h3>
            <p>{accountCopy.overview.activityBody}</p>
          </div>
          <Link href={localeHref("/account/orders", locale)}>{copy.account.orders}<ArrowRight size={16} aria-hidden="true" /></Link>
        </header>
        {state.status === "loading" ? (
          <div className="account-activity-loading" role="status" aria-live="polite">
            <span className="visually-hidden">{copy.account.loading}</span>
            <span className="account-activity-placeholder" aria-hidden="true" />
          </div>
        ) : null}
        {state.status === "success" && latestOrder ? (
          <Link className="account-latest-order" href={localeHref("/account/orders", locale)}>
            <PackageCheck size={22} aria-hidden="true" />
            <span>
              <strong>{latestOrder.items[0]?.productName ?? copy.order.order}</strong>
              <small>{new Date(latestOrder.createdAt).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })} · {copy.order.statusLabels[latestOrder.status as keyof typeof copy.order.statusLabels] ?? accountCopy.orders.updatePending}</small>
            </span>
            <em>{latestOrder.id}</em>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ) : null}
        {state.status === "success" && !latestOrder ? <p className="account-activity-empty">{accountCopy.overview.noActivity}</p> : null}
      </section>

      <div className="account-module-list account-module-list-compact">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link href={localeHref(module.href, locale)} key={module.href}>
              <Icon size={22} strokeWidth={2} aria-hidden="true" />
              <span><strong>{module.title}</strong><small>{module.body}</small></span>
              {module.value ? <em>{module.value}</em> : null}
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </Link>
          );
        })}
      </div>

      <aside className="account-support-panel">
        <Headphones size={24} aria-hidden="true" />
        <div><h3>{accountCopy.overview.supportTitle}</h3><p>{accountCopy.overview.supportBody}</p></div>
        <div>
          <Link href={localeHref("/contact", locale)}>{accountCopy.overview.contactSupport}</Link>
          <Link href={localeHref("/orders/lookup", locale)}>{accountCopy.overview.trackOrder}</Link>
        </div>
      </aside>
    </AccountShell>
  );
}
