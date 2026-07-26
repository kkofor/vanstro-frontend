"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { localeHref } from "@/lib/i18n/routes";

export type PageBreadcrumbItem = {
  label: string;
  href?: string;
};

type PageBreadcrumbProps = {
  items: PageBreadcrumbItem[];
  className?: string;
};

export function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  const { copy, locale } = useLocale();

  return (
    <nav
      className={["legal-breadcrumb", className].filter(Boolean).join(" ")}
      aria-label={copy.breadcrumbLabel}
    >
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          {item.href ? (
            <Link href={localeHref(item.href, locale)}>{item.label}</Link>
          ) : (
            <span>{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
