import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Mail, MapPin, MessageSquareText, Phone, ShieldCheck, Store, UserRoundCheck } from "lucide-react";
import { ContactChatButton } from "@/components/contact/ContactChatButton";
import { ContactTopicField } from "@/components/contact/ContactTopicField";
import { PublicSubmissionForm } from "@/components/forms/PublicSubmissionForm";
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
    title: "Product and order questions",
    text: "Ask about stocked materials, order documents, pickup coordination, or after-sales routing.",
    icon: MessageSquareText
  },
  {
    title: "Local dealer fulfillment",
    text: "For separately offered local services, contact the local dealer you selected or contracted with.",
    icon: Store
  },
  {
    title: "Dealer program inquiries",
    text: "Interested in joining the VanStro network? Send your company details and proposed dealer service area for review.",
    icon: UserRoundCheck
  }
];

const quickContacts = [
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
    value: "204-505-2288",
    href: "tel:+12045052288",
    icon: Phone
  },
  {
    title: "Dealer routing",
    text: "Availability, pickup, delivery coordination and separately offered local services are handled by the local dealer selected for the order.",
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
    text: "Separately quoted local services are provided by the local dealer unless VanStro expressly states otherwise in writing.",
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
    dealer: "MB01 - Yuan Construction Ltd.",
    phone: "204-505-2288",
    email: "MB01@VANSTRO.CA",
    address: "856 Century St, Winnipeg, MB R3H 0M5"
  }
];

export function ContactPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  const localizedContactRoutes = french
    ? [
        { title: "Questions sur les produits et les commandes", text: "Posez vos questions sur les matériaux en stock, les documents de commande, le ramassage ou le soutien après-vente.", icon: MessageSquareText },
        { title: "Prise en charge par un détaillant local", text: "Pour les services locaux offerts séparément, communiquez avec le détaillant que vous avez choisi ou avec lequel vous avez conclu une entente.", icon: Store },
        { title: "Programme pour les détaillants", text: "Vous souhaitez vous joindre au réseau VanStro? Transmettez les renseignements sur votre entreprise et la zone de service proposée.", icon: UserRoundCheck }
      ]
    : contactRoutes;
  const localizedQuickContacts = french
    ? [
        { title: "Soutien par courriel", text: "Notre équipe répond aux demandes par courriel dans un délai de 24 heures ouvrables.", value: "support@vanstro.ca", href: "mailto:support@vanstro.ca", icon: Mail },
        { title: "Soutien téléphonique", text: "Pour les questions urgentes sur une commande ou l’orientation vers un détaillant pendant les heures d’ouverture.", value: "204-505-2288", href: "tel:+12045052288", icon: Phone },
        { title: "Orientation vers un détaillant", text: "Le détaillant choisi pour la commande confirme la disponibilité et coordonne le ramassage, la livraison et les services locaux offerts séparément.", value: "Trouvez du soutien local ci-dessous", href: "#dealer-contacts", icon: Store }
      ]
    : quickContacts;
  const localizedContactDetails = french
    ? [
        { title: "Suivi les jours ouvrables", text: "La plupart des demandes générales sont acheminées dans un délai d’un jour ouvrable.", icon: Clock3 },
        { title: "Limites des services", text: "Les services locaux faisant l’objet d’un devis distinct sont fournis par le détaillant, sauf indication écrite contraire de VanStro.", icon: ShieldCheck },
        { title: "Siège social", text: "VanStro Global Supply Inc. a son siège social à Winnipeg, au Manitoba.", icon: MapPin }
      ]
    : contactDetails;

  return (
    <>
      <section className="page-hero contact-page-hero">
        <div className="container contact-page-hero-grid">
          <div>
            <PageBreadcrumb items={[{ label: french ? "Accueil" : "Home", href: localeHref("/", locale) }, { label: french ? "Nous joindre" : "Contact us" }]} />
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
          <PublicSubmissionForm
            className="form-panel form-grid two contact-page-form"
            id="contact-form"
            kind="contact"
          >
            <div className="contact-page-form-heading form-wide">
              <span className="contact-page-kicker">{french ? "Demande générale" : "General inquiry"}</span>
              <h2>{french ? "Transmettez-nous les renseignements une seule fois; nous acheminerons votre demande à la bonne équipe." : "Send us the details once. We will route it."}</h2>
              <p>
                {french
                  ? "Indiquez votre numéro de commande, la catégorie de produit, votre ville et votre détaillant préféré, s’il y a lieu."
                  : "Include your order number, product category, city, and preferred dealer if you have one."}
              </p>
            </div>
            <div className="field">
              <label htmlFor="name">{french ? "Nom" : "Name"}</label>
              <input id="name" name="name" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="email">{french ? "Courriel" : "Email"}</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <ContactTopicField locale={locale} />
            <div className="field">
              <label htmlFor="phone">{french ? "Téléphone" : "Phone"}</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="city">{french ? "Ville / province" : "City / province"}</label>
              <input id="city" name="city" autoComplete="address-level2" />
            </div>
            <div className="field">
              <label htmlFor="dealer">{french ? "Détaillant préféré" : "Preferred dealer"}</label>
              <select id="dealer" name="dealer" defaultValue="">
                <option value="">{french ? "Je ne sais pas — choisir selon mon emplacement" : "Not sure / route by location"}</option>
                {dealerContacts.map((dealer) => (
                  <option value={dealer.dealer} key={dealer.dealer}>
                    {dealer.region} - {dealer.dealer}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="orderNumber">{french ? "Numéro de commande" : "Order number"}</label>
              <input id="orderNumber" name="orderNumber" placeholder={french ? "Facultatif" : "Optional"} />
            </div>
            <div className="field form-wide">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                placeholder={french ? "Décrivez votre besoin, notamment le nom des produits, l’emplacement du détaillant ou les échéances." : "Tell us what you need help with, including product names, dealer location, or timing details."}
                required
              />
            </div>
            <p className="form-wide form-privacy-disclosure">
              {french
                ? "Ce formulaire transmet votre demande et vos coordonnées à VanStro. Si vous choisissez un détaillant ou demandez une coordination locale, VanStro peut communiquer les renseignements raisonnablement nécessaires à ce détaillant pour répondre à votre demande."
                : "This form sends your inquiry and contact details to VanStro. If you select a dealer or request local coordination, VanStro may share information reasonably necessary for that dealer to respond to your request."}{" "}
              <Link href={localeHref("/privacy", locale)}>
                {french ? "Consultez la Politique de confidentialité." : "Read the Privacy Policy."}
              </Link>
            </p>
            <button className="button button-primary" type="submit">
              {french ? "Envoyer le message" : "Send message"}
            </button>
          </PublicSubmissionForm>

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

      <section className="page-panel contact-page-panel" id="dealer-contacts">
        <div className="container contact-page-dealer-section">
          <div className="contact-page-section-heading">
            <span className="contact-page-kicker">{french ? "Coordonnées des détaillants locaux" : "Local dealer contacts"}</span>
            <h2>{french ? "Trouvez les coordonnées du détaillant le plus proche" : "Find the nearest support contact"}</h2>
            <p>
              {french
                ? "Le détaillant local choisi pour une commande confirme la disponibilité et coordonne le ramassage, les options de livraison, les demandes de retour et le soutien après-vente. Communiquez avec ce détaillant pour l’installation ou tout autre service local offert séparément."
                : "The local dealer selected for an order confirms availability and coordinates pickup, delivery options, return requests and after-sales assistance. Contact that dealer for installation or other separately offered local services."}
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

export default function ContactPage() {
  return <ContactPageContent />;
}
