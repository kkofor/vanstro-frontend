export type SupportChannel = "live" | "ai";

export type AiSupportIntent =
  | "product-fit"
  | "dealer-fulfillment"
  | "order-help"
  | "dealer-program";

export type SupportMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  meta?: string;
  handoff?: boolean;
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
  handoff = false
): SupportMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    meta,
    handoff
  };
}

export function createOpeningMessage(context: AiSupportContext) {
  const pageHint = context.pathname.startsWith("/products/")
    ? "I can help with this product, SKU, pickup, delivery and checkout questions."
    : "I can help with product selection, dealer fulfillment, checkout and dealer program questions.";

  return makeSupportMessage(
    "assistant",
    `Hi, I am VanStro's assistant. ${pageHint}`,
    `${context.selectedDealerName} selected`
  );
}

export function resolveAiSupportReply(input: string, context: AiSupportContext) {
  const text = input.toLowerCase();

  if (/\b(human|person|agent|representative|live|人工|真人|客服|转人工)\b/.test(text)) {
    return makeSupportMessage(
      "assistant",
      "I can help collect the key details first, then route this to a VanStro support teammate. Please share your order number, email or the product/SKU involved.",
      "Human support available",
      true
    );
  }

  if (/\b(dealer|pickup|delivery|deliver|fulfill|fulfillment|store|postal|location)\b/.test(text)) {
    return makeSupportMessage(
      "assistant",
      `Your current fulfillment dealer is ${context.selectedDealerName}. You can choose a dealer in the header, then place the product order online. Pickup, delivery coordination or project support is handled by the assigned local dealer after checkout.`,
      "Dealer fulfillment"
    );
  }

  if (/\b(order|track|tracking|payment|checkout|paid|cart|invoice)\b/.test(text)) {
    const cartNote =
      context.cartCount > 0
        ? `I see ${context.cartCount} item${context.cartCount === 1 ? "" : "s"} in the cart.`
        : "Your cart is currently empty.";

    return makeSupportMessage(
      "assistant",
      `${cartNote} For checkout, confirm product quantity, selected dealer and payment details. For an existing order, use Track order from the top bar or contact support with your order number.`,
      "Checkout support",
      true
    );
  }

  if (/\b(dealer program|partner|join|contractor|trade|business|b2b)\b/.test(text)) {
    return makeSupportMessage(
      "assistant",
      "VanStro works with trade buyers and dealer partners across Canada. For dealer onboarding, prepare your company name, service area, contact details and current business type, then submit the dealer application.",
      "Dealer program"
    );
  }

  if (/\b(product|sku|cabinet|vanity|baseboard|trim|door|window|size|finish|white)\b/.test(text)) {
    return makeSupportMessage(
      "assistant",
      "For product selection, compare category, SKU, dimensions, finish and price. Current public cabinet and vanity finishes are white-focused, and product detail pages carry the SKU, dimensions, dealer quantity and add-to-cart action.",
      "Product guidance"
    );
  }

  return makeSupportMessage(
    "assistant",
    "I can help route this. Tell me whether this is about product selection, dealer pickup or delivery, checkout, an existing order, or joining the dealer program. If this needs a person, I can prepare a handoff.",
    "Need one detail",
    true
  );
}
