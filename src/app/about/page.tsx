import type { Metadata } from "next";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

export const metadata: Metadata = buildPageMetadata({
  title: "About VanStro",
  description:
    "Learn how VanStro connects online ordering for building materials with local dealer fulfillment and support.",
  path: "/about",
  image: "/assets/generated/vanstro-dealer-white-v1.webp"
});

const platformRoles = [
  {
    title: "Product information",
    text:
      "Our catalog helps customers compare product categories, models, SKUs, dimensions, finishes and other published details before ordering."
  },
  {
    title: "Online ordering",
    text:
      "Customers can select products and place orders directly through the VanStro website. Product details, pricing and order information are presented during shopping and checkout."
  },
  {
    title: "Supply coordination",
    text:
      "VanStro coordinates product supply with participating independent local dealers. The local dealer handling an order coordinates the transportation, pickup and post-sale arrangements included for that order."
  }
];

const orderPath = [
  {
    title: "Shop and order online",
    text:
      "Browse products, compare published details and place your order through the VanStro website."
  },
  {
    title: "Product and order coordination",
    text:
      "VanStro records the order and shares the product and order information needed for the local dealer to arrange the included fulfillment."
  },
  {
    title: "Dealer fulfillment and support",
    text:
      "The local dealer handling the order coordinates any included transportation or pickup and explains post-sale support or other services they separately offer."
  }
];

const nextSteps = [
  {
    title: "Planning a home project?",
    text:
      "Compare cabinets, vanities, trim and hardware, then view dealer locations and contact information.",
    href: "/dealers/map",
    label: "View dealer locations"
  },
  {
    title: "Buying as a contractor or builder?",
    text:
      "Contact VanStro with product references, quantities, project location and timing questions.",
    href: "/contact",
    label: "Contact VanStro"
  },
  {
    title: "Interested in becoming a dealer?",
    text:
      "Review the program, qualification criteria and application process for participating as an independent local dealer.",
    href: "/dealer-program",
    label: "Explore the dealer program"
  }
];

export function AboutPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  const roles = french
    ? [
        { title: "Information sur les produits", text: "Notre catalogue aide les clients à comparer les catégories, les modèles, les UGS, les dimensions, les finis et les autres renseignements publiés avant de commander." },
        { title: "Commande en ligne", text: "Les clients peuvent sélectionner des produits et passer leurs commandes directement sur le site VanStro. Les détails, les prix et les renseignements sur la commande sont présentés pendant le magasinage et au moment du paiement." },
        { title: "Coordination de l’approvisionnement", text: "VanStro coordonne l’approvisionnement avec les détaillants locaux indépendants participants. Le détaillant responsable de la commande coordonne le transport, le ramassage et les mesures de suivi après-vente comprises dans la commande." }
      ]
    : platformRoles;
  const path = french
    ? [
        { title: "Magasinez et commandez en ligne", text: "Parcourez les produits, comparez les renseignements publiés et passez votre commande sur le site VanStro." },
        { title: "Coordination du produit et de la commande", text: "VanStro enregistre la commande et transmet les renseignements nécessaires au détaillant local pour coordonner les dispositions comprises dans la commande." },
        { title: "Prise en charge et soutien par le détaillant", text: "Le détaillant responsable coordonne le transport ou le ramassage inclus et explique le soutien après-vente ou les services qu’il offre séparément." }
      ]
    : orderPath;
  const steps = french
    ? [
        { title: "Vous planifiez un projet résidentiel?", text: "Comparez les armoires, les meubles-lavabos, les moulures et la quincaillerie, puis consultez les coordonnées des détaillants.", href: "/dealers/map", label: "Voir les détaillants" },
        { title: "Vous achetez comme entrepreneur ou constructeur?", text: "Communiquez avec VanStro en indiquant les produits, les quantités, l’emplacement et l’échéancier du projet.", href: "/contact", label: "Communiquer avec VanStro" },
        { title: "Vous souhaitez devenir détaillant?", text: "Consultez le programme, les critères d’admissibilité et le processus de demande pour devenir détaillant local indépendant.", href: "/dealer-program", label: "Découvrir le programme" }
      ]
    : nextSteps;

  return (
    <>
      <section className="about-profile-hero">
        <div className="container">
          <PageBreadcrumb items={[{ label: french ? "Accueil" : "Home", href: localeHref("/", locale) }, { label: french ? "À propos" : "About us" }]} />
          <div className="about-profile-hero-grid">
            <div className="about-profile-hero-copy">
              <h1>{french ? "Commandez en ligne. Votre détaillant local prend le relais." : "Order online. Fulfill locally."}</h1>
              <p className="about-profile-lede">
                {french
                  ? "Établie à Winnipeg, VanStro relie les commandes de matériaux de construction à la prise en charge et au soutien offerts par des détaillants locaux."
                  : "Headquartered in Winnipeg, VanStro connects building-material orders with local dealer fulfillment and support."}
              </p>
              <div className="about-profile-actions">
                <Link className="button button-primary" href={localeHref("/products", locale)}>
                  {french ? "Voir les produits" : "Browse products"}
                </Link>
                <Link className="button button-secondary" href={localeHref("/contact", locale)}>
                  {french ? "Communiquer avec VanStro" : "Contact VanStro"}
                </Link>
              </div>
            </div>
            <div className="about-profile-visual">
              <img
                src={assetPath("/assets/generated/vanstro-dealer-white-v1.webp")}
                srcSet={`${assetPath("/assets/generated/vanstro-dealer-white-v1-768.webp")} 768w, ${assetPath("/assets/generated/vanstro-dealer-white-v1-1200.webp")} 1200w, ${assetPath("/assets/generated/vanstro-dealer-white-v1.webp")} 1672w`}
                sizes="(max-width: 980px) calc(100vw - 32px), min(57vw, 800px)"
                alt={french ? "Produits d’armoires entreposés sur des rayonnages et des palettes" : "Cabinet products stored on warehouse racks and pallets"}
                width={1672}
                height={941}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="about-profile-work" aria-labelledby="about-work-title">
        <div className="container about-profile-work-grid">
          <div className="about-profile-section-intro">
            <h2 id="about-work-title">{french ? "Ce que fait VanStro" : "What VanStro does"}</h2>
            <p>
              {french
                ? "VanStro réunit l’information sur les produits, la commande en ligne et la coordination de l’approvisionnement sur une seule plateforme pratique."
                : "VanStro brings product information, online ordering and supply coordination into one practical platform."}
            </p>
          </div>
          <div className="about-profile-role-list">
            {roles.map((role) => (
              <article key={role.title}>
                <h3>{role.title}</h3>
                <p>{role.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-profile-path" aria-labelledby="about-path-title">
        <div className="container">
          <div className="about-profile-path-heading">
            <h2 id="about-path-title">{french ? "Commandez en ligne. Votre détaillant local prend le relais." : "Order online. Fulfill locally."}</h2>
            <p>
              {french
                ? "VanStro fournit la plateforme de produits et de commande en ligne. Le détaillant local indépendant responsable coordonne les dispositions locales incluses."
                : "VanStro provides the online product and ordering platform. The independent local dealer handling the order coordinates the included local arrangements."}
            </p>
          </div>
          <ol className="about-profile-path-list">
            {path.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="about-profile-path-note">
            {french
              ? "Le transport, le ramassage et les services locaux dépendent du détaillant, de la commande et de la zone de service."
              : "Transportation, pickup arrangements and locally offered services depend on the dealer, order and service area."}
          </p>
        </div>
      </section>

      <section className="about-profile-handoff" aria-labelledby="about-handoff-title">
        <div className="container">
          <div className="about-profile-handoff-heading">
            <h2 id="about-handoff-title">
              {french ? "Commande en ligne. Service par un détaillant local." : "Online ordering. Local dealer service."}
            </h2>
            <p>
              {french
                ? "VanStro exploite la plateforme de produits et de commande en ligne. Le détaillant local indépendant responsable coordonne le transport, le ramassage et les dispositions après-vente incluses."
                : "VanStro operates the online product and ordering platform. The independent local dealer handling the order coordinates the included transportation, pickup and post-sale arrangements."}
            </p>
          </div>
          <div className="about-profile-handoff-grid">
            <article>
              <h3>VanStro</h3>
              <ul>
                <li>{french ? "Tient à jour le catalogue de produits en ligne" : "Maintains the online product catalog"}</li>
                <li>{french ? "Fournit l’expérience de magasinage et de commande en ligne" : "Provides the online shopping and ordering experience"}</li>
                <li>{french ? "Coordonne les renseignements sur les produits et les commandes" : "Coordinates product and order information"}</li>
                <li>{french ? "Fournit le soutien relatif à la plateforme et aux politiques sur les produits" : "Provides platform and product-policy support"}</li>
              </ul>
            </article>
            <article>
              <h3>{french ? "Votre détaillant local" : "Your local dealer"}</h3>
              <ul>
                <li>{french ? "Coordonne le transport ou le ramassage inclus dans la commande" : "Coordinates transportation or pickup included for the order"}</li>
                <li>{french ? "Fournit le soutien après-vente applicable" : "Provides the applicable post-sale assistance"}</li>
                <li>{french ? "Communique les modalités locales de ramassage ou de livraison" : "Communicates local fulfillment arrangements"}</li>
                <li>{french ? "Explique les services locaux qu’il offre séparément" : "Explains any local services they separately offer"}</li>
              </ul>
            </article>
          </div>
          <div className="about-profile-handoff-note">
            <p>
              {french
                ? "Les détaillants locaux exercent leurs activités de façon indépendante. Le transport, le ramassage, le soutien après-vente et les autres services peuvent varier selon le détaillant, la commande et la zone de service."
                : "Local dealers operate independently. Transportation, pickup, post-sale assistance and other services may vary by dealer, specific order and service area."}
            </p>
            <Link href={localeHref("/dealer-services-and-responsibility", locale)}>
              {french ? "Lire les responsabilités de VanStro et du détaillant local" : "Read VanStro and Local Dealer Responsibilities"}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="about-profile-next" aria-labelledby="about-next-title">
        <div className="container about-profile-next-grid">
          <div className="about-profile-section-intro">
            <h2 id="about-next-title">{french ? "Choisissez la prochaine étape." : "Choose your next step."}</h2>
            <p>
              {french
                ? "Parcourez les produits, posez une question sur votre projet ou découvrez le programme destiné aux détaillants indépendants."
                : "Browse products, ask about a project or explore the independent dealer program."}
            </p>
          </div>
          <nav className="about-profile-next-list" aria-label={french ? "Prochaines étapes avec VanStro" : "About VanStro next steps"}>
            {steps.map((step) => (
              <Link href={localeHref(step.href, locale)} key={step.title}>
                <span>
                  <strong>{step.title}</strong>
                  <small>{step.text}</small>
                </span>
                <span className="about-profile-next-action">
                  {step.label} <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </>
  );
}

export default function AboutPage() {
  return <AboutPageContent />;
}
