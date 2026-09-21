import type { Metadata } from "next";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Limited 12-Month Warranty Policy",
  description:
    "Coverage term, exclusions, notification period and claim process for VanStro's limited 12-month warranty on kitchen cabinets and bathroom vanities.",
  path: "/warranty",
  noIndex: true
});

const WARRANTY_PDF_HREF = "/resources/vanstro-cabinet-vanity-warranty-2026-en-fr.pdf";

export default function WarrantyPage() {
  return (
    <>
      <section className="page-hero unified-content-hero">
        <div className="container unified-content-hero-grid">
          <PageBreadcrumb
            className="unified-content-hero-breadcrumb"
            items={[{ label: "Home", href: "/" }, { label: "Warranty" }]}
          />
          <div className="unified-content-hero-copy">
            <h1>Limited 12-Month Warranty Policy</h1>
            <p>Kitchen Cabinet &amp; Bathroom Vanity Products</p>
            <p>VanStro warrants only the cabinet products it supplies.</p>
          </div>
        </div>
      </section>

      <section className="page-panel">
        <div className="container legal-page">
          <div className="legal-content">
            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Coverage</h2>
                <p>
                  VanStro warrants to the original end-customer purchaser that kitchen cabinets,
                  bathroom vanities, hinges, and drawer slides shall be free from defects in
                  materials and workmanship under normal residential use for a period of
                  twelve (12) months from the date of original end-customer purchase. To the
                  maximum extent permitted by applicable law, this warranty is non-transferable.
                  Proof of purchase is required.
                </p>
                <small>Source: Coverage, page 1.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Exclusions</h2>
                <p>This warranty does not cover:</p>
                <ul className="legal-bullet-list">
                  <li>Normal wear and tear</li>
                  <li>Damage caused by misuse, abuse, or improper installation</li>
                  <li>
                    Environmental conditions, including but not limited to humidity, temperature,
                    and light exposure
                  </li>
                  <li>Improper handling or storage</li>
                  <li>Force majeure events</li>
                  <li>Any labor costs, including removal and reinstallation</li>
                </ul>
                <small>Source: Exclusions, page 3.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Notification Period</h2>
                <p>
                  The customer must provide written notice of any claimed defect to VanStro or
                  the selling dealer within thirty (30) days of discovering such defect, and in
                  any event before the expiration of the warranty period. Where applicable law
                  provides for a longer reasonable period or does not permit a fixed notice
                  period, the applicable law shall prevail.
                </p>
                <small>Source: Notification Period, page 3.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Warranty Remedy</h2>
                <p>
                  VanStro reserves the right, at its sole and absolute discretion, to repair or
                  replace defective products with functionally equivalent products of equal or
                  better quality. Replacement parts may differ from the original. VanStro shall
                  cover the cost of replacement parts only; all other costs, including but not
                  limited to installation, removal, and transportation costs, shall be the
                  responsibility of the selling dealer or the customer, as separately allocated
                  between VanStro and the selling dealer under a separate written agreement.
                  Where applicable consumer protection law determines that the above cost
                  allocation is unconscionable or unenforceable, VanStro and the selling dealer
                  shall negotiate a reasonable cost-sharing arrangement, or such allocation shall
                  be made in accordance with applicable law. Repair or replacement under this
                  warranty shall not extend, renew, or create a new warranty period. VanStro
                  reserves the right to require inspection, return, or verification of any claimed
                  defective product prior to approving replacement or repair.
                </p>
                <small>Source: Warranty Remedy, pages 3–4.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Serial Number Requirement</h2>
                <p>
                  All warranty claims must include a valid product Serial Number (SN). Claims
                  without valid product SN identification will be rejected.
                </p>
                <small>Source: Serial Number Requirement, page 4.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Statutory Rights</h2>
                <p>
                  Nothing in this warranty shall affect or limit the customer&rsquo;s statutory
                  rights under any applicable Canadian provincial consumer protection laws,
                  including but not limited to provincial Consumer Protection Acts, Sale of Goods
                  Acts, and other mandatory consumer protection statutes. In particular, for
                  customers in the Province of Qu&eacute;bec, this includes (where applicable)
                  the Consumer Protection Act of Qu&eacute;bec and the hidden defect (vices
                  cach&eacute;s) provisions of the Civil Code of Qu&eacute;bec. Where applicable
                  law provides longer warranty periods or non-excludable rights, those rights
                  shall prevail.
                </p>
                <small>Source: Statutory Rights, page 5.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Scope</h2>
                <p>This warranty is valid only within Canada.</p>
                <small>Source: Scope, page 5.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Governing Law</h2>
                <p>
                  This warranty shall be governed by and construed in accordance with the laws of
                  the Province of Manitoba, Canada, except where the customer&rsquo;s province of
                  residence requires the application of its own mandatory consumer protection
                  laws that cannot be excluded by agreement.
                </p>
                <small>Source: Governing Law, pages 5&ndash;6.</small>
              </div>
            </section>

            <section className="legal-section" style={{ gridTemplateColumns: "1fr" }}>
              <div className="legal-section-copy">
                <h2>Warranty Claim</h2>
                <p>
                  To make a warranty claim, please contact your authorized VanStro dealer first,
                  providing written notice, product SN, and proof of purchase. If the dealer is
                  unavailable, contact VanStro directly. If the dealer provides its own extended
                  warranty, the dealer&rsquo;s written terms shall apply within the scope of such
                  extension.
                </p>
                <small>Source: Warranty Claim, page 6.</small>
              </div>
            </section>
          </div>

          <aside className="summary-panel legal-summary">
            <div className="legal-summary-copy">
              <span className="legal-summary-kicker">Support</span>
              <h2>Full warranty document</h2>
              <p>
                This page lists the key terms of the current warranty policy. Effective date:
                2026-05-02.
              </p>
            </div>
            <div className="legal-summary-actions">
              <a
                className="button button-primary"
                href={assetPath(WARRANTY_PDF_HREF)}
                target="_blank"
                rel="noreferrer"
              >
                Full warranty document (PDF)
              </a>
              <a className="button button-secondary" href="mailto:warranty@vanstro.ca">
                warranty@vanstro.ca
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
