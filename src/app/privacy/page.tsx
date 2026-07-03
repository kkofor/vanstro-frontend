import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy and cookie information for the VanStro frontend demo."
};

const privacySections = [
  {
    title: "What this demo stores",
    body:
      "This static frontend demo stores cart items, favorites, selected dealer, postal code, demo orders and cookie preferences in the browser through localStorage."
  },
  {
    title: "What is not connected yet",
    body:
      "Production authentication, payment, analytics, consent integrations and backend customer records are not connected in this demo build."
  },
  {
    title: "Future production handling",
    body:
      "When VanStro connects the production backend, privacy terms should be replaced with approved legal copy covering account data, order records, payments, dealer fulfillment, analytics and support communications."
  }
];

export default function PrivacyPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Privacy Policy</h1>
          <p>
            Current privacy notes for the static VanStro frontend demo and its browser-only
            commerce state.
          </p>
        </div>
      </section>

      <section className="page-panel">
        <div className="container legal-page">
          <div className="legal-content">
            {privacySections.map((section) => (
              <section className="legal-section" key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>

          <aside className="summary-panel legal-summary">
            <h2>Cookie controls</h2>
            <p>
              Visitors can adjust optional cookie preferences without leaving the site.
            </p>
            <Link className="button button-primary" href="/cookie-settings">
              Open cookie settings
            </Link>
            <Link className="button button-secondary" href="/contact">
              Contact support
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
