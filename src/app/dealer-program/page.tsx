import type { Metadata } from "next";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { assetPath } from "@/lib/assets";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Dealer program",
  description:
    "Review the VanStro dealer program for qualified local building-materials operators, including platform responsibilities, dealer responsibilities, application review and policy requirements.",
  path: "/dealer-program",
  image: "/assets/generated/dealer-program-handshake-v1.webp"
});

const englishContent = {
  breadcrumbHome: "Home",
  breadcrumbPage: "Dealer program",
  heroTitle: "Dealer program",
  heroText: "For qualified local building-materials operators who can support customer communication, order execution and local service within VanStro's platform-backed supply model.",
  apply: "Start dealer application",
  reviewFit: "Review fit first",
  imageAlt: "Business handshake representing a VanStro dealer partnership",
  glanceTitle: "Program at a glance",
  glanceText: "The dealer program is structured around a platform-backed product supply model and local dealer responsibility.",
  summaryLabel: "Program summary",
  atAGlance: [
    ["VanStro role", "Product supply platform, catalog, checkout, product information and dealer network support."],
    ["Dealer role", "Independent local customer contact, order execution, delivery coordination and services where offered."],
    ["Application status", "Reviewed case by case. Submission does not guarantee approval, a dealer service area assignment, pricing or customer referrals."],
    ["Final terms", "Commercial terms, launch timing and obligations require written approval or agreement."]
  ],
  qualificationTitle: "Partner qualification",
  qualificationText: "This page is intended for B2B operators who can take local responsibility for customer contact and service coordination. It is not a general consumer support page.",
  goodFitTitle: "Good fit",
  notFitTitle: "Not a fit yet",
  goodFit: [
    "Showroom, contractor or local building-materials business",
    "Defined dealer service area and customer-facing team",
    "Ability to coordinate pickup, delivery or after-sales support",
    "Willingness to follow applicable VanStro product and disclosure policies while operating independently"
  ],
  notFit: [
    "No local service or customer support capacity",
    "Unclear responsibility ownership for dealer-provided services",
    "Expectation that VanStro will absorb dealer service liability",
    "Requirement for guaranteed referrals, customers, orders, revenue or profit"
  ],
  modelTitle: "Operating model",
  modelText: "VanStro separates platform product supply from dealer-provided local services. The distinction should be clear to applicants, customers and dealer teams before work begins.",
  tableHeaders: ["Area", "VanStro platform", "Dealer partner", "Customer path"],
  operatingRows: [
    { area: "Product order", vanstro: "Catalog, product supply, product information, platform checkout and product policy review.", dealer: "Local order execution, customer communication and product handoff.", customer: "Browses products online and may select a participating independent local dealer for the applicable order." },
    { area: "Dealer services", vanstro: "Does not provide delivery, installation, measurement or renovation services unless stated in writing.", dealer: "Sets service scope, price, schedule, payment collection, workmanship and service warranty.", customer: "Contracts directly with the dealer for extended services where offered." },
    { area: "Returns and support", vanstro: "Reviews product-policy escalations and RMA matters where appropriate.", dealer: "First point of contact for delivery, returns, exchanges and after-sales support.", customer: "Starts routine support and return questions with the selling local dealer." }
  ],
  boundaryTitle: "Responsibility boundary",
  boundaryText: "Product orders do not include dealer extended services unless VanStro states otherwise in writing. Dealer service fees are separate from VanStro product pricing and are collected directly by the dealer.",
  reviewTitle: "Application review",
  reviewText: "VanStro reviews dealer applications for local coverage, operating readiness and fit with the existing dealer network. Submission is not approval.",
  reviewSteps: [
    ["1", "Company profile", "Business details, proposed dealer service area, product focus and operating capabilities."],
    ["2", "Participation review", "VanStro reviews the applicant's customer support capacity in its proposed dealer service area."],
    ["3", "Transaction procedures", "Candidates review procedures that apply to VanStro orders, returns, privacy and independent-dealer disclosure, not to unrelated operations."],
    ["4", "Activation", "Launch timing and commercial terms are confirmed only through written approval or agreement."]
  ],
  policiesTitle: "Operating rules before applying",
  policiesText: "These pages explain the rules that prospective dealers should understand before applying. They are part of the operating context, not marketing material.",
  policyRows: [
    ["Dealer Services & Responsibility", "Service liability, service pricing, customer handoff and platform boundary.", "/dealer-services-and-responsibility"],
    ["Return Policy", "Return routing, RMA review, distributor handling and escalation path.", "/return-policy"],
    ["Privacy Policy", "Application information, customer referrals and dealer data sharing.", "/privacy"],
    ["Terms and Conditions", "Website use, ordering terms, permitted use and governing law.", "/terms-and-conditions"],
    ["Legal Disclaimer", "Product information, images, pricing references and non-binding website content.", "/legal-disclaimer"],
    ["Cookie Preferences", "Consent controls for optional functional, analytics and marketing cookies.", "/cookie-settings"],
    ["Careers", "Team growth and future regional opportunities.", "/careers"]
  ],
  notesTitle: "Important application notes",
  notes: [
    "Each dealer independently manages its business operations, marketing, customers, personnel, resale and service pricing, and any services it offers.",
    "Submitting an application does not guarantee approval, a dealer service area arrangement, pricing terms, customer referrals, orders, revenue, profit, launch timing or a dealer relationship. Final terms require written approval or agreement.",
    "Application information may be used for cooperation review, dealer onboarding, local coverage assessment and follow-up communication. Review the Privacy Policy and Cookie Preferences before submitting information."
  ],
  ctaTitle: "Discuss your market and local coverage.",
  ctaText: "Share your company profile, proposed dealer service area and local support capabilities. VanStro will review fit and follow up with the right team.",
  startApplication: "Start application",
  contactTeam: "Contact dealer program team",
  legalCaution: null
} as const;

const frenchContent = {
  breadcrumbHome: "Accueil",
  breadcrumbPage: "Programme pour les détaillants",
  heroTitle: "Programme pour les détaillants",
  heroText: "Pour les entreprises locales qualifiées de matériaux de construction qui peuvent assurer les communications avec les clients, l’exécution des commandes et les services locaux dans le modèle d’approvisionnement soutenu par la plateforme VanStro.",
  apply: "Commencer une demande de détaillant",
  reviewFit: "Évaluer l’admissibilité",
  imageAlt: "Poignée de main représentant un partenariat de détaillant avec VanStro",
  glanceTitle: "Le programme en bref",
  glanceText: "Le programme destiné aux détaillants repose sur un modèle d’approvisionnement soutenu par la plateforme et sur la responsabilité du détaillant local.",
  summaryLabel: "Résumé du programme",
  atAGlance: [
    ["Rôle de VanStro", "Plateforme d’approvisionnement, catalogue, paiement, renseignements sur les produits et soutien du réseau de détaillants."],
    ["Rôle du détaillant", "Point de contact local indépendant, exécution des commandes, coordination des livraisons et services offerts, le cas échéant."],
    ["État de la demande", "Évaluation au cas par cas. La soumission ne garantit ni l’approbation, ni l’attribution d’une zone de service, ni des prix ou des recommandations de clients."],
    ["Modalités définitives", "Les modalités commerciales, le calendrier de lancement et les obligations nécessitent une approbation écrite ou une entente."]
  ],
  qualificationTitle: "Admissibilité des partenaires",
  qualificationText: "Cette page s’adresse aux entreprises interentreprises qui peuvent assumer localement les communications avec les clients et la coordination des services. Il ne s’agit pas d’une page générale de soutien aux consommateurs.",
  goodFitTitle: "Profil recherché",
  notFitTitle: "Pas encore admissible",
  goodFit: ["Salle d’exposition, entreprise d’entrepreneur ou commerce local de matériaux de construction", "Zone de service définie et équipe en contact avec la clientèle", "Capacité à coordonner le ramassage, la livraison ou le soutien après-vente", "Volonté de respecter les politiques VanStro applicables sur les produits et les renseignements, tout en demeurant indépendant"],
  notFit: ["Aucune capacité de service local ou de soutien à la clientèle", "Responsabilités incertaines pour les services fournis par le détaillant", "Attente que VanStro assume la responsabilité des services du détaillant", "Exigence de recommandations, clients, commandes, revenus ou bénéfices garantis"],
  modelTitle: "Modèle opérationnel",
  modelText: "VanStro distingue l’approvisionnement en produits de la plateforme des services locaux fournis par le détaillant. Cette distinction doit être claire pour les demandeurs, les clients et les équipes des détaillants avant le début du travail.",
  tableHeaders: ["Domaine", "Plateforme VanStro", "Détaillant partenaire", "Parcours du client"],
  operatingRows: [
    { area: "Commande de produits", vanstro: "Catalogue, approvisionnement, renseignements sur les produits, paiement sur la plateforme et examen des politiques relatives aux produits.", dealer: "Exécution locale de la commande, communications avec le client et remise du produit.", customer: "Consulte les produits en ligne et peut choisir un détaillant local indépendant participant pour la commande visée." },
    { area: "Services du détaillant", vanstro: "Ne fournit pas la livraison, l’installation, la prise de mesures ou la rénovation, sauf indication écrite contraire.", dealer: "Établit la portée des services, le prix, l’horaire, la perception des paiements, la qualité d’exécution et la garantie de service.", customer: "Contracte directement avec le détaillant pour les services supplémentaires offerts." },
    { area: "Retours et soutien", vanstro: "Examine les escalades liées aux politiques sur les produits et les demandes d’ARM, s’il y a lieu.", dealer: "Premier point de contact pour la livraison, les retours, les échanges et le soutien après-vente.", customer: "Commence les demandes courantes de soutien et de retour auprès du détaillant vendeur." }
  ],
  boundaryTitle: "Limite des responsabilités",
  boundaryText: "Les commandes de produits n’incluent pas les services supplémentaires du détaillant, sauf indication écrite de VanStro. Les frais de service du détaillant sont distincts du prix des produits VanStro et sont perçus directement par le détaillant.",
  reviewTitle: "Examen des demandes",
  reviewText: "VanStro examine les demandes de détaillants selon la couverture locale, la préparation opérationnelle et la compatibilité avec le réseau de détaillants existant. La soumission ne constitue pas une approbation.",
  reviewSteps: [["1", "Profil de l’entreprise", "Détails de l’entreprise, zone de service proposée, spécialités de produits et capacités opérationnelles."], ["2", "Examen de la participation", "VanStro examine la capacité du demandeur à soutenir les clients dans sa zone de service proposée."], ["3", "Procédures transactionnelles", "Les candidats examinent les procédures applicables aux commandes, retours, renseignements personnels et divulgations relatives aux détaillants indépendants de VanStro, et non à leurs activités sans lien."], ["4", "Activation", "Le calendrier de lancement et les modalités commerciales sont confirmés uniquement par une approbation ou une entente écrite."]],
  policiesTitle: "Règles opérationnelles avant de présenter une demande",
  policiesText: "Ces pages expliquent les règles que les détaillants éventuels doivent comprendre avant de présenter une demande. Elles font partie du contexte opérationnel et non du matériel promotionnel.",
  policyRows: [["Services et responsabilités du détaillant", "Responsabilité des services, tarification, remise au client et limites de la plateforme.", "/dealer-services-and-responsibility"], ["Politique de retour", "Acheminement des retours, examen des ARM, traitement par le distributeur et processus d’escalade.", "/return-policy"], ["Politique de confidentialité", "Renseignements de la demande, recommandations de clients et partage des données.", "/privacy"], ["Modalités", "Utilisation du site, modalités de commande, utilisation permise et droit applicable.", "/terms-and-conditions"], ["Avis juridique", "Renseignements sur les produits, images, références de prix et contenu non contraignant du site.", "/legal-disclaimer"], ["Préférences relatives aux témoins", "Contrôles de consentement pour les témoins fonctionnels, analytiques et publicitaires facultatifs.", "/cookie-settings"], ["Carrières", "Croissance de l’équipe et occasions régionales futures.", "/careers"]],
  notesTitle: "Notes importantes sur la demande",
  notes: ["Chaque détaillant gère indépendamment ses activités, son marketing, ses clients, son personnel, ses prix de revente et de service, ainsi que les services qu’il offre.", "La présentation d’une demande ne garantit pas l’approbation, une zone de service, des modalités de prix, des recommandations de clients, des commandes, des revenus, des bénéfices, un calendrier de lancement ou une relation de détaillant. Les modalités finales exigent une approbation ou une entente écrite.", "Les renseignements de la demande peuvent servir à l’examen de la coopération, à l’intégration du détaillant, à l’évaluation de la couverture locale et aux communications de suivi. Consultez la Politique de confidentialité et les Préférences relatives aux témoins avant de transmettre des renseignements."],
  ctaTitle: "Discutez de votre marché et de votre couverture locale.",
  ctaText: "Présentez le profil de votre entreprise, votre zone de service proposée et vos capacités de soutien local. VanStro évaluera l’admissibilité et fera un suivi avec la bonne équipe.",
  startApplication: "Commencer une demande",
  contactTeam: "Communiquer avec l’équipe du programme",
  legalCaution: "Ces renseignements sont fournis à titre général; faites examiner les modalités applicables par un conseiller juridique avant de vous engager dans une relation de détaillant."
} as const;

export function DealerProgramPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const content = locale === "fr-CA" ? frenchContent : englishContent;
  return <>
    <section className="page-hero dealer-program-hero dealer-program-b2b-hero"><div className="container dealer-program-b2b-hero-grid"><div>
      <PageBreadcrumb items={[{ label: content.breadcrumbHome, href: localeHref("/", locale) }, { label: content.breadcrumbPage }]} />
      <h1>{content.heroTitle}</h1><p>{content.heroText}</p>
      <div className="dealer-program-actions"><Link className="button button-primary" href={localeHref("/dealers/apply", locale)}>{content.apply}</Link><Link className="button button-secondary" href={localeHref("#fit", locale)}>{content.reviewFit}</Link></div>
    </div><figure className="dealer-program-visual dealer-program-b2b-visual"><img src={assetPath("/assets/generated/dealer-program-handshake-v1.webp")} alt={content.imageAlt} width={1672} height={941} loading="eager" fetchPriority="high" decoding="async" /></figure></div></section>

    <section className="page-panel dealer-program-panel"><div className="container dealer-program-b2b-split"><div className="dealer-program-b2b-heading"><h2>{content.glanceTitle}</h2><p>{content.glanceText}</p></div><aside className="dealer-program-b2b-summary" aria-label={content.summaryLabel}><dl>{content.atAGlance.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl></aside></div></section>

    <section className="page-panel dealer-program-panel" id="fit"><div className="container dealer-program-b2b-split"><div className="dealer-program-b2b-heading"><h2>{content.qualificationTitle}</h2><p>{content.qualificationText}</p></div><div className="dealer-program-b2b-qualification"><article><h3>{content.goodFitTitle}</h3><ul>{content.goodFit.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h3>{content.notFitTitle}</h3><ul>{content.notFit.map((item) => <li key={item}>{item}</li>)}</ul></article></div></div></section>

    <section className="page-panel dealer-program-panel alt" id="model"><div className="container"><div className="dealer-program-b2b-heading wide"><h2>{content.modelTitle}</h2><p>{content.modelText}</p></div><div className="dealer-program-b2b-table-wrap"><table className="dealer-program-b2b-table"><thead><tr>{content.tableHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{content.operatingRows.map((row) => <tr key={row.area}><th scope="row">{row.area}</th><td>{row.vanstro}</td><td>{row.dealer}</td><td>{row.customer}</td></tr>)}</tbody></table></div><div className="dealer-program-b2b-notice"><strong>{content.boundaryTitle}</strong><p>{content.boundaryText}</p></div></div></section>

    <section className="page-panel dealer-program-panel"><div className="container dealer-program-b2b-split"><div className="dealer-program-b2b-heading"><h2>{content.reviewTitle}</h2><p>{content.reviewText}</p></div><ol className="dealer-program-b2b-steps">{content.reviewSteps.map(([number, title, text]) => <li key={title}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></div></section>

    <section className="page-panel dealer-program-panel alt" id="policies"><div className="container dealer-program-b2b-split"><div className="dealer-program-b2b-heading"><h2>{content.policiesTitle}</h2><p>{content.policiesText}</p></div><div className="dealer-program-b2b-policy-list">{content.policyRows.map(([label, scope, href]) => <Link href={localeHref(href, locale)} key={label}><span>{label}</span><small>{scope}</small></Link>)}</div></div></section>

    <section className="page-panel dealer-program-panel"><div className="container dealer-program-b2b-legal"><h2>{content.notesTitle}</h2>{content.notes.map((note) => <p key={note}>{note}</p>)}{content.legalCaution ? <p>{content.legalCaution}</p> : null}</div></section>
    <section className="dealer-program-cta dealer-program-b2b-cta"><div className="container dealer-program-cta-grid"><div><h2>{content.ctaTitle}</h2><p>{content.ctaText}</p></div><div className="dealer-program-actions"><Link className="button button-primary" href={localeHref("/dealers/apply", locale)}>{content.startApplication}</Link><Link className="button button-secondary" href={localeHref("/contact", locale)}>{content.contactTeam}</Link></div></div></section>
  </>;
}

export default function DealerProgramPage() {
  return <DealerProgramPageContent />;
}
