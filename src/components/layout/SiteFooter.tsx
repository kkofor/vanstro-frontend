import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { CookiePreferencesButton } from "@/components/layout/CookiePreferencesButton";
import { assetPath } from "@/lib/assets";

const footerGroups = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/products" },
      { label: "Kitchen cabinets", href: "/products?category=kitchen-cabinets" },
      { label: "Bathroom vanities", href: "/products?category=bathroom-vanities" },
      { label: "Baseboards & mouldings", href: "/products?category=baseboards" },
      { label: "Doors & windows", href: "/products?category=doors-windows" }
    ]
  },
  {
    title: "Customer support",
    links: [
      { label: "Contact us", href: "/contact" },
      { label: "Order tracking", href: "/orders/demo-order" },
      { label: "Store pickup", href: "#stores" },
      { label: "Shipping & delivery", href: "/articles" },
      { label: "Returns & exchanges", href: "/articles" }
    ]
  },
  {
    title: "Dealer program",
    links: [
      { label: "Become a dealer", href: "/dealers/apply" },
      { label: "Partner login", href: "/account/login" },
      { label: "Dealer benefits", href: "/dealers/apply" },
      { label: "Trade resources", href: "/articles" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Resource Center", href: "/articles" },
      { label: "Design Studio", href: "https://tools.vanstro.ca/" },
      { label: "Privacy policy", href: "/privacy" }
    ]
  }
];

type SocialChannel = {
  label: string;
  icon: "facebook" | "instagram" | "youtube" | "pinterest" | "tiktok" | "linkedin" | "x";
};

const socialChannels: SocialChannel[] = [
  { label: "Facebook", icon: "facebook" },
  { label: "Instagram", icon: "instagram" },
  { label: "YouTube", icon: "youtube" },
  { label: "Pinterest", icon: "pinterest" },
  { label: "TikTok", icon: "tiktok" },
  { label: "LinkedIn", icon: "linkedin" },
  { label: "X", icon: "x" }
];

function SocialIcon({ icon }: { icon: SocialChannel["icon"] }) {
  if (icon === "instagram") {
    return (
      <svg className="social-icon-line" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4.6" y="4.6" width="14.8" height="14.8" rx="4.2" />
        <circle cx="12" cy="12" r="3.4" />
        <circle className="social-icon-dot" cx="16.6" cy="7.6" r="1" />
      </svg>
    );
  }

  if (icon === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2a31.5 31.5 0 0 0-.5 3.8 31.5 31.5 0 0 0 .5 3.8 3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 31.5 31.5 0 0 0 .5-3.8 31.5 31.5 0 0 0-.5-3.8Z" />
        <path d="m10.2 15.3 5-3.3-5-3.3v6.6Z" className="social-icon-cutout" />
      </svg>
    );
  }

  if (icon === "pinterest") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 20V5h5.2c3.1 0 5 1.7 5 4.3s-1.9 4.4-5 4.4h-2.2V20H8Zm3-9.1h2.1c1.4 0 2.2-.6 2.2-1.7s-.8-1.7-2.2-1.7H11v3.4Z" />
      </svg>
    );
  }

  if (icon === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.1 4.2h2.7c.3 2.2 1.6 3.8 3.7 4.1v2.8a7.1 7.1 0 0 1-3.6-1.2v5.4c0 3.1-2.1 5-5.1 5-2.7 0-4.7-1.8-4.7-4.3 0-2.8 2.2-4.5 5.4-4.3v2.9c-1.3-.2-2.3.4-2.3 1.4 0 .8.7 1.4 1.6 1.4 1 0 2.3-.5 2.3-2.4V4.2Z" />
      </svg>
    );
  }

  if (icon === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.7 9.2H3.8v10.1h2.9V9.2ZM5.2 7.8a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM9.1 9.2h2.8v1.4c.5-.9 1.6-1.6 3.1-1.6 3 0 4.2 1.9 4.2 4.8v5.5h-2.9v-5.1c0-1.7-.6-2.5-1.9-2.5s-2.4 1-2.4 2.7v4.9H9.1V9.2Z" />
      </svg>
    );
  }

  if (icon === "x") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 5h3.5l3.1 4.2L16.4 5h2.8l-5.3 5.9L20 19h-3.5l-3.6-4.9L8.5 19H5.7l5.9-6.6L6 5Zm2.8 1.7 8.5 10.7h1L9.8 6.7h-1Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.5 20v-7h2.4l.4-3h-2.8V8.1c0-.9.3-1.5 1.6-1.5h1.4V4c-.7-.1-1.4-.2-2.2-.2-2.8 0-4.4 1.7-4.4 4.1V10H7.5v3h2.4v7h3.6Z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" aria-label="VanStro home">
              <img src={assetPath("/assets/vanstro-logo.png")} alt="VanStro Global Supply" />
            </Link>
            <p>
              Canadian home materials supply platform for homeowners, contractors
              and VanStro dealer partners.
            </p>
            <div className="footer-contact-list" aria-label="Contact information">
              <span>
                <MapPin size={16} strokeWidth={2.2} />
                Nationwide delivery with local dealer service
              </span>
              <span>
                <Mail size={16} strokeWidth={2.2} />
                support@vanstro.ca
              </span>
              <span>
                <Phone size={16} strokeWidth={2.2} />
                Dealer-assisted fulfillment
              </span>
            </div>
            <div className="footer-social" aria-label="Social media channels">
              <div className="social-links">
                {socialChannels.map((channel) => (
                  <span role="img" aria-label={channel.label} key={channel.label}>
                    <SocialIcon icon={channel.icon} />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="footer-help">
            <span>Need help with an order?</span>
            <h3>Checkout online. Fulfillment stays local.</h3>
            <p>
              Your selected VanStro dealer receives the paid order and coordinates
              pickup, delivery, project support or after-sales service.
            </p>
            <div className="footer-help-actions">
              <Link className="button button-primary" href="/products">
                Shop products
              </Link>
              <Link className="button button-secondary" href="/contact">
                Contact support
              </Link>
            </div>
          </div>
        </div>

        <div className="footer-link-grid">
          {footerGroups.map((group) => (
            <nav className="footer-group" aria-label={group.title} key={group.title}>
              <h3>{group.title}</h3>
              {group.links.map((link) => (
                <Link href={link.href} key={link.label}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 VanStro Global Supply Inc. All rights reserved.</p>
          <div className="footer-legal">
            <Link className="footer-legal-link" href="/articles">
              Legal Disclaimer
            </Link>
            <Link className="footer-legal-link" href="/articles">
              Terms and Conditions
            </Link>
            <Link className="footer-legal-link" href="/privacy">
              Privacy Policy
            </Link>
            <CookiePreferencesButton />
            <Link className="footer-legal-link" href="/articles">
              Return Policy
            </Link>
            <Link className="footer-legal-link" href="/dealers/apply">
              Dealer Services &amp; Responsibility
            </Link>
            <Link className="footer-legal-link" href="/about">
              Careers
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
