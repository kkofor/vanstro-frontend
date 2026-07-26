"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

const links = [
  { href: "/account", key: "overview" as const },
  { href: "/account/profile", key: "profile" as const },
  { href: "/account/addresses", key: "addresses" as const },
  { href: "/account/orders", key: "orders" as const },
  { href: "/favorites", key: "favorites" as const }
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
    return <div className="empty-panel"><h2>{copy.account.loading}</h2></div>;
  }

  if (session.status !== "authenticated") {
    return (
      <div className="empty-panel">
        <h2>{copy.account.signInRequiredTitle}</h2>
        <p>{copy.account.signInRequiredBody}</p>
        <Link className="button button-primary" href={localeHref("/account/login", locale)}>
          {copy.auth.signIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="two-column-page">
      <nav className="summary-panel" aria-label={copy.account.title}>
        <h2>{copy.account.title}</h2>
        <p>{session.user?.email}</p>
        <ul className="account-nav">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                className={link.key === active ? "section-link" : "text-link"}
                href={localeHref(link.href, locale)}
              >
                {copy.account[link.key]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <section>{children}</section>
    </div>
  );
}
