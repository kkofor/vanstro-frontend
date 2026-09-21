"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpenCheck,
  Heart,
  LayoutDashboard,
  MapPin,
  UserRound
} from "lucide-react";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { CommercePageSkeleton, CommerceStatePanel } from "@/components/ui/CommerceStatePanel";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

const links = [
  { href: "/account", key: "overview" as const, icon: LayoutDashboard },
  { href: "/account/profile", key: "profile" as const, icon: UserRound },
  { href: "/account/addresses", key: "addresses" as const, icon: MapPin },
  { href: "/account/orders", key: "orders" as const, icon: BookOpenCheck },
  { href: "/account/favorites", key: "favorites" as const, icon: Heart }
];

export function AccountShell({
  children,
  locale: explicitLocale,
  active
}: {
  children: ReactNode;
  locale?: SiteLocale;
  active: (typeof links)[number]["key"];
}) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const session = useCustomerSession();

  if (session.status === "loading") {
    return <CommercePageSkeleton rows={2} label={copy.account.loading} />;
  }

  if (session.status === "error") {
    return (
      <CommerceStatePanel
        tone="error"
        title={copy.account.sessionErrorTitle}
        body={copy.account.sessionErrorBody}
        actions={(
          <button className="button button-primary" type="button" onClick={session.retry}>
            {copy.account.retry}
          </button>
        )}
      />
    );
  }

  if (session.status !== "authenticated") {
    return (
      <CommerceStatePanel
        title={copy.account.signInRequiredTitle}
        body={copy.account.signInRequiredBody}
        actions={(
          <>
            <Link className="button button-primary" href={localeHref("/account/login", locale)}>
              {copy.auth.signIn}
            </Link>
            <Link className="button button-secondary" href={localeHref("/account/register", locale)}>
              {copy.auth.createAccount}
            </Link>
          </>
        )}
      />
    );
  }

  return (
    <div className="account-layout">
      <aside className="account-sidebar">
        <div className="account-identity">
          <span aria-hidden="true">{session.user?.firstName?.[0] ?? session.user?.email[0]}</span>
          <div>
            <strong>{session.user?.firstName || copy.account.title}</strong>
            <small>{session.user?.email}</small>
          </div>
        </div>
        <nav aria-label={copy.account.title}>
          <ul className="account-nav">
            {links.map((link) => {
              const Icon = link.icon;
              const current = link.key === active;
              return (
                <li key={link.href}>
                  <Link
                    className={current ? "active" : undefined}
                    aria-current={current ? "page" : undefined}
                    href={localeHref(link.href, locale)}
                  >
                    <Icon size={19} strokeWidth={2} aria-hidden="true" />
                    <span>{copy.account[link.key]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="account-content">{children}</div>
    </div>
  );
}
