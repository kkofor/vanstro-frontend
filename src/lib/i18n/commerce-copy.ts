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
  };
  auth: {
    wait: string;
    createAccount: string;
    signIn: string;
    existingAccount: string;
    newAccount: string;
    error: string;
    registrationError: string;
    passwordRequirement: string;
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
    pos: string;
    cash: string;
    notes: string;
    notesPlaceholder: string;
    summary: string;
    store: string;
    inventory: string;
    inventoryValue: string;
    creating: string;
    continuePayment: string;
    tokenError: string;
    reserveError: string;
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
    paymentMethod: Record<"pos" | "cash", string>;
    statusLabels: Record<"paid" | "reserved" | "dealer_accepted" | "fulfilling" | "delivered" | "pending" | "expired" | "cancelled" | "failed", string>;
    sku: string;
    unitSeparator: string;
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
  common: { email: "Email", password: "Password", firstName: "First name", lastName: "Last name", shopProducts: "Shop products", continueShopping: "Continue shopping", subtotal: "Subtotal", total: "Total", items: "Items" },
  auth: { wait: "Please wait...", createAccount: "Create account", signIn: "Sign in", existingAccount: "Already have an account? Sign in", newAccount: "Create an account", error: "We could not sign you in. Please check your details and try again.", registrationError: "We could not create your account. Please check your details and try again.", passwordRequirement: "Use at least 12 characters." },
  favorites: { loadingTitle: "Loading favorites", loadingBody: "Checking your saved products.", unavailableTitle: "Favorites are unavailable", unavailableBody: "We couldn’t load your favorites. Please try again.", authRequiredTitle: "Sign in to view favorites", authRequiredBody: "Your favorites are saved to your account. Sign in to view them.", emptyTitle: "No saved products yet", emptyBody: "Save products from the catalog to revisit them before checkout.", browse: "Browse products", retry: "Try again", signIn: "Sign in" },
  cart: { loadingTitle: "Loading your cart", loadingBody: "Checking saved items and current pricing.", unavailableTitle: "Your cart is unavailable", emptyTitle: "Your cart is empty", emptyBody: "Add stocked products to start a pickup or delivery order.", quantityFor: (name) => `Quantity for ${name}`, decrease: "Decrease quantity", increase: "Increase quantity", remove: (name) => `Remove ${name}`, summary: "Order summary", servingStore: "Serving store", payment: "Payment", paymentValue: "POS or cash", checkout: "Continue to checkout" },
  drawer: { close: "Close cart drawer", title: "Added to cart", count: (count) => `${count} items in cart`, added: (quantity) => `${quantity} item${quantity === 1 ? " has" : "s have"} been added to your cart`, quantity: "Qty", pickupDelivery: (dealer) => `${dealer} pickup or coordinated local delivery`, subtotalLabel: "Cart subtotal", orderSubtotal: "Order subtotal", taxes: "Final taxes and shipping/delivery will be calculated during checkout.", viewCart: "View cart", continueShopping: "Continue shopping", suggestions: "Suggested items with your purchase" },
  checkout: { loadingTitle: "Loading checkout", loadingBody: "Checking your current cart.", unavailableTitle: "Checkout is unavailable", returnToCart: "Return to cart", emptyTitle: "No items ready for checkout", emptyBody: "Add products first, then return to checkout.", phone: "Phone", fulfillment: "Fulfillment method", pickup: "Store pickup", delivery: "Local delivery", paymentRegistration: "Payment method", pos: "Pay by card at the store", cash: "Pay cash at the store", notes: "Order notes", notesPlaceholder: "Pickup timing, delivery instructions, or project details", summary: "Order summary", store: "Fulfilling dealer", inventory: "Inventory", inventoryValue: "Reserved after payment is confirmed", creating: "Creating checkout session...", continuePayment: "Review and place order", tokenError: "Checkout did not return an order access token.", reserveError: "Checkout could not reserve inventory. Please review your cart and try again." },
  order: { loadingTitle: "Loading order status", loadingBody: "Checking the latest payment session.", unavailableTitle: "Order status is unavailable", returnToCheckout: "Return to checkout", session: "Payment session", status: "Status", inventoryReserved: "Inventory reserved", reservationExpires: (date) => `Reservation expires ${date}.`, paymentConfirmation: "Payment confirmation", paymentConfirmed: "Payment has been confirmed.", paymentPending: "Payment confirmation has not been received yet.", sessionTotal: "Session total", notFoundTitle: "Order not found", notFoundBody: "No order or payment-session query was found for this route.", order: "Order", items: "Items", fulfillment: { pickup: "Store pickup", delivery: "Local delivery" }, paymentMethod: { pos: "POS", cash: "Cash" }, statusLabels: { paid: "Paid", reserved: "Reserved", dealer_accepted: "Dealer accepted", fulfilling: "Fulfilling", delivered: "Delivered", pending: "Pending", expired: "Expired", cancelled: "Cancelled", failed: "Failed" }, sku: "SKU", unitSeparator: "x" },
  storefront: { requestError: "The request could not be completed. Please try again.", invalidState: "Stored storefront state is invalid.", timeline: { paid: "Paid", paidDetail: "Payment recorded to the platform.", reserved: "Inventory reserved", reservedDetail: (dealer) => `${dealer} stock is reserved for this order.`, accepted: "Dealer accepted", acceptedDetail: "Dealer fulfillment will be handled in Admin ERP.", delivered: "Delivered", deliveredDetail: "Delivery triggers invoice and settlement events." } }
};

const french: CommerceCopy = {
  common: { email: "Courriel", password: "Mot de passe", firstName: "Prénom", lastName: "Nom", shopProducts: "Magasiner les produits", continueShopping: "Continuer à magasiner", subtotal: "Sous-total", total: "Total", items: "Articles" },
  auth: { wait: "Veuillez patienter…", createAccount: "Créer un compte", signIn: "Se connecter", existingAccount: "Vous avez déjà un compte? Se connecter", newAccount: "Créer un compte", error: "Nous n’avons pas pu vous connecter. Vérifiez vos renseignements et réessayez.", registrationError: "Nous n’avons pas pu créer votre compte. Vérifiez vos renseignements et réessayez.", passwordRequirement: "Utilisez au moins 12 caractères." },
  favorites: { loadingTitle: "Chargement des favoris", loadingBody: "Vérification de vos produits enregistrés.", unavailableTitle: "Les favoris ne sont pas accessibles", unavailableBody: "Nous n’avons pas pu charger vos favoris. Veuillez réessayer.", authRequiredTitle: "Connectez-vous pour voir vos favoris", authRequiredBody: "Vos favoris sont enregistrés dans votre compte. Connectez-vous pour les consulter.", emptyTitle: "Aucun produit favori pour le moment", emptyBody: "Ajoutez des produits aux favoris pour les retrouver avant de passer à la caisse.", browse: "Parcourir les produits", retry: "Réessayer", signIn: "Se connecter" },
  cart: { loadingTitle: "Chargement de votre panier", loadingBody: "Vérification des articles et des prix actuels.", unavailableTitle: "Votre panier n’est pas accessible", emptyTitle: "Votre panier est vide", emptyBody: "Ajoutez des produits en stock pour commencer une commande à ramasser ou à livrer.", quantityFor: (name) => `Quantité de ${name}`, decrease: "Réduire la quantité", increase: "Augmenter la quantité", remove: (name) => `Retirer ${name}`, summary: "Sommaire de la commande", servingStore: "Détaillant responsable", payment: "Paiement", paymentValue: "Terminal de paiement ou argent comptant", checkout: "Passer à la caisse" },
  drawer: { close: "Fermer le tiroir du panier", title: "Ajouté au panier", count: (count) => `${count} article${count === 1 ? "" : "s"} dans le panier`, added: (quantity) => `${quantity} article${quantity === 1 ? " a" : "s ont"} été ajouté${quantity === 1 ? "" : "s"} à votre panier`, quantity: "Qté", pickupDelivery: (dealer) => `Ramassage chez ${dealer} ou livraison locale coordonnée`, subtotalLabel: "Sous-total du panier", orderSubtotal: "Sous-total de la commande", taxes: "Les taxes et les frais d’expédition ou de livraison définitifs seront calculés à la caisse.", viewCart: "Voir le panier", continueShopping: "Continuer à magasiner", suggestions: "Articles suggérés avec votre achat" },
  checkout: { loadingTitle: "Chargement de la caisse", loadingBody: "Vérification de votre panier.", unavailableTitle: "La caisse n’est pas accessible", returnToCart: "Retourner au panier", emptyTitle: "Aucun article prêt à commander", emptyBody: "Ajoutez d’abord des produits, puis revenez à la caisse.", phone: "Téléphone", fulfillment: "Mode de réception", pickup: "Ramassage en magasin", delivery: "Livraison locale", paymentRegistration: "Mode de paiement", pos: "Payer par carte au magasin", cash: "Payer en argent comptant au magasin", notes: "Notes sur la commande", notesPlaceholder: "Heure de ramassage, directives de livraison ou détails du projet", summary: "Sommaire de la commande", store: "Détaillant responsable", inventory: "Stock", inventoryValue: "Réservé après la confirmation du paiement", creating: "Création de la séance de commande…", continuePayment: "Vérifier et passer la commande", tokenError: "La caisse n’a pas retourné de jeton d’accès à la commande.", reserveError: "Le stock n’a pas pu être réservé. Vérifiez votre panier et réessayez." },
  order: { loadingTitle: "Chargement de l’état de la commande", loadingBody: "Vérification de la dernière séance de paiement.", unavailableTitle: "L’état de la commande n’est pas accessible", returnToCheckout: "Retourner à la caisse", session: "Séance de paiement", status: "État", inventoryReserved: "Stock réservé", reservationExpires: (date) => `La réservation expire le ${date}.`, paymentConfirmation: "Confirmation du paiement", paymentConfirmed: "Le paiement a été confirmé.", paymentPending: "La confirmation du paiement n’a pas encore été reçue.", sessionTotal: "Total de la séance", notFoundTitle: "Commande introuvable", notFoundBody: "Aucune commande ni séance de paiement n’a été trouvée pour cette adresse.", order: "Commande", items: "Articles", fulfillment: { pickup: "Ramassage en magasin", delivery: "Livraison locale" }, paymentMethod: { pos: "Terminal de paiement", cash: "Argent comptant" }, statusLabels: { paid: "Payée", reserved: "Réservée", dealer_accepted: "Acceptée par le détaillant", fulfilling: "En préparation", delivered: "Livrée", pending: "En attente", expired: "Expirée", cancelled: "Annulée", failed: "Échouée" }, sku: "UGS", unitSeparator: "×" },
  storefront: { requestError: "La demande n’a pas pu être traitée. Veuillez réessayer.", invalidState: "Les données enregistrées de la boutique sont invalides.", timeline: { paid: "Payée", paidDetail: "Paiement enregistré sur la plateforme.", reserved: "Stock réservé", reservedDetail: (dealer) => `Le stock de ${dealer} est réservé pour cette commande.`, accepted: "Acceptée par le détaillant", acceptedDetail: "Le détaillant traitera l’exécution dans le système ERP d’administration.", delivered: "Livrée", deliveredDetail: "La livraison déclenche la facturation et le règlement." } }
};

export function getCommerceCopy(locale: SiteLocale): CommerceCopy {
  return locale === "fr-CA" ? french : english;
}
