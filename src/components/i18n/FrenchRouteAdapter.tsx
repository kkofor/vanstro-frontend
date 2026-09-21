"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";

type FrenchRouteAdapterProps = {
  canonicalPath: string;
  title: string;
};

export function FrenchRouteAdapter({ canonicalPath, title }: FrenchRouteAdapterProps) {
  const { locale } = useLocale();
  const isFrench = locale === "fr-CA";

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">{isFrench ? "Contenu en français (Canada)" : "French (Canada) content"}</p>
          <h1>{title}</h1>
          <p>
            {isFrench
              ? "Le contenu complet de cette page est disponible ci-dessous."
              : "The complete page content is available below."}
          </p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <Link className="button button-primary" href={canonicalPath}>
            {isFrench ? "Consulter le contenu actuel" : "View current content"}
          </Link>
        </div>
      </section>
    </>
  );
}
