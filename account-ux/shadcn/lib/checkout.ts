/**
 * lib/checkout.ts — zod schemas and shared types for /checkout.
 * Mirrors the field rules in docs/05-checkout.md §6 and the API contract in §7.
 * Money is always integer cents. Tax is quoted server-side with lib/tax.ts.
 */
import { z } from "zod"
import { addressSchema, PROVINCES } from "./validators"
import { quoteTax, type ProvinceCode, type TaxQuote } from "./tax"
import { getDealer } from "./dealers"

/* ---------- cart ---------- */

export const cartItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  unitCents: z.number().int().nonnegative(),
  qty: z.number().int().positive(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const DELIVERY = {
  freight: { labelEn: "Curbside freight (LTL)", labelFr: "Livraison en bordure de rue (LTL)", cents: 24900, etaDays: [7, 10] },
  white: { labelEn: "White-glove delivery", labelFr: "Livraison gants blancs", cents: 59900, etaDays: [10, 14] },
  /** Pickup happens at the selected local dealer; unavailable when the province has no dealer or the dealer does not offer pickup. */
  pickup: { labelEn: "Pick up at your local dealer", labelFr: "Ramassage chez votre détaillant local", cents: 0, etaDays: [2, 2], dealerOnly: true },
} as const
export type DeliveryMethod = keyof typeof DELIVERY
/** Stored on historical orders; new checkouts cannot choose white-glove. */
export const deliveryMethodSchema = z.enum(["freight", "white", "pickup"])
export const newDeliveryMethodSchema = z.enum(["freight", "pickup"])

/* ---------- promo codes ---------- */

/** Cart-level product discounts (percent of the product subtotal, before delivery and tax). Production reads this from the promotions service. */
export const PROMOS: Record<string, { pct: number; labelEn: string; labelFr: string; expires?: string }> = {
  VANSTRO10: { pct: 10, labelEn: "10% off products", labelFr: "10 % de rabais sur les produits" },
  SPRING25: { pct: 25, labelEn: "Spring 25% off", labelFr: "Printemps 25 % de rabais", expires: "2026-05-31" },
}
export const promoCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/)
export type PromoStatus = "ok" | "unknown" | "expired"
export function promoStatus(code: string, now = new Date()): PromoStatus {
  const p = PROMOS[code]
  if (!p) return "unknown"
  if (p.expires && now > new Date(p.expires + "T23:59:59-05:00")) return "expired"
  return "ok"
}

/* ---------- step 1 · shipping ---------- */

export const contactSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  /** 10 digits, +1 implied. Optional unless smsReceipt is on (checked in orderCreateSchema). */
  phone: z.string().regex(/^[2-9]\d{9}$/, "Enter a 10‑digit Canadian mobile number.").optional().or(z.literal("")),
})

/** Saved address by id, or a new inline address (validated with the address-book rules). */
export const shippingTargetSchema = z.union([z.object({ addressId: z.string().min(1) }), z.object({ address: addressSchema })])

/**
 * Local dealer for the order. Any participating dealer is accepted. Checkout defaults
 * to one in the shipping province; the customer may pick another. `null` is only
 * accepted when that province has no participating dealer (Vanstro fulfils directly).
 */
export const dealerSelectionSchema = z.object({ dealerId: z.string().min(1).nullable() })

export const shippingStepSchema = z
  .object({
    contact: contactSchema,
    shipping: shippingTargetSchema,
    dealer: dealerSelectionSchema,
    deliveryMethod: newDeliveryMethodSchema,
    notes: z.string().trim().max(140, "Keep delivery notes under 140 characters.").optional(),
  })
  .superRefine((v, ctx) => {
    const dealer = v.dealer.dealerId ? getDealer(v.dealer.dealerId) : null
    if (v.dealer.dealerId && !dealer) {
      ctx.addIssue({ code: "custom", path: ["dealer", "dealerId"], message: "Select a participating local dealer." })
    }
    if (v.deliveryMethod === "pickup" && !(dealer && dealer.services.includes("pickup"))) {
      ctx.addIssue({ code: "custom", path: ["deliveryMethod"], message: "Pickup is only available at a participating local dealer that offers it." })
    }
  })
export type ShippingStep = z.infer<typeof shippingStepSchema>

/* ---------- step 2 · review & consent ---------- */

export const consentSchema = z.object({
  terms: z.literal(true, { errorMap: () => ({ message: "Please accept the Terms of Sale to continue." }) }),
  privacy: z.literal(true, { errorMap: () => ({ message: "Please acknowledge the Privacy Policy to continue." }) }),
  /** CASL express consent. Default false; store timestamp + IP server-side when true. */
  marketing: z.boolean().default(false),
  smsReceipt: z.boolean().default(false),
  /**
   * Dealer-role acknowledgment (www.vanstro.ca/dealer-services-and-responsibility). Required
   * whenever a dealer is assigned; recorded with timestamp + IP like the Terms consent.
   */
  dealerRole: z.boolean().default(false),
})
export type Consent = z.infer<typeof consentSchema>

/* ---------- step 3 · payment ---------- */

export const paymentSelectionSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("saved"), cardToken: z.string().min(1) }),
  z.object({ method: z.literal("new"), saveCard: z.boolean().default(false) }),
  z.object({ method: z.literal("apple_pay") }),
  z.object({ method: z.literal("google_pay") }),
  /** Dealer channel: unpaid order, paid later from account › Pay → Moneris Go Cloud. */
  z.object({ method: z.literal("pos") }),
])

export const billingSchema = z.union([
  z.object({ sameAsShipping: z.literal(true) }),
  z.object({ sameAsShipping: z.literal(false), addressId: z.string().min(1) }),
  z.object({ sameAsShipping: z.literal(false), address: addressSchema }),
])

/* ---------- POST /api/orders ---------- */

export const orderCreateSchema = z
  .object({
    cart: z.array(cartItemSchema).min(1),
    contact: contactSchema,
    shipping: shippingTargetSchema,
    dealer: dealerSelectionSchema,
    deliveryMethod: newDeliveryMethodSchema,
    notes: z.string().max(140).optional(),
    billing: billingSchema,
    consents: consentSchema,
    payment: paymentSelectionSchema,
    /** Cart-level promo applied on cart.html; validated + priced server-side (never trust the client discount). */
    promo: promoCodeSchema.optional(),
    locale: z.enum(["en-CA", "fr-CA"]).default("en-CA"),
  })
  .superRefine((v, ctx) => {
    if (v.consents.smsReceipt && !v.contact.phone) {
      ctx.addIssue({ code: "custom", path: ["contact", "phone"], message: "Add a mobile number to receive an SMS receipt." })
    }
    if (v.dealer.dealerId && !v.consents.dealerRole) {
      ctx.addIssue({ code: "custom", path: ["consents", "dealerRole"], message: "Please confirm you understand your local dealer’s role to continue." })
    }
  })
export type OrderCreate = z.infer<typeof orderCreateSchema>

/* ---------- quote ---------- */

export const quoteRequestSchema = z.object({
  province: z.enum(Object.keys(PROVINCES) as [ProvinceCode, ...ProvinceCode[]]),
  items: z.array(cartItemSchema).min(1),
  deliveryMethod: newDeliveryMethodSchema,
  promo: promoCodeSchema.optional(),
})

export interface CheckoutQuote {
  subtotalCents: number
  /** Promo discount on the product subtotal (0 when none). Applied before delivery and tax, same as cart.html. */
  discountCents: number
  promo: { code: string; pct: number } | null
  freightCents: number
  taxableCents: number
  tax: TaxQuote
  totalCents: number
}

/** Pure, deterministic. Same function runs on the server for /quote and again inside /orders (never trust the client total). */
export function quoteCheckout(province: ProvinceCode, items: CartItem[], deliveryMethod: DeliveryMethod, promoCode?: string): CheckoutQuote {
  const subtotalCents = items.reduce((s, i) => s + i.unitCents * i.qty, 0)
  const promo = promoCode && promoStatus(promoCode) === "ok" ? { code: promoCode, pct: PROMOS[promoCode].pct } : null
  const discountCents = promo ? Math.round(subtotalCents * promo.pct / 100) : 0
  const freightCents = DELIVERY[deliveryMethod].cents
  const taxableCents = subtotalCents - discountCents + freightCents
  // Pickup is taxed where the goods change hands: the dealer's province. Dealers are assigned per
  // shipping province, so `province` (the resolved shipping/dealer province) is already the place of supply.
  const tax = quoteTax(province, taxableCents)
  return { subtotalCents, discountCents, promo, freightCents, taxableCents, tax, totalCents: tax.totalCents }
}

/* ---------- Moneris response codes surfaced to the UI ---------- */

/** 000–049 approved; 050+ declined. Only the codes we word differently are listed. */
export const DECLINE_MESSAGES: Record<string, { en: string; fr: string }> = {
  "050": { en: "Your bank declined the payment. No charge was made.", fr: "Votre banque a refusé le paiement. Aucun montant n’a été débité." },
  "051": { en: "This card has expired. No charge was made.", fr: "Cette carte est expirée. Aucun montant n’a été débité." },
  "076": { en: "Your bank declined the payment (insufficient funds). No charge was made.", fr: "Votre banque a refusé le paiement (fonds insuffisants). Aucun montant n’a été débité." },
  // Not a bank decision: the Hosted Tokenization temporary token was expired/invalid (single use, ~15 min).
  token_rejected: { en: "Your card details timed out before we could take the payment. No charge was made. Please re-enter your card.", fr: "Vos données de carte ont expiré avant le paiement. Aucun montant n’a été débité. Veuillez saisir votre carte de nouveau." },
  bad_token: { en: "Your card details timed out before we could take the payment. No charge was made. Please re-enter your card.", fr: "Vos données de carte ont expiré avant le paiement. Aucun montant n’a été débité. Veuillez saisir votre carte de nouveau." },
  // Moneris answered PROCESSING / AUTHORIZED-without-capture: not final. Ops reconciles; don't let the customer pay twice.
  payment_pending: { en: "Your bank is still confirming this payment. Don’t retry — we’ll email you as soon as it’s confirmed.", fr: "Votre banque confirme encore ce paiement. Ne réessayez pas — nous vous écrirons dès qu’il sera confirmé." },
  // Moneris unreachable / 5xx / duplicate key: nothing was charged as far as we know.
  payment_unavailable: { en: "We couldn’t reach the payment provider. No charge was made. Please try again in a moment.", fr: "Impossible de joindre le fournisseur de paiement. Aucun montant n’a été débité. Réessayez dans un instant." },
}
export function declineMessage(code: string | undefined, locale: "en-CA" | "fr-CA" = "en-CA") {
  const m = (code && DECLINE_MESSAGES[code]) || DECLINE_MESSAGES["050"]
  return locale === "fr-CA" ? m.fr : m.en
}
