import type { Metadata } from "next";
import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { CookieSettingsClient } from "@/components/layout/CookieSettingsClient";
import { requireLegalPage } from "@/content/legalPages";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

const pageEntry = requireLegalPage("cookie-settings", "fr-CA");

export const metadata: Metadata = buildPrivateMetadata(
  "Préférences relatives aux témoins",
  pageEntry.description,
  "/fr/cookie-settings"
);

export default function FrenchCookieSettingsPage() {
  return (
    <>
      <LegalPageTemplate entry={pageEntry} locale="fr-CA" />
      <section className="page-panel cookie-settings-page-panel" id="cookie-controls">
        <div className="container">
          <div className="cookie-settings-page-card">
            <CookieSettingsClient />
          </div>
        </div>
      </section>
    </>
  );
}
