import type { ReactNode } from "react";
import type { SiteLocale } from "@/lib/i18n/locale";

export function AccountPageFrame({ locale, title, description, children }: {
  locale: SiteLocale;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="account-workspace" lang={locale}>
      <div className="container">
        <header className="account-workspace-heading">
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </section>
  );
}
