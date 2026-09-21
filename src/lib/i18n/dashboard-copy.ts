import type { SiteLocale } from "@/lib/i18n/locale";

const englishDashboardCopy = {
  tabs: {
    overview: "Overview", products: "Products", categories: "Categories", pricing: "Pricing", promotions: "Promotions",
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
    contentSaved: "Content saved.", articleCreated: "Article created.", articleUpdated: "Article updated.",
    customerProfileUpdated: "Customer profile updated.", addressAdded: "Address added.",
    addressUpdated: "Address updated.", addressDeleted: "Address deleted.",
    defaultAddressSet: "Default address set."
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
    view: "View", save: "Save",
    savePrice: "Save price", saveInventory: "Save inventory", delete: "Delete", edit: "Edit", assign: "Assign", addNote: "Add note",
    updateStatus: "Update status", openQueue: "Open queue", retry: "Retry", cancel: "Cancel"
  },
  common: {
    name: "Name", slug: "Slug", status: "Status", category: "Category", key: "Key",
    email: "Email", role: "Role", note: "Note", message: "Message", created: "Created",
    select: "Select", noRecords: "No records yet.", yes: "Yes", no: "No", product: "Product",
    phone: "Phone", total: "Total", fulfillment: "Fulfillment", customer: "Customer", locale: "Locale",
    notes: "Notes", details: "Details", jsonPayload: "JSON payload",
    firstName: "First name", lastName: "Last name"
  },
  values: {
    draft: "Draft", active: "Active", inactive: "Inactive", archived: "Archived", submitted: "Submitted",
    under_review: "Under review", approved: "Approved", rejected: "Rejected", new: "New", routed: "Routed",
    closed: "Closed", spam: "Spam", pending: "Pending", pending_payment: "Pending payment", payment_expired: "Payment expired", published: "Published", warning: "Warning",
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
    createProduct: "Create product",
    prices: "Prices",
    priceCents: "Price (cents)",
    inventory: "Inventory",
    onHand: "On hand", noCategory: "No category", productId: "Product ID",
    skuCode: "SKU code", addSku: "Add SKU", assetUrl: "Asset URL", altText: "Alt text",
    addAsset: "Add asset", skus: "SKUs", editProduct: "Edit product", specifications: "Specifications",
    refreshErpColors: "Refresh ERP colors", mpn: "MPN",
    shortDescription: "Short description", brand: "Brand", erpMapping: "ERP mapping",
    erpSystem: "ERP system", erpSkuKey: "ERP SKU key", erpProductId: "ERP product ID",
    erpSkuId: "ERP SKU ID", specKey: "Spec key", specValue: "Spec value", addSpec: "Add specification",
    highlightsJson: "Highlights JSON"
  },
  erpSync: {
    title: "Sync products from ERP", copy: "Pull products, categories, specifications and SKUs from the ERP catalog through the formal sync job.",
    connectionTitle: "ERP connection status", connectionUnavailable: "Connection status unavailable for this account.",
    connectionNotConfigured: "ERP integration is not configured.", maskedUrl: "ERP API base",
    health: "API health", healthReachable: "Reachable", healthUnreachable: "Unreachable",
    lastTested: "Last tested", lastSyncTitle: "Last sync", neverSynced: "No ERP sync has run yet.",
    runUnavailable: "Latest sync run unavailable.", succeeded: "Succeeded", running: "Running", failed: "Failed",
    previewTitle: "Preview sync", previewCopy: "The sync covers the fields below and applies changes only when started.",
    scopeProducts: "Product base information", scopeCategories: "Categories",
    scopeSpecifications: "Specifications", scopeOptions: "Option definitions and values",
    scopeSkus: "Variants / SKUs", scopeStatus: "Statuses", scopeMappings: "ERP external ID mappings",
    scopePricesInventory: "Prices and inventory only when the ERP is the field owner",
    awaitingIntegration: "Internal sync surface is ready; real ERP endpoint integration is pending.",
    start: "Start sync", retryLastSync: "Retry last sync", syncing: "Syncing…",
    progressCopy: "The sync runs on the server; the product list refreshes when it completes.",
    alreadyRunning: "An ERP sync is already running.", startFailed: "Sync request failed.",
    resultTitle: "Sync result", imported: "Imported", updated: "Updated", skipped: "Skipped",
    failedCount: "Failed", categoriesImported: "Categories imported", categoriesUpdated: "Categories updated",
    conflictNote: "Field-owner conflicts are rejected per item and listed under failure reasons.",
    failureReasons: "Per-item failure reasons", startedAt: "Started", finishedAt: "Finished",
    productsUpserted: "Products upserted", runError: "Run error",
    viewProducts: "View synced products", jobsLink: "View ERP sync jobs"
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
    createButton: "Create user", kind: "Kind", roles: "Roles", adminProfile: "Admin profile",
    customerProfile: "Customer profile", saveProfile: "Save profile", addressBook: "Address book",
    addAddress: "Add address", setDefault: "Set default", defaultAddress: "Default",
    label: "Label", addressLine1: "Address line 1", addressLine2: "Address line 2",
    city: "City", province: "Province", postalCode: "Postal code"
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
    title: "Orders", copy: "Review orders, including pending in-store reservations, update fulfillment status, and assign dealers.",
    orderId: "Order", paymentSessionId: "Payment session", paymentMethodLabel: "Payment method", paymentMethod: { card: "Online card", pos: "In-store card", cash: "In-store cash" }, items: "Items", assignDealer: "Assign dealer", postalCode: "Postal code",
    statusHistory: "Status history", source: "Source",
    dealerUnavailable: "Dealer assignment is temporarily unavailable."
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
    jobType: "Type",
    systemStatus: "ERP system status",
    serviceAccounts: "Service account summary",
    neverSynced: "No sync jobs yet",
    attention: "Failed or retry-waiting jobs need attention",
    ready: "Ready",
    noServiceAccounts: "No service accounts",
 lastError: "Last error"
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
    overview: "Vue d’ensemble", products: "Produits", categories: "Catégories", pricing: "Tarification", promotions: "Promotions",
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
    contentSaved: "Contenu enregistré.", articleCreated: "Article créé.", articleUpdated: "Article mis à jour.",
    customerProfileUpdated: "Profil client mis à jour.", addressAdded: "Adresse ajoutée.",
    addressUpdated: "Adresse mise à jour.", addressDeleted: "Adresse supprimée.",
    defaultAddressSet: "Adresse par défaut définie."
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
    view: "Voir", save: "Enregistrer",
    savePrice: "Enregistrer le prix", saveInventory: "Enregistrer l'inventaire", delete: "Supprimer", edit: "Modifier", assign: "Attribuer", addNote: "Ajouter une note",
    updateStatus: "Mettre à jour l’état", openQueue: "Ouvrir la file", retry: "Réessayer", cancel: "Annuler"
  },
  common: {
    name: "Nom", slug: "Identifiant URL", status: "État", category: "Catégorie", key: "Clé",
    email: "Courriel", role: "Rôle", note: "Note", message: "Message", created: "Création",
    select: "Sélectionner", noRecords: "Aucun enregistrement pour le moment.", yes: "Oui", no: "Non", product: "Produit",
    phone: "Téléphone", total: "Total", fulfillment: "Exécution", customer: "Client", locale: "Langue",
    notes: "Notes", details: "Détails", jsonPayload: "Charge utile JSON",
    firstName: "Prénom", lastName: "Nom de famille"
  },
  values: {
    draft: "Brouillon", active: "Actif", inactive: "Inactif", archived: "Archivé", submitted: "Soumis",
    under_review: "En cours d’examen", approved: "Approuvé", rejected: "Rejeté", new: "Nouveau", routed: "Acheminé",
    closed: "Fermé", spam: "Pourriel", pending: "En attente", pending_payment: "Paiement en attente", payment_expired: "Paiement expiré", published: "Publié", warning: "Avertissement",
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
    createProduct: "Créer un produit",
    prices: "Prix",
    priceCents: "Prix (centimes)", inventory: "Inventaire", onHand: "En main", noCategory: "Aucune catégorie", productId: "ID du produit",
    skuCode: "Code UGS", addSku: "Ajouter une UGS", assetUrl: "URL de la ressource", altText: "Texte de remplacement",
    addAsset: "Ajouter une ressource", skus: "UGS", editProduct: "Modifier le produit", specifications: "Spécifications",
    refreshErpColors: "Actualiser les couleurs ERP", mpn: "N° de pièce",
    shortDescription: "Description courte", brand: "Marque", erpMapping: "Liaison ERP",
    erpSystem: "Système ERP", erpSkuKey: "Clé UGS ERP", erpProductId: "ID produit ERP",
    erpSkuId: "ID UGS ERP", specKey: "Clé de spécification", specValue: "Valeur", addSpec: "Ajouter une spécification",
    highlightsJson: "JSON des points forts"
  },
  erpSync: {
    title: "Synchroniser les produits depuis l’ERP", copy: "Importez produits, catégories, spécifications et UGS du catalogue ERP via le processus de synchronisation officiel.",
    connectionTitle: "État de la connexion ERP", connectionUnavailable: "État de la connexion indisponible pour ce compte.",
    connectionNotConfigured: "L’intégration ERP n’est pas configurée.", maskedUrl: "Base de l’API ERP",
    health: "Santé de l’API", healthReachable: "Accessible", healthUnreachable: "Inaccessible",
    lastTested: "Dernier test", lastSyncTitle: "Dernière synchronisation", neverSynced: "Aucune synchronisation ERP pour le moment.",
    runUnavailable: "Dernière exécution indisponible.", succeeded: "Réussie", running: "En cours", failed: "Échouée",
    previewTitle: "Aperçu de la synchronisation", previewCopy: "La synchronisation couvre les champs ci-dessous et applique les changements uniquement au démarrage.",
    scopeProducts: "Informations de base des produits", scopeCategories: "Catégories",
    scopeSpecifications: "Spécifications", scopeOptions: "Définitions et valeurs d’options",
    scopeSkus: "Variantes / UGS", scopeStatus: "États", scopeMappings: "Mappages d’identifiants ERP externes",
    scopePricesInventory: "Prix et inventaire uniquement si l’ERP est le propriétaire des champs",
    awaitingIntegration: "La surface de synchronisation interne est prête ; l’intégration réelle avec le point de terminaison ERP est en attente.",
    start: "Démarrer la synchronisation", retryLastSync: "Réessayer la dernière synchronisation", syncing: "Synchronisation…",
    progressCopy: "La synchronisation s’exécute sur le serveur ; la liste des produits est actualisée à la fin.",
    alreadyRunning: "Une synchronisation ERP est déjà en cours.", startFailed: "Échec de la demande de synchronisation.",
    resultTitle: "Résultat de la synchronisation", imported: "Importés", updated: "Mis à jour", skipped: "Ignorés",
    failedCount: "Échecs", categoriesImported: "Catégories importées", categoriesUpdated: "Catégories mises à jour",
    conflictNote: "Les conflits de propriété des champs sont rejetés élément par élément et répertoriés dans les raisons d’échec.",
    failureReasons: "Raisons d’échec par élément", startedAt: "Début", finishedAt: "Fin",
    productsUpserted: "Produits insérés ou mis à jour", runError: "Erreur d’exécution",
    viewProducts: "Voir les produits synchronisés", jobsLink: "Voir les tâches de synchronisation ERP"
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
    createButton: "Créer l’utilisateur", kind: "Type", roles: "Rôles", adminProfile: "Profil administrateur",
    customerProfile: "Profil client", saveProfile: "Enregistrer le profil", addressBook: "Carnet d’adresses",
    addAddress: "Ajouter une adresse", setDefault: "Définir par défaut", defaultAddress: "Par défaut",
    label: "Libellé", addressLine1: "Adresse (ligne 1)", addressLine2: "Adresse (ligne 2)",
    city: "Ville", province: "Province", postalCode: "Code postal"
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
    title: "Commandes", copy: "Examinez les commandes, y compris les réservations en magasin en attente, mettez à jour l’état d’exécution et attribuez un détaillant.",
    orderId: "Commande", paymentSessionId: "Session de paiement", paymentMethodLabel: "Mode de paiement", paymentMethod: { card: "Carte en ligne", pos: "Carte en magasin", cash: "Espèces en magasin" }, items: "Articles", assignDealer: "Attribuer un détaillant", postalCode: "Code postal",
    statusHistory: "Historique des états", source: "Source",
    dealerUnavailable: "L’attribution d’un détaillant est temporairement indisponible."
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
    jobType: "Type",
    systemStatus: "ERP system status",
    serviceAccounts: "Service account summary",
    neverSynced: "No sync jobs yet",
    attention: "Failed or retry-waiting jobs need attention",
    ready: "Ready",
    noServiceAccounts: "No service accounts",
 lastError: "Dernière erreur"
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

type DashboardF0Copy = Omit<DashboardCopy, "values"> & {
  values: DashboardCopy["values"] & Record<"paid" | "processing" | "fulfilled" | "cancelled" | "failed" | "retry_wait" | "pickup" | "delivery", string>;
};

const simplifiedChineseDashboardCopy: DashboardF0Copy = {
  tabs: {
    overview: "概览", products: "产品", categories: "分类", pricing: "定价", promotions: "促销",
    users: "用户", roles: "角色", dealers: "经销商", dealerApplications: "经销商申请",
    contactLeads: "咨询线索", crmContacts: "网站客户管理", productReviews: "产品评价", supportHandoffs: "客服转接",
    orders: "订单", paymentSessions: "支付会话", erpSyncJobs: "ERP 同步", inventorySnapshots: "库存",
    cms: "内容", operations: "运营", emailOutbox: "邮件发件箱", auditLogs: "审计日志"
  },
  errors: {
    requestFailedWith: (status) => `请求失败，状态码为 ${status}`,
    loadPathFailed: (path) => `无法加载 ${path}`,
    dashboardLoadFailed: "管理后台加载失败。", storedSessionExpired: "已保存的会话已过期。",
    loginFailed: "登录失败。", requestFailed: "请求失败。"
  },
  messages: {
    signedIn: "已登录。", signedOut: "已退出登录。", assetCreated: "资源已创建。",
    productCreated: "产品已创建。", skuCreated: "SKU 已创建。", categoryCreated: "分类已创建。",
    priceCreated: "价格已创建。", promotionCreated: "促销已创建。", adminUserCreated: "管理员用户已创建。",
    roleCreated: "角色已创建。", applicationStatusUpdated: "申请状态已更新。",
    applicationNoteAdded: "申请备注已添加。", leadStatusUpdated: "线索状态已更新。",
    leadAssigned: "线索已分配。", leadNoteAdded: "线索备注已添加。",
    reviewStatusUpdated: "评价状态已更新。", reviewNoteAdded: "评价备注已添加。",
    handoffStatusUpdated: "客服转接状态已更新。", emailRetried: "邮件已加入重试队列。",
    paymentMarkedPaid: "支付会话已标记为已付款，订单已创建。",
    emailProviderSaved: "SMTP 服务设置已保存。",
    emailProviderTestQueued: "测试邮件已加入发送队列。",
    emailTemplatePublished: "邮件模板版本已发布。",
    productUpdated: "产品已更新。", categoryUpdated: "分类已更新。", priceUpdated: "价格已更新。",
    promotionUpdated: "促销已更新。", orderStatusUpdated: "订单状态已更新。",
    orderAssigned: "订单经销商已分配。", erpRetried: "ERP 任务已加入重试队列。",
    crmUpdated: "客户资料已更新。", crmNoteAdded: "客户备注已添加。", crmPromoted: "客户已加入 ERP 同步队列。",
    catalogSynced: "ERP 产品目录已同步。", inventoryUpdated: "库存已更新。",
    contentSaved: "内容已保存。", articleCreated: "文章已创建。", articleUpdated: "文章已更新。",
    customerProfileUpdated: "客户资料已更新。", addressAdded: "地址已添加。",
    addressUpdated: "地址已更新。", addressDeleted: "地址已删除。",
    defaultAddressSet: "默认地址已设置。"
  },
  login: {
    eyebrow: "VanStro 管理后台", title: "管理员登录",
    intro: "请使用已获授权的 VanStro 管理员账户登录。", apiBase: "API 地址：",
    email: "电子邮箱", password: "密码", signingIn: "正在登录…", signIn: "登录"
  },
  hero: {
    eyebrow: "VanStro 管理后台", title: "产品目录、定价与业务申请管理后台",
    signedInAs: (email) => `当前登录账户：${email}。`,
    refreshing: "正在刷新…", refresh: "刷新", signOut: "退出登录",
    countsLabel: "管理后台统计", sectionsLabel: "管理后台栏目"
  },
  stats: {
    products: "产品", categories: "分类", prices: "价格", promotions: "促销",
    users: "用户", dealers: "经销商", applications: "经销商申请", leads: "咨询线索",
    crmContacts: "客户资料", reviews: "产品评价", opsAlerts: "运营告警", orders: "订单"
  },
  pagination: {
    showing: (page, totalPages, total) => `第 ${page} 页，共 ${totalPages} 页（合计 ${total} 条）`
  },
  actions: {
    view: "查看", save: "保存",
    savePrice: "保存价格", saveInventory: "保存库存", delete: "删除", edit: "编辑", assign: "分配", addNote: "添加备注",
    updateStatus: "更新状态", openQueue: "打开队列", retry: "重试", cancel: "取消"
  },
  common: {
    name: "名称", slug: "页面网址", status: "状态", category: "分类", key: "标识",
    email: "电子邮箱", role: "角色", note: "备注", message: "消息", created: "创建时间",
    select: "请选择", noRecords: "暂无记录。", yes: "是", no: "否", product: "产品",
    phone: "电话", total: "总计", fulfillment: "履约方式", customer: "客户", locale: "语言地区",
    notes: "备注", details: "详情", jsonPayload: "JSON 数据",
    firstName: "名", lastName: "姓"
  },
  values: {
    draft: "草稿", active: "启用", inactive: "停用", archived: "已归档", submitted: "已提交",
    under_review: "审核中", approved: "已批准", rejected: "已拒绝", new: "新建", routed: "已转交",
    closed: "已关闭", spam: "垃圾信息", pending: "待处理", pending_payment: "待付款", payment_expired: "付款已过期", published: "已发布", warning: "警告",
    critical: "严重", admin: "管理员", paid: "已支付", processing: "处理中", fulfilled: "已履约",
    cancelled: "已取消", failed: "失败", retry_wait: "等待重试", pickup: "自提", delivery: "配送"
  },
  statusValues: {
    application: { submitted: "已提交", under_review: "审核中", approved: "已批准", rejected: "已拒绝", archived: "已归档" },
    lead: { new: "新建", routed: "已转交", closed: "已关闭", spam: "垃圾信息" },
    review: { pending: "待审核", published: "已发布", rejected: "已拒绝", archived: "已归档" },
    handoff: { new: "新建", in_progress: "处理中", resolved: "已解决", closed: "已关闭" },
    crm: {
      registered: "已注册", engaged: "已互动", checkout_started: "已开始结账",
      customer: "客户", high_intent: "高意向", archived: "已归档",
      none: "未同步", queued: "已排队", synced: "已同步", failed: "同步失败"
    },
    promotion: { draft: "草稿", active: "启用", inactive: "停用", archived: "已归档" }
  },
  products: {
    title: "产品", copy: "通过网站 API 创建产品、SKU 和基础图片资源。",
    createProduct: "创建产品",
    prices: "价格",
    priceCents: "价格（分）",
    inventory: "库存",
    onHand: "在手数量", noCategory: "未分类", productId: "产品 ID",
    skuCode: "SKU 编号", addSku: "添加 SKU", assetUrl: "资源网址", altText: "替代文本",
    addAsset: "添加资源", skus: "SKU", editProduct: "编辑产品", specifications: "规格参数",
    refreshErpColors: "刷新 ERP 颜色", mpn: "制造商零件编号",
    shortDescription: "简短描述", brand: "品牌", erpMapping: "ERP 映射",
    erpSystem: "ERP 系统", erpSkuKey: "ERP SKU 编码", erpProductId: "ERP 产品编号",
    erpSkuId: "ERP SKU 记录编号", specKey: "规格标识", specValue: "规格值", addSpec: "添加规格",
    highlightsJson: "产品亮点（JSON）"
  },
  erpSync: {
    title: "从 ERP 同步商品", copy: "通过正式同步任务从 ERP 目录拉取产品、分类、规格和 SKU。",
    connectionTitle: "ERP 连接状态", connectionUnavailable: "当前账户无法查看连接状态。",
    connectionNotConfigured: "ERP 集成尚未配置。", maskedUrl: "ERP API 地址",
    health: "API 健康检查", healthReachable: "可达", healthUnreachable: "不可达",
    lastTested: "最近检测", lastSyncTitle: "上次同步", neverSynced: "尚未执行过 ERP 同步。",
    runUnavailable: "无法读取最近同步记录。", succeeded: "成功", running: "进行中", failed: "失败",
    previewTitle: "预览同步", previewCopy: "同步覆盖以下范围，仅在开始后才会应用变更。",
    scopeProducts: "产品基础信息", scopeCategories: "分类",
    scopeSpecifications: "规格参数", scopeOptions: "选项定义与取值",
    scopeSkus: "Variant / SKU", scopeStatus: "状态", scopeMappings: "ERP 外部 ID 映射",
    scopePricesInventory: "仅当 ERP 为字段属主时同步价格与库存",
    awaitingIntegration: "内部同步面已就绪；真实 ERP 端点联调待完成。",
    start: "开始同步", retryLastSync: "重试上次同步", syncing: "同步中…",
    progressCopy: "同步在服务器端执行，完成后自动刷新商品列表。",
    alreadyRunning: "已有 ERP 同步任务正在进行。", startFailed: "同步请求失败。",
    resultTitle: "同步结果", imported: "新增", updated: "更新", skipped: "跳过",
    failedCount: "失败", categoriesImported: "分类新增", categoriesUpdated: "分类更新",
    conflictNote: "字段属主冲突按条目拒绝，并列入失败原因。",
    failureReasons: "单条失败原因", startedAt: "开始时间", finishedAt: "完成时间",
    productsUpserted: "新增或更新商品数", runError: "运行错误",
    viewProducts: "查看同步后的商品", jobsLink: "查看 ERP 同步任务"
  },
  categories: {
    title: "分类", copy: "管理店面产品展示区域使用的目录分组。",
    create: "创建分类", active: "启用"
  },
  pricing: {
    title: "定价", copy: "为平台 SKU 创建有效的目录价格。", create: "创建价格",
    selectSku: "选择 SKU", amountCents: "金额（分）", amount: "金额"
  },
  promotions: {
    title: "促销", copy: "创建用于店面价格标签的营销活动。",
    create: "创建促销", label: "标签"
  },
  users: {
    title: "用户", copy: "创建管理员用户并为其分配初始角色。", create: "创建管理员用户",
    displayName: "显示名称", temporaryPassword: "临时密码", noRole: "无角色",
    createButton: "创建用户", kind: "类型", roles: "角色", adminProfile: "管理员资料",
    customerProfile: "客户资料", saveProfile: "保存资料", addressBook: "地址簿",
    addAddress: "新增地址", setDefault: "设为默认", defaultAddress: "默认",
    label: "标签", addressLine1: "地址行 1", addressLine2: "地址行 2",
    city: "城市", province: "省/地区", postalCode: "邮政编码"
  },
  roles: {
    title: "角色", copy: "创建角色。API 冒烟测试会验证权限替换功能。",
    create: "创建角色", permissions: "权限"
  },
  dealers: {
    title: "经销商", copy: "查看经销商展示资料和服务网点。", code: "经销商编号", locations: "网点"
  },
  applications: {
    title: "经销商申请", copy: "审核经销商计划申请并添加内部处理备注。",
    applicationId: "申请 ID", update: "更新申请", addNote: "添加备注",
    company: "公司", contact: "联系人", market: "市场"
  },
  leads: {
    title: "咨询线索", copy: "将联系表单中的一般咨询转交给管理员用户或经销商。",
    leadId: "线索 ID", update: "更新线索", assignedUserId: "负责用户 ID",
    assignedDealerId: "负责经销商 ID", assign: "分配线索", addNote: "添加备注",
    topic: "主题", location: "所在地"
  },
  crm: {
    title: "网站客户管理", copy: "管理注册客户和店面互动漏斗。外部 ERP 客户管理数据在此仅供查看。",
    search: "搜索邮箱或姓名", stage: "漏斗阶段", source: "来源", erpSync: "ERP 同步",
    events: "活动时间线", orders: "订单", promote: "加入 ERP 同步队列", relatedLead: "关联咨询线索",
    erpLinks: "ERP 客户关联", syncJobs: "同步任务", noUser: "访客——必须关联注册账户后才能加入 ERP 同步队列"
  },
  reviews: {
    title: "产品评价", copy: "审核用户提交的产品评价，通过后才会显示在产品详情页。",
    reviewId: "评价 ID", moderate: "审核评价", addNote: "添加备注", reviewer: "评价人",
    rating: "评分", review: "评价内容", fallbackProduct: "产品", untitled: "无标题"
  },
  emailOutbox: {
    title: "邮件发件箱", copy: "查看待发送的通知邮件，并重试发送失败的邮件。",
    template: "模板", recipient: "收件人", attempts: "尝试次数", lastError: "最近错误",
    retry: "重试", templatesTitle: "邮件模板", templatesCopy: "编辑主题和正文，然后发布新版本。",
    subject: "主题", bodyText: "正文（纯文本）", bodyHtml: "正文（HTML）", publish: "发布版本",
    editTemplate: "编辑模板", version: "版本"
  },
  handoffs: {
    title: "客服转接", copy: "查看 AI 小组件中需要人工跟进的请求。",
    handoffId: "转接 ID", channel: "渠道", sourcePath: "来源页面", update: "更新转接",
    filterAll: "全部状态", filterNew: "仅显示新请求"
  },
  operations: {
    title: "运营", copy: "失败记录需要人工检查；等待中的记录将由后台任务自动重试。",
    empty: "暂无运营告警。", severity: "严重程度", alert: "告警", count: "数量", queue: "队列",
    analyticsTitle: "流量（近 7 天）", analyticsCopy: "仅在用户同意分析 Cookie 后收集第一方页面浏览数据。",
    pageViews: "页面浏览量", uniqueSessions: "独立会话", topPaths: "热门页面",
    checkoutSessions: "结账会话", paidOrders: "已付款订单"
  },
  auditLogs: {
    title: "审计日志", copy: "查看管理后台近期的写入操作，便于追溯。",
    action: "操作", resource: "资源", resourceId: "资源 ID"
  },
  orders: {
    title: "订单", copy: "查看订单，包括待处理的到店预留订单，更新履约状态并分配经销商。",
    orderId: "订单", paymentSessionId: "支付会话", paymentMethodLabel: "支付方式", paymentMethod: { card: "在线卡", pos: "到店刷卡", cash: "到店现金" }, items: "商品", assignDealer: "分配经销商", postalCode: "邮政编码",
    statusHistory: "状态记录", source: "来源",
    dealerUnavailable: "经销商分配功能暂时不可用。"
  },
  paymentSessions: {
    title: "支付会话", copy: "查看结账会话并确认店内付款。",
    expires: "到期时间", method: "支付方式", markPaid: "标记为已付款"
  },
  emailProvider: {
    title: "SMTP 邮件服务",
    copy: "配置后台任务使用的邮件服务器。环境变量中的 SMTP 配置仍作为备用。",
    host: "主机",
    port: "端口",
    user: "用户名",
    password: "密码",
    from: "发件人",
    requireTls: "要求 TLS",
    status: "状态",
    enabled: "已启用",
    disabled: "已停用",
    save: "保存 SMTP 设置",
    test: "发送测试邮件",
    testTo: "测试收件人"
  },
  erp: {
    title: "ERP 同步任务", copy: "监控 ERP 集成任务并重试发送失败的任务。",
    jobType: "类型",
    systemStatus: "ERP 系统状态",
    serviceAccounts: "Service Account 摘要",
    neverSynced: "无同步记录",
    attention: "存在失败或待重试任务",
    ready: "已就绪",
    noServiceAccounts: "暂无 Service Account",
 lastError: "最近错误"
  },
  inventory: {
    title: "库存快照", copy: "按 SKU 和经销商网点查看并调整现有库存。",
    onHand: "现有库存", reserved: "已预留", available: "可用库存", location: "网点",
    adjust: "调整现有库存", createSnapshot: "创建快照", saveInventory: "保存库存"
  },
  cms: {
    title: "内容管理", copy: "编辑店面导航、首页、页脚、法律页面和文章。",
    navigation: "导航", homePage: "首页", footer: "页脚", legalPages: "法律页面",
    articles: "文章", catalogConfig: "目录配置", storefrontConfig: "店面配置",
    readiness: "模块就绪状态", slug: "页面网址", titleField: "标题", body: "正文"
  }
};

export function getDashboardCopy(locale: SiteLocale): DashboardCopy {
  return locale === "fr-CA" ? frenchDashboardCopy : englishDashboardCopy;
}

export function getDashboardF0Copy(): DashboardCopy {
  return simplifiedChineseDashboardCopy;
}
