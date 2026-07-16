import type { Metadata } from "next";
import Link from "next/link";
import { SecondaryPageHero } from "@/components/layout/SecondaryPageHero";
import { FORM_ENDPOINTS } from "@/lib/api/form-endpoints";

export const metadata: Metadata = {
  title: "Dealer application",
  description:
    "Apply to become a VanStro dealer partner. Share company details, service area, operating capabilities and local support coverage for review.",
  alternates: {
    canonical: "/dealers/apply"
  }
};

const applicationSummary = [
  ["Review type", "Case-by-case business review"],
  ["Best fit", "Local building-materials, showroom or contractor operators"],
  ["Required", "Company profile, service area, customer support capability"],
  ["Outcome", "Follow-up only after VanStro review"]
];

const requiredItems = [
  "Legal company name and primary contact",
  "Service city, province and coverage area",
  "Business type, showroom or trade operation details",
  "Dealer services you can coordinate locally",
  "Any current order, catalog or product category focus"
];

const capabilityOptions = [
  "Customer communication",
  "Order execution",
  "Pickup coordination",
  "Delivery coordination",
  "After-sales support",
  "Showroom consultation"
];

const reviewSteps = [
  ["1", "Submit profile", "Send company, contact, service area and operating details."],
  ["2", "Coverage review", "VanStro checks market fit, local coverage and network balance."],
  ["3", "Policy alignment", "Qualified candidates review customer handoff, returns and service boundaries."],
  ["4", "Written terms", "Final activation requires written approval or agreement."]
];

export default function DealerApplicationPage() {
  return (
    <>
      <SecondaryPageHero
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Dealer program", href: "/dealer-program" },
          { label: "Dealer application" }
        ]}
        title="Dealer application"
        className="dealer-application-hero"
        image={{
          src: "/assets/generated/dealer-program-handshake-v1.webp",
          alt: "Business partners discussing a VanStro dealer application"
        }}
        actions={
          <>
            <a className="button button-primary" href="#application-form">
              Start application
            </a>
            <Link className="button button-secondary" href="/dealer-program#fit">
              Review fit first
            </Link>
          </>
        }
      >
        <p>
          Share your company profile, local coverage and operating capacity.
          VanStro will review whether your business fits the dealer program
          before discussing commercial terms.
        </p>
      </SecondaryPageHero>

      <section className="page-panel dealer-application-panel">
        <div className="container dealer-application-layout">
          <form
            className="form-panel dealer-application-form"
            id="application-form"
            action={FORM_ENDPOINTS.dealerApplication}
            method="post"
          >
            <input type="hidden" name="source" value="dealer-application-page" />

            <div className="dealer-application-form-heading">
              <span>Company profile</span>
              <h2>Send the details once. We will review fit before next steps.</h2>
              <p>
                Fields marked required help VanStro determine whether the dealer
                program can support your market and operating model.
              </p>
            </div>

            <fieldset className="dealer-application-fieldset">
              <legend>Business contact</legend>
              <div className="form-grid two">
                <div className="field">
                  <label htmlFor="companyName">Company name</label>
                  <input id="companyName" name="companyName" autoComplete="organization" required />
                </div>
                <div className="field">
                  <label htmlFor="contactName">Contact name</label>
                  <input id="contactName" name="contactName" autoComplete="name" required />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" type="tel" autoComplete="tel" required />
                </div>
                <div className="field">
                  <label htmlFor="website">Company website</label>
                  <input id="website" name="website" type="url" placeholder="Optional" />
                </div>
                <div className="field">
                  <label htmlFor="businessType">Business type</label>
                  <select id="businessType" name="businessType" required defaultValue="">
                    <option value="" disabled>
                      Select business type
                    </option>
                    <option value="showroom">Showroom / design centre</option>
                    <option value="contractor">Contractor / trade operator</option>
                    <option value="building-materials">Building-materials retailer</option>
                    <option value="dealer-distributor">Dealer / distributor</option>
                    <option value="other">Other qualified local operator</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="dealer-application-fieldset">
              <legend>Coverage and operations</legend>
              <div className="form-grid two">
                <div className="field">
                  <label htmlFor="city">Primary city</label>
                  <input id="city" name="city" autoComplete="address-level2" required />
                </div>
                <div className="field">
                  <label htmlFor="province">Province</label>
                  <select id="province" name="province" required defaultValue="">
                    <option value="" disabled>
                      Select province
                    </option>
                    <option value="AB">Alberta</option>
                    <option value="BC">British Columbia</option>
                    <option value="MB">Manitoba</option>
                    <option value="NB">New Brunswick</option>
                    <option value="NL">Newfoundland and Labrador</option>
                    <option value="NS">Nova Scotia</option>
                    <option value="ON">Ontario</option>
                    <option value="PE">Prince Edward Island</option>
                    <option value="QC">Quebec</option>
                    <option value="SK">Saskatchewan</option>
                    <option value="NT">Northwest Territories</option>
                    <option value="NU">Nunavut</option>
                    <option value="YT">Yukon</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="serviceArea">Service area</label>
                  <input
                    id="serviceArea"
                    name="serviceArea"
                    placeholder="City, region, or radius served"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="productFocus">Product focus</label>
                  <input
                    id="productFocus"
                    name="productFocus"
                    placeholder="Cabinets, vanities, trim, or mixed categories"
                  />
                </div>
              </div>

              <div className="dealer-application-checklist" aria-label="Local capabilities">
                <span>Local capabilities</span>
                <div>
                  {capabilityOptions.map((capability) => (
                    <label key={capability}>
                      <input name="capabilities" type="checkbox" value={capability} />
                      {capability}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            <fieldset className="dealer-application-fieldset">
              <legend>Application notes</legend>
              <div className="field">
                <label htmlFor="message">Business profile and notes</label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Tell us about your company, showroom or trade operation, local support team, service coverage, and why VanStro should review your application."
                  required
                />
              </div>
            </fieldset>

            <div className="dealer-application-guidance">
              <strong>Before you submit</strong>
              <p>
                VanStro reviews dealer applications case by case. Submitting this
                form does not guarantee approval, assigned territory, pricing,
                inventory access, lead volume, launch timing or a dealer relationship.
              </p>
              <p>
                Application information may be used for cooperation review, dealer
                onboarding, local coverage assessment and follow-up communication.
                Please review the <Link href="/privacy">Privacy Policy</Link>,{" "}
                <Link href="/terms-and-conditions">Terms and Conditions</Link>, and{" "}
                <Link href="/dealer-services-and-responsibility">Dealer Services & Responsibility</Link>.
              </p>
            </div>

            <label className="dealer-application-consent">
              <input name="applicationAcknowledgement" type="checkbox" required />
              <span>
                I understand this application is for review only and final terms
                require written approval or agreement from VanStro.
              </span>
            </label>

            <div className="dealer-application-submit-row">
              <button className="button button-primary" type="submit">
                Submit application
              </button>
              <p>Most qualified applications receive follow-up after internal review.</p>
            </div>
          </form>

          <aside className="dealer-application-aside" aria-label="Application preparation">
            <section className="dealer-application-summary">
              <h2>Application overview</h2>
              <dl>
                {applicationSummary.map(([term, description]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{description}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section>
              <h2>Prepare before submitting</h2>
              <ul>
                {requiredItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Review path</h2>
              <ol className="dealer-application-steps">
                {reviewSteps.map(([number, title, text]) => (
                  <li key={title}>
                    <span>{number}</span>
                    <div>
                      <strong>{title}</strong>
                      <p>{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="dealer-application-boundary">
              <h2>Important boundary</h2>
              <p>
                Dealer-provided services, service pricing, workmanship and local
                scheduling are separate from VanStro product pricing unless VanStro
                states otherwise in writing.
              </p>
              <Link href="/dealer-program#policies">Review operating rules</Link>
            </section>
          </aside>
        </div>
      </section>
    </>
  );
}
