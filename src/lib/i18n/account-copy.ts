import type { SiteLocale } from "@/lib/i18n/locale";

const english = {
  overview: {
    title: "Your Account At A Glance",
    intro: "Pick up where you left off, review order activity and keep delivery details ready for your next project.",
    activityTitle: "Recent Order Activity",
    activityBody: "Your latest signed-in order appears here with its current fulfillment status.",
    noActivity: "No signed-in orders yet. Orders placed while you are signed in will appear here.",
    profileReady: "Contact details ready",
    profileIncomplete: "Complete your contact details",
    profileBodyReady: "Your name and phone number are ready for order communication.",
    profileBodyIncomplete: "Add your full name and phone number so the fulfilling dealer can reach you about an order.",
    addressReady: "Default delivery address",
    addressMissing: "No default address",
    addressMissingBody: "Save a delivery address to make future checkout faster.",
    supportTitle: "Need Help With An Order Or Account?",
    supportBody: "Track a guest order with its private access token, or contact VanStro support for account and product-order questions.",
    contactSupport: "Contact support",
    trackOrder: "Track a guest order"
  },
  profile: {
    title: "Contact Details",
    intro: "These details help VanStro and the fulfilling dealer communicate about your orders.",
    emailHelp: "Your sign-in email cannot be changed here. Contact support if it needs to be corrected.",
    phoneHelp: "Use a Canadian phone number where you can receive order and fulfillment updates.",
    readyTitle: "Profile ready for ordering",
    readyBody: "Your required contact details are complete.",
    incompleteTitle: "Complete your profile",
    incompleteBody: "Add the missing contact details before your next delivery order.",
    securityTitle: "Account access and privacy",
    securityBody: "Reset your password securely, review how VanStro uses account information, or contact support for help.",
    resetPassword: "Reset password",
    privacy: "Privacy policy",
    support: "Account support"
  },
  addresses: {
    title: "Saved Delivery Addresses",
    intro: "Keep project and home delivery destinations ready for checkout. You can choose a different address for each order.",
    count: (count: number) => `${new Intl.NumberFormat("en-CA").format(count)} saved address${count === 1 ? "" : "es"}`,
    addTitle: "Add A Delivery Address",
    addBody: "Save the recipient and destination exactly as they should appear on the order.",
    editTitle: "Edit Saved Address",
    editBody: "Update this destination, then save your changes.",
    label: "Address label",
    labelPlaceholder: "Home, renovation or job site",
    recipient: "Recipient",
    phone: "Delivery phone",
    defaultDeleteWarning: "This is your default address. Deleting it will leave your account without a default address.",
    guidanceTitle: "Before you save",
    guidanceItems: [
      "Use a label that helps you recognize the destination at checkout.",
      "Enter a phone number the fulfilling dealer can use for delivery coordination.",
      "Confirm unit, postal code and province before saving."
    ],
    confirmDelete: "Confirm removal",
    removing: "Removing…",
    settingDefault: "Setting default…"
  },
  orders: {
    title: "Order History",
    intro: "Review signed-in purchases, payment status and local fulfillment progress.",
    showing: (start: number, end: number, total: number) => `Orders ${new Intl.NumberFormat("en-CA").format(start)}–${new Intl.NumberFormat("en-CA").format(end)} of ${new Intl.NumberFormat("en-CA").format(total)}`,
    firstItem: "Products",
    moreItems: (count: number) => `and ${new Intl.NumberFormat("en-CA").format(count)} more`,
    payment: "Payment method",
    destination: "Destination",
    latestUpdate: "Latest update",
    updatePending: "Update pending"
  },
  favorites: {
    title: "Saved Products",
    intro: "Compare products you saved and return to them when you are ready to build your cart.",
    count: (count: number) => `${new Intl.NumberFormat("en-CA").format(count)} saved product${count === 1 ? "" : "s"}`,
    noteTitle: "Planning a project?",
    noteBody: "Check model, size and current price again before adding a saved product to your cart. Availability is confirmed for the fulfilling dealer during checkout."
  }
};

const french: typeof english = {
  overview: {
    title: "Votre compte en un coup d’œil",
    intro: "Reprenez votre projet, consultez vos commandes et préparez vos coordonnées de livraison pour votre prochain achat.",
    activityTitle: "Activité récente des commandes",
    activityBody: "Votre dernière commande passée pendant votre connexion apparaît ici avec son état d’exécution.",
    noActivity: "Aucune commande associée à ce compte. Les commandes passées pendant votre connexion apparaîtront ici.",
    profileReady: "Coordonnées prêtes",
    profileIncomplete: "Compléter vos coordonnées",
    profileBodyReady: "Votre nom et votre téléphone sont prêts pour les communications relatives aux commandes.",
    profileBodyIncomplete: "Ajoutez votre nom complet et votre téléphone afin que le détaillant responsable puisse vous joindre au sujet d’une commande.",
    addressReady: "Adresse de livraison par défaut",
    addressMissing: "Aucune adresse par défaut",
    addressMissingBody: "Enregistrez une adresse de livraison pour accélérer vos prochaines commandes.",
    supportTitle: "Besoin d’aide avec une commande ou votre compte?",
    supportBody: "Suivez une commande d’invité avec son jeton privé ou communiquez avec le soutien VanStro pour toute question sur votre compte.",
    contactSupport: "Communiquer avec le soutien",
    trackOrder: "Suivre une commande d’invité"
  },
  profile: {
    title: "Coordonnées",
    intro: "Ces renseignements permettent à VanStro et au détaillant responsable de communiquer avec vous au sujet de vos commandes.",
    emailHelp: "Votre courriel de connexion ne peut pas être modifié ici. Communiquez avec le soutien s’il doit être corrigé.",
    phoneHelp: "Utilisez un numéro canadien où vous pouvez recevoir les mises à jour sur vos commandes et leur exécution.",
    readyTitle: "Profil prêt pour commander",
    readyBody: "Vos coordonnées requises sont complètes.",
    incompleteTitle: "Complétez votre profil",
    incompleteBody: "Ajoutez les coordonnées manquantes avant votre prochaine commande avec livraison.",
    securityTitle: "Accès au compte et confidentialité",
    securityBody: "Réinitialisez votre mot de passe de façon sécurisée, consultez l’utilisation de vos renseignements ou demandez de l’aide.",
    resetPassword: "Réinitialiser le mot de passe",
    privacy: "Politique de confidentialité",
    support: "Soutien du compte"
  },
  addresses: {
    title: "Adresses de livraison enregistrées",
    intro: "Gardez vos destinations résidentielles et de chantier prêtes pour la caisse. Vous pouvez choisir une adresse différente pour chaque commande.",
    count: (count: number) => {
      const singular = new Intl.PluralRules("fr-CA").select(count) === "one";
      return `${new Intl.NumberFormat("fr-CA").format(count)} adresse${singular ? "" : "s"} enregistrée${singular ? "" : "s"}`;
    },
    addTitle: "Ajouter une adresse de livraison",
    addBody: "Enregistrez le destinataire et l’adresse exactement comme ils doivent apparaître sur la commande.",
    editTitle: "Modifier l’adresse enregistrée",
    editBody: "Mettez cette destination à jour, puis enregistrez vos changements.",
    label: "Nom de l’adresse",
    labelPlaceholder: "Maison, rénovation ou chantier",
    recipient: "Destinataire",
    phone: "Téléphone de livraison",
    defaultDeleteWarning: "Il s’agit de votre adresse par défaut. Sa suppression laissera votre compte sans adresse par défaut.",
    guidanceTitle: "Avant d’enregistrer",
    guidanceItems: [
      "Utilisez un nom qui vous aide à reconnaître la destination à la caisse.",
      "Indiquez un téléphone que le détaillant responsable peut utiliser pour coordonner la livraison.",
      "Vérifiez l’unité, le code postal et la province avant d’enregistrer."
    ],
    confirmDelete: "Confirmer la suppression",
    removing: "Suppression…",
    settingDefault: "Définition par défaut…"
  },
  orders: {
    title: "Historique des commandes",
    intro: "Consultez les achats associés au compte, le paiement et la progression de l’exécution locale.",
    showing: (start: number, end: number, total: number) => `Commandes ${new Intl.NumberFormat("fr-CA").format(start)} à ${new Intl.NumberFormat("fr-CA").format(end)} sur ${new Intl.NumberFormat("fr-CA").format(total)}`,
    firstItem: "Produits",
    moreItems: (count: number) => `et ${new Intl.NumberFormat("fr-CA").format(count)} autre${new Intl.PluralRules("fr-CA").select(count) === "one" ? "" : "s"}`,
    payment: "Mode de paiement",
    destination: "Destination",
    latestUpdate: "Dernière mise à jour",
    updatePending: "Mise à jour en attente"
  },
  favorites: {
    title: "Produits enregistrés",
    intro: "Comparez les produits favoris et retrouvez-les lorsque vous serez prêt à préparer votre panier.",
    count: (count: number) => {
      const singular = new Intl.PluralRules("fr-CA").select(count) === "one";
      return `${new Intl.NumberFormat("fr-CA").format(count)} produit${singular ? "" : "s"} enregistré${singular ? "" : "s"}`;
    },
    noteTitle: "Vous planifiez un projet?",
    noteBody: "Vérifiez de nouveau le modèle, les dimensions et le prix avant d’ajouter un favori au panier. La disponibilité est confirmée auprès du détaillant responsable à la caisse."
  }
};

export function getAccountCopy(locale: SiteLocale) {
  return locale === "fr-CA" ? french : english;
}
