export type CareerRole = {
  slug: string;
  title: string;
  location: string;
  workArrangement: string;
  employmentType?: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  preferred?: string[];
  subject: string;
};

export type CareersContent = {
  pageTitle: string;
  pageDescription: string;
  heroTitle: string;
  heroDescription: string;
  heroImageAlt: string;
  rolesTitle: string;
  positionsLabel: string;
  summaryTitle: string;
  requirementsTitle: string;
  responsibilitiesTitle: string;
  preferredTitle: string;
  applyTitle: string;
  applyDescription: string;
  applyButton: string;
  roles: CareerRole[];
};

export const CAREERS_EMAIL = "hr@vanstro.ca";

const englishRoles: CareerRole[] = [
  {
    slug: "business-operations-coordinator",
    title: "Business Operations Coordinator",
    location: "Winnipeg, Manitoba",
    workArrangement: "In person",
    employmentType: "Full-time or part-time",
    summary:
      "Support daily operations, cross-team coordination and the systems that connect management, suppliers, service providers, dealers and internal departments.",
    responsibilities: [
      "Coordinate communication among management, business development teams, suppliers, service providers and internal departments.",
      "Track operational tasks, project progress, action items and business reporting.",
      "Support office services, vendor relationships, records, meetings, procurement and facility coordination.",
      "Maintain accurate operational data across POS, CRM, Microsoft 365, product coding and SKU records.",
      "Assist with supplier follow-up, logistics, order tracking, dealer onboarding and customer records."
    ],
    requirements: [
      "Fluent English and Chinese communication skills, written and verbal.",
      "Strong organization, coordination, problem-solving and multi-priority management skills.",
      "Proficiency with Excel, Word, Outlook, Teams, SharePoint and OneDrive.",
      "Professional judgment, attention to detail, accountability and discretion with confidential information."
    ],
    preferred: [
      "French language proficiency.",
      "Experience in operations, administration, project coordination, office management or business support.",
      "Experience with CRM, POS, ERP, inventory or related business systems.",
      "Experience in building materials, construction, distribution, wholesale or supply chain environments."
    ],
    subject: "Application — Business Operations Coordinator"
  },
  {
    slug: "human-resources-coordinator-recruitment-specialist",
    title: "Human Resources Coordinator / Recruitment Specialist",
    location: "Winnipeg, Manitoba",
    workArrangement: "In person",
    summary:
      "Support hiring and team development through organized candidate communication, interview coordination, recruitment tracking and onboarding administration.",
    responsibilities: [
      "Manage job postings across recruitment platforms.",
      "Screen résumés and prepare candidate shortlists.",
      "Coordinate interviews and follow up with candidates.",
      "Maintain recruitment tracking and documentation.",
      "Assist with onboarding and HR-related administrative tasks."
    ],
    requirements: [
      "Experience in recruitment, human resources or a related administrative role.",
      "Strong communication, organization and time-management skills.",
      "Ability to manage multiple tasks and recruiting timelines.",
      "A proactive, detail-oriented approach in a fast-moving work environment."
    ],
    preferred: [
      "Experience recruiting for sales or business development roles.",
      "Familiarity with Canadian hiring practices.",
      "Experience using recruitment platforms such as Indeed or LinkedIn."
    ],
    subject: "Application — Human Resources Coordinator / Recruitment Specialist"
  },
  {
    slug: "business-development-representative",
    title: "Business Development Representative",
    location: "Winnipeg and surrounding areas",
    workArrangement: "Office and field-based",
    employmentType: "Full-time or part-time, permanent",
    summary:
      "Develop dealer and trade-client relationships across the Prairie Provinces, support onboarding and maintain disciplined follow-up as accounts progress.",
    responsibilities: [
      "Identify and develop dealership and trade-account opportunities.",
      "Visit building-material suppliers, cabinet showrooms and construction firms.",
      "Support dealer onboarding and ongoing account development.",
      "Maintain long-term business relationships and submit activity and market-observation reports.",
      "Handle client and dealer information in accordance with company confidentiality requirements."
    ],
    requirements: [
      "Legal entitlement to work in Canada.",
      "Ability to conduct field-based client visits and travel within assigned regions.",
      "A valid Canadian driver’s licence and reliable transportation.",
      "Self-motivation, professional communication and consistent follow-through."
    ],
    preferred: [
      "Experience in B2B sales, channel development or trade-account management.",
      "Experience working with contractors, retailers, showrooms or building-material customers."
    ],
    subject: "Application — Business Development Representative"
  }
];

const frenchRoles: CareerRole[] = [
  {
    slug: "business-operations-coordinator",
    title: "Coordonnateur ou coordonnatrice des opérations commerciales",
    location: "Winnipeg (Manitoba)",
    workArrangement: "En personne",
    employmentType: "Temps plein ou temps partiel",
    summary:
      "Soutenir les activités quotidiennes, la coordination entre les équipes et les systèmes qui relient la direction, les fournisseurs, les prestataires de services, les détaillants et les services internes.",
    responsibilities: [
      "Coordonner les communications entre la direction, les équipes de développement des affaires, les fournisseurs, les prestataires de services et les services internes.",
      "Assurer le suivi des tâches opérationnelles, de l’avancement des projets, des mesures à prendre et des rapports d’activité.",
      "Soutenir les services de bureau, les relations avec les fournisseurs, les dossiers, les réunions, l’approvisionnement et la coordination des installations.",
      "Tenir à jour des données opérationnelles exactes dans les systèmes de point de vente, de GRC, de Microsoft 365, de codification des produits et d’UGS.",
      "Participer au suivi des fournisseurs, à la logistique, au suivi des commandes, à l’intégration des détaillants et à la tenue des dossiers clients."
    ],
    requirements: [
      "Excellente maîtrise de l’anglais et du chinois, à l’oral comme à l’écrit.",
      "Solides compétences en organisation, en coordination, en résolution de problèmes et en gestion de priorités multiples.",
      "Maîtrise d’Excel, de Word, d’Outlook, de Teams, de SharePoint et de OneDrive.",
      "Jugement professionnel, souci du détail, sens des responsabilités et discrétion dans le traitement des renseignements confidentiels."
    ],
    preferred: [
      "Maîtrise du français.",
      "Expérience en opérations, en administration, en coordination de projets, en gestion de bureau ou en soutien aux activités.",
      "Expérience avec les systèmes de GRC, de point de vente, de PGI, de gestion des stocks ou d’autres systèmes d’entreprise.",
      "Expérience dans les matériaux de construction, la construction, la distribution, le commerce de gros ou la chaîne d’approvisionnement."
    ],
    subject: "Candidature — Coordination des opérations commerciales"
  },
  {
    slug: "human-resources-coordinator-recruitment-specialist",
    title: "Coordonnateur ou coordonnatrice des ressources humaines / Spécialiste du recrutement",
    location: "Winnipeg (Manitoba)",
    workArrangement: "En personne",
    summary:
      "Soutenir le recrutement et le développement de l’équipe grâce à des communications structurées avec les personnes candidates, à la coordination des entrevues, au suivi du recrutement et à l’administration de l’intégration.",
    responsibilities: [
      "Gérer les offres d’emploi sur les plateformes de recrutement.",
      "Examiner les curriculum vitæ et préparer des listes restreintes de candidatures.",
      "Coordonner les entrevues et assurer le suivi auprès des personnes candidates.",
      "Tenir à jour le suivi et la documentation de recrutement.",
      "Participer à l’intégration et aux tâches administratives liées aux ressources humaines."
    ],
    requirements: [
      "Expérience en recrutement, en ressources humaines ou dans un poste administratif connexe.",
      "Solides compétences en communication, en organisation et en gestion du temps.",
      "Capacité à gérer plusieurs tâches et calendriers de recrutement.",
      "Approche proactive et minutieuse dans un environnement de travail en évolution rapide."
    ],
    preferred: [
      "Expérience du recrutement pour des postes de vente ou de développement des affaires.",
      "Connaissance des pratiques canadiennes en matière d’embauche.",
      "Expérience de plateformes de recrutement comme Indeed ou LinkedIn."
    ],
    subject: "Candidature — Ressources humaines / Recrutement"
  },
  {
    slug: "business-development-representative",
    title: "Représentant ou représentante du développement des affaires",
    location: "Winnipeg et les environs",
    workArrangement: "Travail au bureau et sur le terrain",
    employmentType: "Temps plein ou temps partiel, poste permanent",
    summary:
      "Développer les relations avec les détaillants et la clientèle professionnelle dans les provinces des Prairies, soutenir l’intégration et assurer un suivi rigoureux à mesure que les comptes progressent.",
    responsibilities: [
      "Repérer et développer des occasions auprès des détaillants et des comptes professionnels.",
      "Visiter des fournisseurs de matériaux de construction, des salles d’exposition d’armoires et des entreprises de construction.",
      "Soutenir l’intégration des détaillants et le développement continu des comptes.",
      "Entretenir des relations d’affaires à long terme et présenter des rapports d’activité et d’observation du marché.",
      "Traiter les renseignements sur la clientèle et les détaillants conformément aux exigences de confidentialité de l’entreprise."
    ],
    requirements: [
      "Être légalement autorisé à travailler au Canada.",
      "Pouvoir effectuer des visites chez la clientèle et se déplacer dans les régions attribuées.",
      "Détenir un permis de conduire canadien valide et disposer d’un moyen de transport fiable.",
      "Faire preuve d’autonomie, de professionnalisme dans les communications et de constance dans le suivi."
    ],
    preferred: [
      "Expérience en vente interentreprises, en développement de canaux ou en gestion de comptes professionnels.",
      "Expérience auprès d’entrepreneurs, de détaillants, de salles d’exposition ou d’une clientèle du secteur des matériaux de construction."
    ],
    subject: "Candidature — Développement des affaires"
  }
];

export const careersContent: Record<"en-CA" | "fr-CA", CareersContent> = {
  "en-CA": {
    pageTitle: "Careers At VanStro",
    pageDescription: "Explore current career opportunities with VanStro Global Supply in Winnipeg, Manitoba.",
    heroTitle: "Careers At VanStro",
    heroDescription: "Join the team connecting home-material products, dealers and customers across Canada from our Winnipeg operations.",
    heroImageAlt: "Illustration of a workspace used to represent coordination and customer support",
    rolesTitle: "Open Roles",
    positionsLabel: "positions",
    summaryTitle: "Summary",
    requirementsTitle: "Required",
    responsibilitiesTitle: "What you’ll do",
    preferredTitle: "Preferred",
    applyTitle: "Apply for this role",
    applyDescription: "Email your current résumé and a brief introduction to",
    applyButton: "Start email",
    roles: englishRoles
  },
  "fr-CA": {
    pageTitle: "Carrières chez VanStro",
    pageDescription: "Découvrez les possibilités de carrière actuelles chez VanStro Global Supply à Winnipeg, au Manitoba.",
    heroTitle: "Carrières chez VanStro",
    heroDescription: "Joignez-vous à l’équipe de Winnipeg qui relie les produits pour la maison, les détaillants et la clientèle partout au Canada.",
    heroImageAlt: "Illustration d’un espace de travail représentant la coordination et le soutien à la clientèle",
    rolesTitle: "Postes à pourvoir",
    positionsLabel: "postes",
    summaryTitle: "Résumé",
    requirementsTitle: "Exigences",
    responsibilitiesTitle: "Vos responsabilités",
    preferredTitle: "Atouts",
    applyTitle: "Postuler à ce poste",
    applyDescription: "Envoyez votre curriculum vitæ à jour et une brève présentation à",
    applyButton: "Préparer le courriel",
    roles: frenchRoles
  }
};

export function buildCareerMailto(subject: string) {
  return `mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
