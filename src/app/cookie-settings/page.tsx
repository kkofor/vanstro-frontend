import type { Metadata } from "next";
import { LegalPageTemplate } from "@/components/legal/LegalPageTemplate";
import { CookieSettingsClient } from "@/components/layout/CookieSettingsClient";
import { buildLegalMetadata, requireLegalPage } from "@/content/legalPages";

const pageEntry = requireLegalPage("cookie-settings");

export const metadata: Metadata = {
  ...buildLegalMetadata(pageEntry),
  title: "Cookie Preferences"
};

export default function CookieSettingsPage() {
  return (
    <>
      <LegalPageTemplate entry={pageEntry} />
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
