import { FileText, Package, Shield } from "lucide-react";

/** Single source of truth for the SSR "Sold by" seller line (trust band + PDP kv row). */
export const SELLER_SUBTITLE = "Sold by Vanstro Global Supply";

const TRUST_ITEMS = [
  {
    Icon: Shield,
    title: "Secured by Moneris",
    subtitle: SELLER_SUBTITLE
  },
  {
    Icon: Package,
    title: "1-year warranty",
    subtitle: "Through your local dealer"
  },
  {
    Icon: FileText,
    title: "GST/HST invoice",
    subtitle: "PDF in your account after payment"
  }
] as const;

/**
 * Server component (no "use client", no hooks) — v2 DOM:
 *   <section class="card trust"> > ul.trust__items > li > svg + div(strong + text)
 * Icon colors come from CSS only (no inline colors).
 */
export function ProductTrustBand() {
  return (
    <section className="card trust">
      <ul className="trust__items">
        {TRUST_ITEMS.map(({ Icon, title, subtitle }) => (
          <li key={title}>
            <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
            <div>
              <strong>{title}</strong>
              {subtitle}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}