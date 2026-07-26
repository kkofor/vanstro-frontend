import type { SiteLocale } from "@/lib/i18n/locale";

type SiteLink = {
  label: string;
  href: string;
};

export type SiteCopy = {
  skipToContent: string;
  localeLabel: string;
  currentLocale: string;
  alternateLocale: string;
  alternateLocaleHref: string;
  utilityMessage: string;
  trackOrder: string;
  support: string;
  searchPlaceholder: string;
  searchLabel: string;
  searchAction: string;
  dealer: {
    openHours: string;
    choose: string;
    postalCode: string;
    apply: string;
  };
  account: {
    signIn: string;
    signedIn: string;
    signOut: string;
    saved: string;
    savedCount: (count: number) => string;
    cart: string;
    cartCount: (count: number) => string;
  };
  menu: {
    open: string;
    close: string;
    mainLabel: string;
    mobileLabel: string;
    shortcutsLabel: string;
  };
  productsLabel: string;
  allProductsLabel: string;
  categoryMenuLabel: string;
  publicSubmission: {
    submitting: string;
    success: string;
    error: string;
  };
  contactChat: {
    action: string;
    ready: string;
  };
  breadcrumbLabel: string;
  dealerMap: {
    title: string;
    description: string;
    locationCount: (count: number) => string;
    viewLabel: string;
    map: string;
    list: string;
    unavailableTitle: string;
    unavailableBody: string;
    mapLabel: string;
    attribution: string;
    zoomIn: string;
    zoomOut: string;
    listLabel: string;
    searchLabel: string;
    searchPlaceholder: string;
    showOnMap: string;
    noResults: string;
    popup: {
      contact: string;
      phone: string;
      email: string;
      address: string;
    };
  };
  supportWidget: {
    customerSupportLabel: string;
    assistantLabel: string;
    closeLabel: string;
    contextLabel: string;
    aiFirst: string;
    ready: string;
    mayNeedTeammate: string;
    answerReady: string;
    handoffPrepared: string;
    suggestedQuestionsLabel: string;
    handoffTitle: string;
    handoffDescription: string;
    handoffAction: string;
    inputLabel: string;
    inputPlaceholder: string;
    sendLabel: string;
    disclaimer: string;
    imageAlt: string;
    launcherTitle: string;
    launcherSubtitle: string;
    liveIntro: string;
    liveIntroMeta: string;
    handoffMessage: string;
    handoffContactLabel: string;
    handoffContactDescription: string;
    prompts: Array<{ id: "product-fit" | "dealer-fulfillment" | "order-help" | "dealer-program"; label: string; prompt: string }>;
    openingProduct: string;
    openingGeneral: string;
    greeting: (pageHint: string) => string;
    dealerSelected: (dealer: string) => string;
    replies: {
      human: string;
      humanMeta: string;
      contactPage: string;
      contactDescription: string;
      fulfillment: (dealer: string) => string;
      fulfillmentMeta: string;
      deliveryArticle: string;
      deliveryDescription: string;
      cartCount: (count: number) => string;
      emptyCart: string;
      order: (cartNote: string) => string;
      checkoutMeta: string;
      openCart: string;
      cartDescription: string;
      trackOrder: string;
      trackDescription: string;
      dealerProgram: string;
      dealerProgramMeta: string;
      applyDealer: string;
      applyDescription: string;
      product: string;
      productMeta: string;
      allProducts: string;
      productsDescription: string;
      fallback: string;
      fallbackMeta: string;
      supportOptions: string;
      supportDescription: string;
    };
  };
  productCategories: SiteLink[];
  navItems: SiteLink[];
  becomeDealer: string;
  partnerLogin: string;
  footer: {
    description: string;
    contactLabel: string;
    serviceArea: string;
    localFulfillment: string;
    socialLabel: string;
    helpKicker: string;
    helpTitle: string;
    helpBody: string;
    shopProducts: string;
    contactSupport: string;
    groups: Array<{ title: string; links: SiteLink[] }>;
    copyright: string;
    legalNotice: string;
    legalNoticeBody: string;
    privacyPolicy: string;
    cookiePreferences: string;
  };
  cookies: {
    title: string;
    bodyBeforeLink: string;
    policyLink: string;
    rejectAll: string;
    customize: string;
    acceptAll: string;
    rejectAndClose: string;
    preferencesTitle: string;
    closePreferences: string;
    intro: string;
    controlsLabel: string;
    manageTitle: string;
    alwaysActive: string;
    disable: string;
    enable: string;
    saved: string;
    saveError: string;
    retry: string;
    save: string;
    rows: Array<{
      key: "strictlyNecessary" | "functional" | "analytics" | "targeting";
      title: string;
      description: string;
    }>;
  };
};

const englishCopy: SiteCopy = {
  skipToContent: "Skip to main content",
  localeLabel: "Locale",
  currentLocale: "CA - EN",
  alternateLocale: "FR",
  alternateLocaleHref: "/fr",
  utilityMessage: "Online ordering is available in participating service areas. Your local dealer coordinates fulfillment.",
  trackOrder: "Track order",
  support: "Support",
  searchPlaceholder: "Search by product, SKU, or category...",
  searchLabel: "Search products",
  searchAction: "Search",
  dealer: {
    openHours: "Open — closes at 9 p.m.",
    choose: "Choose a local dealer",
    postalCode: "Postal code",
    apply: "Apply"
  },
  account: {
    signIn: "Sign in",
    signedIn: "Signed in",
    signOut: "Sign out",
    saved: "Saved",
    savedCount: (count) => `Saved ${count}`,
    cart: "Cart",
    cartCount: (count) => `Cart ${count}`
  },
  menu: {
    open: "Open menu",
    close: "Close menu",
    mainLabel: "Main navigation",
    mobileLabel: "Mobile navigation",
    shortcutsLabel: "Account and cart shortcuts"
  },
  productsLabel: "Products",
  allProductsLabel: "All Products",
  categoryMenuLabel: "Product categories",
  publicSubmission: {
    submitting: "Submitting...",
    success: "Submitted successfully. We will follow up soon.",
    error: "Submission failed. Please try again."
  },
  contactChat: {
    action: "Chat with us",
    ready: "AI assistant ready"
  },
  breadcrumbLabel: "Breadcrumb",
  dealerMap: {
    title: "Dealer locations",
    description: "Select a marker to view dealer contact details.",
    locationCount: (count) => `${count} dealer locations`,
    viewLabel: "Dealer map view",
    map: "Map",
    list: "List",
    unavailableTitle: "Map temporarily unavailable",
    unavailableBody: "Use the dealer list to view locations and contact information.",
    mapLabel: "Interactive map showing participating VanStro dealer locations",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    listLabel: "Dealer location list",
    searchLabel: "Search dealer locations",
    searchPlaceholder: "Search by city, province, or postal code",
    showOnMap: "Show on map",
    noResults: "No dealer locations match your search.",
    popup: { contact: "Contact", phone: "Phone", email: "Email", address: "Address" }
  },
  supportWidget: {
    customerSupportLabel: "VanStro AI customer support",
    assistantLabel: "VanStro assistant",
    closeLabel: "Close support panel",
    contextLabel: "Support context",
    aiFirst: "AI first, human handoff when needed",
    ready: "Ready to help",
    mayNeedTeammate: "May need a teammate",
    answerReady: "Answer ready",
    handoffPrepared: "Handoff prepared",
    suggestedQuestionsLabel: "Suggested questions",
    handoffTitle: "AI can prepare a teammate handoff",
    handoffDescription: "It will pass the dealer, page context and conversation summary.",
    handoffAction: "Transfer with context",
    inputLabel: "Ask VanStro assistant",
    inputPlaceholder: "Ask about products, pickup, orders...",
    sendLabel: "Send message",
    disclaimer: "AI starts the conversation. A teammate can take over when needed.",
    imageAlt: "VanStro AI support",
    launcherTitle: "AI support",
    launcherSubtitle: "Ask VanStro",
    liveIntro: "I will start here. If this needs a support teammate, I can prepare the handoff after collecting the key details.",
    liveIntroMeta: "AI first",
    handoffMessage: "I can route this to a VanStro support teammate. Please leave your name, email, order number if available, and the product or dealer location involved.",
    handoffContactLabel: "Open contact form",
    handoffContactDescription: "Use this for files, project details or email follow-up.",
    prompts: [
      { id: "product-fit", label: "Find product", prompt: "Help me find the right cabinet, vanity, trim or door product." },
      { id: "dealer-fulfillment", label: "Pickup / delivery", prompt: "How does dealer pickup or delivery support work?" },
      { id: "order-help", label: "Order help", prompt: "I need help with checkout, payment or tracking an order." },
      { id: "dealer-program", label: "Dealer program", prompt: "I am a business buyer interested in joining the dealer program." }
    ],
    openingProduct: "I can help with this product, SKU, pickup, delivery and checkout questions.",
    openingGeneral: "I can help with product selection, dealer fulfillment, checkout and dealer program questions.",
    greeting: (pageHint) => `Hi, I am VanStro's AI assistant. ${pageHint}`,
    dealerSelected: (dealer) => `${dealer} selected`,
    replies: {
      human: "I can collect the key details first, then route this to a VanStro support teammate with the context included. Please share your order number, email, dealer location or product/SKU.",
      humanMeta: "Human support available",
      contactPage: "Contact page",
      contactDescription: "Use the full support form if you prefer email follow-up.",
      fulfillment: (dealer) => `You selected ${dealer} as your local dealer. After checkout, the local dealer confirms availability and the pickup or delivery options for your location. Separately offered local services are subject to a separate agreement with the local dealer.`,
      fulfillmentMeta: "Local dealer fulfillment",
      deliveryArticle: "Delivery article",
      deliveryDescription: "Review how dealer handoff works after checkout.",
      cartCount: (count) => `I see ${count} item${count === 1 ? "" : "s"} in the cart.`,
      emptyCart: "Your cart is currently empty.",
      order: (cartNote) => `${cartNote} For checkout, confirm quantity, selected dealer and payment details. For an existing order, use Track order or share your order number for handoff.`,
      checkoutMeta: "Checkout support",
      openCart: "Open cart",
      cartDescription: "Review quantity and selected products.",
      trackOrder: "Track demo order",
      trackDescription: "See the current order status pattern.",
      dealerProgram: "VanStro works with trade buyers and local dealer partners in participating service areas across Canada. For onboarding, prepare your company name, proposed dealer service area, contact details and business type.",
      dealerProgramMeta: "Dealer program",
      applyDealer: "Apply as dealer",
      applyDescription: "Start the partner application flow.",
      product: "For product selection, compare category, SKU, dimensions, finish and price. Cabinet and vanity finishes are white-focused, and detail pages show SKU, size, dealer quantity and add-to-cart.",
      productMeta: "Product guidance",
      allProducts: "All products",
      productsDescription: "Search by product, SKU, category or size.",
      fallback: "I can help route this. Tell me whether this is about product selection, dealer pickup or delivery, checkout, an existing order, or joining the dealer program. If this needs a person, I can prepare a handoff.",
      fallbackMeta: "Need one detail",
      supportOptions: "Support options",
      supportDescription: "Share more detail with the VanStro team."
    }
  },
  productCategories: [
    { href: "/products", label: "All Products" },
    { href: "/products?category=kitchen-cabinets", label: "Kitchen Cabinets" },
    { href: "/products?category=bathroom-vanities", label: "Bathroom Vanities" },
    { href: "/products?category=baseboards", label: "Baseboards & Mouldings" },
    { href: "/products?category=handle-series", label: "Handle Series" }
  ],
  navItems: [
    { href: "/", label: "Home" },
    { href: "/articles", label: "Resource Center" },
    { href: "https://tools.vanstro.ca/", label: "Design Studio" },
    { href: "/about", label: "About us" },
    { href: "/contact", label: "Contact us" }
  ],
  becomeDealer: "Become a dealer",
  partnerLogin: "Partner login",
  footer: {
    description: "Canadian home materials supply platform for homeowners, contractors and VanStro dealer partners.",
    contactLabel: "Contact information",
    serviceArea: "Service availability varies by postal code",
    localFulfillment: "Local dealer fulfillment",
    socialLabel: "Social media channels",
    helpKicker: "Need help with an order?",
    helpTitle: "Order online. Fulfillment stays local.",
    helpBody: "Your selected local dealer receives the order request and confirms availability, pickup and delivery options for your postal code. Any separately offered local services are agreed directly with that dealer.",
    shopProducts: "Shop products",
    contactSupport: "Contact support",
    groups: [
      {
        title: "Shop",
        links: [
          { label: "All products", href: "/products" },
          { label: "Kitchen cabinets", href: "/products?category=kitchen-cabinets" },
          { label: "Bathroom vanities", href: "/products?category=bathroom-vanities" },
          { label: "Baseboards & mouldings", href: "/products?category=baseboards" },
          { label: "Handle series", href: "/products?category=handle-series" }
        ]
      },
      {
        title: "Customer support",
        links: [
          { label: "Contact us", href: "/contact" },
          { label: "Order tracking", href: "/orders/demo-order" },
          { label: "Store pickup", href: "/#stores" },
          { label: "Shipping & delivery", href: "/articles/pickup-and-delivery-options" },
          { label: "Returns & exchanges", href: "/return-policy" }
        ]
      },
      {
        title: "Dealer program",
        links: [
          { label: "Dealer program", href: "/dealer-program" },
          { label: "Become a dealer", href: "/dealers/apply" },
          { label: "Partner login", href: "/account/login" },
          { label: "Dealer benefits", href: "/dealer-program#fit" },
          { label: "Trade resources", href: "/dealer-program#policies" }
        ]
      },
      {
        title: "Company",
        links: [
          { label: "About us", href: "/about" },
          { label: "Dealer map", href: "/dealers/map" },
          { label: "Resource Center", href: "/articles" },
          { label: "Design Studio", href: "https://tools.vanstro.ca/" },
          { label: "Careers", href: "/careers" }
        ]
      }
    ],
    copyright: "© 2026 VanStro Global Supply Inc. All rights reserved. | Tous droits réservés.",
    legalNotice: "Legal Disclaimer",
    legalNoticeBody: "Terms and legal policies are currently available in English while reviewed French versions are prepared.",
    privacyPolicy: "Privacy Policy",
    cookiePreferences: "Cookie Preferences"
  },
  cookies: {
    title: "How We Use Cookies",
    bodyBeforeLink: "We use cookies and similar technologies which are required for our website to function. Optional cookies help us understand how people use VanStro, improve services and personalize product offers. For more information, see our ",
    policyLink: "Cookie Policy",
    rejectAll: "Reject All",
    customize: "Customize",
    acceptAll: "Accept All",
    rejectAndClose: "Reject non-essential cookies and close",
    preferencesTitle: "Cookie Preferences",
    closePreferences: "Close cookie preferences",
    intro: "We use cookies and similar technologies that are required for VanStro to function. Optional cookies help improve product browsing, local dealer selection, support workflows and marketing relevance.",
    controlsLabel: "Cookie preference controls",
    manageTitle: "Manage Cookie Preferences",
    alwaysActive: "Always Active",
    disable: "Disable",
    enable: "Enable",
    saved: "Preferences saved.",
    saveError: "Your preference is active on this device, but the consent record could not be saved. Please try again.",
    retry: "Retry saving",
    save: "Save My Preferences",
    rows: [
      { key: "strictlyNecessary", title: "Strictly Necessary Cookies", description: "Required for cart, checkout, account security and core site operation." },
      { key: "functional", title: "Functional Cookies", description: "Remember store selection, language choices and support preferences." },
      { key: "analytics", title: "Analytics and Performance Cookies", description: "Help us understand page usage and improve product discovery flows." },
      { key: "targeting", title: "Targeting Cookies", description: "Support more relevant product offers, dealer updates and campaign measurement." }
    ]
  }
};

const frenchCopy: SiteCopy = {
  skipToContent: "Aller au contenu principal",
  localeLabel: "Langue",
  currentLocale: "CA - FR",
  alternateLocale: "EN",
  alternateLocaleHref: "/",
  utilityMessage: "La commande en ligne est offerte dans les zones de service participantes. Votre détaillant local coordonne le ramassage ou la livraison.",
  trackOrder: "Suivre une commande",
  support: "Soutien",
  searchPlaceholder: "Rechercher par produit, UGS ou catégorie…",
  searchLabel: "Rechercher des produits",
  searchAction: "Rechercher",
  dealer: {
    openHours: "Ouvert — ferme à 21 h",
    choose: "Choisir un détaillant local",
    postalCode: "Code postal",
    apply: "Valider"
  },
  account: {
    signIn: "Se connecter",
    signedIn: "Connecté",
    signOut: "Se déconnecter",
    saved: "Favoris",
    savedCount: (count) => `Favoris ${count}`,
    cart: "Panier",
    cartCount: (count) => `Panier ${count}`
  },
  menu: {
    open: "Ouvrir le menu",
    close: "Fermer le menu",
    mainLabel: "Navigation principale",
    mobileLabel: "Navigation mobile",
    shortcutsLabel: "Raccourcis du compte et du panier"
  },
  productsLabel: "Produits",
  allProductsLabel: "Tous les produits",
  categoryMenuLabel: "Catégories de produits",
  publicSubmission: {
    submitting: "Envoi en cours…",
    success: "Votre demande a bien été envoyée. Nous communiquerons avec vous sous peu.",
    error: "L’envoi a échoué. Veuillez réessayer plus tard."
  },
  contactChat: {
    action: "Clavardez avec nous",
    ready: "Assistant virtuel prêt"
  },
  breadcrumbLabel: "Fil d’Ariane",
  dealerMap: {
    title: "Emplacements des détaillants",
    description: "Sélectionnez un repère pour afficher les coordonnées du détaillant.",
    locationCount: (count) => `${count} emplacement${count === 1 ? "" : "s"} de détaillant${count === 1 ? "" : "s"}`,
    viewLabel: "Affichage des détaillants",
    map: "Carte",
    list: "Liste",
    unavailableTitle: "Carte temporairement indisponible",
    unavailableBody: "Consultez la liste des détaillants pour voir les emplacements et les coordonnées.",
    mapLabel: "Carte interactive des détaillants VanStro participants",
    attribution: '&copy; contributeurs d’<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    listLabel: "Liste des emplacements de détaillants",
    searchLabel: "Rechercher des détaillants",
    searchPlaceholder: "Rechercher par ville, province ou code postal",
    showOnMap: "Afficher sur la carte",
    noResults: "Aucun détaillant ne correspond à votre recherche.",
    popup: { contact: "Personne-ressource", phone: "Téléphone", email: "Courriel", address: "Adresse" }
  },
  supportWidget: {
    customerSupportLabel: "Soutien à la clientèle VanStro par IA",
    assistantLabel: "Assistant VanStro",
    closeLabel: "Fermer le panneau de soutien",
    contextLabel: "Contexte du soutien",
    aiFirst: "L’assistant virtuel vous aide d’abord; un membre de l’équipe prend la relève au besoin",
    ready: "Prêt à vous aider",
    mayNeedTeammate: "Un membre de l’équipe pourrait être requis",
    answerReady: "Réponse prête",
    handoffPrepared: "Demande prête à être transmise",
    suggestedQuestionsLabel: "Questions suggérées",
    handoffTitle: "L’assistant virtuel peut préparer la mise en relation avec notre équipe",
    handoffDescription: "Nous transmettrons le détaillant sélectionné, la page consultée et un résumé de la conversation.",
    handoffAction: "Transmettre la demande avec son contexte",
    inputLabel: "Poser une question à l’assistant VanStro",
    inputPlaceholder: "Posez une question sur les produits, le ramassage ou les commandes…",
    sendLabel: "Envoyer le message",
    disclaimer: "L’assistant virtuel répond d’abord. Un membre de l’équipe peut prendre la relève au besoin.",
    imageAlt: "Soutien VanStro par IA",
    launcherTitle: "Soutien par IA",
    launcherSubtitle: "Demandez à VanStro",
    liveIntro: "Je vais commencer ici. Si votre demande nécessite l’aide de notre équipe, je pourrai la transmettre après avoir recueilli les renseignements essentiels.",
    liveIntroMeta: "Assistant virtuel propulsé par l’IA",
    handoffMessage: "Je peux acheminer votre demande à un membre de l’équipe de soutien VanStro. Veuillez indiquer votre nom, votre courriel, votre numéro de commande, si vous l’avez, ainsi que le produit ou le détaillant concerné.",
    handoffContactLabel: "Ouvrir le formulaire de contact",
    handoffContactDescription: "Utilisez-le pour joindre des fichiers, fournir les détails du projet ou demander un suivi par courriel.",
    prompts: [
      { id: "product-fit", label: "Trouver un produit", prompt: "Aidez-moi à trouver l’armoire, le meuble-lavabo, la moulure ou la porte qui me convient." },
      { id: "dealer-fulfillment", label: "Ramassage et livraison", prompt: "Comment fonctionnent le ramassage et la livraison par un détaillant?" },
      { id: "order-help", label: "Aide avec une commande", prompt: "J’ai besoin d’aide avec le paiement ou le suivi d’une commande." },
      { id: "dealer-program", label: "Programme pour les détaillants", prompt: "Je représente une entreprise et je souhaite adhérer au programme destiné aux détaillants." }
    ],
    openingProduct: "Je peux répondre à vos questions sur ce produit, son UGS, le ramassage, la livraison et le paiement.",
    openingGeneral: "Je peux vous aider à choisir un produit, à comprendre la prise en charge de votre commande par un détaillant, à passer à la caisse ou à vous renseigner sur le programme destiné aux détaillants.",
    greeting: (pageHint) => `Bonjour, je suis l’assistant virtuel de VanStro. ${pageHint}`,
    dealerSelected: (dealer) => `Détaillant sélectionné : ${dealer}`,
    replies: {
      human: "Je peux d’abord recueillir les renseignements essentiels, puis acheminer votre demande à un membre de l’équipe de soutien VanStro avec son contexte. Veuillez fournir votre numéro de commande, votre courriel, le détaillant ou le produit et son UGS.",
      humanMeta: "Soutien humain offert",
      contactPage: "Page Nous joindre",
      contactDescription: "Utilisez le formulaire complet si vous préférez un suivi par courriel.",
      fulfillment: (dealer) => `Vous avez sélectionné ${dealer} comme détaillant local. Après le passage de la commande, ce détaillant confirme la disponibilité et les options de ramassage ou de livraison pour votre emplacement. Les services locaux offerts séparément font l’objet d’une entente distincte avec le détaillant.`,
      fulfillmentMeta: "Prise en charge par un détaillant local",
      deliveryArticle: "Article sur la livraison",
      deliveryDescription: "Voyez comment se déroule le transfert au détaillant après le paiement.",
      cartCount: (count) => `Votre panier contient ${count} article${count === 1 ? "" : "s"}.`,
      emptyCart: "Votre panier est vide.",
      order: (cartNote) => `${cartNote} Pour passer à la caisse, confirmez la quantité, le détaillant sélectionné et les renseignements de paiement. Pour une commande existante, utilisez le suivi de commande ou fournissez votre numéro de commande afin que nous transmettions votre demande à un membre de l’équipe.`,
      checkoutMeta: "Aide avec une commande",
      openCart: "Ouvrir le panier",
      cartDescription: "Vérifiez les quantités et les produits sélectionnés.",
      trackOrder: "Suivre la commande de démonstration",
      trackDescription: "Consultez le modèle actuel de suivi de commande.",
      dealerProgram: "VanStro collabore avec des acheteurs commerciaux et des détaillants locaux dans les zones de service participantes au Canada. Pour l’adhésion, préparez le nom de votre entreprise, la zone de service proposée, vos coordonnées et votre type d’entreprise.",
      dealerProgramMeta: "Programme pour les détaillants",
      applyDealer: "Présenter une demande",
      applyDescription: "Commencez la demande d’adhésion au programme de partenaires.",
      product: "Pour choisir un produit, comparez la catégorie, l’UGS, les dimensions, le fini et le prix. Les armoires et les meubles-lavabos sont principalement offerts en blanc; les pages de détail indiquent l’UGS, les dimensions, la quantité chez le détaillant et l’option d’ajout au panier.",
      productMeta: "Conseils sur les produits",
      allProducts: "Tous les produits",
      productsDescription: "Recherchez par produit, UGS, catégorie ou dimension.",
      fallback: "Je peux vous orienter. Indiquez si votre demande concerne le choix d’un produit, le ramassage ou la livraison par un détaillant, le paiement, une commande existante ou l’adhésion au programme destiné aux détaillants. Si vous devez parler à quelqu’un, je peux transmettre votre demande à un membre de l’équipe.",
      fallbackMeta: "Précision requise",
      supportOptions: "Options de soutien",
      supportDescription: "Transmettez plus de détails à l’équipe VanStro."
    }
  },
  productCategories: [
    { href: "/products", label: "Tous les produits" },
    { href: "/products?category=kitchen-cabinets", label: "Armoires de cuisine" },
    { href: "/products?category=bathroom-vanities", label: "Meubles-lavabos" },
    { href: "/products?category=baseboards", label: "Plinthes et moulures" },
    { href: "/products?category=handle-series", label: "Poignées" }
  ],
  navItems: [
    { href: "/fr", label: "Accueil" },
    { href: "/articles", label: "Centre de ressources" },
    { href: "https://tools.vanstro.ca/", label: "Studio de conception (EN)" },
    { href: "/about", label: "À propos" },
    { href: "/contact", label: "Nous joindre" }
  ],
  becomeDealer: "Devenir détaillant",
  partnerLogin: "Connexion partenaire",
  footer: {
    description: "Plateforme canadienne d’approvisionnement en matériaux résidentiels destinée aux propriétaires, aux entrepreneurs et aux détaillants partenaires de VanStro.",
    contactLabel: "Coordonnées",
    serviceArea: "La disponibilité des services varie selon le code postal",
    localFulfillment: "Prise en charge par un détaillant local",
    socialLabel: "Réseaux sociaux",
    helpKicker: "Besoin d’aide avec une commande?",
    helpTitle: "Commandez en ligne. Votre détaillant local prend le relais.",
    helpBody: "Le détaillant local sélectionné reçoit votre demande de commande et confirme la disponibilité ainsi que les options de ramassage et de livraison pour votre code postal. Tout service local offert séparément est convenu directement avec ce détaillant.",
    shopProducts: "Magasiner les produits",
    contactSupport: "Communiquer avec le soutien",
    groups: [
      {
        title: "Magasiner",
        links: [
          { label: "Tous les produits", href: "/products" },
          { label: "Armoires de cuisine", href: "/products?category=kitchen-cabinets" },
          { label: "Meubles-lavabos", href: "/products?category=bathroom-vanities" },
          { label: "Plinthes et moulures", href: "/products?category=baseboards" },
          { label: "Poignées", href: "/products?category=handle-series" }
        ]
      },
      {
        title: "Service à la clientèle",
        links: [
          { label: "Nous joindre", href: "/contact" },
          { label: "Suivi de commande", href: "/orders/demo-order" },
          { label: "Ramassage en magasin", href: "/fr#stores" },
          { label: "Expédition et livraison", href: "/articles/pickup-and-delivery-options" },
          { label: "Retours et échanges", href: "/return-policy" }
        ]
      },
      {
        title: "Programme pour les détaillants",
        links: [
          { label: "Programme pour les détaillants", href: "/dealer-program" },
          { label: "Devenir détaillant", href: "/dealers/apply" },
          { label: "Connexion partenaire", href: "/account/login" },
          { label: "Avantages pour les détaillants", href: "/dealer-program#fit" },
          { label: "Ressources commerciales", href: "/dealer-program#policies" }
        ]
      },
      {
        title: "Entreprise",
        links: [
          { label: "À propos", href: "/about" },
          { label: "Carte des détaillants", href: "/dealers/map" },
          { label: "Centre de ressources", href: "/articles" },
          { label: "Studio de conception (EN)", href: "https://tools.vanstro.ca/" },
          { label: "Carrières", href: "/careers" }
        ]
      }
    ],
    copyright: "© 2026 VanStro Global Supply Inc. Tous droits réservés.",
    legalNotice: "Avis juridique",
    legalNoticeBody: "Les conditions et politiques juridiques demeurent offertes en anglais pendant la préparation de leurs versions françaises révisées.",
    privacyPolicy: "Politique de confidentialité",
    cookiePreferences: "Préférences relatives aux témoins"
  },
  cookies: {
    title: "Notre utilisation des témoins",
    bodyBeforeLink: "Nous utilisons des témoins et des technologies semblables nécessaires au fonctionnement de notre site. Les témoins facultatifs nous aident à comprendre l’utilisation de VanStro, à améliorer nos services et à personnaliser les offres de produits. Pour en savoir plus, consultez notre ",
    policyLink: "politique relative aux témoins",
    rejectAll: "Tout refuser",
    customize: "Personnaliser",
    acceptAll: "Tout accepter",
    rejectAndClose: "Refuser les témoins non essentiels et fermer",
    preferencesTitle: "Préférences relatives aux témoins",
    closePreferences: "Fermer les préférences relatives aux témoins",
    intro: "Nous utilisons des témoins et des technologies semblables nécessaires au fonctionnement de VanStro. Les témoins facultatifs contribuent à améliorer la navigation parmi les produits, la sélection d’un détaillant local, le soutien et la pertinence des communications commerciales.",
    controlsLabel: "Contrôles des préférences relatives aux témoins",
    manageTitle: "Gérer les préférences relatives aux témoins",
    alwaysActive: "Toujours actif",
    disable: "Désactiver",
    enable: "Activer",
    saved: "Préférences enregistrées.",
    saveError: "Votre préférence est active sur cet appareil, mais le registre de consentement n’a pas pu être enregistré. Veuillez réessayer.",
    retry: "Réessayer l’enregistrement",
    save: "Enregistrer mes préférences",
    rows: [
      { key: "strictlyNecessary", title: "Témoins strictement nécessaires", description: "Nécessaires au panier, au paiement, à la sécurité du compte et au fonctionnement essentiel du site." },
      { key: "functional", title: "Témoins fonctionnels", description: "Mémorisent le détaillant sélectionné, les choix de langue et les préférences de soutien." },
      { key: "analytics", title: "Témoins d’analyse et de performance", description: "Nous aident à comprendre l’utilisation des pages et à améliorer la découverte des produits." },
      { key: "targeting", title: "Témoins publicitaires", description: "Servent à personnaliser les offres de produits, les communications des détaillants et la mesure des campagnes." }
    ]
  }
};

export function getSiteCopy(locale: SiteLocale) {
  return locale === "fr-CA" ? frenchCopy : englishCopy;
}
