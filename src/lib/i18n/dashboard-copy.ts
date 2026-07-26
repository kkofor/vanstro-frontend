import type { SiteLocale } from "@/lib/i18n/locale";

const englishDashboardCopy = {
  tabs: {
    products: "Products", categories: "Categories", pricing: "Pricing", promotions: "Promotions",
    users: "Users", roles: "Roles", dealers: "Dealers", dealerApplications: "Applications",
    contactLeads: "Leads", crmContacts: "Website CRM", productReviews: "Reviews", supportHandoffs: "Support handoffs",
    orders: "Orders", paymentSessions: "Payment sessions", erpSyncJobs: "ERP sync", inventorySnapshots: "Inventory",
    cms: "Content", operations: "Operations", emailOutbox: "Email outbox", auditLogs: "Audit logs"
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
    handoffStatusUpdated: "Support handoff status updated.", emailRetried: "Email queued for retry.",
    paymentMarkedPaid: "Payment session marked as paid and order created.",
    emailProviderSaved: "SMTP provider settings saved.",
    emailProviderTestQueued: "Test email queued for delivery.",
    emailTemplatePublished: "Email template version published.",
    productUpdated: "Product updated.", categoryUpdated: "Category updated.", priceUpdated: "Price updated.",
    promotionUpdated: "Promotion updated.", orderStatusUpdated: "Order status updated.",
    orderAssigned: "Order dealer assigned.", erpRetried: "ERP job queued for retry.",
    crmUpdated: "CRM contact updated.", crmNoteAdded: "CRM note added.", crmPromoted: "Customer queued for ERP sync.",
    catalogSynced: "ERP catalog synced.", inventoryUpdated: "Inventory updated.",
    contentSaved: "Content saved.", articleCreated: "Article created.", articleUpdated: "Article updated."
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
    crmContacts: "CRM contacts", reviews: "Reviews", opsAlerts: "Ops alerts", orders: "Orders"
  },
  pagination: {
    showing: (page: number, totalPages: number, total: number) => `Page ${page} of ${totalPages} (${total} total)`
  },
  actions: {
    view: "View", save: "Save", delete: "Delete", edit: "Edit", assign: "Assign", addNote: "Add note",
    updateStatus: "Update status", openQueue: "Open queue", retry: "Retry"
  },
  common: {
    name: "Name", slug: "Slug", status: "Status", category: "Category", key: "Key",
    email: "Email", role: "Role", note: "Note", message: "Message", created: "Created",
    select: "Select", noRecords: "No records yet.", yes: "Yes", no: "No", product: "Product",
    phone: "Phone", total: "Total", fulfillment: "Fulfillment", customer: "Customer", locale: "Locale",
    notes: "Notes", details: "Details", jsonPayload: "JSON payload"
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
    crm: {
      registered: "Registered", engaged: "Engaged", checkout_started: "Checkout started",
      customer: "Customer", high_intent: "High intent", archived: "Archived",
      none: "Not synced", queued: "Queued", synced: "Synced", failed: "Failed"
    },
    promotion: { draft: "Draft", active: "Active", inactive: "Inactive", archived: "Archived" }
  },
  products: {
    title: "Products", copy: "Create products, SKUs and basic image assets from the Website API.",
    createProduct: "Create product", noCategory: "No category", productId: "Product ID",
    skuCode: "SKU code", addSku: "Add SKU", assetUrl: "Asset URL", altText: "Alt text",
    addAsset: "Add asset", skus: "SKUs", editProduct: "Edit product", specifications: "Specifications",
    syncFromErp: "Sync from ERP", refreshErpColors: "Refresh ERP colors", mpn: "MPN",
    shortDescription: "Short description", brand: "Brand", erpMapping: "ERP mapping",
    erpSystem: "ERP system", erpSkuKey: "ERP SKU key", erpProductId: "ERP product ID",
    erpSkuId: "ERP SKU ID", specKey: "Spec key", specValue: "Spec value", addSpec: "Add specification",
    highlightsJson: "Highlights JSON"
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
  crm: {
    title: "Website CRM", copy: "Registered customers and storefront engagement funnel. External ERP CRM is read-only here.",
    search: "Search email or name", stage: "Funnel stage", source: "Source", erpSync: "ERP sync",
    events: "Activity timeline", orders: "Orders", promote: "Queue ERP sync", relatedLead: "Related contact lead",
    erpLinks: "ERP customer links", syncJobs: "Sync jobs", noUser: "Guest — register link required for ERP promote"
  },
  reviews: {
    title: "Product reviews", copy: "Moderate submitted product reviews before they appear on product detail pages.",
    reviewId: "Review ID", moderate: "Moderate review", addNote: "Add note", reviewer: "Reviewer",
    rating: "Rating", review: "Review", fallbackProduct: "Product", untitled: "Untitled"
  },
  emailOutbox: {
    title: "Email outbox", copy: "Review pending notification emails and retry failed deliveries.",
    template: "Template", recipient: "Recipient", attempts: "Attempts", lastError: "Last error",
    retry: "Retry", templatesTitle: "Email templates", templatesCopy: "Edit subject and body, then publish a new version.",
    subject: "Subject", bodyText: "Body (text)", bodyHtml: "Body (HTML)", publish: "Publish version",
    editTemplate: "Edit template", version: "Version"
  },
  handoffs: {
    title: "Support handoffs", copy: "Review AI widget requests for human follow-up.",
    handoffId: "Handoff ID", channel: "Channel", sourcePath: "Source path", update: "Update handoff",
    filterAll: "All statuses", filterNew: "New only"
  },
  operations: {
    title: "Operations", copy: "Failures require review; waiting records will be retried by the worker automatically.",
    empty: "No operational alerts.", severity: "Severity", alert: "Alert", count: "Count", queue: "Queue",
    analyticsTitle: "Traffic (7 days)", analyticsCopy: "First-party page views collected only with analytics cookie consent.",
    pageViews: "Page views", uniqueSessions: "Unique sessions", topPaths: "Top paths",
    checkoutSessions: "Checkout sessions", paidOrders: "Paid orders"
  },
  auditLogs: {
    title: "Audit logs", copy: "Read recent Dashboard write activity for traceability.",
    action: "Action", resource: "Resource", resourceId: "Resource ID"
  },
  orders: {
    title: "Orders", copy: "Review paid orders, update fulfillment status, and assign dealers.",
    orderId: "Order", items: "Items", assignDealer: "Assign dealer", postalCode: "Postal code",
    statusHistory: "Status history", source: "Source"
  },
  paymentSessions: {
    title: "Payment sessions", copy: "Read checkout sessions and confirm in-store payments.",
    expires: "Expires", method: "Method", markPaid: "Mark paid"
  },
  emailProvider: {
    title: "SMTP provider",
    copy: "Configure the mail server used by the worker. Environment SMTP remains a fallback.",
    host: "Host",
    port: "Port",
    user: "Username",
    password: "Password",
    from: "From",
    requireTls: "Require TLS",
    status: "Status",
    enabled: "Enabled",
    disabled: "Disabled",
    save: "Save SMTP settings",
    test: "Send test email",
    testTo: "Test recipient"
  },
  erp: {
    title: "ERP sync jobs", copy: "Monitor ERP integration jobs and retry failed deliveries.",
    jobType: "Type", lastError: "Last error"
  },
  inventory: {
    title: "Inventory snapshots", copy: "Review and adjust on-hand inventory by SKU and dealer location.",
    onHand: "On hand", reserved: "Reserved", available: "Available", location: "Location",
    adjust: "Adjust on hand", createSnapshot: "Create snapshot", saveInventory: "Save inventory"
  },
  cms: {
    title: "Content management", copy: "Edit storefront navigation, homepage, footer, legal pages, and articles.",
    navigation: "Navigation", homePage: "Home page", footer: "Footer", legalPages: "Legal pages",
    articles: "Articles", catalogConfig: "Catalog config", storefrontConfig: "Storefront config",
    readiness: "Module readiness", slug: "Slug", titleField: "Title", body: "Body"
  }
};

export type DashboardCopy = typeof englishDashboardCopy;

const frenchDashboardCopy: DashboardCopy = {
  tabs: {
    products: "Produits", categories: "Catégories", pricing: "Tarification", promotions: "Promotions",
    users: "Utilisateurs", roles: "Rôles", dealers: "Détaillants", dealerApplications: "Demandes",
    contactLeads: "Prospects", crmContacts: "CRM site Web", productReviews: "Avis", supportHandoffs: "Transferts d’assistance",
    orders: "Commandes", paymentSessions: "Sessions de paiement", erpSyncJobs: "Sync ERP", inventorySnapshots: "Inventaire",
    cms: "Contenu", operations: "Opérations", emailOutbox: "Boîte d’envoi", auditLogs: "Journaux d’audit"
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
    handoffStatusUpdated: "État du transfert mis à jour.", emailRetried: "Courriel remis en file d’attente.",
    paymentMarkedPaid: "Session de paiement marquée comme payée et commande créée.",
    emailProviderSaved: "Paramètres SMTP enregistrés.",
    emailProviderTestQueued: "Courriel de test mis en file d’attente.",
    emailTemplatePublished: "Version du modèle de courriel publiée.",
    productUpdated: "Produit mis à jour.", categoryUpdated: "Catégorie mise à jour.", priceUpdated: "Prix mis à jour.",
    promotionUpdated: "Promotion mise à jour.", orderStatusUpdated: "État de la commande mis à jour.",
    orderAssigned: "Détaillant attribué à la commande.", erpRetried: "Tâche ERP remise en file d’attente.",
    crmUpdated: "Contact CRM mis à jour.", crmNoteAdded: "Note CRM ajoutée.", crmPromoted: "Client mis en file pour la synchro ERP.",
    catalogSynced: "Catalogue ERP synchronisé.", inventoryUpdated: "Inventaire mis à jour.",
    contentSaved: "Contenu enregistré.", articleCreated: "Article créé.", articleUpdated: "Article mis à jour."
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
    crmContacts: "Contacts CRM", reviews: "Avis", opsAlerts: "Alertes opérationnelles", orders: "Commandes"
  },
  pagination: {
    showing: (page, totalPages, total) => `Page ${page} sur ${totalPages} (${total} au total)`
  },
  actions: {
    view: "Voir", save: "Enregistrer", delete: "Supprimer", edit: "Modifier", assign: "Attribuer", addNote: "Ajouter une note",
    updateStatus: "Mettre à jour l’état", openQueue: "Ouvrir la file", retry: "Réessayer"
  },
  common: {
    name: "Nom", slug: "Identifiant URL", status: "État", category: "Catégorie", key: "Clé",
    email: "Courriel", role: "Rôle", note: "Note", message: "Message", created: "Création",
    select: "Sélectionner", noRecords: "Aucun enregistrement pour le moment.", yes: "Oui", no: "Non", product: "Produit",
    phone: "Téléphone", total: "Total", fulfillment: "Exécution", customer: "Client", locale: "Langue",
    notes: "Notes", details: "Détails", jsonPayload: "Charge utile JSON"
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
    crm: {
      registered: "Inscrit", engaged: "Engagé", checkout_started: "Paiement commencé",
      customer: "Client", high_intent: "Forte intention", archived: "Archivé",
      none: "Non synchronisé", queued: "En file", synced: "Synchronisé", failed: "Échec"
    },
    promotion: { draft: "Brouillon", active: "Active", inactive: "Inactive", archived: "Archivée" }
  },
  products: {
    title: "Produits", copy: "Créez des produits, des UGS et des ressources d’image de base à partir de l’API du site Web.",
    createProduct: "Créer un produit", noCategory: "Aucune catégorie", productId: "ID du produit",
    skuCode: "Code UGS", addSku: "Ajouter une UGS", assetUrl: "URL de la ressource", altText: "Texte de remplacement",
    addAsset: "Ajouter une ressource", skus: "UGS", editProduct: "Modifier le produit", specifications: "Spécifications",
    syncFromErp: "Synchroniser depuis l’ERP", refreshErpColors: "Actualiser les couleurs ERP", mpn: "N° de pièce",
    shortDescription: "Description courte", brand: "Marque", erpMapping: "Liaison ERP",
    erpSystem: "Système ERP", erpSkuKey: "Clé UGS ERP", erpProductId: "ID produit ERP",
    erpSkuId: "ID UGS ERP", specKey: "Clé de spécification", specValue: "Valeur", addSpec: "Ajouter une spécification",
    highlightsJson: "JSON des points forts"
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
  crm: {
    title: "CRM du site Web", copy: "Clients inscrits et entonnoir d’engagement. Le CRM ERP externe est en lecture seule ici.",
    search: "Rechercher un courriel ou un nom", stage: "Étape de l’entonnoir", source: "Source", erpSync: "Synchro ERP",
    events: "Chronologie d’activité", orders: "Commandes", promote: "Mettre en file la synchro ERP",
    relatedLead: "Prospect associé", erpLinks: "Liens clients ERP", syncJobs: "Tâches de synchro",
    noUser: "Invité — un compte enregistré est requis pour la promotion ERP"
  },
  reviews: {
    title: "Avis sur les produits", copy: "Modérez les avis soumis avant leur publication sur les pages de détails des produits.",
    reviewId: "ID de l’avis", moderate: "Modérer l’avis", addNote: "Ajouter une note", reviewer: "Auteur",
    rating: "Note", review: "Avis", fallbackProduct: "Produit", untitled: "Sans titre"
  },
  emailOutbox: {
    title: "Boîte d’envoi", copy: "Consultez les courriels de notification en attente et relancez les échecs.",
    template: "Modèle", recipient: "Destinataire", attempts: "Tentatives", lastError: "Dernière erreur",
    retry: "Réessayer", templatesTitle: "Modèles de courriel", templatesCopy: "Modifiez l’objet et le corps, puis publiez une nouvelle version.",
    subject: "Objet", bodyText: "Corps (texte)", bodyHtml: "Corps (HTML)", publish: "Publier la version",
    editTemplate: "Modifier le modèle", version: "Version"
  },
  handoffs: {
    title: "Transferts d’assistance", copy: "Examinez les demandes du widget IA pour un suivi humain.",
    handoffId: "ID du transfert", channel: "Canal", sourcePath: "Chemin source", update: "Mettre à jour le transfert",
    filterAll: "Tous les états", filterNew: "Nouveaux seulement"
  },
  operations: {
    title: "Opérations", copy: "Les échecs doivent être examinés; les enregistrements en attente seront réessayés automatiquement par le processus de traitement.",
    empty: "Aucune alerte opérationnelle.", severity: "Gravité", alert: "Alerte", count: "Nombre", queue: "File",
    analyticsTitle: "Trafic (7 jours)", analyticsCopy: "Vues de pages premières parties collectées uniquement avec le consentement analytique.",
    pageViews: "Vues de pages", uniqueSessions: "Sessions uniques", topPaths: "Chemins les plus visités",
    checkoutSessions: "Sessions de paiement", paidOrders: "Commandes payées"
  },
  auditLogs: {
    title: "Journaux d’audit", copy: "Consultez les activités d’écriture récentes du tableau de bord à des fins de traçabilité.",
    action: "Action", resource: "Ressource", resourceId: "ID de la ressource"
  },
  orders: {
    title: "Commandes", copy: "Examinez les commandes payées, mettez à jour l’état d’exécution et attribuez un détaillant.",
    orderId: "Commande", items: "Articles", assignDealer: "Attribuer un détaillant", postalCode: "Code postal",
    statusHistory: "Historique des états", source: "Source"
  },
  paymentSessions: {
    title: "Sessions de paiement", copy: "Consultez les sessions et confirmez les paiements en magasin.",
    expires: "Expiration", method: "Mode", markPaid: "Marquer payé"
  },
  emailProvider: {
    title: "Fournisseur SMTP",
    copy: "Configurez le serveur de messagerie utilisé par le worker. Les variables d’environnement restent un secours.",
    host: "Hôte",
    port: "Port",
    user: "Nom d’utilisateur",
    password: "Mot de passe",
    from: "Expéditeur",
    requireTls: "Exiger TLS",
    status: "État",
    enabled: "Activé",
    disabled: "Désactivé",
    save: "Enregistrer SMTP",
    test: "Envoyer un courriel de test",
    testTo: "Destinataire de test"
  },
  erp: {
    title: "Tâches de synchronisation ERP", copy: "Surveillez les tâches d’intégration ERP et relancez les échecs.",
    jobType: "Type", lastError: "Dernière erreur"
  },
  inventory: {
    title: "Instantanés d’inventaire", copy: "Consultez et ajustez le stock disponible par UGS et emplacement de détaillant.",
    onHand: "En stock", reserved: "Réservé", available: "Disponible", location: "Emplacement",
    adjust: "Ajuster le stock", createSnapshot: "Créer un instantané", saveInventory: "Enregistrer l’inventaire"
  },
  cms: {
    title: "Gestion de contenu", copy: "Modifiez la navigation, la page d’accueil, le pied de page, les pages légales et les articles.",
    navigation: "Navigation", homePage: "Page d’accueil", footer: "Pied de page", legalPages: "Pages légales",
    articles: "Articles", catalogConfig: "Config catalogue", storefrontConfig: "Config boutique",
    readiness: "État des modules", slug: "Identifiant URL", titleField: "Titre", body: "Corps"
  }
};

export function getDashboardCopy(locale: SiteLocale): DashboardCopy {
  return locale === "fr-CA" ? frenchDashboardCopy : englishDashboardCopy;
}
