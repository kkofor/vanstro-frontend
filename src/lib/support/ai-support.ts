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

export const AI_SUPPORT_PROMPTS: Array<{
  id: AiSupportIntent;
  label: string;
  prompt: string;
}> = [
  {
    id: "product-fit",
    label: "Find product",
    prompt: "Help me find the right cabinet, vanity, trim or door product."
  },
  {
    id: "dealer-fulfillment",
    label: "Pickup / delivery",
    prompt: "How does dealer pickup or delivery support work?"
  },
  {
    id: "order-help",
    label: "Order help",
    prompt: "I need help with checkout, payment or tracking an order."
  },
  {
    id: "dealer-program",
    label: "Dealer program",
    prompt: "I am a business buyer interested in joining the dealer program."
  }
];

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

export function createOpeningMessage(context: AiSupportContext) {
  const pageHint = context.pathname.startsWith("/products/")
    ? "I can help with this product, SKU, pickup, delivery and checkout questions."
    : "I can help with product selection, dealer fulfillment, checkout and dealer program questions.";

  return makeSupportMessage(
    "assistant",
    `Hi, I am VanStro's AI assistant. ${pageHint}`,
    `${context.selectedDealerName} selected`
  );
}

export function resolveAiSupportReply(input: string, context: AiSupportContext) {
  const text = input.toLowerCase();
  const asksForHuman =
    /\b(human|person|agent|representative|live|teammate|staff|support)\b/.test(text) ||
    text.includes("\u4eba\u5de5") ||
    text.includes("\u771f\u4eba") ||
    text.includes("\u5ba2\u670d") ||
    text.includes("\u8f6c\u4eba\u5de5");

  if (asksForHuman) {
    return makeSupportMessage(
      "assistant",
      "I can collect the key details first, then route this to a VanStro support teammate with the context included. Please share your order number, email, dealer location or product/SKU.",
      "Human support available",
      {
        handoff: true,
        actions: [
          {
            label: "Contact page",
            href: "/contact",
            description: "Use the full support form if you prefer email follow-up."
          }
        ]
      }
    );
  }

  if (/\b(dealer|pickup|delivery|deliver|fulfill|fulfillment|store|postal|location)\b/.test(text)) {
    return makeSupportMessage(
      "assistant",
      `Your current fulfillment dealer is ${context.selectedDealerName}. Choose a dealer in the header, place the order online, and the assigned local dealer coordinates pickup, delivery or project support after checkout.`,
      "Dealer fulfillment",
      {
        actions: [
          {
            label: "Delivery article",
            href: "/articles/pickup-and-delivery-options",
            description: "Review how dealer handoff works after checkout.",
            tone: "primary"
          }
        ]
      }
    );
  }

  if (/\b(order|track|tracking|payment|checkout|paid|cart|invoice)\b/.test(text)) {
    const cartNote =
      context.cartCount > 0
        ? `I see ${context.cartCount} item${context.cartCount === 1 ? "" : "s"} in the cart.`
        : "Your cart is currently empty.";
    const orderAction =
      context.cartCount > 0
        ? {
            label: "Open cart",
            href: "/cart",
            description: "Review quantity and selected products.",
            tone: "primary" as const
          }
        : {
            label: "Track demo order",
            href: "/orders/demo-order",
            description: "See the current order status pattern.",
            tone: "primary" as const
          };

    return makeSupportMessage(
      "assistant",
      `${cartNote} For checkout, confirm quantity, selected dealer and payment details. For an existing order, use Track order or share your order number for handoff.`,
      "Checkout support",
      {
        handoff: true,
        actions: [orderAction]
      }
    );
  }

  if (/\b(dealer program|partner|join|contractor|trade|business|b2b)\b/.test(text)) {
    return makeSupportMessage(
      "assistant",
      "VanStro works with trade buyers and dealer partners across Canada. For onboarding, prepare your company name, service area, contact details and business type.",
      "Dealer program",
      {
        actions: [
          {
            label: "Apply as dealer",
            href: "/dealers/apply",
            description: "Start the partner application flow.",
            tone: "primary"
          }
        ]
      }
    );
  }

  if (/\b(product|sku|cabinet|vanity|baseboard|trim|door|window|size|finish|white)\b/.test(text)) {
    return makeSupportMessage(
      "assistant",
      "For product selection, compare category, SKU, dimensions, finish and price. Cabinet and vanity finishes are white-focused, and detail pages show SKU, size, dealer quantity and add-to-cart.",
      "Product guidance",
      {
        actions: [
          {
            label: "All products",
            href: "/products",
            description: "Search by product, SKU, category or size.",
            tone: "primary"
          }
        ]
      }
    );
  }

  return makeSupportMessage(
    "assistant",
    "I can help route this. Tell me whether this is about product selection, dealer pickup or delivery, checkout, an existing order, or joining the dealer program. If this needs a person, I can prepare a handoff.",
    "Need one detail",
    {
      handoff: true,
      actions: [
        {
          label: "Support options",
          href: "/contact",
          description: "Share more detail with the VanStro team."
        }
      ]
    }
  );
}
