import Link from "next/link";
import { assetPath } from "@/lib/assets";
import { localeHref } from "@/lib/i18n/routes";
import type { SiteLocale } from "@/lib/i18n/locale";
import { CHEV, DealerToolsStage } from "./DealerToolsStage";
import "./dealer-design.css";

const EN = {
  h1: "Dealer Program",
  lede: "For qualified local building-materials operators who can support customer communication, order execution and local service within VanStro's platform-backed supply model.",
  apply: "Start dealer application",
  reviewFit: "Review fit first",
  glanceTitle: "Program At A Glance",
  glanceLede: "The dealer program is structured around a platform-backed product supply model and local dealer responsibility.",
  pillars: [
    ["VanStro role", "Product supply platform and dealer tools after written approval.", "Product supply platform, catalog, checkout, product information, dealer network support, and dealer operating tools after written approval."],
    ["Dealer role", "Local customer contact, order execution and service coordination.", "Independent local customer contact, order execution, delivery coordination and services where offered."],
    ["Application status", "Reviewed case by case. Submission is not approval.", "Reviewed case by case. Submission does not guarantee approval, a dealer service area assignment, pricing or customer referrals."],
    ["Final terms", "Written approval or agreement before launch.", "Commercial terms, launch timing and obligations require written approval or agreement."]
  ] as const,
  fitTitle: "Partner Qualification",
  fitLede: "This page is intended for B2B operators who can take local responsibility for customer contact and service coordination. It is not a general consumer support page.",
  good: "Good fit",
  goodItems: [
    "Showroom, contractor or local building-materials business",
    "Defined dealer service area and customer-facing team",
    "Ability to coordinate pickup, delivery or after-sales support",
    "Willingness to follow applicable VanStro product and disclosure policies while operating independently"
  ],
  not: "Not a fit yet",
  notItems: [
    "No local service or customer support capacity",
    "Unclear responsibility ownership for dealer-provided services",
    "Expectation that VanStro will absorb dealer service liability",
    "Requirement for guaranteed referrals, customers, orders, revenue or profit"
  ],
  modelTitle: "Operating Model",
  modelLede: "VanStro separates platform product supply from dealer-provided local services. The distinction should be clear to applicants, customers and dealer teams before work begins.",
  modelRows: [
    ["Product order", "Catalog and checkout on the platform. Local handoff with the dealer.", "Catalog, product supply, product information, platform checkout and product policy review.", "Local order execution, customer communication and product handoff.", "Browses products online and may select a participating independent local dealer for the applicable order."],
    ["Dealer services", "Extended services stay with the dealer unless VanStro states otherwise in writing.", "Does not provide delivery, installation, measurement or renovation services unless stated in writing.", "Sets service scope, price, schedule, payment collection, workmanship and service warranty.", "Contracts directly with the dealer for extended services where offered."],
    ["Returns and support", "The selling local dealer is the first point of contact.", "Reviews product-policy escalations and RMA matters where appropriate.", "First point of contact for delivery, returns, exchanges and after-sales support.", "Starts routine support and return questions with the selling local dealer."],
    ["Dealer tools", "3D, ERP and CRM after written approval. They do not move dealer-service fees.", "Provides 3D design with the VanStro product library, plus dedicated ERP and CRM, after written approval.", "Uses the tools for local selling, order follow-through and customer records.", "Does not change who the customer contracts with for dealer services, or who collects those fees."]
  ] as const,
  tri: ["VanStro platform", "Dealer partner", "Customer path"] as const,
  boundaryTitle: "Responsibility boundary",
  boundaryText: "Product orders do not include dealer extended services unless VanStro states otherwise in writing. Dealer service fees are separate from VanStro product pricing and are collected directly by the dealer.",
  toolsTitle: "Dealer Operating Tools",
  toolsLede: "After written approval or agreement, VanStro may make three systems available to participating dealers: a 3D design workspace with the VanStro product library, a dedicated ERP for orders, inventory and sales, and a CRM for local customer work. The tools support the dealer's own operation. They do not guarantee customers, orders, revenue or profit, and they do not move dealer-service liability onto VanStro.",
  reviewTitle: "Application Review",
  reviewLede: "VanStro reviews dealer applications for local coverage, operating readiness and fit with the existing dealer network. Submission is not approval.",
  steps: [
    ["1 · Company profile", "Business details, proposed dealer service area, product focus and operating capabilities."],
    ["2 · Participation review", "VanStro reviews the applicant's customer support capacity in its proposed dealer service area."],
    ["3 · Review VanStro order, return, privacy and dealer-disclosure rules", "Candidates review the rules that apply to VanStro orders, returns, privacy and independent-dealer disclosure, not to unrelated operations."],
    ["4 · Activation", "Launch timing and commercial terms are confirmed only through written approval or agreement."]
  ] as const,
  rulesTitle: "Operating Rules Before Applying",
  rulesLede: "These pages explain the rules that prospective dealers should understand before applying. They are part of the operating context, not marketing material.",
  rules: [
    ["/dealer-services-and-responsibility", "Dealer Services & Responsibility", "Service liability, service pricing, customer handoff and platform boundary."],
    ["/return-policy", "Return Policy", "Return routing, RMA review, distributor handling and escalation path."],
    ["/privacy", "Privacy Policy", "Application information, customer referrals and dealer data sharing."],
    ["/terms-and-conditions", "Terms and Conditions", "Website use, ordering terms, permitted use and governing law."],
    ["/legal-disclaimer", "Legal Disclaimer", "Product information, images, pricing references and non-binding website content."],
    ["/cookie-settings", "Cookie Preferences", "Consent controls for optional functional, analytics and marketing cookies."],
    ["/careers", "Careers", "Team growth and future regional opportunities."]
  ] as const,
  notesTitle: "Important Application Notes",
  notes: [
    "Each dealer independently manages its business operations, marketing, customers, personnel, resale and service pricing, and any services it offers.",
    "Submitting an application does not guarantee approval, a dealer service area arrangement, pricing terms, customer referrals, orders, revenue, profit, launch timing or a dealer relationship. Final terms require written approval or agreement.",
    "Application information may be used for cooperation review, dealer onboarding, local coverage assessment and follow-up communication. Review the Privacy Policy and Cookie Preferences before submitting information."
  ],
  ctaTitle: "Discuss Your Market And Local Coverage.",
  ctaLede: "Share your company profile, proposed dealer service area and local support capabilities. VanStro will review fit and follow up with the right team.",
  ctaCardTitle: "Dealer program team",
  ctaCardInclude: "What to include",
  start: "Start application",
  contact: "Contact dealer program team",
  heroAlt: "White Shaker kitchen from the VanStro catalog",
  ctaAlt: "Finished kitchen with VanStro-style cabinetry in a working home",
  navProgram: "Dealer Program",
  navFit: "Qualification",
  navModel: "Operating model",
  navTools: "Tools",
  navReview: "Review",
  navRules: "Rules",
  navApply: "Application",
};

const FR = {
  h1: "Programme pour les détaillants",
  lede: "Pour les entreprises locales qualifiées de matériaux de construction qui peuvent assurer les communications avec les clients, l’exécution des commandes et les services locaux dans le modèle d’approvisionnement soutenu par la plateforme VanStro.",
  apply: "Commencer une demande de détaillant",
  reviewFit: "Évaluer l’admissibilité",
  glanceTitle: "Le programme en bref",
  glanceLede: "Le programme destiné aux détaillants repose sur un modèle d’approvisionnement soutenu par la plateforme et sur la responsabilité du détaillant local.",
  pillars: [
    ["Rôle de VanStro", "Plateforme d’approvisionnement et outils pour les détaillants après une approbation écrite.", "Plateforme d’approvisionnement, catalogue, paiement, renseignements sur les produits, soutien du réseau de détaillants, et outils d’exploitation pour les détaillants après une approbation écrite."],
    ["Rôle du détaillant", "Point de contact local, exécution des commandes et coordination des services.", "Point de contact local indépendant, exécution des commandes, coordination des livraisons et services offerts, le cas échéant."],
    ["État de la demande", "Évaluation au cas par cas. La soumission ne constitue pas une approbation.", "Évaluation au cas par cas. La soumission ne garantit ni l’approbation, ni l’attribution d’une zone de service, ni des prix ou des recommandations de clients."],
    ["Modalités définitives", "Approbation ou entente écrite avant le lancement.", "Les modalités commerciales, le calendrier de lancement et les obligations nécessitent une approbation écrite ou une entente."]
  ] as const,
  fitTitle: "Admissibilité des partenaires",
  fitLede: "Cette page s’adresse aux entreprises interentreprises qui peuvent assumer localement les communications avec les clients et la coordination des services. Il ne s’agit pas d’une page générale de soutien aux consommateurs.",
  good: "Profil recherché",
  goodItems: ["Salle d’exposition, entreprise d’entrepreneur ou commerce local de matériaux de construction", "Zone de service définie et équipe en contact avec la clientèle", "Capacité à coordonner le ramassage, la livraison ou le soutien après-vente", "Volonté de respecter les politiques VanStro applicables sur les produits et les renseignements, tout en demeurant indépendant"],
  not: "Pas encore admissible",
  notItems: ["Aucune capacité de service local ou de soutien à la clientèle", "Responsabilités incertaines pour les services fournis par le détaillant", "Attente que VanStro assume la responsabilité des services du détaillant", "Exigence de recommandations, clients, commandes, revenus ou bénéfices garantis"],
  modelTitle: "Modèle opérationnel",
  modelLede: "VanStro distingue l’approvisionnement en produits de la plateforme des services locaux fournis par le détaillant. Cette distinction doit être claire pour les demandeurs, les clients et les équipes des détaillants avant le début du travail.",
  modelRows: [
    ["Commande de produits", "Catalogue et paiement sur la plateforme. Remise locale avec le détaillant.", "Catalogue, approvisionnement, renseignements sur les produits, paiement sur la plateforme et examen des politiques relatives aux produits.", "Exécution locale de la commande, communications avec le client et remise du produit.", "Consulte les produits en ligne et peut choisir un détaillant local indépendant participant pour la commande visée."],
    ["Services du détaillant", "Les services supplémentaires restent chez le détaillant, sauf indication écrite contraire.", "Ne fournit pas la livraison, l’installation, la prise de mesures ou la rénovation, sauf indication écrite contraire.", "Établit la portée des services, le prix, l’horaire, la perception des paiements, la qualité d’exécution et la garantie de service.", "Contracte directement avec le détaillant pour les services supplémentaires offerts."],
    ["Retours et soutien", "Le détaillant vendeur est le premier point de contact.", "Examine les escalades liées aux politiques sur les produits et les demandes d’ARM, s’il y a lieu.", "Premier point de contact pour la livraison, les retours, les échanges et le soutien après-vente.", "Commence les demandes courantes de soutien et de retour auprès du détaillant vendeur."],
    ["Outils du détaillant", "Conception 3D, ERP et CRM après une approbation écrite. Ils ne déplacent pas les frais de service du détaillant.", "Fournit la conception 3D avec la bibliothèque de produits VanStro et un rendu, plus un ERP et un CRM dédiés, après une approbation écrite.", "Utilise les outils pour la vente locale, le suivi des commandes et les dossiers clients.", "Ne change pas la partie avec laquelle le client contracte pour les services du détaillant, ni qui perçoit ces frais."]
  ] as const,
  tri: ["Plateforme VanStro", "Détaillant partenaire", "Parcours du client"] as const,
  boundaryTitle: "Limite des responsabilités",
  boundaryText: "Les commandes de produits n’incluent pas les services supplémentaires du détaillant, sauf indication écrite de VanStro. Les frais de service du détaillant sont distincts du prix des produits VanStro et sont perçus directement par le détaillant.",
  toolsTitle: "Outils d’exploitation pour les détaillants",
  toolsLede: "Les détaillants participants reçoivent trois systèmes VanStro après une approbation ou une entente écrite : un espace de conception 3D avec la bibliothèque de produits VanStro et un rendu, un ERP dédié aux commandes, aux stocks et aux ventes, et un CRM pour le travail client local. Les outils soutiennent l’exploitation du détaillant. Ils ne garantissent ni clients, ni commandes, ni revenus ou bénéfices, et ne transfèrent pas la responsabilité des services du détaillant à VanStro.",
  reviewTitle: "Examen des demandes",
  reviewLede: "VanStro examine les demandes de détaillants selon la couverture locale, la préparation opérationnelle et la compatibilité avec le réseau de détaillants existant. La soumission ne constitue pas une approbation.",
  steps: [
    ["1 · Profil de l’entreprise", "Détails de l’entreprise, zone de service proposée, spécialités de produits et capacités opérationnelles."],
    ["2 · Examen de la participation", "VanStro examine la capacité du demandeur à soutenir les clients dans sa zone de service proposée."],
    ["3 · Examiner les règles VanStro sur les commandes, les retours, les renseignements personnels et les divulgations relatives aux détaillants", "Les candidats examinent les règles applicables aux commandes, retours, renseignements personnels et divulgations relatives aux détaillants indépendants de VanStro, et non à leurs activités sans lien."],
    ["4 · Activation", "Le calendrier de lancement et les modalités commerciales sont confirmés uniquement par une approbation ou une entente écrite."]
  ] as const,
  rulesTitle: "Règles opérationnelles avant de présenter une demande",
  rulesLede: "Ces pages expliquent les règles que les détaillants éventuels doivent comprendre avant de présenter une demande. Elles font partie du contexte opérationnel et non du matériel promotionnel.",
  rules: [
    ["/dealer-services-and-responsibility", "Services et responsabilités du détaillant", "Responsabilité des services, tarification, remise au client et limites de la plateforme."],
    ["/return-policy", "Politique de retour", "Acheminement des retours, examen des ARM, traitement par le distributeur et processus d’escalade."],
    ["/privacy", "Politique de confidentialité", "Renseignements de la demande, recommandations de clients et partage des données."],
    ["/terms-and-conditions", "Modalités", "Utilisation du site, modalités de commande, utilisation permise et droit applicable."],
    ["/legal-disclaimer", "Avis juridique", "Renseignements sur les produits, images, références de prix et contenu non contraignant du site."],
    ["/cookie-settings", "Préférences relatives aux témoins", "Contrôles de consentement pour les témoins fonctionnels, analytiques et publicitaires facultatifs."],
    ["/careers", "Carrières", "Croissance de l’équipe et occasions régionales futures."]
  ] as const,
  notesTitle: "Notes importantes sur la demande",
  notes: [
    "Chaque détaillant gère indépendamment ses activités, son marketing, ses clients, son personnel, ses prix de revente et de service, ainsi que les services qu’il offre.",
    "La présentation d’une demande ne garantit pas l’approbation, une zone de service, des modalités de prix, des recommandations de clients, des commandes, des revenus, des bénéfices, un calendrier de lancement ou une relation de détaillant. Les modalités finales exigent une approbation ou une entente écrite.",
    "Les renseignements de la demande peuvent servir à l’examen de la coopération, à l’intégration du détaillant, à l’évaluation de la couverture locale et aux communications de suivi. Consultez la Politique de confidentialité et les Préférences relatives aux témoins avant de transmettre des renseignements."
  ],
  ctaTitle: "Discutez de votre marché et de votre couverture locale.",
  ctaLede: "Présentez le profil de votre entreprise, votre zone de service proposée et vos capacités de soutien local. VanStro évaluera l’admissibilité et fera un suivi avec la bonne équipe.",
  ctaCardTitle: "Équipe du programme détaillants",
  ctaCardInclude: "À inclure",
  start: "Commencer une demande",
  contact: "Communiquer avec l’équipe du programme",
  heroAlt: "Cuisine blanche du catalogue VanStro",
  ctaAlt: "Cuisine aménagée avec des armoires de style VanStro",
  navProgram: "Programme détaillants",
  navFit: "Admissibilité",
  navModel: "Modèle d'exploitation",
  navTools: "Outils",
  navReview: "Examen",
  navRules: "Règles",
  navApply: "Demande",
};

export function DealerProgramDesign({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";
  const t = french ? FR : EN;
  const apply = localeHref("/dealers/apply", locale);
  const navLinks = [
    { href: "#top", label: t.navProgram },
    { href: "#fit", label: t.navFit },
    { href: "#model", label: t.navModel },
    { href: "#tools", label: t.navTools },
    { href: "#review", label: t.navReview },
    { href: "#policies", label: t.navRules },
    { href: apply, label: t.navApply }
  ] as const;
  return (
    <div className="dealer-program-page">
      <section className="hero" id="top">
        <img className="hero-bg" src={assetPath("/assets/dealers/kitchen-scene.webp")} alt={t.heroAlt} width={1672} height={941} />
        <div className="hero-veil" aria-hidden="true" />
        <div className="hero-copy">
          <div>
            <h1>{t.h1}</h1>
            <p className="hero-lede">{t.lede}</p>
            <div className="hero-actions">
              <Link className="btn btn-white" href={apply}>{t.apply}</Link>
              <a className="btn btn-ghost" href="#fit">{t.reviewFit}</a>
            </div>
          </div>
        </div>
      </section>

      <nav className="dealer-program-nav" aria-label="Dealer program sections">
        <div className="wrap">
          {navLinks.map((item) => (
            <a key={item.label} href={item.href}>{item.label}</a>
          ))}
        </div>
      </nav>

      <section className="why" id="glance">
        <div className="wrap">
          <h2 className="section-title">{t.glanceTitle}</h2>
          <p className="lede">{t.glanceLede}</p>
          <div className="pillars">
            {t.pillars.map(([title, blurb, full], index) => (
              <details className="pillar" name="glance" key={title} open={index === 0}>
                <summary>
                  <div>
                    <h3>{title}</h3>
                    <p className="blurb">{blurb}</p>
                  </div>
                  {CHEV}
                </summary>
                <p className="full">{full}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="chapter" id="fit">
        <div className="wrap">
          <div className="chapter-head">
            <div>
              <h2 className="section-title">{t.fitTitle}</h2>
              <p className="lede">{t.fitLede}</p>
            </div>
            <Link className="btn btn-ink" href={apply}>{t.apply}</Link>
          </div>
          <div className="matter">
            <div className="matter-item">
              <h3>{t.good}</h3>
              <ul>{t.goodItems.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="matter-item is-no">
              <h3>{t.not}</h3>
              <ul>{t.notItems.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      <section className="chapter soft" id="model">
        <div className="wrap">
          <div className="chapter-head">
            <div>
              <h2 className="section-title">{t.modelTitle}</h2>
              <p className="lede">{t.modelLede}</p>
            </div>
            <Link className="btn btn-ink" href={apply}>{t.apply}</Link>
          </div>
          <div className="soft-band">
            {t.modelRows.map(([title, blurb, vanstro, dealer, customer], index) => (
              <details className="model-row" name="model" key={title} open={index === 0}>
                <summary>
                  <div>
                    <h3>{title}</h3>
                    <p className="blurb">{blurb}</p>
                  </div>
                  {CHEV}
                </summary>
                <div className="tri">
                  <div><h4>{t.tri[0]}</h4><p>{vanstro}</p></div>
                  <div><h4>{t.tri[1]}</h4><p>{dealer}</p></div>
                  <div><h4>{t.tri[2]}</h4><p>{customer}</p></div>
                </div>
              </details>
            ))}
            <p className="boundary"><strong>{t.boundaryTitle}</strong> {t.boundaryText}</p>
          </div>
        </div>
      </section>

      <section className="tools" id="tools">
        <div className="tools-head">
          <div className="wrap">
            <div className="chapter-head">
              <div>
                <h2 className="section-title">{t.toolsTitle}</h2>
                <p className="lede">{t.toolsLede}</p>
              </div>
              <Link className="btn btn-white" href={apply}>{t.apply}</Link>
            </div>
            <DealerToolsStage french={french} />
          </div>
        </div>
      </section>

      <section className="faq" id="review">
        <div className="wrap">
          <h2 className="section-title">{t.reviewTitle}</h2>
          <p className="lede">{t.reviewLede}</p>
          <div className="faq-list">
            {t.steps.map(([title, text], index) => (
              <details className="faq-item" name="review" key={title} open={index === 0}>
                <summary><h3>{title}</h3>{CHEV}</summary>
                <p>{text}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="rules" id="policies">
        <div className="wrap">
          <h2 className="section-title">{t.rulesTitle}</h2>
          <p className="lede">{t.rulesLede}</p>
          <div className="rule-list">
            {t.rules.map(([href, label, scope]) => (
              <Link href={localeHref(href, locale)} key={href}>
                <strong>{label}</strong>
                <small>{scope}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="notes" id="notes">
        <div className="wrap">
          <h2 className="section-title">{t.notesTitle}</h2>
          {t.notes.map((note) => <p key={note}>{note}</p>)}
        </div>
      </section>

      <section className="cta">
        <img className="cta-bg" src={assetPath("/assets/dealers/kitchen-life.jpg")} alt={t.ctaAlt} width={1600} height={1000} />
        <div className="cta-veil" aria-hidden="true" />
        <div className="cta-copy">
          <div>
            <h2 className="section-title">{t.ctaTitle}</h2>
            <p className="lede">{t.ctaLede}</p>
            <div className="cta-actions">
              <Link className="btn btn-white" href={apply}>{t.start}</Link>
              <a className="btn btn-ghost" href="mailto:dealer@vanstro.ca">{t.contact}</a>
            </div>
          </div>
          <aside className="cta-card">
            <h3>{t.ctaCardTitle}</h3>
            <ul className="cta-card-lines">
              <li><a href="mailto:dealer@vanstro.ca">dealer@vanstro.ca</a></li>
              <li><a href="tel:+12042212288">204 221 2288</a></li>
              <li>856 Century Street<br />Winnipeg, MB R3H 0M5</li>
            </ul>
            <hr />
            <p className="cta-card-label">{t.ctaCardInclude}</p>
            <p className="cta-card-note">{t.steps[0][1]}</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
