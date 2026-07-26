import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";
import { getSiteCopy } from "@/lib/i18n/site-copy";

export type SupportChannel = "live" | "ai";

export type AiSupportIntent =
  | "product-fit"
  | "dealer-fulfillment"
  | "order-help"
  | "dealer-program";

export type SupportAction = {
  label: string;
  href: string;
  description?: string;
  tone?: "primary" | "secondary";
};

export type SupportMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  meta?: string;
  handoff?: boolean;
  actions?: SupportAction[];
};

export type AiSupportContext = {
  pathname: string;
  selectedDealerName: string;
  cartCount: number;
};

export function getAiSupportPrompts(locale: SiteLocale) {
  return getSiteCopy(locale).supportWidget.prompts;
}

export function makeSupportMessage(
  role: SupportMessage["role"],
  text: string,
  meta?: string,
  handoffOrOptions: boolean | { handoff?: boolean; actions?: SupportAction[] } = false,
  legacyActions: SupportAction[] = []
): SupportMessage {
  const options =
    typeof handoffOrOptions === "boolean"
      ? { handoff: handoffOrOptions, actions: legacyActions }
      : handoffOrOptions;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    meta,
    handoff: options.handoff ?? false,
    actions: options.actions?.length ? options.actions : undefined
  };
}

export function createOpeningMessage(context: AiSupportContext, locale: SiteLocale) {
  const copy = getSiteCopy(locale).supportWidget;
  const pathname = context.pathname.replace(/^\/fr(?=\/|$)/, "") || "/";
  const pageHint = pathname.startsWith("/products/")
    ? copy.openingProduct
    : copy.openingGeneral;

  return makeSupportMessage(
    "assistant",
    copy.greeting(pageHint),
    copy.dealerSelected(context.selectedDealerName)
  );
}

export function resolveAiSupportReply(
  input: string,
  context: AiSupportContext,
  locale: SiteLocale
) {
  const copy = getSiteCopy(locale).supportWidget.replies;
  const text = input.toLocaleLowerCase(locale);
  const asksForHuman =
    /\b(human|person|agent|representative|live|teammate|staff|support)\b/.test(text) ||
    /\b(humain|personne|agent|représentant|conseiller|équipe|soutien|aide)\b/.test(text) ||
    text.includes("人工") ||
    text.includes("真人") ||
    text.includes("客服") ||
    text.includes("转人工");

  if (asksForHuman) {
    return makeSupportMessage("assistant", copy.human, copy.humanMeta, {
      handoff: true,
      actions: [{
        label: copy.contactPage,
        href: localeHref("/contact", locale),
        description: copy.contactDescription
      }]
    });
  }

  if (/\b(dealer|pickup|delivery|deliver|fulfill|fulfillment|store|postal|location|détaillant|ramassage|livraison|livrer|exécution|magasin|postal|emplacement)\b/.test(text)) {
    return makeSupportMessage("assistant", copy.fulfillment(context.selectedDealerName), copy.fulfillmentMeta, {
      actions: [{
        label: copy.deliveryArticle,
        href: localeHref("/articles/pickup-and-delivery-options", locale),
        description: copy.deliveryDescription,
        tone: "primary"
      }]
    });
  }

  if (/\b(order|track|tracking|payment|checkout|paid|cart|invoice|commande|suivi|paiement|caisse|panier|facture)\b/.test(text)) {
    const cartNote = context.cartCount > 0
      ? copy.cartCount(context.cartCount)
      : copy.emptyCart;
    const orderAction = context.cartCount > 0
      ? {
          label: copy.openCart,
          href: localeHref("/cart", locale),
          description: copy.cartDescription,
          tone: "primary" as const
        }
      : {
          label: copy.trackOrder,
          href: localeHref("/orders/demo-order", locale),
          description: copy.trackDescription,
          tone: "primary" as const
        };

    return makeSupportMessage("assistant", copy.order(cartNote), copy.checkoutMeta, {
      handoff: true,
      actions: [orderAction]
    });
  }

  if (/\b(dealer program|partner|join|contractor|trade|business|b2b|programme de détaillants|partenaire|adhérer|entrepreneur|commerce|entreprise)\b/.test(text)) {
    return makeSupportMessage("assistant", copy.dealerProgram, copy.dealerProgramMeta, {
      actions: [{
        label: copy.applyDealer,
        href: localeHref("/dealers/apply", locale),
        description: copy.applyDescription,
        tone: "primary"
      }]
    });
  }

  if (/\b(product|sku|cabinet|vanity|baseboard|trim|door|window|size|finish|white|produit|ugs|armoire|meuble-lavabo|plinthe|moulure|porte|fenêtre|dimension|fini|blanc)\b/.test(text)) {
    return makeSupportMessage("assistant", copy.product, copy.productMeta, {
      actions: [{
        label: copy.allProducts,
        href: localeHref("/products", locale),
        description: copy.productsDescription,
        tone: "primary"
      }]
    });
  }

  return makeSupportMessage("assistant", copy.fallback, copy.fallbackMeta, {
    handoff: true,
    actions: [{
      label: copy.supportOptions,
      href: localeHref("/contact", locale),
      description: copy.supportDescription
    }]
  });
}
