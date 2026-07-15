import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Mail, MapPin, MessageSquareText, Phone, ShieldCheck, Store, UserRoundCheck } from "lucide-react";
import { ContactChatButton } from "@/components/contact/ContactChatButton";
import { assetPath } from "@/lib/assets";
import { FORM_ENDPOINTS } from "@/lib/api/form-endpoints";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Contact VanStro for product, order, dealer and project support.",
  alternates: {
    canonical: "/contact"
  }
};

const contactRoutes = [
  {
    title: "Product and order questions",
    text: "Ask about stocked materials, order documents, pickup coordination, or after-sales routing.",
    icon: MessageSquareText
  },
  {
    title: "Dealer-assisted fulfillment",
    text: "For routine delivery, installation, local service, and return questions, your assigned dealer is the first point of contact.",
    icon: Store
  },
  {
    title: "Dealer program inquiries",
    text: "Interested in joining the VanStro network? Send your company details and service area for review.",
    icon: UserRoundCheck
  }
];

const quickContacts = [
  {
    title: "Email support",
    text: "Our support team replies to email inquiries within 24 business hours.",
    value: "info@vanstro.ca",
    href: "mailto:info@vanstro.ca",
    icon: Mail
  },
  {
    title: "Phone support",
    text: "For urgent order or dealer routing questions during business hours.",
    value: "204-505-2288",
    href: "tel:+12045052288",
    icon: Phone
  },
  {
    title: "Dealer routing",
    text: "Local fulfillment, delivery coordination, returns, and after-sales service are handled by the assigned dealer.",
    value: "Find local support below",
    href: "#dealer-contacts",
    icon: Store
  }
];

const contactDetails = [
  {
    title: "Business-day follow-up",
    text: "Most general inquiries are routed within one business day.",
    icon: Clock3
  },
  {
    title: "Service boundary",
    text: "Dealer-provided services are handled by authorized local dealers unless VanStro states otherwise in writing.",
    icon: ShieldCheck
  },
  {
    title: "Head office",
    text: "VanStro Global Supply Inc. is headquartered in Winnipeg, Manitoba.",
    icon: MapPin
  }
];

const dealerContacts = [
  {
    region: "Manitoba",
    dealer: "MB01 - Yuan Construction",
    phone: "204-505-2288",
    email: "MB01@VANSTRO.CA",
    address: "856 Century St, Winnipeg, MB R3H 0M5"
  }
];

export default function ContactPage() {
  return (
    <>
      <section className="page-hero contact-page-hero">
        <div className="container contact-page-hero-grid">
          <div>
            <nav className="legal-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <span>Contact us</span>
            </nav>
            <h1>Contact VanStro</h1>
            <p className="contact-page-lede">
              Reach the right VanStro contact for product questions, order support,
              dealer-assisted fulfillment, or business partnership inquiries.
            </p>
            <div className="contact-page-hero-actions">
              <a className="button button-primary" href="#contact-form">
                Send a message
              </a>
              <a className="button button-secondary" href="#dealer-contacts">
                Find dealer contact
              </a>
              <ContactChatButton variant="hero" />
            </div>
          </div>
          <figure className="contact-page-hero-visual">
            <img
              src={assetPath("/assets/generated/contact-support-hero-v1.png")}
              alt="VanStro support representative coordinating building materials orders"
            />
          </figure>
        </div>
      </section>

      <section className="page-panel contact-page-panel">
        <div className="container contact-page-main-grid">
          <form
            className="form-panel form-grid two contact-page-form"
            id="contact-form"
            action={FORM_ENDPOINTS.contactLead}
            method="post"
          >
            <div className="contact-page-form-heading form-wide">
              <span className="contact-page-kicker">General inquiry</span>
              <h2>Send us the details once. We will route it.</h2>
              <p>
                Include your order number, product category, city, and preferred
                dealer if you have one.
              </p>
            </div>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="topic">Topic</label>
              <select id="topic" name="topic" required defaultValue="">
                <option value="" disabled>
                  Select a topic
                </option>
                <option value="products">Product question</option>
                <option value="orders">Order support</option>
                <option value="dealer-service">Dealer service routing</option>
                <option value="dealer-program">Dealer program</option>
                <option value="website-support">Website support</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="city">City / province</label>
              <input id="city" name="city" autoComplete="address-level2" />
            </div>
            <div className="field">
              <label htmlFor="dealer">Preferred dealer</label>
              <select id="dealer" name="dealer" defaultValue="">
                <option value="">Not sure / route by location</option>
                {dealerContacts.map((dealer) => (
                  <option value={dealer.dealer} key={dealer.dealer}>
                    {dealer.region} - {dealer.dealer}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="orderNumber">Order number</label>
              <input id="orderNumber" name="orderNumber" placeholder="Optional" />
            </div>
            <div className="field form-wide">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                placeholder="Tell us what you need help with, including product names, dealer location, or timing details."
                required
              />
            </div>
            <button className="button button-primary" type="submit">
              Send message
            </button>
          </form>

          <aside className="contact-page-info-column" aria-label="Contact details">
            <div className="contact-page-note contact-page-quick-card">
              <span className="contact-page-kicker">Best for</span>
              <p>
                Quote terms, order documents, product warranty routing, dealer
                program questions, and website support.
              </p>
              <div className="contact-page-quick-list">
                <ContactChatButton />
                {quickContacts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a href={item.href} key={item.title}>
                      <Icon size={20} strokeWidth={2.2} />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.value}</small>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
            <div className="contact-page-detail-list">
              {contactDetails.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title}>
                    <Icon size={19} strokeWidth={2.2} />
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      <section className="page-panel contact-page-panel alt">
        <div className="container">
          <div className="contact-page-route-grid" aria-label="Contact routing options">
            {contactRoutes.map((route) => {
              const Icon = route.icon;
              return (
                <article className="contact-page-route-card" key={route.title}>
                  <Icon size={22} strokeWidth={2.1} />
                  <h2>{route.title}</h2>
                  <p>{route.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="page-panel contact-page-panel" id="dealer-contacts">
        <div className="container contact-page-dealer-section">
          <div className="contact-page-section-heading">
            <span className="contact-page-kicker">Local dealer contacts</span>
            <h2>Find the nearest support contact</h2>
            <p>
              VanStro products are fulfilled through authorized local dealers.
              Contact the relevant dealer for pickup, delivery coordination,
              installation where offered, returns, exchanges, and after-sales service.
            </p>
          </div>

          <div className="contact-page-dealer-grid">
            {dealerContacts.map((dealer) => (
              <article className="contact-page-dealer-card" key={`${dealer.region}-${dealer.dealer}`}>
                <span>{dealer.region}</span>
                <h3>{dealer.dealer}</h3>
                <div className="contact-page-dealer-list">
                  <a href={`mailto:${dealer.email}`}>
                    <Mail size={16} strokeWidth={2.2} />
                    {dealer.email}
                  </a>
                  <a href={`tel:+1${dealer.phone.replace(/\D/g, "")}`}>
                    <Phone size={16} strokeWidth={2.2} />
                    {dealer.phone}
                  </a>
                  <p>
                    <MapPin size={16} strokeWidth={2.2} />
                    {dealer.address}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
