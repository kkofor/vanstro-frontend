import "./dealer-apply-design.css";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicSubmissionForm } from "@/components/forms/PublicSubmissionForm";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Dealer application",
  description:
    "Apply to become a VanStro dealer partner. Share company details, proposed dealer service area, operating capabilities and local support coverage for review.",
  path: "/dealers/apply",
  image: "/assets/generated/dealer-program-handshake-v1.webp"
});

const copy = {
  "en-CA": {
    breadcrumbs: ["Home", "Dealer Program", "Dealer Application"],
    title: "Dealer Application",
    imageAlt: "Business partners discussing a VanStro dealer application",
    startApplication: "Start application",
    reviewFit: "Review fit first",
    intro: "Share your company profile, local coverage and operating capacity. VanStro will review whether your business fits the dealer program before discussing commercial terms.",
    profileKicker: "Company profile",
    profileTitle: "Send The Details Once. We Will Review Fit Before Next Steps.",
    profilePurpose: "We use these answers to see if your coverage and operations fit the program.",
    profileText: "Fields marked required help VanStro determine whether the dealer program can support your market and operating model.",
    businessContact: "Business contact",
    companyName: "Company name",
    contactName: "Contact name",
    email: "Email",
    phone: "Phone",
    website: "Company website",
    optional: "Optional",
    businessType: "Business type",
    selectBusinessType: "Select business type",
    businessTypes: [
      ["showroom", "Showroom / design centre"],
      ["contractor", "Contractor / trade operator"],
      ["building-materials", "Building-materials retailer"],
      ["dealer-distributor", "Dealer / distributor"],
      ["other", "Other qualified local operator"]
    ],
    coverageOperations: "Coverage and operations",
    primaryCity: "Primary city",
    province: "Province",
    selectProvince: "Select province",
    provinces: [
      ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"],
      ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"],
      ["NS", "Nova Scotia"], ["ON", "Ontario"], ["PE", "Prince Edward Island"],
      ["QC", "Quebec"], ["SK", "Saskatchewan"], ["NT", "Northwest Territories"],
      ["NU", "Nunavut"], ["YT", "Yukon"]
    ],
    serviceArea: "Proposed dealer service area",
    serviceAreaPlaceholder: "City, region, or service radius",
    productFocus: "Product focus",
    productFocusPlaceholder: "Cabinets, vanities, trim, or mixed categories",
    localCapabilities: "Local capabilities",
    capabilities: [
      ["Customer communication", "Customer communication"],
      ["Order execution", "Order execution"],
      ["Pickup coordination", "Pickup coordination"],
      ["Delivery coordination", "Delivery coordination"],
      ["After-sales support", "After-sales support"],
      ["Showroom consultation", "Showroom consultation"]
    ],
    applicationNotes: "Application notes",
    profileNotes: "Business profile and notes",
    notesPlaceholder: "Tell us about your company, showroom or trade operation, local support team, service coverage, and why VanStro should review your application.",
    beforeSubmit: "Before you submit",
    independent: "Each dealer remains independently owned and operated and manages its own business operations.",
    disclaimer: "VanStro reviews dealer applications case by case. Submitting this form does not guarantee approval, a dealer service area arrangement, pricing, inventory access, customer referrals, orders, revenue, profit, launch timing or a dealer relationship.",
    privacyIntro: "This application is submitted to VanStro. VanStro may use the information for cooperation review, dealer onboarding, local coverage assessment and follow-up communication, and may disclose it to service providers that support those activities as described in the Privacy Policy. Please review the",
    privacyPolicy: "Privacy Policy",
    terms: "Terms and Conditions",
    responsibility: "Dealer Services & Responsibility",
    acknowledgement: "I understand this application is for review only and final terms require written approval or agreement from VanStro.",
    submit: "Submit application",
    followUp: "VanStro may contact applicants after review if more information or a discussion is appropriate. A response or timing is not guaranteed.",
    preparationAria: "Application preparation",
    overview: "Application Overview",
    summary: [
      ["Review type", "Case-by-case business review"],
      ["Best fit", "Local building-materials, showroom or contractor operators"],
      ["Required", "Company profile, proposed dealer service area, customer support capability"],
      ["Outcome", "Follow-up only after VanStro review"]
    ],
    prepare: "Prepare Before Submitting",
    requiredItems: [
      "Legal company name and primary contact",
      "Proposed dealer service city, province and coverage area",
      "Business type, showroom or trade operation details",
      "Dealer services you can coordinate locally",
      "Any current order, catalog or product category focus"
    ],
    reviewPath: "Review Path",
    reviewSteps: [
      ["1", "Submit profile", "Send company, contact, proposed dealer service area and operating details."],
      ["2", "Participation review", "VanStro reviews the applicant's customer support capacity in its proposed dealer service area."],
      ["3", "Transaction procedures", "Qualified candidates review procedures for VanStro orders, returns, privacy and independent-dealer disclosure."],
      ["4", "Written terms", "Final activation requires written approval or agreement."]
    ],
    boundary: "Important Boundary",
    boundaryText: "Dealer-provided services, service pricing, workmanship and local scheduling are separate from VanStro product pricing unless VanStro states otherwise in writing.",
    operatingRules: "Review operating rules",
    legalCaution: null
  },
  "fr-CA": {
    breadcrumbs: ["Accueil", "Programme pour les détaillants", "Demande pour devenir détaillant"],
    title: "Demande pour devenir détaillant",
    imageAlt: "Partenaires d’affaires discutant d’une demande pour devenir détaillant VanStro",
    startApplication: "Commencer la demande",
    reviewFit: "Vérifier d’abord l’admissibilité",
    intro: "Présentez le profil de votre entreprise, votre couverture locale et votre capacité opérationnelle. VanStro vérifiera si votre entreprise répond aux critères du programme destiné aux détaillants avant de discuter des modalités commerciales.",
    profileKicker: "Profil de l’entreprise",
    profileTitle: "Envoyez les renseignements une seule fois. Nous vérifierons l’admissibilité avant les prochaines étapes.",
    profilePurpose: "Nous utilisons ces réponses pour déterminer si votre couverture et vos activités conviennent au programme.",
    profileText: "Les champs obligatoires aident VanStro à déterminer si le programme destiné aux détaillants convient à votre marché et à votre modèle d’exploitation.",
    businessContact: "Coordonnées de l’entreprise",
    companyName: "Nom de l’entreprise",
    contactName: "Nom de la personne-ressource",
    email: "Courriel",
    phone: "Téléphone",
    website: "Site Web de l’entreprise",
    optional: "Facultatif",
    businessType: "Type d’entreprise",
    selectBusinessType: "Sélectionnez un type d’entreprise",
    businessTypes: [
      ["showroom", "Salle d’exposition / centre de design"],
      ["contractor", "Entrepreneur / professionnel du bâtiment"],
      ["building-materials", "Détaillant de matériaux de construction"],
      ["dealer-distributor", "Détaillant / distributeur"],
      ["other", "Autre exploitant local qualifié"]
    ],
    coverageOperations: "Couverture et activités",
    primaryCity: "Ville principale",
    province: "Province ou territoire",
    selectProvince: "Sélectionnez une province ou un territoire",
    provinces: [
      ["AB", "Alberta"], ["BC", "Colombie-Britannique"], ["MB", "Manitoba"],
      ["NB", "Nouveau-Brunswick"], ["NL", "Terre-Neuve-et-Labrador"],
      ["NS", "Nouvelle-Écosse"], ["ON", "Ontario"], ["PE", "Île-du-Prince-Édouard"],
      ["QC", "Québec"], ["SK", "Saskatchewan"], ["NT", "Territoires du Nord-Ouest"],
      ["NU", "Nunavut"], ["YT", "Yukon"]
    ],
    serviceArea: "Zone de service proposée",
    serviceAreaPlaceholder: "Ville, région ou rayon de service",
    productFocus: "Produits ciblés",
    productFocusPlaceholder: "Armoires, meubles-lavabos, moulures ou catégories variées",
    localCapabilities: "Capacités locales",
    capabilities: [
      ["Customer communication", "Communication avec la clientèle"],
      ["Order execution", "Exécution des commandes"],
      ["Pickup coordination", "Coordination du ramassage"],
      ["Delivery coordination", "Coordination de la livraison"],
      ["After-sales support", "Soutien après-vente"],
      ["Showroom consultation", "Consultation en salle d’exposition"]
    ],
    applicationNotes: "Renseignements complémentaires",
    profileNotes: "Profil de l’entreprise et précisions",
    notesPlaceholder: "Présentez votre entreprise, votre salle d’exposition ou vos activités professionnelles, votre équipe de soutien locale, votre couverture de service et les raisons pour lesquelles VanStro devrait étudier votre demande.",
    beforeSubmit: "Avant de soumettre votre demande",
    independent: "Chaque détaillant est une entreprise indépendante et demeure responsable de ses propres activités.",
    disclaimer: "VanStro étudie chaque demande au cas par cas. La soumission de ce formulaire ne garantit ni l’approbation, ni l’attribution d’une zone de service, ni des prix, un accès aux stocks, des recommandations de clients, des commandes, des revenus, des bénéfices, une date de lancement ou une relation avec VanStro.",
    privacyIntro: "Cette demande est transmise à VanStro. VanStro peut utiliser les renseignements pour évaluer une collaboration, intégrer un détaillant, analyser la couverture locale et assurer le suivi, et peut les communiquer aux fournisseurs de services qui soutiennent ces activités, comme l’explique la Politique de confidentialité. Veuillez consulter la",
    privacyPolicy: "Politique de confidentialité",
    terms: "Modalités et conditions",
    responsibility: "Services et responsabilités des détaillants",
    acknowledgement: "Je comprends que cette demande est soumise uniquement aux fins d’évaluation et que les modalités définitives nécessitent l’approbation écrite de VanStro ou une entente avec celle-ci.",
    submit: "Soumettre la demande",
    followUp: "Après son évaluation, VanStro peut communiquer avec les candidats si des renseignements supplémentaires ou une discussion sont nécessaires. Une réponse ou un délai de réponse ne sont pas garantis.",
    preparationAria: "Préparation de la demande",
    overview: "Aperçu de la demande",
    summary: [
      ["Type d’évaluation", "Évaluation commerciale au cas par cas"],
      ["Profil recherché", "Détaillants locaux de matériaux, salles d’exposition ou entrepreneurs"],
      ["Renseignements requis", "Profil de l’entreprise, zone de service proposée et capacité de soutien à la clientèle"],
      ["Résultat", "Suivi seulement après l’évaluation de VanStro"]
    ],
    prepare: "À préparer avant la soumission",
    requiredItems: [
      "Dénomination sociale et principale personne-ressource",
      "Ville, province et territoire de couverture proposés",
      "Type d’entreprise et détails sur la salle d’exposition ou les activités professionnelles",
      "Services de détaillant que vous pouvez coordonner localement",
      "Commandes en cours, catalogues ou catégories de produits ciblées"
    ],
    reviewPath: "Étapes d’évaluation",
    reviewSteps: [
      ["1", "Soumission du profil", "Transmettez les renseignements sur l’entreprise, la personne-ressource, la zone de service proposée et les activités."],
      ["2", "Évaluation de la participation", "VanStro évalue la capacité du candidat à soutenir la clientèle dans la zone de service proposée."],
      ["3", "Procédures de transaction", "Les candidats qualifiés examinent les procédures relatives aux commandes VanStro, aux retours, à la confidentialité et à la divulgation du statut de détaillant indépendant."],
      ["4", "Modalités écrites", "L’activation définitive nécessite une approbation écrite ou une entente."]
    ],
    boundary: "Limite importante",
    boundaryText: "Les services fournis par le détaillant, leur tarification, la qualité d’exécution et la planification locale sont distincts des prix des produits VanStro, sauf indication écrite contraire de VanStro.",
    operatingRules: "Consulter les règles d’exploitation",
    legalCaution: "Ces renseignements sont fournis à titre général; faites examiner les modalités applicables par un conseiller juridique avant de vous engager dans une relation de détaillant."
  }
} as const;

export function DealerApplicationPageContent({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const pageCopy = copy[locale];
  const french = locale === "fr-CA";

  return (
    <div className="dealer-apply-page">
      <section className="page-hero">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href={localeHref("/dealer-program", locale)}>{pageCopy.breadcrumbs[1]}</Link>
            <span aria-hidden="true">/</span>
            <span>{pageCopy.title}</span>
          </nav>
          <h1>{pageCopy.title}</h1>
          <p className="lede">{pageCopy.intro}</p>
          <p className="lede">{pageCopy.profilePurpose}</p>
        </div>
      </section>

      <section className="apply" id="apply">
        <div className="wrap">
          <div className="apply-grid">
            <PublicSubmissionForm className="form-card" id="application-form" kind="dealer-application">
              <input type="hidden" name="source" value="dealer-application-page" />
              <div className="block">
                <h2>{pageCopy.businessContact}</h2>
                <div className="form-grid">
                  <div className="field"><label htmlFor="companyName">{pageCopy.companyName}</label><input id="companyName" name="companyName" autoComplete="organization" required /></div>
                  <div className="field"><label htmlFor="contactName">{pageCopy.contactName}</label><input id="contactName" name="contactName" autoComplete="name" required /></div>
                  <div className="field"><label htmlFor="email">{pageCopy.email}</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
                  <div className="field"><label htmlFor="phone">{pageCopy.phone}</label><input id="phone" name="phone" type="tel" autoComplete="tel" required /></div>
                  <div className="field span-2"><label htmlFor="website">{pageCopy.website}</label><input id="website" name="website" type="url" autoComplete="url" /></div>
                </div>
              </div>
              <div className="block">
                <h2>{pageCopy.coverageOperations}</h2>
                <div className="form-grid">
                  <div className="field"><label htmlFor="businessType">{pageCopy.businessType}</label><select id="businessType" name="businessType" required defaultValue=""><option value="" disabled>{pageCopy.selectBusinessType}</option>{pageCopy.businessTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
                  <div className="field"><label htmlFor="city">{pageCopy.primaryCity}</label><input id="city" name="city" autoComplete="address-level2" required /></div>
                  <div className="field"><label htmlFor="province">{pageCopy.province}</label><select id="province" name="province" required defaultValue=""><option value="" disabled>{pageCopy.selectProvince}</option>{pageCopy.provinces.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
                  <div className="field"><label htmlFor="serviceArea">{pageCopy.serviceArea}</label><input id="serviceArea" name="serviceArea" required /></div>
                  <div className="field span-2"><label htmlFor="productFocus">{pageCopy.productFocus}</label><input id="productFocus" name="productFocus" /></div>
                  <div className="field span-2">
                    <span>{pageCopy.localCapabilities}</span>
                    <div className="caps">
                      {pageCopy.capabilities.map(([value, label]) => (
                        <label className="choice" key={value}><input name="capabilities" type="checkbox" value={value} /> <span>{label}</span></label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="block">
                <h2>{pageCopy.applicationNotes}</h2>
                <div className="field"><label htmlFor="message">{pageCopy.profileNotes}</label><textarea id="message" name="message" required /></div>
              </div>
              <div className="before-submit">
                <h2>{pageCopy.beforeSubmit}</h2>
                <p>{pageCopy.independent}</p>
                <p>{pageCopy.disclaimer}</p>
                <p>{pageCopy.boundaryText}</p>
              </div>
              <p className="legal-note">{pageCopy.privacyIntro} <Link href={localeHref("/privacy", locale)}>{pageCopy.privacyPolicy}</Link>, <Link href={localeHref("/terms-and-conditions", locale)}>{pageCopy.terms}</Link>, {french ? "et les" : "and"} <Link href={localeHref("/dealer-services-and-responsibility", locale)}>{pageCopy.responsibility}</Link>.</p>
              <label className="ack"><input id="ack" name="applicationAcknowledgement" type="checkbox" required /><span>{pageCopy.acknowledgement}</span></label>
              <div className="form-actions">
                <button className="btn btn-fill" type="submit">{pageCopy.submit}</button>
                <p className="form-note">{pageCopy.followUp}</p>
              </div>
            </PublicSubmissionForm>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function DealerApplicationPage() {
  return <DealerApplicationPageContent />;
}
