/**
 * Dealer-only quotes. Customers never see or call this.
 * declined = dealer voided the quote (not a customer refusal).
 */
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { randomBytes } from "node:crypto"
import { z } from "zod"
import {
  billingSchema, cartItemSchema, consentSchema, contactSchema, newDeliveryMethodSchema,
  promoCodeSchema, promoStatus, quoteCheckout, shippingTargetSchema, type CheckoutQuote, type DeliveryMethod,
} from "./checkout"
import type { StoredAddress, StoredItem } from "./orders"
import type { DealerSnapshot } from "./dealers"
import type { Locale } from "./mail"

export const QUOTE_NO_RE = /^QT-\d{4}-\d{6}(?:-[A-F0-9]{4})?$/i
const VALID_MS = 14 * 24 * 60 * 60 * 1000
const DATA_DIR = process.env.QUOTES_DIR ?? join(process.cwd(), "data", "quotes")

export type QuoteStatus = "awaiting" | "approved" | "declined" | "expired" | "ordered"

export interface Quote {
  quoteNo: string
  dealerId: string
  createdByUserId: string
  createdByName: string
  customer: { email: string; phone: string | null; name: string }
  project: string
  locale: Locale
  items: StoredItem[]
  deliveryMethod: DeliveryMethod
  notes: string | null
  shipping: StoredAddress
  billing: StoredAddress
  dealer: DealerSnapshot
  quote: CheckoutQuote
  promo?: string
  consents: { kind: string; at: string; ip: string }[]
  smsReceipt: boolean
  /** awaiting | approved | declined (dealer void) | expired | ordered */
  status: QuoteStatus
  validUntil: string
  createdAt: string
  updatedAt: string
  approvedAt?: string | null
  declinedAt?: string | null
  orderedAt?: string | null
  orderNo?: string | null
  checkoutIdempotencyKey?: string | null
  /** Set when a dealer typed a CAD discount at approve. Overrides any promo in the frozen snapshot. */
  dealerDiscountCents?: number | null
  priceRevisions?: {
    at: string
    byUserId: string
    before: { discountCents: number; totalCents: number }
    after: { discountCents: number; totalCents: number }
    overwrittenPromo?: string | null
  }[]
  /** quote_email = dealer sent the quote to a customer address (unverified). */
  notifications?: { kind: "quote_email"; to: string; sentAt?: string; byUserId: string; error?: string }[]
}

/** Hard cap: dealer discount cannot exceed 50% of product subtotal. Reject, do not clamp. */
export function dealerDiscountLimitCents(subtotalCents: number): number {
  return Math.floor(Math.max(0, subtotalCents) * 0.5)
}

export const quoteCreateSchema = z.object({
  cart: z.array(cartItemSchema.pick({ sku: true, qty: true }).extend({ name: z.string().optional() })).min(1),
  contact: contactSchema,
  shipping: shippingTargetSchema,
  dealer: z.object({ dealerId: z.string().min(1).nullable() }).optional(),
  deliveryMethod: newDeliveryMethodSchema,
  notes: z.string().max(140).optional(),
  billing: billingSchema,
  consents: consentSchema,
  promo: promoCodeSchema.optional(),
  locale: z.enum(["en-CA", "fr-CA"]).default("en-CA"),
  project: z.string().trim().max(80).optional(),
  checkoutIdempotencyKey: z.string().trim().min(8).max(80).optional(),
})
export type QuoteCreate = z.infer<typeof quoteCreateSchema>

function nowIso() { return new Date().toISOString() }

export function publicQuote(q: Quote) {
  return {
    quoteNo: q.quoteNo,
    dealerId: q.dealerId,
    createdByUserId: q.createdByUserId,
    createdByName: q.createdByName,
    customer: q.customer,
    project: q.project,
    locale: q.locale,
    items: q.items,
    deliveryMethod: q.deliveryMethod,
    notes: q.notes,
    shipping: q.shipping,
    billing: q.billing,
    dealer: q.dealer,
    quote: q.quote,
    promo: q.promo ?? null,
    smsReceipt: q.smsReceipt,
    status: q.status,
    validUntil: q.validUntil,
    createdAt: q.createdAt,
    approvedAt: q.approvedAt ?? null,
    declinedAt: q.declinedAt ?? null,
    orderedAt: q.orderedAt ?? null,
    orderNo: q.orderNo ?? null,
    dealerDiscountCents: q.dealerDiscountCents ?? null,
  }
}

class FileQuoteRepo {
  private dir = DATA_DIR
  private lock: Promise<unknown> = Promise.resolve()
  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lock.then(fn, fn)
    this.lock = run.catch(() => {})
    return run
  }
  private file(quoteNo: string) { return join(this.dir, `${quoteNo}.json`) }
  private async ensureDir() { await mkdir(this.dir, { recursive: true, mode: 0o700 }) }
  private async write(q: Quote) {
    await this.ensureDir()
    const tmp = this.file(q.quoteNo) + ".tmp"
    await writeFile(tmp, JSON.stringify(q, null, 2), { mode: 0o600 })
    await rename(tmp, this.file(q.quoteNo))
  }
  private async nextSeq(): Promise<{ year: number; seq: number }> {
    await this.ensureDir()
    const year = new Date().getFullYear()
    const seqFile = join(this.dir, `.seq-${year}`)
    let seq = 0
    try { seq = Number(await readFile(seqFile, "utf8")) || 0 } catch { /* first */ }
    seq += 1
    const tmp = seqFile + ".tmp"
    await writeFile(tmp, String(seq), { mode: 0o600 })
    await rename(tmp, seqFile)
    return { year, seq }
  }
  private async readRaw(quoteNo: string): Promise<Quote | null> {
    if (!QUOTE_NO_RE.test(quoteNo)) return null
    try { return JSON.parse(await readFile(this.file(quoteNo), "utf8")) as Quote } catch { return null }
  }
  private needsExpire(q: Quote): boolean {
    if (q.status === "ordered" || q.status === "declined" || q.status === "expired") return false
    return Date.parse(q.validUntil) <= Date.now()
  }
  private async sweep(q: Quote): Promise<Quote> {
    if (this.needsExpire(q)) {
      q.status = "expired"
      q.updatedAt = nowIso()
      await this.write(q)
    }
    return q
  }
  async create(input: Omit<Quote, "quoteNo" | "createdAt" | "updatedAt" | "status" | "validUntil"> & { status?: QuoteStatus }): Promise<Quote> {
    return this.withLock(async () => {
      const { year, seq } = await this.nextSeq()
      const at = nowIso()
      const q: Quote = {
        ...input,
        quoteNo: `QT-${year}-${String(seq).padStart(6, "0")}-${randomBytes(2).toString("hex").toUpperCase()}`,
        status: "awaiting",
        createdAt: at,
        updatedAt: at,
        validUntil: new Date(Date.parse(at) + VALID_MS).toISOString(),
      }
      await this.write(q)
      return q
    })
  }
  async get(quoteNo: string): Promise<Quote | null> {
    return this.withLock(async () => {
      const q = await this.readRaw(quoteNo)
      if (!q) return null
      return this.sweep(q)
    })
  }
  async listByDealer(dealerId: string): Promise<Quote[]> {
    return this.withLock(async () => {
      await this.ensureDir()
      const files = (await readdir(this.dir)).filter(f => f.endsWith(".json"))
      const all: Quote[] = []
      for (const f of files) {
        try { all.push(JSON.parse(await readFile(join(this.dir, f), "utf8")) as Quote) } catch { /* skip */ }
      }
      const mine = all.filter(q => q.dealerId === dealerId)
      for (const q of mine) await this.sweep(q)
      return mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    })
  }
  async findByIdempotency(dealerId: string, key: string): Promise<Quote | null> {
    const list = await this.listByDealer(dealerId)
    return list.find(q => q.checkoutIdempotencyKey === key && q.status !== "declined" && q.status !== "expired") ?? null
  }
  async logNotification(quoteNo: string, entry: NonNullable<Quote["notifications"]>[number]): Promise<void> {
    await this.update(quoteNo, q => {
      q.notifications = q.notifications || []
      q.notifications.push(entry)
    })
  }
  async update(quoteNo: string, fn: (q: Quote) => void): Promise<Quote | null> {
    return this.withLock(async () => {
      const q = await this.readRaw(quoteNo)
      if (!q) return null
      await this.sweep(q)
      fn(q)
      q.updatedAt = nowIso()
      await this.write(q)
      return q
    })
  }
}

export const quotes = new FileQuoteRepo()
export { DATA_DIR as QUOTES_DIR }
