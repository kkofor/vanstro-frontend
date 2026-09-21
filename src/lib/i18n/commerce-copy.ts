import type { SiteLocale } from "@/lib/i18n/locale";

type CommerceCopy = {
  common: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    shopProducts: string;
    continueShopping: string;
    subtotal: string;
    total: string;
    items: string;
    retry: string;
    backToProducts: string;
  };
  auth: {
    loginTitle: string;
    loginBody: string;
    registerTitle: string;
    registerBody: string;
    accountBenefits: string[];
    secureSession: string;
    wait: string;
    createAccount: string;
    signIn: string;
    existingAccount: string;
    newAccount: string;
    error: string;
    registrationError: string;
    passwordRequirement: string;
  };
  account: {
    title: string;
    intro: string;
    overview: string;
    profile: string;
    addresses: string;
    orders: string;
    favorites: string;
    signInRequiredTitle: string;
    signInRequiredBody: string;
    loading: string;
    saveProfile: string;
    profileSaved: string;
    addAddress: string;
    addressSaved: string;
    addressUpdated: string;
    addressDeleted: string;
    editAddress: string;
    deleteAddress: string;
    setDefault: string;
    saveAddress: string;
    cancelEdit: string;
    defaultAddress: string;
    noOrders: string;
    viewOrder: string;
    orderCount: (count: number) => string;
    favoriteCount: (count: number) => string;
    loadErrorTitle: string;
    loadErrorBody: string;
    sessionErrorTitle: string;
    sessionErrorBody: string;
    retry: string;
    addressesEmptyTitle: string;
    addressesEmptyBody: string;
    ordersEmptyTitle: string;
    ordersEmptyBody: string;
    overviewOrders: string;
    overviewFavorites: string;
    overviewProfile: string;
    overviewAddresses: string;
  };
  favorites: {
    loadingTitle: string;
    loadingBody: string;
    unavailableTitle: string;
    unavailableBody: string;
    authRequiredTitle: string;
    authRequiredBody: string;
    emptyTitle: string;
    emptyBody: string;
    browse: string;
    retry: string;
    signIn: string;
  };
  cart: {
    loadingTitle: string;
    loadingBody: string;
    unavailableTitle: string;
    emptyTitle: string;
    emptyBody: string;
    quantityFor: (name: string) => string;
    decrease: string;
    increase: string;
    remove: (name: string) => string;
    summary: string;
    servingStore: string;
    payment: string;
    paymentValue: string;
    checkout: string;
    retry: string;
    continueShopping: string;
    itemCount: (count: number) => string;
    unitPrice: string;
    lineTotal: string;
    fulfillmentTitle: string;
    fulfillmentBody: (dealer: string) => string;
    chooseAtCheckout: string;
    taxesDelivery: string;
    mutationPending: string;
    reviewTitle: string;
    reviewBody: string;
    quantity: string;
    productFulfillment: string;
    productFulfillmentBody: string;
    requestedDealer: (dealer: string) => string;
    fulfillmentConfirmation: string;
    productsSubtotal: string;
    delivery: string;
    estimatedTax: string;
    deliveryAtCheckout: string;
    taxAtCheckout: string;
    currentSubtotal: string;
    checkoutIncludesTitle: string;
    checkoutIncludes: [string, string, string];
    inventoryNotice: string;
    secureCheckout: string;
  };
  drawer: {
    close: string;
    title: string;
    count: (count: number) => string;
    added: (quantity: number) => string;
    quantity: string;
    pickupDelivery: (dealer: string) => string;
    subtotalLabel: string;
    orderSubtotal: string;
    taxes: string;
    viewCart: string;
    continueShopping: string;
    suggestions: string;
    emptyTitle: string;
    emptyBody: (dealer: string) => string;
    remove: string;
  };
  checkout: {
    loadingTitle: string;
    loadingBody: string;
    unavailableTitle: string;
    returnToCart: string;
    emptyTitle: string;
    emptyBody: string;
    phone: string;
    fulfillment: string;
    pickup: string;
    delivery: string;
    paymentRegistration: string;
    card: string;
    pos: string;
    cash: string;
    notes: string;
    notesPlaceholder: string;
    summary: string;
    store: string;
    tax: string;
    shipping: string;
    inventory: string;
    inventoryValue: string;
    creating: string;
    continuePayment: string;
    tokenError: string;
    reserveError: string;
    deliveryAddress: string;
  };
  address: {
    title: string;
    search: string;
    searchPlaceholder: string;
    searching: string;
    manualFallback: string;
    line1: string;
    line2: string;
    city: string;
    province: string;
    postalCode: string;
    chooseProvince: string;
    useSaved: string;
    chooseSaved: string;
  };
  payment: {
    loadingTitle: string;
    loadingBody: string;
    unavailableTitle: string;
    sessionExpired: string;
    reconciliationTitle: string;
    reconciliationBody: string;
    refundPendingTitle: string;
    refundPendingBody: string;
    refundedTitle: string;
    refundedBody: string;
    refundFailedTitle: string;
    refundFailedBody: string;
    viewOrder: string;
    summary: string;
    payNow: string;
    processing: string;
    inStoreTitle: string;
    inStoreBody: string;
    inStoreReference: string;
    simulatePayment: string;
    successRedirect: string;
    confirmationPending: string;
    cardUnavailable: string;
    returnToCheckout: string;
  };
  lookup: {
    title: string;
    intro: string;
    orderId: string;
    token: string;
    submit: string;
    error: string;
    help: string;
    signedInHint: string;
  };
  order: {
    loadingTitle: string;
    loadingBody: string;
    unavailableTitle: string;
    returnToCheckout: string;
    session: string;
    status: string;
    inventoryReserved: string;
    reservationExpires: (date: string) => string;
    paymentConfirmation: string;
    paymentConfirmed: string;
    paymentPending: string;
    sessionTotal: string;
    notFoundTitle: string;
    notFoundBody: string;
    order: string;
    items: string;
    fulfillment: Record<"pickup" | "delivery", string>;
    paymentMethod: Record<"card" | "pos" | "cash", string>;
    statusLabels: Record<
      | "paid"
      | "processing"
      | "fulfilled"
      | "shipped"
      | "reserved"
      | "dealer_accepted"
      | "fulfilling"
      | "delivered"
      | "pending"
      | "expired"
      | "cancelled"
      | "failed",
      string
    >;
    tracking: string;
    trackingNumber: string;
    shipmentStatus: string;
    statusHistory: string;
    sku: string;
    unitSeparator: string;
    retry: string;
    backToOrders: string;
    orderSummary: string;
    placedOn: string;
    fulfillmentDetails: string;
    paymentDetails: string;
    currentStatus: string;
    statusUpdated: string;
  };
  storefront: {
    requestError: string;
    invalidState: string;
    timeline: {
      paid: string;
      paidDetail: string;
      reserved: string;
      reservedDetail: (dealer: string) => string;
      accepted: string;
      acceptedDetail: string;
      delivered: string;
      deliveredDetail: string;
    };
  };
};

const english: CommerceCopy = {
  common: { email: "Email", password: "Password", firstName: "First name", lastName: "Last name", shopProducts: "Shop products", continueShopping: "Continue shopping", subtotal: "Subtotal", total: "Total", items: "Items", retry: "Try again", backToProducts: "Back to products" },
  auth: { loginTitle: "Welcome Back", loginBody: "Sign in to review orders, manage delivery addresses and return to saved products.", registerTitle: "Create Your VanStro Account", registerBody: "Keep project purchases, addresses and saved products together in one secure place.", accountBenefits: ["Review current and past orders", "Save delivery and pickup details", "Keep products ready for your next project"], secureSession: "Your session is protected with a secure, HttpOnly account cookie.", wait: "Please wait…", createAccount: "Create account", signIn: "Sign in", existingAccount: "Already have an account? Sign in", newAccount: "New to VanStro? Create an account", error: "We could not sign you in. Check your email and password, then try again.", registrationError: "We could not create your account. Review the highlighted details and try again.", passwordRequirement: "Use at least 12 characters. A longer, unique passphrase is easier to remember and safer to reuse nowhere else." },
  account: {
    title: "My Account", intro: "Manage your profile, addresses and order history.", overview: "Overview", profile: "Profile", addresses: "Addresses", orders: "Orders", favorites: "Favorites",
    signInRequiredTitle: "Sign in required", signInRequiredBody: "Sign in or create an account to access your customer area.", loading: "Loading your account...",
    saveProfile: "Save profile", profileSaved: "Profile updated.", addAddress: "Add address", addressSaved: "Address saved.", addressUpdated: "Address updated.", addressDeleted: "Address removed.", editAddress: "Edit", deleteAddress: "Delete", setDefault: "Set as default", saveAddress: "Save address", cancelEdit: "Cancel", defaultAddress: "Default",
    noOrders: "You have no orders yet.", viewOrder: "View order", orderCount: (count) => `${count} order${count === 1 ? "" : "s"}`, favoriteCount: (count) => `${count} saved product${count === 1 ? "" : "s"}`,
    loadErrorTitle: "We couldn’t load this account section", loadErrorBody: "Your account is still secure. Check your connection and try again.", sessionErrorTitle: "We couldn’t verify your session", sessionErrorBody: "This may be a temporary connection problem. Try again before signing in again.", retry: "Try again", addressesEmptyTitle: "No saved addresses yet", addressesEmptyBody: "Add an address to make future delivery checkout faster.", ordersEmptyTitle: "No orders in this account yet", ordersEmptyBody: "When you place an order while signed in, its payment and fulfillment progress will appear here.", overviewOrders: "Track orders and fulfillment", overviewFavorites: "Return to saved products", overviewProfile: "Keep contact details current", overviewAddresses: "Manage delivery addresses"
  },
  favorites: { loadingTitle: "Loading favorites", loadingBody: "Checking your saved products.", unavailableTitle: "Favorites are unavailable", unavailableBody: "We couldn’t load your favorites. Please try again.", authRequiredTitle: "Sign in to view favorites", authRequiredBody: "Your favorites are saved to your account. Sign in to view them.", emptyTitle: "No saved products yet", emptyBody: "Save products from the catalog to revisit them before checkout.", browse: "Browse products", retry: "Try again", signIn: "Sign in" },
  cart: { loadingTitle: "Loading your cart", loadingBody: "Checking saved items, current pricing and your fulfilling dealer.", unavailableTitle: "Your cart is temporarily unavailable", emptyTitle: "Your cart is ready for a new project", emptyBody: "Add products to compare quantities, then choose pickup or coordinated local delivery at checkout.", quantityFor: (name) => `Quantity for ${name}`, decrease: "Decrease quantity", increase: "Increase quantity", remove: (name) => `Remove ${name}`, summary: "Order summary", servingStore: "Fulfilling dealer", payment: "Payment", paymentValue: "Selected at checkout", checkout: "Continue to checkout", retry: "Reload cart", continueShopping: "Continue shopping", itemCount: (count) => `${new Intl.NumberFormat("en-CA").format(count)} item${count === 1 ? "" : "s"}`, unitPrice: "Unit price", lineTotal: "Line total", fulfillmentTitle: "Pickup or local delivery", fulfillmentBody: (dealer) => `${dealer} will confirm stock and coordinate your selected pickup or delivery option.`, chooseAtCheckout: "Choose fulfillment at checkout", taxesDelivery: "No tax or delivery charge is added to this subtotal yet. Final amounts are calculated before payment.", mutationPending: "Updating your cart…", reviewTitle: "Review your project materials", reviewBody: "Confirm each model, size and quantity before continuing. Checkout validates availability against your requested dealer preference.", quantity: "Quantity", productFulfillment: "Fulfillment selected at checkout", productFulfillmentBody: "Checkout validates stock for your requested pickup or local delivery preference.", requestedDealer: (dealer) => `Requested dealer: ${dealer}`, fulfillmentConfirmation: "Checkout checks inventory against your requested dealer and fulfillment preference. Final coordination follows dealer acceptance.", productsSubtotal: "Products subtotal", delivery: "Delivery", estimatedTax: "Estimated tax", deliveryAtCheckout: "Calculated at checkout", taxAtCheckout: "Calculated at checkout", currentSubtotal: "Current subtotal", checkoutIncludesTitle: "Next at checkout", checkoutIncludes: ["Choose pickup or local delivery", "Confirm contact details and fulfilling dealer", "Review tax, delivery charge and payment method"], inventoryNotice: "Items are not reserved while they remain in your cart. Checkout creates a time-limited inventory reservation.", secureCheckout: "Continue to secure checkout" },
  drawer: { close: "Close cart drawer", title: "Your cart", count: (count) => `${count} ${count === 1 ? "item" : "items"}`, added: (quantity) => `${quantity} item${quantity === 1 ? " has" : "s have"} been added to your cart`, quantity: "Qty", pickupDelivery: (dealer) => `Free pickup at ${dealer}, or delivery quoted by dealer — chosen at checkout.`, subtotalLabel: "Cart subtotal", orderSubtotal: "Order subtotal", taxes: "Taxes and delivery are calculated at checkout. Stock is reserved for 60 minutes once you start checkout.", viewCart: "View cart", continueShopping: "Continue shopping", suggestions: "Suggested items with your purchase", emptyTitle: "Your cart is empty", emptyBody: (dealer) => `Anything you add is priced by your dealer, ${String(dealer).replace(/\.+$/, "")}.`, remove: "Remove" },
  checkout: { loadingTitle: "Loading checkout", loadingBody: "Checking your current cart.", unavailableTitle: "Checkout is unavailable", returnToCart: "Return to cart", emptyTitle: "No items ready for checkout", emptyBody: "Add products first, then return to checkout.", phone: "Phone", fulfillment: "Fulfillment method", pickup: "Store pickup", delivery: "Local delivery", paymentRegistration: "Payment method", card: "Pay online by credit card", pos: "Pay by card at the store", cash: "Pay cash at the store", notes: "Order notes", notesPlaceholder: "Pickup timing, delivery instructions, or project details", summary: "Order summary", store: "Fulfilling dealer", tax: "Estimated tax", shipping: "Delivery", inventory: "Inventory", inventoryValue: "Continuing verifies stock and creates a time-limited reservation", creating: "Creating checkout session...", continuePayment: "Continue to payment", tokenError: "Checkout did not return an order access token.", reserveError: "Checkout could not reserve inventory. Please review your cart and try again.", deliveryAddress: "Delivery address" },
  address: { title: "Canadian address", search: "Search address", searchPlaceholder: "Start typing your street or postal code", searching: "Searching addresses...", manualFallback: "Address search is unavailable. Enter your address manually.", line1: "Address line 1", line2: "Address line 2", city: "City", province: "Province", postalCode: "Postal code", chooseProvince: "Select province", useSaved: "Use a saved address", chooseSaved: "Choose a saved address" },
  payment: { loadingTitle: "Loading payment", loadingBody: "Preparing your secure payment session.", unavailableTitle: "Payment is unavailable", sessionExpired: "This checkout session has expired.", reconciliationTitle: "Payment received — order confirmation pending", reconciliationBody: "Your payment was received, but we are still confirming the order. Do not pay again. VanStro support will reconcile the transaction.", refundPendingTitle: "Refund in progress", refundPendingBody: "The refund has been requested and is awaiting confirmation from the payment provider.", refundedTitle: "Payment refunded", refundedBody: "This payment has been refunded. Processing time on your statement depends on your card issuer.", refundFailedTitle: "Refund needs attention", refundFailedBody: "The refund could not be confirmed automatically. VanStro support will review it; do not submit another payment.", viewOrder: "View order", summary: "Payment summary", payNow: "Pay now", processing: "Processing payment...", inStoreTitle: "Complete payment in store", inStoreBody: "Your items are reserved. Pay at the dealer when you arrive.", inStoreReference: "Reservation reference", simulatePayment: "Simulate in-store payment (dev)", successRedirect: "Payment confirmed. Redirecting to your order...", confirmationPending: "Payment received. We’re confirming your order now; do not submit another payment.", cardUnavailable: "Online card payments are not available right now. Choose in-store payment or try again later.", returnToCheckout: "Return to checkout" },
  lookup: { title: "Track Your Order", intro: "Enter the order number and private access token from your confirmation email. Signed-in customers can also open orders from My account.", orderId: "Order number", token: "Private access token", submit: "View order", error: "Enter both the order number and access token exactly as shown in your confirmation email.", help: "The access token protects guest order details. Do not share it publicly.", signedInHint: "Signed in? Your full order history is available in My account." },
  order: { loadingTitle: "Loading order status", loadingBody: "Checking the latest payment and fulfillment updates.", unavailableTitle: "Order status is temporarily unavailable", returnToCheckout: "Return to checkout", session: "Payment session", status: "Status", inventoryReserved: "Inventory reserved", reservationExpires: (date) => `Reservation expires ${date}.`, paymentConfirmation: "Payment confirmation", paymentConfirmed: "Payment has been confirmed.", paymentPending: "Payment confirmation has not been received yet.", sessionTotal: "Session total", notFoundTitle: "We couldn’t find this order", notFoundBody: "Check the order link or return to order lookup with the private token from your confirmation email.", order: "Order", items: "Items", fulfillment: { pickup: "Store pickup", delivery: "Local delivery" }, paymentMethod: { card: "Credit card", pos: "In-store card", cash: "Cash" }, statusLabels: { paid: "Paid", processing: "Processing", fulfilled: "Fulfilled", shipped: "Shipped", reserved: "Reserved", dealer_accepted: "Dealer accepted", fulfilling: "Preparing order", delivered: "Delivered", pending: "Pending", expired: "Expired", cancelled: "Cancelled", failed: "Needs attention" }, tracking: "Shipment tracking", trackingNumber: "Tracking number", shipmentStatus: "Shipment status", statusHistory: "Order progress", sku: "SKU", unitSeparator: "×", retry: "Check again", backToOrders: "Back to order history", orderSummary: "Order summary", placedOn: "Placed", fulfillmentDetails: "Fulfillment", paymentDetails: "Payment", currentStatus: "Current status", statusUpdated: "Status updated" },
  storefront: { requestError: "The request could not be completed. Please try again.", invalidState: "Stored storefront state is invalid.", timeline: { paid: "Paid", paidDetail: "Payment recorded to the platform.", reserved: "Inventory reserved", reservedDetail: (dealer) => `${dealer} stock is reserved for this order.`, accepted: "Dealer accepted", acceptedDetail: "Dealer fulfillment will be handled in Admin ERP.", delivered: "Delivered", deliveredDetail: "Delivery triggers invoice and settlement events." } }
};

const french: CommerceCopy = {
  common: { email: "Courriel", password: "Mot de passe", firstName: "Prénom", lastName: "Nom", shopProducts: "Magasiner les produits", continueShopping: "Continuer à magasiner", subtotal: "Sous-total", total: "Total", items: "Articles", retry: "Réessayer", backToProducts: "Retour aux produits" },
  auth: { loginTitle: "Bon retour", loginBody: "Connectez-vous pour consulter vos commandes, gérer vos adresses et retrouver vos produits favoris.", registerTitle: "Créez votre compte VanStro", registerBody: "Regroupez les achats de vos projets, vos adresses et vos produits favoris dans un espace sécurisé.", accountBenefits: ["Consulter les commandes en cours et passées", "Enregistrer les renseignements de livraison et de ramassage", "Garder des produits prêts pour votre prochain projet"], secureSession: "Votre séance est protégée par un témoin de compte sécurisé et HttpOnly.", wait: "Veuillez patienter…", createAccount: "Créer un compte", signIn: "Se connecter", existingAccount: "Vous avez déjà un compte? Se connecter", newAccount: "Nouveau chez VanStro? Créer un compte", error: "Nous n’avons pas pu vous connecter. Vérifiez votre courriel et votre mot de passe, puis réessayez.", registrationError: "Nous n’avons pas pu créer votre compte. Vérifiez les renseignements indiqués et réessayez.", passwordRequirement: "Utilisez au moins 12 caractères. Une phrase de passe longue et unique est plus facile à retenir et plus sécuritaire." },
  account: {
    title: "Mon compte", intro: "Gérez votre profil, vos adresses et l’historique de vos commandes.", overview: "Aperçu", profile: "Profil", addresses: "Adresses", orders: "Commandes", favorites: "Favoris",
    signInRequiredTitle: "Connexion requise", signInRequiredBody: "Connectez-vous ou créez un compte pour accéder à votre espace client.", loading: "Chargement de votre compte…",
    saveProfile: "Enregistrer le profil", profileSaved: "Profil mis à jour.", addAddress: "Ajouter une adresse", addressSaved: "Adresse enregistrée.", addressUpdated: "Adresse mise à jour.", addressDeleted: "Adresse supprimée.", editAddress: "Modifier", deleteAddress: "Supprimer", setDefault: "Définir par défaut", saveAddress: "Enregistrer l’adresse", cancelEdit: "Annuler", defaultAddress: "Par défaut",
    noOrders: "Vous n’avez pas encore de commande.", viewOrder: "Voir la commande", orderCount: (count) => `${count} commande${count === 1 ? "" : "s"}`, favoriteCount: (count) => `${count} produit${count === 1 ? "" : "s"} enregistré${count === 1 ? "" : "s"}`,
    loadErrorTitle: "Impossible de charger cette section du compte", loadErrorBody: "Votre compte demeure sécurisé. Vérifiez votre connexion et réessayez.", sessionErrorTitle: "Impossible de vérifier votre séance", sessionErrorBody: "Il peut s’agir d’un problème de connexion temporaire. Réessayez avant de vous reconnecter.", retry: "Réessayer", addressesEmptyTitle: "Aucune adresse enregistrée", addressesEmptyBody: "Ajoutez une adresse pour accélérer vos prochaines commandes avec livraison.", ordersEmptyTitle: "Aucune commande dans ce compte", ordersEmptyBody: "Les commandes passées pendant votre connexion apparaîtront ici avec leur paiement et leur état d’exécution.", overviewOrders: "Suivre les commandes et leur exécution", overviewFavorites: "Retrouver les produits favoris", overviewProfile: "Tenir les coordonnées à jour", overviewAddresses: "Gérer les adresses de livraison"
  },
  favorites: { loadingTitle: "Chargement des favoris", loadingBody: "Vérification de vos produits enregistrés.", unavailableTitle: "Les favoris ne sont pas accessibles", unavailableBody: "Nous n’avons pas pu charger vos favoris. Veuillez réessayer.", authRequiredTitle: "Connectez-vous pour voir vos favoris", authRequiredBody: "Vos favoris sont enregistrés dans votre compte. Connectez-vous pour les consulter.", emptyTitle: "Aucun produit favori pour le moment", emptyBody: "Ajoutez des produits aux favoris pour les retrouver avant de passer à la caisse.", browse: "Parcourir les produits", retry: "Réessayer", signIn: "Se connecter" },
  cart: { loadingTitle: "Chargement de votre panier", loadingBody: "Vérification des articles, des prix actuels et du détaillant responsable.", unavailableTitle: "Votre panier est temporairement inaccessible", emptyTitle: "Votre panier est prêt pour un nouveau projet", emptyBody: "Ajoutez des produits pour comparer les quantités, puis choisissez le ramassage ou la livraison locale coordonnée à la caisse.", quantityFor: (name) => `Quantité de ${name}`, decrease: "Réduire la quantité", increase: "Augmenter la quantité", remove: (name) => `Retirer ${name}`, summary: "Sommaire de la commande", servingStore: "Détaillant responsable", payment: "Paiement", paymentValue: "Choisi à la caisse", checkout: "Passer à la caisse", retry: "Recharger le panier", continueShopping: "Continuer à magasiner", itemCount: (count) => `${new Intl.NumberFormat("fr-CA").format(count)} article${new Intl.PluralRules("fr-CA").select(count) === "one" ? "" : "s"}`, unitPrice: "Prix unitaire", lineTotal: "Total de la ligne", fulfillmentTitle: "Ramassage ou livraison locale", fulfillmentBody: (dealer) => `${dealer} confirmera le stock et coordonnera le ramassage ou la livraison choisie.`, chooseAtCheckout: "Choisir l’exécution à la caisse", taxesDelivery: "Aucune taxe ni aucuns frais de livraison ne sont encore ajoutés à ce sous-total. Les montants définitifs sont calculés avant le paiement.", mutationPending: "Mise à jour de votre panier…", reviewTitle: "Vérifiez les matériaux de votre projet", reviewBody: "Confirmez chaque modèle, dimension et quantité avant de continuer. La caisse valide la disponibilité selon votre préférence de détaillant.", quantity: "Quantité", productFulfillment: "Exécution choisie à la caisse", productFulfillmentBody: "La caisse valide le stock selon votre préférence de ramassage ou de livraison locale.", requestedDealer: (dealer) => `Détaillant demandé : ${dealer}`, fulfillmentConfirmation: "La caisse vérifie le stock selon le détaillant et le mode d’exécution demandés. La coordination finale suit l’acceptation du détaillant.", productsSubtotal: "Sous-total des produits", delivery: "Livraison", estimatedTax: "Taxes estimées", deliveryAtCheckout: "Calculée à la caisse", taxAtCheckout: "Calculées à la caisse", currentSubtotal: "Sous-total actuel", checkoutIncludesTitle: "Prochaines étapes à la caisse", checkoutIncludes: ["Choisir le ramassage ou la livraison locale", "Confirmer les coordonnées et le détaillant responsable", "Vérifier les taxes, les frais de livraison et le mode de paiement"], inventoryNotice: "Les articles ne sont pas réservés tant qu’ils demeurent dans votre panier. La caisse crée une réservation de stock de durée limitée.", secureCheckout: "Continuer vers la caisse sécurisée" },
  drawer: { close: "Fermer le tiroir du panier", title: "Votre panier", count: (count) => `${count} article${count === 1 ? "" : "s"}`, added: (quantity) => `${quantity} article${quantity === 1 ? " a" : "s ont"} été ajouté${quantity === 1 ? "" : "s"} à votre panier`, quantity: "Qté", pickupDelivery: (dealer) => `Ramassage gratuit chez ${dealer}, ou livraison sur devis du détaillant — au choix à la caisse.`, subtotalLabel: "Sous-total du panier", orderSubtotal: "Sous-total de la commande", taxes: "Les taxes et la livraison sont calculées à la caisse. Le stock est réservé 60 minutes dès que vous commencez le paiement.", viewCart: "Voir le panier", continueShopping: "Continuer à magasiner", suggestions: "Articles suggérés avec votre achat", emptyTitle: "Votre panier est vide", emptyBody: (dealer) => `Tout ce que vous ajoutez est tarifé par votre détaillant, ${String(dealer).replace(/\.+$/, "")}.`, remove: "Retirer" },
  checkout: { loadingTitle: "Chargement de la caisse", loadingBody: "Vérification de votre panier.", unavailableTitle: "La caisse n’est pas accessible", returnToCart: "Retourner au panier", emptyTitle: "Aucun article prêt à commander", emptyBody: "Ajoutez d’abord des produits, puis revenez à la caisse.", phone: "Téléphone", fulfillment: "Mode de réception", pickup: "Ramassage en magasin", delivery: "Livraison locale", paymentRegistration: "Mode de paiement", card: "Payer en ligne par carte de crédit", pos: "Payer par carte au magasin", cash: "Payer en argent comptant au magasin", notes: "Notes sur la commande", notesPlaceholder: "Heure de ramassage, directives de livraison ou détails du projet", summary: "Sommaire de la commande", store: "Détaillant responsable", tax: "Taxes estimées", shipping: "Livraison", inventory: "Stock", inventoryValue: "Continuer vérifie le stock et crée une réservation de durée limitée", creating: "Création de la séance de commande…", continuePayment: "Continuer vers le paiement", tokenError: "La caisse n’a pas retourné de jeton d’accès à la commande.", reserveError: "Le stock n’a pas pu être réservé. Vérifiez votre panier et réessayez.", deliveryAddress: "Adresse de livraison" },
  address: { title: "Adresse canadienne", search: "Rechercher une adresse", searchPlaceholder: "Commencez à taper votre rue ou votre code postal", searching: "Recherche d’adresses…", manualFallback: "La recherche d’adresse n’est pas disponible. Saisissez votre adresse manuellement.", line1: "Adresse ligne 1", line2: "Adresse ligne 2", city: "Ville", province: "Province", postalCode: "Code postal", chooseProvince: "Choisir une province", useSaved: "Utiliser une adresse enregistrée", chooseSaved: "Choisir une adresse enregistrée" },
  payment: { loadingTitle: "Chargement du paiement", loadingBody: "Préparation de votre séance de paiement sécurisée.", unavailableTitle: "Le paiement n’est pas accessible", sessionExpired: "Cette séance de commande a expiré.", reconciliationTitle: "Paiement reçu — confirmation de commande en attente", reconciliationBody: "Votre paiement a été reçu, mais nous confirmons encore la commande. Ne payez pas de nouveau. Le soutien VanStro rapprochera la transaction.", refundPendingTitle: "Remboursement en cours", refundPendingBody: "Le remboursement a été demandé et attend la confirmation du fournisseur de paiement.", refundedTitle: "Paiement remboursé", refundedBody: "Ce paiement a été remboursé. Le délai d’affichage dépend de l’émetteur de votre carte.", refundFailedTitle: "Le remboursement nécessite une vérification", refundFailedBody: "Le remboursement n’a pas pu être confirmé automatiquement. Le soutien VanStro l’examinera; ne soumettez pas un autre paiement.", viewOrder: "Voir la commande", summary: "Sommaire du paiement", payNow: "Payer maintenant", processing: "Traitement du paiement…", inStoreTitle: "Finaliser le paiement en magasin", inStoreBody: "Vos articles sont réservés. Payez chez le détaillant à votre arrivée.", inStoreReference: "Référence de réservation", simulatePayment: "Simuler le paiement en magasin (dev)", successRedirect: "Paiement confirmé. Redirection vers votre commande…", confirmationPending: "Paiement reçu. Nous confirmons maintenant votre commande; ne soumettez pas un autre paiement.", cardUnavailable: "Le paiement par carte en ligne n’est pas disponible pour le moment. Choisissez le paiement en magasin ou réessayez plus tard.", returnToCheckout: "Retourner à la caisse" },
  lookup: { title: "Suivre votre commande", intro: "Entrez le numéro de commande et le jeton d’accès privé reçus dans votre courriel de confirmation. Les clients connectés peuvent aussi ouvrir leurs commandes depuis Mon compte.", orderId: "Numéro de commande", token: "Jeton d’accès privé", submit: "Voir la commande", error: "Entrez le numéro de commande et le jeton d’accès exactement comme dans le courriel de confirmation.", help: "Le jeton protège les renseignements d’une commande d’invité. Ne le partagez pas publiquement.", signedInHint: "Vous êtes connecté? L’historique complet se trouve dans Mon compte." },
  order: { loadingTitle: "Chargement de l’état de la commande", loadingBody: "Vérification des dernières mises à jour du paiement et de l’exécution.", unavailableTitle: "L’état de la commande est temporairement inaccessible", returnToCheckout: "Retourner à la caisse", session: "Séance de paiement", status: "État", inventoryReserved: "Stock réservé", reservationExpires: (date) => `La réservation expire le ${date}.`, paymentConfirmation: "Confirmation du paiement", paymentConfirmed: "Le paiement a été confirmé.", paymentPending: "La confirmation du paiement n’a pas encore été reçue.", sessionTotal: "Total de la séance", notFoundTitle: "Impossible de trouver cette commande", notFoundBody: "Vérifiez le lien ou revenez au suivi avec le jeton privé de votre courriel de confirmation.", order: "Commande", items: "Articles", fulfillment: { pickup: "Ramassage en magasin", delivery: "Livraison locale" }, paymentMethod: { card: "Carte de crédit", pos: "Carte en magasin", cash: "Argent comptant" }, statusLabels: { paid: "Payée", processing: "En traitement", fulfilled: "Exécutée", shipped: "Expédiée", reserved: "Réservée", dealer_accepted: "Acceptée par le détaillant", fulfilling: "Préparation en cours", delivered: "Livrée", pending: "En attente", expired: "Expirée", cancelled: "Annulée", failed: "Vérification requise" }, tracking: "Suivi d’expédition", trackingNumber: "Numéro de suivi", shipmentStatus: "État de l’expédition", statusHistory: "Progression de la commande", sku: "UGS", unitSeparator: "×", retry: "Vérifier de nouveau", backToOrders: "Retour à l’historique", orderSummary: "Sommaire de la commande", placedOn: "Passée le", fulfillmentDetails: "Exécution", paymentDetails: "Paiement", currentStatus: "État actuel", statusUpdated: "État mis à jour" },
  storefront: { requestError: "La demande n’a pas pu être traitée. Veuillez réessayer.", invalidState: "Les données enregistrées de la boutique sont invalides.", timeline: { paid: "Payée", paidDetail: "Paiement enregistré sur la plateforme.", reserved: "Stock réservé", reservedDetail: (dealer) => `Le stock de ${dealer} est réservé pour cette commande.`, accepted: "Acceptée par le détaillant", acceptedDetail: "Le détaillant traitera l’exécution dans le système ERP d’administration.", delivered: "Livrée", deliveredDetail: "La livraison déclenche la facturation et le règlement." } }
};

export function getCommerceCopy(locale: SiteLocale): CommerceCopy {
  return locale === "fr-CA" ? french : english;
}
