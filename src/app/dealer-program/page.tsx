import type { Metadata } from "next";
import Link from "next/link";
import { assetPath } from "@/lib/assets";

export const metadata: Metadata = {
  title: "Dealer program",
  description:
    "Review the VanStro dealer program for qualified local building-materials operators, including platform responsibilities, dealer responsibilities, application review and policy requirements.",
  alternates: {
    canonical: "/dealer-program"
  }
};

const atAGlance = [
  ["VanStro role", "Product supply platform, catalog, checkout, product information and dealer network support."],
  ["Dealer role", "Independent local customer contact, order execution, delivery coordination and services where offered."],
  ["Application status", "Reviewed case by case. Submission does not guarantee approval, territory, pricing or lead volume."],
  ["Final terms", "Commercial terms, launch timing and obligations require written approval or agreement."]
];

const operatingRows = [
  {
    area: "Product order",
    vanstro: "Catalog, product supply, product information, platform checkout and product policy review.",
    dealer: "Local order execution, customer communication and product handoff.",
    customer: "Discovers products online and works with the assigned local dealer for routine matters."
  },
  {
    area: "Dealer services",
    vanstro: "Does not provide delivery, installation, measurement or renovation services unless stated in writing.",
    dealer: "Sets service scope, price, schedule, payment collection, workmanship and service warranty.",
    customer: "Contracts directly with the dealer for extended services where offered."
  },
  {
    area: "Returns and support",
    vanstro: "Reviews product-policy escalations and RMA matters where appropriate.",
    dealer: "First point of contact for delivery, returns, exchanges and after-sales support.",
    customer: "Starts routine support and return questions with the selling local dealer."
  }
];

const goodFit = [
  "Showroom, contractor or local building-materials business",
  "Defined service area and customer-facing team",
  "Ability to coordinate pickup, delivery or after-sales support",
  "Willingness to operate under VanStro policies and disclosure rules"
];

const notFit = [
  "No local service or customer support capacity",
  "Unclear responsibility ownership for dealer-provided services",
  "Expectation that VanStro will absorb dealer service liability",
  "Requirement for guaranteed leads, revenue or exclusive territory"
];

const reviewSteps = [
  ["1", "Company profile", "Business details, service area, product focus and operating capabilities."],
  ["2", "Coverage review", "VanStro reviews market fit, local coverage and dealer network balance."],
  ["3", "Workflow alignment", "Approved candidates align on order flow, customer handoff, returns and disclosure language."],
  ["4", "Activation", "Launch timing and commercial terms are confirmed only through written approval or agreement."]
];

const policyRows = [
  ["Dealer Services & Responsibility", "Service liability, service pricing, customer handoff and platform boundary.", "/dealer-services-and-responsibility"],
  ["Return Policy", "Return routing, RMA review, distributor handling and escalation path.", "/return-policy"],
  ["Privacy Policy", "Application information, customer referrals and dealer data sharing.", "/privacy"],
  ["Terms and Conditions", "Website use, ordering terms, permitted use and governing law.", "/terms-and-conditions"],
  ["Legal Disclaimer", "Product information, images, pricing references and non-binding website content.", "/legal-disclaimer"],
  ["Cookie Preferences", "Consent controls for optional functional, analytics and marketing cookies.", "/cookie-settings"],
  ["Careers", "Team growth and future regional opportunities.", "/careers"]
];

export default function DealerProgramPage() {
  return (
    <>
      <section className="page-hero dealer-program-hero dealer-program-b2b-hero">
        <div className="container dealer-program-b2b-hero-grid">
          <div>
            <nav className="legal-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <span>Dealer program</span>
            </nav>
            <h1>Dealer program</h1>
            <p>
              For qualified local building-materials operators who can support
              customer communication, order execution and local service within
              VanStro&apos;s platform-backed supply model.
            </p>
            <div className="dealer-program-actions">
              <Link className="button button-primary" href="/dealers/apply">
                Start dealer application
              </Link>
              <Link className="button button-secondary" href="#fit">
                Review fit first
              </Link>
            </div>
          </div>

          <figure className="dealer-program-visual dealer-program-b2b-visual">
            <img
              src={assetPath("/assets/generated/dealer-program-handshake-v1.png")}
              alt="Business handshake representing a VanStro dealer partnership"
            />
          </figure>
        </div>
      </section>

      <section className="page-panel dealer-program-panel">
        <div className="container dealer-program-b2b-split">
          <div className="dealer-program-b2b-heading">
            <h2>Program at a glance</h2>
            <p>
              The dealer program is structured around a platform-backed product
              supply model and local dealer responsibility.
            </p>
          </div>
          <aside className="dealer-program-b2b-summary" aria-label="Program summary">
            <dl>
              {atAGlance.map(([term, description]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      <section className="page-panel dealer-program-panel" id="fit">
        <div className="container dealer-program-b2b-split">
          <div className="dealer-program-b2b-heading">
            <h2>Partner qualification</h2>
            <p>
              This page is intended for B2B operators who can take local
              responsibility for customer contact and service coordination. It is
              not a general consumer support page.
            </p>
          </div>
          <div className="dealer-program-b2b-qualification">
            <article>
              <h3>Good fit</h3>
              <ul>
                {goodFit.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Not a fit yet</h3>
              <ul>
                {notFit.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="page-panel dealer-program-panel alt" id="model">
        <div className="container">
          <div className="dealer-program-b2b-heading wide">
            <h2>Operating model</h2>
            <p>
              VanStro separates platform product supply from dealer-provided
              local services. The distinction should be clear to applicants,
              customers and dealer teams before work begins.
            </p>
          </div>
          <div className="dealer-program-b2b-table-wrap">
            <table className="dealer-program-b2b-table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>VanStro platform</th>
                  <th>Dealer partner</th>
                  <th>Customer path</th>
                </tr>
              </thead>
              <tbody>
                {operatingRows.map((row) => (
                  <tr key={row.area}>
                    <th scope="row">{row.area}</th>
                    <td>{row.vanstro}</td>
                    <td>{row.dealer}</td>
                    <td>{row.customer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dealer-program-b2b-notice">
            <strong>Responsibility boundary</strong>
            <p>
              Product orders do not include dealer extended services unless
              VanStro states otherwise in writing. Dealer service fees are
              separate from VanStro product pricing and are collected directly by
              the dealer.
            </p>
          </div>
        </div>
      </section>

      <section className="page-panel dealer-program-panel">
        <div className="container dealer-program-b2b-split">
          <div className="dealer-program-b2b-heading">
            <h2>Application review</h2>
            <p>
              VanStro reviews dealer applications for local coverage, operating
              readiness and fit with the existing dealer network. Submission is
              not approval.
            </p>
          </div>
          <ol className="dealer-program-b2b-steps">
            {reviewSteps.map(([number, title, text]) => (
              <li key={title}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-panel dealer-program-panel alt" id="policies">
        <div className="container dealer-program-b2b-split">
          <div className="dealer-program-b2b-heading">
            <h2>Operating rules before applying</h2>
            <p>
              These pages explain the rules that prospective dealers should
              understand before applying. They are part of the operating context,
              not marketing material.
            </p>
          </div>
          <div className="dealer-program-b2b-policy-list">
            {policyRows.map(([label, scope, href]) => (
              <Link href={href} key={label}>
                <span>{label}</span>
                <small>{scope}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="page-panel dealer-program-panel">
        <div className="container dealer-program-b2b-legal">
          <h2>Important application notes</h2>
          <p>
            Submitting an application does not guarantee approval, territory
            exclusivity, pricing terms, lead volume, revenue, launch timing or a
            dealer relationship. Final terms require written approval or
            agreement.
          </p>
          <p>
            Application information may be used for cooperation review, dealer
            onboarding, local coverage assessment and follow-up communication.
            Review the Privacy Policy and Cookie Preferences before submitting
            information.
          </p>
        </div>
      </section>

      <section className="dealer-program-cta dealer-program-b2b-cta">
        <div className="container dealer-program-cta-grid">
          <div>
            <h2>Discuss your market and coverage.</h2>
            <p>
              Share your company profile, service area and local support
              capabilities. VanStro will review fit and follow up with the right
              team.
            </p>
          </div>
          <div className="dealer-program-actions">
            <Link className="button button-primary" href="/dealers/apply">
              Start application
            </Link>
            <Link className="button button-secondary" href="/contact">
              Contact dealer program team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
