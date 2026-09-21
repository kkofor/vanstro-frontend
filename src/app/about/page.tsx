import type { Metadata } from "next";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { assetPath } from "@/lib/assets";
import { buildPageMetadata } from "@/lib/seo/metadata";
import type { SiteLocale } from "@/lib/i18n/locale";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";

export const metadata: Metadata = buildPageMetadata({
  title: "About VanStro Global Supply | Building Materials Platform Canada",
  description:
    "VanStro connects established building materials manufacturing with local dealer service in Canada. RTA cabinets, vanities, wall panels, baseboards and related products.",
  path: "/about",
  image: "/assets/generated/vanstro-dealer-white-v1.webp"
});

const whatWeDo = [
  {
    title: "Global Sourcing & Traceability",
    text:
      "We source products from leading manufacturers around the world through a carefully managed supply chain. Products are subject to documented quality-control and traceability procedures throughout the distribution process."
  },
  {
    title: "National Platform Support",
    text:
      "By centralizing branding, marketing, customer development, supply chain management and operational support, VanStro handles many of the functions that traditionally required significant time, capital and resources from independent dealers."
  },
  {
    title: "Authorized Dealer Network",
    text:
      "Our products are distributed through a network of authorized local dealers who provide delivery coordination, customer support, installation assistance and after-sales service. Services vary by dealer, order and service area."
  }
];

const setsUsApart = [
  {
    title: "Consistent Standards",
    text:
      "Wherever our authorized dealers operate, customers can expect the same quality products, fair pricing and commitment to service."
  },
  {
    title: "Global Sourcing, Competitive Pricing",
    text:
      "Through long-term manufacturing partnerships and supply chain optimization, we deliver quality products at competitive prices. Pricing varies by product, order size, location and dealer."
  },
  {
    title: "Local Service, National Support",
    text:
      "Our dealer partners combine local market knowledge with the strength and resources of a national distribution platform."
  },
  {
    title: "Quality You Can Trust",
    text:
      "Products are inspected, quality-controlled, labelled and traceable through our distribution process. Warranty coverage, exclusions and claim procedures vary by product and order."
  }
];

const platformDuties = [
  "Centralized branding, marketing and national customer development",
  "Long-term manufacturer partnerships and supply chain management",
  "Inventory coordination and supply chain support",
  "Product inspection, quality control and ongoing customer support"
];

const dealerDuties = [
  "Customer communication and local support",
  "Order execution and delivery coordination",
  "Installation assistance, where offered",
  "After-sales service within the dealer's service area"
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

const frenchWhatWeDo = [
  {
    title: "Approvisionnement mondial et traçabilité",
    text:
      "Nous nous approvisionnons auprès de fabricants de premier plan partout dans le monde au moyen d’une chaîne d’approvisionnement rigoureusement gérée. Les produits font l’objet de procédures documentées de contrôle de la qualité et de traçabilité tout au long du processus de distribution."
  },
  {
    title: "Soutien de la plateforme nationale",
    text:
      "En centralisant l’image de marque, le marketing, le développement de la clientèle, la gestion de la chaîne d’approvisionnement et le soutien opérationnel, VanStro prend en charge bon nombre des fonctions qui exigeaient traditionnellement beaucoup de temps, de capital et de ressources de la part des partenaires indépendants."
  },
  {
    title: "Réseau de partenaires autorisés",
    text:
      "Nos produits sont distribués par un réseau de partenaires locaux autorisés qui assurent la coordination des livraisons, le soutien à la clientèle, l’aide à l’installation et le service après-vente. Les services varient selon le partenaire, la commande et la zone de service."
  }
];

const frenchSetsUsApart = [
  {
    title: "Des normes uniformes",
    text:
      "Là où nos partenaires autorisés exercent leurs activités, les clients peuvent compter sur les mêmes produits de qualité, des prix équitables et un engagement envers le service."
  },
  {
    title: "Approvisionnement mondial, prix concurrentiels",
    text:
      "Grâce à des partenariats de fabrication à long terme et à l’optimisation de la chaîne logistique, nous offrons des produits de qualité à des prix concurrentiels. Les prix varient selon le produit, la quantité, l’emplacement et le partenaire."
  },
  {
    title: "Service local, soutien national",
    text:
      "Nos partenaires allient une connaissance du marché local à la force et aux ressources d’une plateforme nationale de distribution."
  },
  {
    title: "Une qualité digne de confiance",
    text:
      "Les produits sont inspectés, contrôlés, étiquetés et traçables tout au long de notre processus de distribution. La couverture de garantie, les exclusions et les procédures de réclamation varient selon le produit et la commande."
  }
];

const frenchPlatformDuties = [
  "Image de marque, marketing et développement de la clientèle à l’échelle nationale",
  "Partenariats de fabrication à long terme et gestion de la chaîne d’approvisionnement",
  "Coordination des stocks et soutien de la chaîne d’approvisionnement",
  "Inspection des produits, contrôle de la qualité et soutien continu à la clientèle"
];

const frenchDealerDuties = [
  "Communication avec la clientèle et soutien local",
  "Exécution des commandes et coordination des livraisons",
  "Aide à l’installation, lorsqu’elle est offerte",
  "Service après-vente dans la zone de service du partenaire"
];

const frenchNextSteps = [
  {
    title: "Vous planifiez un projet résidentiel ?",
    text:
      "Comparez les armoires, les meubles-lavabos, les moulures et la quincaillerie, puis consultez les coordonnées des détaillants.",
    href: "/dealers/map",
    label: "Voir les détaillants"
  },
  {
    title: "Vous achetez comme entrepreneur ou constructeur ?",
    text:
      "Communiquez avec VanStro en indiquant les produits, les quantités, l’emplacement et l’échéancier du projet.",
    href: "/contact",
    label: "Communiquer avec VanStro"
  },
  {
    title: "Vous souhaitez devenir détaillant ?",
    text:
      "Consultez le programme, les critères d’admissibilité et le processus de demande pour devenir détaillant local indépendant.",
    href: "/dealer-program",
    label: "Découvrir le programme"
  }
];

export function AboutPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  const doList = french ? frenchWhatWeDo : whatWeDo;
  const apartList = french ? frenchSetsUsApart : setsUsApart;
  const platformList = french ? frenchPlatformDuties : platformDuties;
  const dealerList = french ? frenchDealerDuties : dealerDuties;
  const steps = french ? frenchNextSteps : nextSteps;
  const warrantyHref = `${localeHref("/articles", locale)}#warranty`;

  return (
    <div className="about-page">
      <section className="about-profile-hero unified-content-hero">
        <div className="container about-profile-hero-grid unified-content-hero-grid">
          <PageBreadcrumb className="unified-content-hero-breadcrumb" items={[{ label: french ? "Accueil" : "Home", href: localeHref("/", locale) }, { label: french ? "À propos" : "About us" }]} />
          <div className="about-profile-hero-copy unified-content-hero-copy">
              <h1>
                {french ? "Plus qu’un fournisseur." : "More Than a Supplier."}
              </h1>
              <p className="about-profile-lede">
                {french
                  ? "Une meilleure façon d’acheminer les matériaux de construction au Canada."
                  : "A Better Way to Bring Building Materials to Canada."}
              </p>
              <p>
                {french
                  ? "VanStro Global Supply Inc. est une entreprise canadienne dont le siège social est situé à Winnipeg, au Manitoba, et qui distribue des matériaux de construction par l’intermédiaire de partenaires locaux autorisés."
                  : "VanStro Global Supply Inc. is a Canadian company headquartered in Winnipeg, Manitoba, distributing building materials through authorized local dealers."}
              </p>
              <div className="about-profile-actions">
                <Link className="button button-primary" href={canonicalCatalogUrl(locale)}>
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
      </section>

      <section className="about-profile-work" aria-labelledby="about-work-title">
        <div className="container about-profile-work-stack">
          <div className="about-profile-section-intro">
            <h2 id="about-work-title">{french ? "Ce que nous faisons" : "What We Do"}</h2>
            <p>
              {french
                ? "Nous sommes une plateforme nationale de chaîne d’approvisionnement et de distribution spécialisée dans les matériaux de construction : armoires de cuisine prêtes à assembler (RTA), meubles-lavabos, panneaux muraux, plinthes et produits connexes."
                : "We are a national supply chain and distribution platform specializing in building materials, including ready-to-assemble (RTA) kitchen cabinets, bathroom vanities, wall panels, baseboards and related products."}
            </p>
            <p>
              {french
                ? "Grâce à des partenariats à long terme avec des fabricants de premier plan, nous offrons une qualité constante, un approvisionnement fiable, des prix concurrentiels et un soutien local fiable. Notre mission est de relier une fabrication établie à un service de proximité."
                : "Through long-term partnerships with leading manufacturers, we provide consistent quality, reliable supply, competitive pricing and dependable local support. Our mission is to connect established manufacturing with local service."}
            </p>
            <p>
              {french
                ? "Nous croyons que les entreprises locales solides sont à la base de communautés solides, et notre plateforme est conçue pour soutenir leur croissance à long terme."
                : "We believe that strong local businesses are the foundation of strong communities, and our platform is built to support their long-term growth."}
            </p>
          </div>
          <div className="about-profile-role-list">
            {doList.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-profile-model" aria-labelledby="about-apart-title">
        <div className="container about-profile-work-stack">
          <div className="about-profile-section-intro">
            <h2 id="about-apart-title">{french ? "Ce qui nous distingue" : "What Sets Us Apart"}</h2>
            <p>
              {french
                ? "Des produits de qualité, des prix concurrentiels et un soutien local fiable, offerts par l’intermédiaire de nos partenaires autorisés."
                : "Quality products, competitive pricing and dependable local support, delivered through our authorized dealers."}
            </p>
          </div>
          <div className="about-profile-role-list about-profile-role-list-quad">
            {apartList.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <p className="about-profile-model-note">
            {french ? "Consultez les " : "See the current "}
            <Link href={warrantyHref}>
              {french ? "conditions de garantie applicables" : "warranty terms"}
            </Link>
            {french
              ? " et la documentation du produit pour connaître la couverture, les exclusions et les procédures de réclamation."
              : " and product documentation for coverage, exclusions and claim procedures."}
          </p>
        </div>
      </section>

      <section className="about-profile-handoff" aria-labelledby="about-handoff-title">
        <div className="container">
          <div className="about-profile-handoff-heading">
            <h2 id="about-handoff-title">
              {french ? "Plateforme nationale. Service de proximité." : "National Platform. Local Service."}
            </h2>
            <p>
              {french
                ? "VanStro centralise l’image de marque, le marketing, le développement de la clientèle et la gestion de la chaîne d’approvisionnement. Le partenaire local autorisé assure la communication avec la clientèle, l’exécution des commandes et le service local."
                : "VanStro centralizes branding, marketing, customer development and supply chain management. The authorized local dealer handles customer communication, order execution and local service."}
            </p>
          </div>
          <div className="about-profile-handoff-grid">
            <article>
              <h3>{french ? "Plateforme VanStro" : "VanStro Platform"}</h3>
              <ul>
                {platformList.map((duty) => (
                  <li key={duty}>{duty}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>{french ? "Votre partenaire local autorisé" : "Your Authorized Local Dealer"}</h3>
              <ul>
                {dealerList.map((duty) => (
                  <li key={duty}>{duty}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="about-profile-handoff-note">
            <p>
              {french
                ? "Les partenaires autorisés sont des entreprises exploitées de façon indépendante, et non des employés, des succursales ou des mandataires de VanStro. Sauf autorisation écrite expresse, un partenaire ne peut pas lier VanStro ni prendre d’engagements en son nom. Le transport, le ramassage, l’aide à l’installation, le soutien après-vente et les autres services varient selon le partenaire, le produit, la commande et la zone de service."
                : "Authorized dealers are independently operated businesses, not VanStro employees, branches or agents. Unless expressly authorized in writing, a dealer cannot bind VanStro or make commitments on VanStro's behalf. Transportation, pickup, installation assistance, post-sale support and other services vary by dealer, product, order and service area."}
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
            <h2 id="about-next-title">{french ? "Choisissez la prochaine étape." : "Choose Your Next Step."}</h2>
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

      <section className="about-profile-commitment" aria-labelledby="about-commitment-title">
        <div className="container about-profile-commitment-grid">
          <p className="about-profile-commitment-eyebrow">{french ? "Notre engagement" : "Our Commitment"}</p>
          <h2 id="about-commitment-title">
            {french
              ? "Qualité supérieure. Des prix concurrentiels. Un service de proximité."
              : "High Quality. Competitive Pricing. Service Close To Home."}
          </h2>
          <p className="about-profile-commitment-body">
            {french
              ? "Nous relions un approvisionnement fiable à un service de proximité afin d’aider les propriétaires, les entrepreneurs, les constructeurs et nos partenaires détaillants à faire avancer leurs projets. Notre engagement est simple : des matériaux de construction de qualité, des prix concurrentiels et un soutien fiable près de chez vous."
              : "We connect reliable supply with local service so homeowners, contractors, builders and our dealer partners can move projects forward. Our commitment is straightforward: quality building materials, competitive pricing and dependable support close to home."}
          </p>
          <div className="about-profile-actions">
            <Link className="button button-primary" href={localeHref("/contact", locale)}>
              {french ? "Communiquer avec nous" : "Contact Us"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AboutPage() {
  return <AboutPageContent />;
}
