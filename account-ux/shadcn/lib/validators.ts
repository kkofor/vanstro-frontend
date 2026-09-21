/**
 * lib/validators.ts — zod schemas + formatting helpers shared by the account flows.
 * Mirrors the rules implemented in the HTML prototypes (login / forgot-password / account).
 */
import { z } from "zod"

/* ------------------------------------------------------------------ identifier */
export type IdentifierKind = "email" | "phone" | "username" | "unknown"

export function detectIdentifier(v: string): IdentifierKind {
  const s = v.trim()
  if (!s) return "unknown"
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return "email"
  if (/^\+?1?[\s().-]*[2-9](?:[\s().-]*\d){9}$/.test(s)) return "phone"
  if (/^[a-z0-9_.]{3,30}$/i.test(s)) return "username"
  return "unknown"
}

export const identifierSchema = z
  .string()
  .trim()
  .min(1, "Enter your email, phone number or username.")
  .refine((v) => detectIdentifier(v) !== "unknown", "That doesn’t look like an email, phone number or username.")

/* ------------------------------------------------------------------ password */
export const PASSWORD_RULES = [
  { id: "len", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "case", label: "Upper & lower case", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: "num", label: "A number", test: (p: string) => /\d/.test(p) },
  { id: "sym", label: "A symbol (!@#…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const

export function passwordStrength(p: string) {
  const passed = PASSWORD_RULES.filter((r) => r.test(p)).length
  // 0 = empty · 1 = weak (too short) · 2–4 = number of rules met once length ≥ 8
  const score = p.length === 0 ? 0 : p.length < 8 ? 1 : Math.max(2, passed)
  return { score, passed, valid: PASSWORD_RULES.slice(0, 3).every((r) => r.test(p)) }
}

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[a-z]/, "Add a lower‑case letter.")
  .regex(/[A-Z]/, "Add an upper‑case letter.")
  .regex(/\d/, "Add a number.")

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string(), signOutOthers: z.boolean().default(true) })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don’t match." })

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean().default(false),
})

/* ------------------------------------------------------------------ OTP */
export const otpSchema = z.string().regex(/^\d{6}$/, "Enter the 6‑digit code.")

/* ------------------------------------------------------------------ profile */
export const profileSchema = z.object({
  displayName: z.string().trim().regex(/^[\p{L}\p{N} ._'-]{2,20}$/u, "2–20 letters, numbers, spaces or . _ ' -"),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  gender: z.enum(["female", "male", "nonbinary", "unspecified"]).default("unspecified"),
  birthday: z
    .string()
    .optional()
    .refine((d) => {
      if (!d) return true
      const age = (Date.now() - new Date(d).getTime()) / 3.15576e10
      return age >= 16 && age <= 120
    }, "You must be at least 16 to have an account."),
  language: z.enum(["en", "fr"]),
  province: z.string().length(2).optional(),
})

/* ------------------------------------------------------------------ address */
export const PROVINCES = {
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick",
  NL: "Newfoundland and Labrador", NS: "Nova Scotia", NT: "Northwest Territories",
  NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec",
  SK: "Saskatchewan", YT: "Yukon",
} as const
export type ProvinceCode = keyof typeof PROVINCES

/** First letter of the postal code (FSA) → province(s). X is shared by NT/NU. */
export const FSA: Record<string, ProvinceCode[]> = {
  A: ["NL"], B: ["NS"], C: ["PE"], E: ["NB"], G: ["QC"], H: ["QC"], J: ["QC"], K: ["ON"], L: ["ON"], M: ["ON"], N: ["ON"], P: ["ON"],
  R: ["MB"], S: ["SK"], T: ["AB"], V: ["BC"], X: ["NT", "NU"], Y: ["YT"],
}

export const POSTAL_RE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] \d[ABCEGHJ-NPRSTV-Z]\d$/

export function formatPostalCode(v: string) {
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
  return s.length > 3 ? `${s.slice(0, 3)} ${s.slice(3)}` : s
}

export function formatPhoneCA(v: string) {
  const d = v.replace(/\D/g, "").replace(/^1/, "").slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export const addressSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().trim().max(24).optional(),
    name: z.string().trim().min(1, "Enter the recipient’s full name."),
    company: z.string().trim().optional(),
    street: z
      .string()
      .trim()
      .min(1, "Enter a street address.")
      .refine((s) => !/\bP\.?\s*O\.?\s*BOX\b/i.test(s), "Cabinets and panels ship by freight — we can’t deliver to a PO Box."),
    unit: z.string().trim().optional(),
    city: z.string().trim().min(1, "Enter a city."),
    province: z.enum(Object.keys(PROVINCES) as [ProvinceCode, ...ProvinceCode[]], { message: "Choose a province or territory." }),
    postalCode: z.string().transform(formatPostalCode).refine((p) => POSTAL_RE.test(p), "Enter a valid postal code, e.g. R3C 4T3."),
    phone: z
      .string()
      .optional()
      .transform((p) => (p ? p.replace(/\D/g, "").replace(/^1/, "") : ""))
      .refine((p) => !p || /^[2-9]\d{9}$/.test(p), "Enter a 10‑digit Canadian phone number."),
    notes: z.string().trim().max(140).optional(),
    defaultShipping: z.boolean().default(false),
    defaultBilling: z.boolean().default(false),
  })
  .superRefine((a, ctx) => {
    const allowed = FSA[a.postalCode[0]]
    if (allowed && !allowed.includes(a.province)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["postalCode"],
        message: `This postal code is in ${PROVINCES[allowed[0]]}, but you chose ${PROVINCES[a.province]}. Check one of them.`,
      })
    }
  })
export type Address = z.infer<typeof addressSchema>

/* ------------------------------------------------------------------ payment card */
export type CardBrand = "visa" | "mastercard" | "amex" | "unknown"

export function detectBrand(num: string): CardBrand {
  const d = num.replace(/\D/g, "")
  if (/^4/.test(d)) return "visa"
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard"
  if (/^3[47]/.test(d)) return "amex"
  return "unknown"
}

export const CARD_LENGTH: Record<CardBrand, number> = { visa: 16, mastercard: 16, amex: 15, unknown: 16 }
export const CVC_LENGTH: Record<CardBrand, number> = { visa: 3, mastercard: 3, amex: 4, unknown: 3 }

export function luhn(num: string) {
  const d = num.replace(/\D/g, "")
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = +d[d.length - 1 - i]
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9 }
    sum += n
  }
  return d.length >= 13 && sum % 10 === 0
}

export function formatCardNumber(num: string, brand = detectBrand(num)) {
  const d = num.replace(/\D/g, "").slice(0, CARD_LENGTH[brand])
  return brand === "amex"
    ? d.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "))
    : d.replace(/(\d{4})(?=\d)/g, "$1 ").trim()
}

export function expiryState(month: number, year: number, now = new Date()): "ok" | "soon" | "expired" {
  const end = new Date(2000 + (year % 100), month, 0, 23, 59, 59)
  const days = (end.getTime() - now.getTime()) / 8.64e7
  return days < 0 ? "expired" : days <= 90 ? "soon" : "ok"
}

export const cardSchema = z
  .object({
    number: z
      .string()
      .transform((n) => n.replace(/\D/g, ""))
      .refine((n) => detectBrand(n) !== "unknown", "We accept Visa, Mastercard and American Express.")
      .refine((n) => n.length === CARD_LENGTH[detectBrand(n)] && luhn(n), "That card number isn’t valid — check for a typo."),
    name: z.string().trim().min(2, "Enter the name as it appears on the card."),
    expiry: z
      .string()
      .regex(/^(0[1-9]|1[0-2])\s?\/\s?\d{2}$/, "Use MM / YY.")
      .refine((e) => {
        const [m, y] = e.split("/").map((s) => parseInt(s, 10))
        return expiryState(m, y) !== "expired"
      }, "This card has expired."),
    cvc: z.string().regex(/^\d{3,4}$/, "Enter the security code."),
    billingAddressId: z.string().min(1, "Choose a billing address."),
    isDefault: z.boolean().default(false),
  })
  .superRefine((c, ctx) => {
    if (c.cvc.length !== CVC_LENGTH[detectBrand(c.number)]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cvc"], message: `Enter the ${CVC_LENGTH[detectBrand(c.number)]}‑digit security code.` })
    }
  })
export type CardInput = z.infer<typeof cardSchema>

/** Edit form: number is read‑only, no CVC. */
export const cardEditSchema = cardSchema.innerType().pick({ name: true, expiry: true, billingAddressId: true, isDefault: true })

export { quoteTax, TAX_RATES, formatCAD, dollarsToCents } from "./tax"
export type { TaxQuote, ProvinceCode as TaxProvince } from "./tax"
