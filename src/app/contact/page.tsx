import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Contact VanStro for product, order, dealer and project support."
};

export default function ContactPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Contact us</h1>
          <p>
            Reach the VanStro team for product questions, order support, store pickup
            coordination or dealer program inquiries.
          </p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <form className="form-panel form-grid two" action="/api/v1/contact" method="post">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="topic">Topic</label>
              <select id="topic" name="topic" required>
                <option value="">Select a topic</option>
                <option value="products">Products</option>
                <option value="orders">Orders</option>
                <option value="dealer">Dealer program</option>
                <option value="support">Support</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" />
            </div>
            <div className="field form-wide">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" required />
            </div>
            <button className="button button-accent" type="submit">
              Send message
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
