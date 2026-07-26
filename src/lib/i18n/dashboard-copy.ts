import type { SiteLocale } from "@/lib/i18n/locale";

const englishDashboardCopy = {
  tabs: {
    products: "Products", categories: "Categories", pricing: "Pricing", promotions: "Promotions",
    users: "Users", roles: "Roles", dealers: "Dealers", dealerApplications: "Applications",
    contactLeads: "Leads", productReviews: "Reviews", supportHandoffs: "Support handoffs",
    operations: "Operations", emailOutbox: "Email outbox", auditLogs: "Audit logs"
  },
  errors: {
    requestFailedWith: (status: number) => `Request failed with ${status}`,
    loadPathFailed: (path: string) => `Failed to load ${path}`,
    dashboardLoadFailed: "Dashboard load failed.", storedSessionExpired: "Stored session expired.",
    loginFailed: "Login failed.", requestFailed: "Request failed."
  },
  messages: {
    signedIn: "Signed in.", signedOut: "Signed out.", assetCreated: "Asset created.",
    productCreated: "Product created.", skuCreated: "SKU created.", categoryCreated: "Category created.",
    priceCreated: "Price created.", promotionCreated: "Promotion created.", adminUserCreated: "Admin user created.",
    roleCreated: "Role created.", applicationStatusUpdated: "Application status updated.",
    applicationNoteAdded: "Application note added.", leadStatusUpdated: "Lead status updated.",
    leadAssigned: "Lead assigned.", leadNoteAdded: "Lead note added.",
    reviewStatusUpdated: "Review status updated.", reviewNoteAdded: "Review note added.",
    handoffStatusUpdated: "Support handoff status updated.", emailRetried: "Email queued for retry."
  },
  login: {
    eyebrow: "VanStro Dashboard", title: "Admin sign in",
    intro: "Sign in with an authorized VanStro administrator account.", apiBase: "API base:",
    email: "Email", password: "Password", signingIn: "Signing in...", signIn: "Sign in"
  },
  hero: {
    eyebrow: "VanStro Dashboard", title: "Catalog, pricing and submissions dashboard",
    signedInAs: (email: string) => `Signed in as ${email}.`,
    refreshing: "Refreshing...", refresh: "Refresh", signOut: "Sign out",
    countsLabel: "Dashboard counts", sectionsLabel: "Dashboard sections"
  },
  stats: {
    products: "Products", categories: "Categories", prices: "Prices", promotions: "Promotions",
    users: "Users", dealers: "Dealers", applications: "Applications", leads: "Leads",
    reviews: "Reviews", opsAlerts: "Ops alerts"
  },
  common: {
    name: "Name", slug: "Slug", status: "Status", category: "Category", key: "Key",
    email: "Email", role: "Role", note: "Note", message: "Message", created: "Created",
    select: "Select", noRecords: "No records yet.", yes: "Yes", no: "No", product: "Product"
  },
  values: {
    draft: "Draft", active: "Active", inactive: "Inactive", archived: "Archived", submitted: "Submitted",
    under_review: "Under review", approved: "Approved", rejected: "Rejected", new: "New", routed: "Routed",
    closed: "Closed", spam: "Spam", pending: "Pending", published: "Published", warning: "Warning",
    critical: "Critical", admin: "Admin"
  },
  statusValues: {
    application: { submitted: "Submitted", under_review: "Under review", approved: "Approved", rejected: "Rejected", archived: "Archived" },
    lead: { new: "New", routed: "Routed", closed: "Closed", spam: "Spam" },
    review: { pending: "Pending", published: "Published", rejected: "Rejected", archived: "Archived" },
    handoff: { new: "New", in_progress: "In progress", resolved: "Resolved", closed: "Closed" },
    promotion: { draft: "Draft", active: "Active", inactive: "Inactive", archived: "Archived" }
  },
  products: {
    title: "Products", copy: "Create products, SKUs and basic image assets from the Website API.",
    createProduct: "Create product", noCategory: "No category", productId: "Product ID",
    skuCode: "SKU code", addSku: "Add SKU", assetUrl: "Asset URL", altText: "Alt text",
    addAsset: "Add asset", skus: "SKUs"
  },
  categories: {
    title: "Categories", copy: "Manage catalog grouping used by storefront rails.",
    create: "Create category", active: "Active"
  },
  pricing: {
    title: "Pricing", copy: "Create active catalog prices for platform SKUs.", create: "Create price",
    selectSku: "Select SKU", amountCents: "Amount cents", amount: "Amount"
  },
  promotions: {
    title: "Promotions", copy: "Create campaign shells for storefront pricing labels.",
    create: "Create promotion", label: "Label"
  },
  users: {
    title: "Users", copy: "Create admin users and assign an initial role.", create: "Create admin user",
    displayName: "Display name", temporaryPassword: "Temporary password", noRole: "No role",
    createButton: "Create user", kind: "Kind", roles: "Roles"
  },
  roles: {
    title: "Roles", copy: "Create roles. Permission replacement is covered by API smoke.",
    create: "Create role", permissions: "Permissions"
  },
  dealers: {
    title: "Dealers", copy: "Read dealer display data and service locations.", code: "Code", locations: "Locations"
  },
  applications: {
    title: "Dealer applications", copy: "Review dealer program submissions and add internal handling notes.",
    applicationId: "Application ID", update: "Update application", addNote: "Add note",
    company: "Company", contact: "Contact", market: "Market"
  },
  leads: {
    title: "Contact leads", copy: "Route general inquiries from the contact form to an admin user or dealer.",
    leadId: "Lead ID", update: "Update lead", assignedUserId: "Assigned user ID",
    assignedDealerId: "Assigned dealer ID", assign: "Assign lead", addNote: "Add note",
    topic: "Topic", location: "Location"
  },
  reviews: {
    title: "Product reviews", copy: "Moderate submitted product reviews before they appear on product detail pages.",
    reviewId: "Review ID", moderate: "Moderate review", addNote: "Add note", reviewer: "Reviewer",
    rating: "Rating", review: "Review", fallbackProduct: "Product", untitled: "Untitled"
  },
  emailOutbox: {
    title: "Email outbox", copy: "Review pending notification emails and retry failed deliveries.",
    template: "Template", recipient: "Recipient", attempts: "Attempts", lastError: "Last error",
    retry: "Retry", templatesTitle: "Published templates", templatesCopy: "Read-only list of email template keys."
  },
  handoffs: {
    title: "Support handoffs", copy: "Review AI widget requests for human follow-up.",
    handoffId: "Handoff ID", channel: "Channel", sourcePath: "Source path", update: "Update handoff",
    filterAll: "All statuses", filterNew: "New only"
  },
  operations: {
    title: "Operations", copy: "Failures require review; waiting records will be retried by the worker automatically.",
    empty: "No operational alerts.", severity: "Severity", alert: "Alert", count: "Count", queue: "Queue"
  },
  auditLogs: {
    title: "Audit logs", copy: "Read recent Dashboard write activity for traceability.",
    action: "Action", resource: "Resource", resourceId: "Resource ID"
  }
};

export type DashboardCopy = typeof englishDashboardCopy;

const frenchDashboardCopy: DashboardCopy = {
  tabs: {
    products: "Produits", categories: "Catégories", pricing: "Tarification", promotions: "Promotions",
    users: "Utilisateurs", roles: "Rôles", dealers: "Détaillants", dealerApplications: "Demandes",
    contactLeads: "Prospects", productReviews: "Avis", supportHandoffs: "Transferts d’assistance",
    operations: "Opérations", emailOutbox: "Boîte d’envoi", auditLogs: "Journaux d’audit"
  },
  errors: {
    requestFailedWith: (status) => `La requête a échoué avec le code ${status}`,
    loadPathFailed: (path) => `Échec du chargement de ${path}`,
    dashboardLoadFailed: "Échec du chargement du tableau de bord.", storedSessionExpired: "La session enregistrée a expiré.",
    loginFailed: "Échec de la connexion.", requestFailed: "La requête a échoué."
  },
  messages: {
    signedIn: "Connexion réussie.", signedOut: "Déconnexion réussie.", assetCreated: "Ressource créée.",
    productCreated: "Produit créé.", skuCreated: "UGS créée.", categoryCreated: "Catégorie créée.",
    priceCreated: "Prix créé.", promotionCreated: "Promotion créée.", adminUserCreated: "Utilisateur administrateur créé.",
    roleCreated: "Rôle créé.", applicationStatusUpdated: "État de la demande mis à jour.",
    applicationNoteAdded: "Note ajoutée à la demande.", leadStatusUpdated: "État du prospect mis à jour.",
    leadAssigned: "Prospect attribué.", leadNoteAdded: "Note ajoutée au prospect.",
    reviewStatusUpdated: "État de l’avis mis à jour.", reviewNoteAdded: "Note ajoutée à l’avis.",
    handoffStatusUpdated: "État du transfert mis à jour.", emailRetried: "Courriel remis en file d’attente."
  },
  login: {
    eyebrow: "Tableau de bord VanStro", title: "Connexion administrateur",
    intro: "Connectez-vous avec un compte administrateur VanStro autorisé.", apiBase: "Base de l’API :",
    email: "Courriel", password: "Mot de passe", signingIn: "Connexion…", signIn: "Se connecter"
  },
  hero: {
    eyebrow: "Tableau de bord VanStro", title: "Tableau de bord du catalogue, des prix et des soumissions",
    signedInAs: (email) => `Connecté en tant que ${email}.`,
    refreshing: "Actualisation…", refresh: "Actualiser", signOut: "Se déconnecter",
    countsLabel: "Totaux du tableau de bord", sectionsLabel: "Sections du tableau de bord"
  },
  stats: {
    products: "Produits", categories: "Catégories", prices: "Prix", promotions: "Promotions",
    users: "Utilisateurs", dealers: "Détaillants", applications: "Demandes", leads: "Prospects",
    reviews: "Avis", opsAlerts: "Alertes opérationnelles"
  },
  common: {
    name: "Nom", slug: "Identifiant URL", status: "État", category: "Catégorie", key: "Clé",
    email: "Courriel", role: "Rôle", note: "Note", message: "Message", created: "Création",
    select: "Sélectionner", noRecords: "Aucun enregistrement pour le moment.", yes: "Oui", no: "Non", product: "Produit"
  },
  values: {
    draft: "Brouillon", active: "Actif", inactive: "Inactif", archived: "Archivé", submitted: "Soumis",
    under_review: "En cours d’examen", approved: "Approuvé", rejected: "Rejeté", new: "Nouveau", routed: "Acheminé",
    closed: "Fermé", spam: "Pourriel", pending: "En attente", published: "Publié", warning: "Avertissement",
    critical: "Critique", admin: "Administrateur"
  },
  statusValues: {
    application: { submitted: "Soumise", under_review: "En cours d’examen", approved: "Approuvée", rejected: "Refusée", archived: "Archivée" },
    lead: { new: "Nouveau", routed: "Acheminé", closed: "Fermé", spam: "Pourriel" },
    review: { pending: "En attente", published: "Publié", rejected: "Refusé", archived: "Archivé" },
    handoff: { new: "Nouveau", in_progress: "En cours", resolved: "Résolu", closed: "Fermé" },
    promotion: { draft: "Brouillon", active: "Active", inactive: "Inactive", archived: "Archivée" }
  },
  products: {
    title: "Produits", copy: "Créez des produits, des UGS et des ressources d’image de base à partir de l’API du site Web.",
    createProduct: "Créer un produit", noCategory: "Aucune catégorie", productId: "ID du produit",
    skuCode: "Code UGS", addSku: "Ajouter une UGS", assetUrl: "URL de la ressource", altText: "Texte de remplacement",
    addAsset: "Ajouter une ressource", skus: "UGS"
  },
  categories: {
    title: "Catégories", copy: "Gérez les regroupements du catalogue utilisés dans les carrousels de la boutique.",
    create: "Créer une catégorie", active: "Active"
  },
  pricing: {
    title: "Tarification", copy: "Créez des prix actifs au catalogue pour les UGS de la plateforme.", create: "Créer un prix",
    selectSku: "Sélectionner une UGS", amountCents: "Montant en cents", amount: "Montant"
  },
  promotions: {
    title: "Promotions", copy: "Créez des ébauches de campagnes pour les libellés de prix de la boutique.",
    create: "Créer une promotion", label: "Libellé"
  },
  users: {
    title: "Utilisateurs", copy: "Créez des utilisateurs administrateurs et attribuez-leur un rôle initial.", create: "Créer un administrateur",
    displayName: "Nom affiché", temporaryPassword: "Mot de passe temporaire", noRole: "Aucun rôle",
    createButton: "Créer l’utilisateur", kind: "Type", roles: "Rôles"
  },
  roles: {
    title: "Rôles", copy: "Créez des rôles. Le remplacement des autorisations est couvert par le test de l’API.",
    create: "Créer un rôle", permissions: "Autorisations"
  },
  dealers: {
    title: "Détaillants", copy: "Consultez les données d’affichage des détaillants et leurs points de service.", code: "Code", locations: "Emplacements"
  },
  applications: {
    title: "Demandes de détaillants", copy: "Examinez les demandes au programme des détaillants et ajoutez des notes de traitement internes.",
    applicationId: "ID de la demande", update: "Mettre à jour la demande", addNote: "Ajouter une note",
    company: "Entreprise", contact: "Personne-ressource", market: "Marché"
  },
  leads: {
    title: "Prospects", copy: "Acheminez les demandes générales du formulaire de contact à un administrateur ou à un détaillant.",
    leadId: "ID du prospect", update: "Mettre à jour le prospect", assignedUserId: "ID de l’utilisateur responsable",
    assignedDealerId: "ID du détaillant responsable", assign: "Attribuer le prospect", addNote: "Ajouter une note",
    topic: "Sujet", location: "Emplacement"
  },
  reviews: {
    title: "Avis sur les produits", copy: "Modérez les avis soumis avant leur publication sur les pages de détails des produits.",
    reviewId: "ID de l’avis", moderate: "Modérer l’avis", addNote: "Ajouter une note", reviewer: "Auteur",
    rating: "Note", review: "Avis", fallbackProduct: "Produit", untitled: "Sans titre"
  },
  emailOutbox: {
    title: "Boîte d’envoi", copy: "Consultez les courriels de notification en attente et relancez les échecs.",
    template: "Modèle", recipient: "Destinataire", attempts: "Tentatives", lastError: "Dernière erreur",
    retry: "Réessayer", templatesTitle: "Modèles publiés", templatesCopy: "Liste en lecture seule des clés de modèles de courriel."
  },
  handoffs: {
    title: "Transferts d’assistance", copy: "Examinez les demandes du widget IA pour un suivi humain.",
    handoffId: "ID du transfert", channel: "Canal", sourcePath: "Chemin source", update: "Mettre à jour le transfert",
    filterAll: "Tous les états", filterNew: "Nouveaux seulement"
  },
  operations: {
    title: "Opérations", copy: "Les échecs doivent être examinés; les enregistrements en attente seront réessayés automatiquement par le processus de traitement.",
    empty: "Aucune alerte opérationnelle.", severity: "Gravité", alert: "Alerte", count: "Nombre", queue: "File"
  },
  auditLogs: {
    title: "Journaux d’audit", copy: "Consultez les activités d’écriture récentes du tableau de bord à des fins de traçabilité.",
    action: "Action", resource: "Ressource", resourceId: "ID de la ressource"
  }
};

export function getDashboardCopy(locale: SiteLocale): DashboardCopy {
  return locale === "fr-CA" ? frenchDashboardCopy : englishDashboardCopy;
}
