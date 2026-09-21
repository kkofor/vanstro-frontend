import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Mail, MapPin, MessageSquareText, Phone, ShieldCheck, Store, UserRoundCheck } from "lucide-react";
import { ContactChatButton } from "@/components/contact/ContactChatButton";
import { ContactForm } from "@/components/contact/ContactForm";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localeHref } from "@/lib/i18n/routes";
import type { SiteLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact us",
  description: "Contact VanStro for product, order, dealer and project support.",
  path: "/contact",
  image: "/assets/generated/contact-support-hero-v1.webp"
});

const contactRoutes = [
  {
    title: "Product And Order Questions",
    text: "Ask about stocked materials, order documents, pickup coordination, or after-sales routing.",
    icon: MessageSquareText
  },
  {
    title: "Local Dealer Fulfillment",
    text: "For separately offered local services, contact the local dealer you selected or contracted with.",
    icon: Store
  },
  {
    title: "Dealer Program Inquiries",
    text: "Interested in joining the VanStro network? Send your company details and proposed dealer service area for review.",
    icon: UserRoundCheck
  }
];

const buildQuickContacts = (locale: SiteLocale) => [
  {
    title: "Email support",
    text: "Our support team replies to email inquiries within 24 business hours.",
    value: "support@vanstro.ca",
    href: "mailto:support@vanstro.ca",
    icon: Mail
  },
  {
    title: "Phone support",
    text: "For urgent order or dealer routing questions during business hours.",
    value: "204 221 2288",
    href: "tel:+12042212288",
    icon: Phone
  },
  {
    title: "Dealer routing",
    text: "Availability, pickup, delivery coordination and separately offered local services are handled by the local dealer selected for the order.",
    value: "View dealer map",
    href: localeHref("/dealers/map", locale),
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
    text: "Separately quoted local services are provided by the local dealer unless VanStro expressly states otherwise in writing.",
    icon: ShieldCheck
  },
  {
    title: "Head office",
    text: "VanStro Global Supply Inc. is headquartered in Winnipeg, Manitoba.",
    icon: MapPin
  }
];

export function ContactPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  const localizedContactRoutes = french
    ? [
        { title: "Questions sur les produits et les commandes", text: "Posez vos questions sur les matériaux en stock, les documents de commande, le ramassage ou le soutien après-vente.", icon: MessageSquareText },
        { title: "Prise en charge par un détaillant local", text: "Pour les services locaux offerts séparément, communiquez avec le détaillant que vous avez choisi ou avec lequel vous avez conclu une entente.", icon: Store },
        { title: "Programme pour les détaillants", text: "Vous souhaitez vous joindre au réseau VanStro ? Transmettez les renseignements sur votre entreprise et la zone de service proposée.", icon: UserRoundCheck }
      ]
    : contactRoutes;
  const localizedQuickContacts = french
    ? [
        { title: "Soutien par courriel", text: "Notre équipe répond aux demandes par courriel dans un délai de 24 heures ouvrables.", value: "support@vanstro.ca", href: "mailto:support@vanstro.ca", icon: Mail },
        { title: "Soutien téléphonique", text: "Pour les questions urgentes sur une commande ou l’orientation vers un détaillant pendant les heures d’ouverture.", value: "204 221 2288", href: "tel:+12042212288", icon: Phone },
        { title: "Orientation vers un détaillant", text: "Le détaillant choisi pour la commande confirme la disponibilité et coordonne le ramassage, la livraison et les services locaux offerts séparément.", value: "Voir la carte des détaillants", href: localeHref("/dealers/map", locale), icon: Store }
      ]
    : buildQuickContacts(locale);
  const localizedContactDetails = french
    ? [
        { title: "Suivi les jours ouvrables", text: "La plupart des demandes générales sont acheminées dans un délai d’un jour ouvrable.", icon: Clock3 },
        { title: "Limites des services", text: "Les services locaux faisant l’objet d’un devis distinct sont fournis par le détaillant, sauf indication écrite contraire de VanStro.", icon: ShieldCheck },
        { title: "Siège social", text: "VanStro Global Supply Inc. a son siège social à Winnipeg, au Manitoba.", icon: MapPin }
      ]
    : contactDetails;

  return (
    <>
      <section className="page-hero contact-page-hero unified-content-hero">
        <div className="container contact-page-hero-grid unified-content-hero-grid">
          <PageBreadcrumb className="unified-content-hero-breadcrumb" items={[{ label: french ? "Accueil" : "Home", href: localeHref("/", locale) }, { label: french ? "Nous joindre" : "Contact us" }]} />
          <div className="unified-content-hero-copy">
            <h1>{french ? "Communiquez avec VanStro" : "Contact VanStro"}</h1>
            <p className="contact-page-lede">
              {french
                ? "Trouvez la bonne personne-ressource chez VanStro pour vos questions sur les produits, le soutien aux commandes, la prise en charge par un détaillant ou les partenariats commerciaux."
                : "Reach the right VanStro contact for product questions, order support, dealer-assisted fulfillment, or business partnership inquiries."}
            </p>
            <div className="contact-page-hero-actions">
              <a className="button button-primary" href="#contact-form">
                {french ? "Envoyer un message" : "Send a message"}
              </a>
              <Link className="button button-secondary" href={localeHref("/dealers/map", locale)}>
                {french ? "Trouver un détaillant" : "Find dealer contact"}
              </Link>
              <ContactChatButton variant="hero" />
            </div>
          </div>
          <figure className="contact-page-hero-visual">
            <img
              src={assetPath("/assets/generated/contact-support-hero-v1.webp")}
              alt={french ? "Représentante du soutien VanStro coordonnant une commande de matériaux de construction" : "VanStro support representative coordinating building materials orders"}
              width={1774}
              height={887}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        </div>
      </section>

      <section className="page-panel contact-page-panel">
        <div className="container contact-page-main-grid">
          <ContactForm locale={locale} />

          <aside className="contact-page-info-column" aria-label={french ? "Coordonnées" : "Contact details"}>
            <div className="contact-page-note contact-page-quick-card">
              <span className="contact-page-kicker">{french ? "Idéal pour" : "Best for"}</span>
              <p>
                {french
                  ? "Les conditions d’un devis, les documents de commande, les demandes concernant la garantie des produits, les demandes concernant le programme pour les détaillants et le soutien du site Web."
                  : "Quote terms, order documents, product warranty routing, dealer program questions, and website support."}
              </p>
              <div className="contact-page-quick-list">
                <ContactChatButton />
                {localizedQuickContacts.map((item) => {
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
              {localizedContactDetails.map((item) => {
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
          <div className="contact-page-route-grid" aria-label={french ? "Options d’acheminement des demandes" : "Contact routing options"}>
            {localizedContactRoutes.map((route) => {
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
    </>
  );
}

export default function ContactPage() {
  return <ContactPageContent />;
}
