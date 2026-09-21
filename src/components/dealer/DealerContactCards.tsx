"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { dealerContacts } from "@/lib/data/dealer-contacts";
import type { StorefrontDealerSummary } from "@/lib/api/api-contract";
import type { SiteLocale } from "@/lib/i18n/locale";

// location.province is a 2-letter code; expand for the card's region label.
// Matches the province names used on the dealer application form (src/app/
// dealers/apply/page.tsx). Set per locale — Alberta, Ontario, Saskatchewan
// and Manitoba are identical in English and French; BC and QC differ.
const PROVINCE_NAMES: Record<SiteLocale, Record<string, string>> = {
  "en-CA": {
    AB: "Alberta",
    BC: "British Columbia",
    ON: "Ontario",
    QC: "Quebec",
    SK: "Saskatchewan",
    MB: "Manitoba"
  },
  "fr-CA": {
    AB: "Alberta",
    BC: "Colombie-Britannique",
    ON: "Ontario",
    QC: "Québec",
    SK: "Saskatchewan",
    MB: "Manitoba"
  }
};

type DealerCard = {
  key: string;
  region: string;
  heading: string;
  comingSoon?: boolean;
  /**
   * Company name, shown in the card body. Only set when it differs from the
   * dealer code, so the dealers whose API name equals their code do not repeat
   * the code on the line under the heading.
   */
  company?: string;
  email?: string;
  phone?: string;
  address: string;
};

/**
 * Build one card from a dealer summary's first location. Returns null when the
 * dealer has no location, because the city and province come from the location
 * record. Uses location.city / location.province — not location.name, which the
 * API layer overwrites with the dealer name for single-location dealers.
 */
function toDealerCard(summary: StorefrontDealerSummary, locale: SiteLocale): DealerCard | null {
  const location = summary.locations[0];
  if (!location) return null;

  const code = summary.code ?? location.code ?? summary.name;

  return {
    key: summary.id,
    region: PROVINCE_NAMES[locale][location.province] ?? location.province,
    heading: `${code} · ${location.city}, ${location.province}`,
    comingSoon: Boolean(code && summary.name.trim().toUpperCase() === code.trim().toUpperCase()),
    company: summary.name === code ? undefined : summary.name,
    email: summary.email ?? location.email,
    phone: summary.phone ?? location.phone,
    address: `${location.address}, ${location.city}, ${location.province} ${location.postalCode}`
  };
}

/**
 * Renders one card per dealer summary. `locale` selects the province-name
 * mapping for the region label; dealer data itself (code, city, phone, email,
 * address) is not localized.
 */
export function DealerContactCards({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const { dealerSummaries } = useLocale();

  const apiCards = dealerSummaries
    .map((summary) => toDealerCard(summary, locale))
    .filter((card): card is DealerCard => card !== null);

  // Storefront API data when it resolves; the static list keeps this section from
  // rendering empty when the API is unavailable (fixture and local builds).
  const cards: DealerCard[] =
    apiCards.length > 0
      ? apiCards
      : dealerContacts.map((dealer) => {
          // dealer.region holds the 2-letter province code; localize it through
          // the same mapping so the fallback renders in French too.
          const region = PROVINCE_NAMES[locale][dealer.region] ?? dealer.region;
          return {
            key: dealer.dealer,
            region,
            heading: dealer.dealer,
            email: dealer.email,
            phone: dealer.phone,
            address: dealer.address
          };
        });

  return (
    <div className="contact-page-dealer-grid">
      {cards.map((card) => (
        <article className="contact-page-dealer-card" key={card.key}>
          <span>{card.region}</span>
          <h3>{card.heading}</h3>
          <div className="contact-page-dealer-list">
            {card.comingSoon ? <em className="dealer-map-coming-soon">{locale === "fr-CA" ? "Bientôt disponible" : "Coming soon"}</em> : null}
            {card.company ? <p>{card.company}</p> : null}
            {card.email ? (
              <a href={`mailto:${card.email}`}>
                <Mail size={16} strokeWidth={2.2} />
                {card.email}
              </a>
            ) : null}
            {card.phone ? (
              <a href={`tel:+1${card.phone.replace(/\D/g, "")}`}>
                <Phone size={16} strokeWidth={2.2} />
                {card.phone}
              </a>
            ) : null}
            <p>
              <MapPin size={16} strokeWidth={2.2} />
              {card.address}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
