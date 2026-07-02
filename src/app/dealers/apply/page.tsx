import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dealer application",
  description: "Apply to become a VanStro dealer or request contractor support."
};

export default function DealerApplicationPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Dealer application</h1>
          <p>Submit your company details for trade pricing, stocked inventory access and dealer support.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <form className="form-panel form-grid two" action="/api/v1/dealer-applications" method="post">
            <div className="field">
              <label htmlFor="companyName">Company name</label>
              <input id="companyName" name="companyName" required />
            </div>
            <div className="field">
              <label htmlFor="contactName">Contact name</label>
              <input id="contactName" name="contactName" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" required />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" name="city" required />
            </div>
            <div className="field">
              <label htmlFor="province">Province</label>
              <select id="province" name="province" required>
                <option value="">Select province</option>
                <option value="ON">Ontario</option>
                <option value="BC">British Columbia</option>
                <option value="AB">Alberta</option>
                <option value="QC">Quebec</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="businessType">Business type</label>
              <input id="businessType" name="businessType" />
            </div>
            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" />
            </div>
            <button className="button button-accent" type="submit">
              Submit application
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
