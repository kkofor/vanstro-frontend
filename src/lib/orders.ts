/**
 * lib/orders.ts — order model + repository.
 *
 * This is the join point between checkout (payment) and everything downstream
 * (confirmation page, emails, tax invoice PDF, dealer notification, ERP push, account › Orders).
 *
 * Lifecycle
 *   pending_payment  POST /api/orders          server-side quote, dealer snapshot
 *   paid             HT: POST /api/checkout/moneris/pay  ·  POS: account Pay → Go Cloud postback
 *   declined         same route, purchase not approved (customer may retry → new order)
 *   expired          pending for more than 30 min and never paid (swept lazily)
 *
 * Money is integer cents from `quoteCheckout`; the order stores the quote as charged and
 * templates/PDF render from that snapshot (never recomputed). Card data never enters this
 * model: `payment` only holds what Moneris returns (brand, last4, auth code, reference).
 *
 * Storage: `OrderRepo` interface + a file-backed implementation (data/orders/*.json,
 * gitignored) so the flow runs end-to-end locally. Production swaps `repo` for the DB
 * implementation; the routes only talk to the interface.
 */
import { mkdir, readFile, readdir, writeFile, rename } from "node:fs/promises"
import { join } from "node:path"
import { randomBytes, randomUUID } from "node:crypto"
import type { CheckoutQuote, DeliveryMethod, OrderCreate } from "./checkout"
import { DELIVERY, quoteCheckout } from "./checkout"
import { defaultDealer, dealersFor, getDealer, snapshotDealer, type DealerSnapshot } from "./dealers"
import { getItem } from "./catalogue"
import type { ProvinceCode } from "./tax"
import type { OrderConfirmationInput, InvoiceInput, OrderAddress } from "../emails/orders"
import type { Locale } from "./mail"
import { invoicePdfHref } from "./signed-links"
import { orderAccessToken, orderStatusHref } from "./order-access"
import type { ErpPushRecord } from "./erp"

/* ------------------------------------------------------------------ types */

export type OrderStatus = "pending_payment" | "paid" | "declined" | "expired" | "cancelled"
export type FulfillmentStatus = "unfulfilled" | "processing" | "ready" | "in_transit" | "delivered" | "returned"

export interface ShipmentTracking {
  carrier?: string
  trackingNo: string
  trackingUrl?: string
  at: string
}

export function trackingHref(t: Pick<ShipmentTracking, "carrier" | "trackingNo" | "trackingUrl">): string | undefined {
  if (t.trackingUrl) return t.trackingUrl
  const no = encodeURIComponent(t.trackingNo)
  const c = (t.carrier || "").toLowerCase()
  if (!t.trackingNo) return undefined
  if (c.includes("canada") || c === "cpc" || c === "cp") return `https://www.canadapost-postescanada.ca/track-reperage/en#/details/${no}`
  if (c.includes("puro")) return `https://www.purolator.com/en/shipping/tracker?pin=${no}`
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${no}`
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${no}`
  return undefined
}

export interface InternalNote {
  at: string
  by: string
  text: string
}

export interface StoredAddress {
  name: string
  company?: string
  street: string
  unit?: string
  city: string
  province: ProvinceCode
  postalCode: string
  phone?: string
}

export interface StoredItem {
  sku: string
  name: string
  variant?: string
  qty: number
  unitCents: number
}

/** What Moneris returned for the approved transaction. Never the PAN. */
export interface PaymentRecord {
  provider: "moneris" | "moneris_go" | "manual"
  method: OrderCreate["payment"]["method"]
  wallet?: "Apple Pay" | "Google Pay"
  brand: string
  last4: string
  authCode?: string
  referenceNo?: string
  responseCode?: string
  amountCents: number
  paidAt: string           // ISO
  threeDS?: boolean
  vaultToken?: string      // Moneris paymentMethodId when the customer saved the card
  /** Offline collection recorded by a dealer. Absent on gateway payments. */
  manual?: { channel: "cash" | "e_transfer" | "other"; note?: string; byUserId: string }
}


export interface PaymentAttempt {
  n: number
  /** sha256 of the temporary token — never the token itself. */
  tokenHash: string
  idempotencyKey: string   // UUID, ≤ 36 chars
  at: string
  outcome?: "approved" | "declined" | "pending" | "error"
  code?: string
}

/** Offline cash / e-transfer / other. Append-only; void by flag, never delete. */
export interface LedgerPayment {
  id: string
  idempotencyKey: string
  amountCents: number
  at: string
  byUserId: string
  channel: "cash" | "e_transfer" | "other"
  note?: string
  voidedAt?: string
  voidedByUserId?: string
}

export const MANUAL_CHANNEL_BRAND: Record<LedgerPayment["channel"], string> = {
  cash: "Cash",
  e_transfer: "E-transfer",
  other: "Other",
}

export function ledgerOpen(o: { payments?: LedgerPayment[] }): LedgerPayment[] {
  return (o.payments ?? []).filter(p => !p.voidedAt)
}

/** Derived. Never persist this field — the ledger (or legacy payment) is the source of truth. */
export function amountPaidCents(o: Order): number {
  const open = ledgerOpen(o)
  if (open.length) return open.reduce((s, p) => s + p.amountCents, 0)
  if (o.status === "paid" && o.payment) return o.payment.amountCents
  return 0
}

export class AmountMismatchError extends Error {
  readonly code = "amount_mismatch"
  constructor(orderNo: string, got: number, expected: number) {
    super(`amount_mismatch:${orderNo}:${got}!=${expected}`)
    this.name = "AmountMismatchError"
  }
}

export class OrderMoneyError extends Error {
  constructor(
    readonly code: "overpay" | "already_paid" | "order_not_payable" | "nothing_to_void" | "paid_cannot_void",
    message?: string,
  ) {
    super(message || code)
    this.name = "OrderMoneyError"
  }
}

export interface NotificationLog {
  kind: "order_confirmation" | "invoice" | "dealer_new_order" | "sms_receipt" | "claim" | "payment_received" | "ready_for_pickup" | "shipped"
  to: string
  sentAt?: string
  error?: string
}

/** New orders: VS-2026-004821-A3F9 (seq + 4 hex). Pre-suffix files VS-2026-004821 still match. */
export const ORDER_NO_RE = /^VS-\d{4}-\d{6}(?:-[A-F0-9]{4})?$/i

export interface Order {
  orderNo: string          // VS-2026-004821-A3F9
  /** null = guest checkout; set when the customer later registers with the order email (claim). */
  userId: string | null
  /** When a guest order was attached to an account. */
  claimedAt?: string | null
  status: OrderStatus
  createdAt: string
  updatedAt: string
  locale: Locale
  email: string
  phone: string | null
  firstName: string
  items: StoredItem[]
  deliveryMethod: DeliveryMethod
  notes: string | null
  shipping: StoredAddress
  billing: StoredAddress
  seller: "Vanstro Global Supply Inc."
  dealer: DealerSnapshot | null
  quote: CheckoutQuote
  consents: { kind: string; at: string; ip: string }[]
  smsReceipt: boolean
  /** How the customer chose to pay at Step 3. */
  paymentMethod: OrderCreate["payment"]["method"]
  /** Customer asked to keep the card as a stored Moneris payment method (never the PAN). */
  saveCard: boolean
  payment: PaymentRecord | null
  /** Manual collections. Absent on orders paid in one gateway shot. Do not store amountPaidCents. */
  payments?: LedgerPayment[]
  declined: { code: string; at: string } | null
  /**
   * Purchase attempts against Moneris. Each *new* temporary token gets its own orderId suffix
   * and idempotencyKey (Moneris forbids reusing an orderId and would replay the first, declined
   * result for a reused key); a retry with the *same* token reuses the key so a network blip
   * cannot charge twice.
   */
  paymentAttempts: PaymentAttempt[]
  invoiceNo: string | null // INV-2026-004821, issued when paid
  invoiceDate: string | null
  notifications: NotificationLog[]
  /** Vanstro Go terminal this POS-channel order will be pushed to. */
  posTerminalId: string | null
  /** Checkout-page key; same key + user reuses this POS order instead of creating another. */
  checkoutIdempotencyKey?: string | null
  pos: { status: "idle" | "pushed" | "busy" | "failed"; cloudTicket?: string; pushedAt?: string; error?: string; idempotencyKey?: string; receiptUrl?: string } | null
  /** Warehouse / dealer handoff. Independent of payment status. Default unfulfilled once paid. */
  fulfillment?: FulfillmentStatus | null
  tracking?: ShipmentTracking | null
  internalNotes?: InternalNote[]
  /** When set, pending/declined TTL is counted from this instant (reopen). */
  openedAt?: string | null
  /** Ops risk hold — do not ship until released. */
  riskHold?: { at: string; by: string; reason: string } | null
  /** ERP `Order/syncEspoQuote` after paid. Independent of payment — a failed push does not un-pay. */
  erp?: ErpPushRecord | null
}

/* ------------------------------------------------------------------ repo */

export class PaymentUnresolvedError extends Error {
  readonly code = "payment_unresolved"
  constructor() {
    super("A previous card attempt is still unresolved. Retry the same token or wait for reconciliation.")
    this.name = "PaymentUnresolvedError"
  }
}

export interface OrderRepo {
  create(input: Omit<Order, "orderNo" | "createdAt" | "updatedAt" | "status" | "payment" | "declined" | "paymentAttempts" | "invoiceNo" | "invoiceDate" | "notifications" | "pos">): Promise<Order>
  get(orderNo: string): Promise<Order | null>
  listByUser(userId: string): Promise<Order[]>
  /** Attaches guest orders for `email` that appear in `provenOrderNos` (caller verified a token per order). */
  claimByEmail(email: string, userId: string, provenOrderNos: string[]): Promise<string[]>
  /** Email-confirm claim: write userId + claim audit only. */
  attachUser(orderNo: string, userId: string, audit: NotificationLog): Promise<"ok" | "missing" | "taken" | "self">
  /** Returns the attempt to use for this token: existing one if the same token was already tried, else a new one. */
  beginPaymentAttempt(orderNo: string, tokenHash: string): Promise<PaymentAttempt>
  recordPaymentAttempt(orderNo: string, n: number, outcome: NonNullable<PaymentAttempt["outcome"]>, code?: string): Promise<Order>
  markPaid(orderNo: string, payment: PaymentRecord): Promise<Order>
  recordManualPayment(orderNo: string, input: {
    amountCents: number
    channel: LedgerPayment["channel"]
    note?: string
    byUserId: string
    idempotencyKey: string
  }): Promise<{ order: Order; replay: boolean; completed: boolean; entry: LedgerPayment }>
  voidLastManualPayment(orderNo: string, byUserId: string): Promise<{ order: Order; entry: LedgerPayment }>
  markDeclined(orderNo: string, code: string): Promise<Order>
  updateEmail(orderNo: string, email: string): Promise<Order>
  logNotification(orderNo: string, entry: NotificationLog): Promise<Order>
  setPosPush(orderNo: string, pos: NonNullable<Order["pos"]>): Promise<Order>
  setErp(orderNo: string, erp: ErpPushRecord): Promise<Order>
  setFulfillment(orderNo: string, fulfillment: FulfillmentStatus): Promise<Order>
  setTracking(orderNo: string, tracking: ShipmentTracking | null): Promise<Order>
  claimPosPush(orderNo: string, retryMs: number): Promise<{ ok: true; order: Order } | { ok: false; error: string; status: number; retryAfterMs?: number }>
  listAll(): Promise<Order[]>
  patchAdmin(orderNo: string, patch: AdminOrderPatch): Promise<Order>
}

export interface AdminOrderPatch {
  by: string
  status?: "cancelled" | "pending_payment"
  fulfillment?: FulfillmentStatus
  note?: string
  email?: string
  phone?: string | null
  firstName?: string
  notes?: string | null
  deliveryMethod?: DeliveryMethod
  /** `undefined` = leave; `null` = Vanstro direct when the province has no dealer. */
  dealerId?: string | null
  shipping?: StoredAddress
  billing?: StoredAddress
  items?: { sku: string; qty: number }[]
  /** true = hold for risk review; false = release. */
  riskHold?: boolean
  riskReason?: string
  tracking?: { carrier?: string; trackingNo: string; trackingUrl?: string } | null
}

const DATA_DIR = process.env.ORDERS_DIR ?? join(process.cwd(), "data", "orders")
const PENDING_TTL_MS = 30 * 60 * 1000
const POS_TTL_MS = 7 * 24 * 60 * 60 * 1000

function nowIso() { return new Date().toISOString() }

class FileOrderRepo implements OrderRepo {
  private dir = DATA_DIR
  private lock: Promise<unknown> = Promise.resolve()

  /** Serialises writes so the sequence counter and per-order files never race. */
  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lock.then(fn, fn)
    this.lock = run.catch(() => {})
    return run
  }

  private file(orderNo: string) { return join(this.dir, `${orderNo}.json`) }

  private async ensureDir() { await mkdir(this.dir, { recursive: true }) }

  private async write(order: Order) {
    await this.ensureDir()
    const tmp = this.file(order.orderNo) + ".tmp"
    await writeFile(tmp, JSON.stringify(order, null, 2))
    await rename(tmp, this.file(order.orderNo))
  }

  /** Yearly sequence shared by order and invoice numbers: VS-2026-004821-A3F9 / INV-2026-004821. */
  private async nextSeq(): Promise<{ year: number; seq: number }> {
    await this.ensureDir()
    const year = new Date().getFullYear()
    const seqFile = join(this.dir, `.seq-${year}`)
    let seq = 4820 // demo baseline so numbers look like the prototype (VS-2026-0048xx)
    try { seq = Number(await readFile(seqFile, "utf8")) || seq } catch { /* first order this year */ }
    seq += 1
    const tmp = seqFile + ".tmp"
    await writeFile(tmp, String(seq))
    await rename(tmp, seqFile)
    return { year, seq }
  }

  private async readRaw(orderNo: string): Promise<Order | null> {
    if (!ORDER_NO_RE.test(orderNo)) return null
    try {
      const o = JSON.parse(await readFile(this.file(orderNo), "utf8")) as Order
      if (!Array.isArray(o.paymentAttempts)) o.paymentAttempts = []
      return o
    } catch { return null }
  }

  private needsExpire(o: Order): boolean {
    if (o.status === "paid" || o.status === "cancelled" || o.status === "expired") return false
    const ttl = o.paymentMethod === "pos" ? POS_TTL_MS : PENDING_TTL_MS
    const from = Date.parse(o.openedAt || o.createdAt)
    return (o.status === "pending_payment" || o.status === "declined") && Date.now() - from > ttl
  }

  private async readAndSweep(orderNo: string): Promise<Order | null> {
    const o = await this.readRaw(orderNo)
    if (!o) return null
    if (this.needsExpire(o)) {
      o.status = "expired"
      o.updatedAt = nowIso()
      await this.write(o)
    }
    return o
  }

  async create(input: Parameters<OrderRepo["create"]>[0]): Promise<Order> {
    return this.withLock(async () => {
      const { year, seq } = await this.nextSeq()
      const at = nowIso()
      const order: Order = {
        ...input,
        orderNo: `VS-${year}-${String(seq).padStart(6, "0")}-${randomBytes(2).toString("hex").toUpperCase()}`,
        status: "pending_payment",
        createdAt: at,
        updatedAt: at,
        payment: null,
        declined: null,
        paymentAttempts: [],
        invoiceNo: null,
        invoiceDate: null,
        notifications: [],
        posTerminalId: input.posTerminalId ?? null,
        pos: input.paymentMethod === "pos" ? { status: "idle" } : null,
      }
      await this.write(order)
      return order
    })
  }

  async get(orderNo: string): Promise<Order | null> {
    return this.withLock(() => this.readAndSweep(orderNo))
  }

  private async all(): Promise<Order[]> {
    await this.ensureDir()
    const files = (await readdir(this.dir)).filter(f => f.endsWith(".json"))
    const orders = await Promise.all(files.map(async f => JSON.parse(await readFile(join(this.dir, f), "utf8")) as Order))
    return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async listByUser(userId: string): Promise<Order[]> {
    return this.withLock(async () => {
      const list = await this.all()
      const mine = list.filter(o => o.userId === userId)
      for (const o of mine) {
        if (this.needsExpire(o)) {
          o.status = "expired"
          o.updatedAt = nowIso()
          await this.write(o)
        }
      }
      return mine
    })
  }

  async claimByEmail(email: string, userId: string, provenOrderNos: string[]): Promise<string[]> {
    const want = email.trim().toLowerCase()
    const allow = new Set(provenOrderNos.map(n => n.trim().toUpperCase()))
    if (!allow.size) return []
    return this.withLock(async () => {
      const list = await this.all()
      const claimed: string[] = []
      for (const o of list) {
        if (o.userId !== null || o.email.trim().toLowerCase() !== want) continue
        if (!allow.has(o.orderNo.toUpperCase())) continue
        o.userId = userId
        o.claimedAt = nowIso()
        o.updatedAt = o.claimedAt
        await this.write(o)
        claimed.push(o.orderNo)
      }
      return claimed
    })
  }

  async attachUser(orderNo: string, userId: string, audit: NotificationLog): Promise<"ok" | "missing" | "taken" | "self"> {
    return this.withLock(async () => {
      const o = await this.readRaw(orderNo)
      if (!o) return "missing"
      if (o.userId === userId) return "self"
      if (o.userId !== null) return "taken"
      o.userId = userId
      o.claimedAt = nowIso()
      o.updatedAt = o.claimedAt
      o.notifications = [...(o.notifications ?? []), { ...audit, to: o.email }]
      await this.write(o)
      return "ok"
    })
  }

  private async update(orderNo: string, patch: (o: Order) => void): Promise<Order> {
    return this.withLock(async () => {
      const o = await this.readAndSweep(orderNo)
      if (!o) throw new Error(`order_not_found:${orderNo}`)
      patch(o)
      o.updatedAt = nowIso()
      await this.write(o)
      return o
    })
  }

  async beginPaymentAttempt(orderNo: string, tokenHash: string): Promise<PaymentAttempt> {
    let attempt!: PaymentAttempt
    await this.update(orderNo, o => {
      const same = o.paymentAttempts.find(a => a.tokenHash === tokenHash)
      if (same) { attempt = same; return }
      const blocked = o.paymentAttempts.find(a =>
        a.outcome === "pending" || (a.outcome === "error" && a.code !== "token_rejected"))
      if (blocked) throw new PaymentUnresolvedError()
      attempt = { n: o.paymentAttempts.length + 1, tokenHash, idempotencyKey: randomUUID(), at: nowIso() }
      o.paymentAttempts.push(attempt)
    })
    return attempt
  }

  recordPaymentAttempt(orderNo: string, n: number, outcome: NonNullable<PaymentAttempt["outcome"]>, code?: string) {
    return this.update(orderNo, o => { const a = o.paymentAttempts.find(x => x.n === n); if (a) { a.outcome = outcome; a.code = code } })
  }

  /**
   * 金额必须等于 quote.totalCents。历史上此处金额不等会静默产出 status=paid 且 invoiceNo=null 的坏单
   * （2026-09-08 扫描确认生产未触发）。部分收款走 payments[] 流水，累计收齐后才调用本函数。
   */
  private applyPaid(o: Order, payment: PaymentRecord) {
    if (o.status === "paid") return
    if (payment.amountCents !== o.quote.totalCents) {
      throw new AmountMismatchError(o.orderNo, payment.amountCents, o.quote.totalCents)
    }
    o.status = "paid"
    o.payment = payment
    o.declined = null
    o.invoiceNo = o.orderNo.replace(/^VS-/, "INV-")
    o.invoiceDate = payment.paidAt
  }

  markPaid(orderNo: string, payment: PaymentRecord) {
    return this.update(orderNo, o => { this.applyPaid(o, payment) })
  }

  async recordManualPayment(orderNo: string, input: {
    amountCents: number
    channel: LedgerPayment["channel"]
    note?: string
    byUserId: string
    idempotencyKey: string
  }): Promise<{ order: Order; replay: boolean; completed: boolean; entry: LedgerPayment }> {
    return this.withLock(async () => {
      const o = await this.readAndSweep(orderNo)
      if (!o) throw new Error(`order_not_found:${orderNo}`)
      if (o.status === "paid") throw new OrderMoneyError("already_paid")
      if (o.status !== "pending_payment" || o.paymentMethod !== "pos") throw new OrderMoneyError("order_not_payable")
      o.payments = o.payments ?? []
      const prior = o.payments.find(p => p.idempotencyKey === input.idempotencyKey)
      if (prior) {
        // Reached only past the `already_paid` throw above, so a settled order never gets here:
        // this replay is always against a still-open order.
        return { order: o, replay: true, completed: false, entry: prior }
      }
      const openSum = ledgerOpen(o).reduce((s, p) => s + p.amountCents, 0)
      if (openSum + input.amountCents > o.quote.totalCents) throw new OrderMoneyError("overpay")
      const entry: LedgerPayment = {
        id: randomUUID(),
        idempotencyKey: input.idempotencyKey,
        amountCents: input.amountCents,
        at: nowIso(),
        byUserId: input.byUserId,
        channel: input.channel,
        note: input.note,
      }
      o.payments.push(entry)
      const nextSum = openSum + input.amountCents
      const settled = nextSum === o.quote.totalCents
      if (settled) {
        const last = entry
        const mixed = new Set(ledgerOpen(o).map(p => p.channel)).size > 1
        this.applyPaid(o, {
          provider: "manual",
          method: "pos",
          brand: mixed ? "Mixed" : MANUAL_CHANNEL_BRAND[last.channel],
          last4: "—",
          amountCents: o.quote.totalCents,
          paidAt: last.at,
          referenceNo: last.note,
          manual: { channel: last.channel, note: last.note, byUserId: last.byUserId },
        })
      }
      o.updatedAt = nowIso()
      await this.write(o)
      return { order: o, replay: false, completed: settled, entry }
    })
  }

  async voidLastManualPayment(orderNo: string, byUserId: string): Promise<{ order: Order; entry: LedgerPayment }> {
    return this.withLock(async () => {
      const o = await this.readAndSweep(orderNo)
      if (!o) throw new Error(`order_not_found:${orderNo}`)
      if (o.status === "paid") throw new OrderMoneyError("paid_cannot_void")
      if (o.status !== "pending_payment") throw new OrderMoneyError("order_not_payable")
      const open = ledgerOpen(o)
      const last = open[open.length - 1]
      if (!last) throw new OrderMoneyError("nothing_to_void")
      last.voidedAt = nowIso()
      last.voidedByUserId = byUserId
      o.updatedAt = nowIso()
      await this.write(o)
      return { order: o, entry: last }
    })
  }

  markDeclined(orderNo: string, code: string) {
    return this.update(orderNo, o => { if (o.status !== "paid") { o.status = "declined"; o.declined = { code, at: nowIso() } } })
  }

  updateEmail(orderNo: string, email: string) {
    return this.update(orderNo, o => { o.email = email })
  }

  logNotification(orderNo: string, entry: NotificationLog) {
    return this.update(orderNo, o => { o.notifications.push(entry) })
  }

  setPosPush(orderNo: string, pos: NonNullable<Order["pos"]>) {
    return this.update(orderNo, o => { o.pos = { ...o.pos, ...pos } })
  }

  setErp(orderNo: string, erp: ErpPushRecord) {
    return this.update(orderNo, o => { o.erp = erp })
  }

  setFulfillment(orderNo: string, fulfillment: FulfillmentStatus) {
    return this.update(orderNo, o => { o.fulfillment = fulfillment })
  }

  setTracking(orderNo: string, tracking: ShipmentTracking | null) {
    return this.update(orderNo, o => { o.tracking = tracking })
  }

  async claimPosPush(orderNo: string, retryMs: number): Promise<{ ok: true; order: Order } | { ok: false; error: string; status: number; retryAfterMs?: number }> {
    return this.withLock(async () => {
      const o = await this.readAndSweep(orderNo)
      if (!o) return { ok: false, error: "order_not_found", status: 404 }
      if (o.status === "paid") return { ok: true, order: o }
      if (o.status === "expired") return { ok: false, error: "order_expired", status: 410 }
      if (o.status !== "pending_payment" || o.paymentMethod !== "pos") return { ok: false, error: "order_not_payable", status: 409 }
      const pos = o.pos
      const recent = pos?.status === "pushed" && pos.pushedAt && Date.now() - new Date(pos.pushedAt).getTime() <= retryMs
      if (recent) {
        const elapsed = Date.now() - new Date(pos.pushedAt!).getTime()
        return { ok: false, error: "pos_busy", status: 409, retryAfterMs: Math.max(1000, retryMs - elapsed) }
      }
      const key = pos?.idempotencyKey || randomUUID()
      o.pos = { status: "pushed", idempotencyKey: key, cloudTicket: pos?.cloudTicket, pushedAt: nowIso() }
      o.updatedAt = nowIso()
      await this.write(o)
      return { ok: true, order: o }
    })
  }

  async listAll(): Promise<Order[]> {
    return this.withLock(async () => {
      const list = await this.all()
      for (const o of list) {
        if (this.needsExpire(o)) {
          o.status = "expired"
          o.updatedAt = nowIso()
          await this.write(o)
        }
      }
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    })
  }

  async patchAdmin(orderNo: string, patch: AdminOrderPatch): Promise<Order> {
    const current = await this.get(orderNo)
    if (!current) throw new Error(`order_not_found:${orderNo}`)

    const moneyEditable = current.status === "pending_payment" || current.status === "declined" || current.status === "expired"
    let nextItems = current.items
    if (patch.items) {
      if (!moneyEditable) throw new Error("items_locked")
      nextItems = await Promise.all(patch.items.map(async line => {
        const c = await getItem(line.sku)
        return { sku: c.sku, name: c.name, variant: c.variant, qty: line.qty, unitCents: c.unitCents }
      }))
      if (!nextItems.length) throw new Error("items_empty")
    }

    const nextShipping = patch.shipping ?? current.shipping
    const nextDelivery = patch.deliveryMethod ?? current.deliveryMethod
    let nextDealer = current.dealer
    if (patch.dealerId !== undefined) {
      nextDealer = resolveAdminDealer(patch.dealerId, nextShipping.province)
    } else if (patch.shipping && patch.shipping.province !== current.shipping.province) {
      const keep = current.dealer ? getDealer(current.dealer.id) : undefined
      nextDealer = keep
        ? snapshotDealer(keep)
        : (defaultDealer(patch.shipping.province) ? snapshotDealer(defaultDealer(patch.shipping.province)!) : null)
    }

    if (nextDelivery === "pickup" && !(nextDealer && nextDealer.services.includes("pickup"))) {
      throw new Error("pickup_unavailable")
    }

    const moneyTouched =
      nextItems !== current.items
      || nextDelivery !== current.deliveryMethod
      || nextShipping.province !== current.shipping.province
    if (moneyTouched && !moneyEditable) throw new Error("money_locked")
    const reopen = (current.status === "declined" || current.status === "expired")
      && (patch.status === "pending_payment" || moneyTouched)
    const nextQuote = moneyTouched
      ? quoteCheckout(nextShipping.province, nextItems, nextDelivery, current.quote.promo?.code)
      : current.quote

    const bits: string[] = []
    return this.update(orderNo, o => {
      if (patch.status === "cancelled") {
        if (o.status === "expired") throw new Error("order_not_cancellable")
        if (o.status !== "cancelled") {
          o.status = "cancelled"
          bits.push("cancelled")
        }
      }
      if (reopen) {
        if (o.status === "paid") throw new Error("order_already_paid")
        if (o.status === "cancelled") throw new Error("order_not_reopenable")
        o.status = "pending_payment"
        o.declined = null
        o.openedAt = nowIso()
        bits.push("reopened for payment")
      }
      if (patch.riskHold === true) {
        o.riskHold = { at: nowIso(), by: patch.by, reason: (patch.riskReason || "Held for review").trim().slice(0, 400) }
        bits.push(`risk hold · ${o.riskHold.reason}`)
      }
      if (patch.riskHold === false && o.riskHold) {
        bits.push("risk hold released")
        o.riskHold = null
      }
      if (patch.fulfillment) {
        if (o.status !== "paid" && o.status !== "cancelled") throw new Error("fulfillment_requires_paid")
        const shippingOn = patch.fulfillment === "processing" || patch.fulfillment === "ready" || patch.fulfillment === "in_transit" || patch.fulfillment === "delivered"
        if (shippingOn && o.riskHold) throw new Error("fulfillment_on_hold")
        if (o.fulfillment !== patch.fulfillment) bits.push(`fulfillment → ${patch.fulfillment}`)
        o.fulfillment = patch.fulfillment
      }
      if (patch.tracking !== undefined) {
        if (patch.tracking === null) {
          o.tracking = null
          bits.push("tracking cleared")
        } else {
          const trackingNo = patch.tracking.trackingNo.trim()
          const tracking: ShipmentTracking = {
            carrier: patch.tracking.carrier?.trim() || undefined,
            trackingNo,
            trackingUrl: patch.tracking.trackingUrl?.trim() || undefined,
            at: nowIso(),
          }
          if (!tracking.trackingUrl) tracking.trackingUrl = trackingHref(tracking)
          o.tracking = tracking
          bits.push(`tracking → ${trackingNo}`)
        }
      }
      if (patch.email && patch.email !== o.email) {
        bits.push(`email → ${patch.email}`)
        o.email = patch.email
      }
      if (patch.phone !== undefined && patch.phone !== o.phone) {
        bits.push("phone")
        o.phone = patch.phone
      }
      if (patch.firstName && patch.firstName !== o.firstName) {
        bits.push(`name → ${patch.firstName}`)
        o.firstName = patch.firstName
      }
      if (patch.notes !== undefined && patch.notes !== o.notes) {
        bits.push("delivery notes")
        o.notes = patch.notes
      }
      if (patch.shipping) {
        bits.push(`ship → ${patch.shipping.city} ${patch.shipping.province}`)
        o.shipping = patch.shipping
      }
      if (patch.billing) {
        bits.push("billing")
        o.billing = patch.billing
      }
      if (nextDelivery !== o.deliveryMethod) {
        bits.push(`delivery → ${nextDelivery}`)
        o.deliveryMethod = nextDelivery
      }
      if (patch.dealerId !== undefined || (nextDealer?.id ?? null) !== (o.dealer?.id ?? null)) {
        bits.push(nextDealer ? `dealer → ${nextDealer.name}` : "dealer → Vanstro direct")
        o.dealer = nextDealer
      }
      if (nextItems !== current.items) {
        bits.push("lines")
        o.items = nextItems
      }
      if (moneyTouched) o.quote = nextQuote
      o.internalNotes = o.internalNotes ?? []
      if (bits.length) {
        o.internalNotes.push({ at: nowIso(), by: patch.by, text: `Updated ${bits.join("; ")}`.slice(0, 2000) })
      }
      if (patch.note?.trim()) {
        o.internalNotes.push({ at: nowIso(), by: patch.by, text: patch.note.trim().slice(0, 2000) })
      }
    })
  }
}

export const orders: OrderRepo = new FileOrderRepo()

/* ------------------------------------------------------------------ helpers */

function resolveAdminDealer(id: string | null, _province: ProvinceCode): DealerSnapshot | null {
  if (id === null) return null
  const d = getDealer(id)
  if (!d) throw new Error("dealer_not_found")
  return snapshotDealer(d)
}

export function firstNameOf(fullName: string, fallbackEmail: string): string {
  const n = fullName.trim().split(/\s+/)[0]
  return n || fallbackEmail.split("@")[0]
}

function toOrderAddress(a: StoredAddress): OrderAddress {
  return { name: a.name, company: a.company, street: a.street, unit: a.unit, city: a.city, province: a.province, postalCode: a.postalCode, phone: a.phone }
}

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

/**
 * Shapes a paid order for the email templates and the invoice PDF. Everything comes from
 * the stored snapshot; `base` is APP_URL so links work in dev and prod.
 */
export function toEmailInput(o: Order, base: string): Omit<OrderConfirmationInput, "invoiceFollows"> {
  if (!o.payment) throw new Error(`order_not_paid:${o.orderNo}`)
  const d = DELIVERY[o.deliveryMethod]
  const placedAt = new Date(o.payment.paidAt)
  return {
    locale: o.locale,
    firstName: o.firstName,
    orderNo: o.orderNo,
    placedAt,
    items: o.items.map(i => ({ sku: i.sku, name: i.name, variant: i.variant, qty: i.qty, unitCents: i.unitCents })),
    totals: {
      subtotalCents: o.quote.subtotalCents,
      discountCents: o.quote.discountCents || undefined,
      promoCode: o.quote.promo?.code,
      freightCents: o.quote.freightCents,
      taxLines: o.quote.tax.lines,
      taxTotalCents: o.quote.tax.taxTotal,
      totalCents: o.quote.totalCents,
      province: o.quote.tax.province,
    },
    delivery: { method: o.deliveryMethod, labelEn: d.labelEn, labelFr: d.labelFr, etaFrom: addDays(placedAt, "etaDays" in d ? d.etaDays[0] : 0), etaTo: addDays(placedAt, "etaDays" in d ? d.etaDays[1] : 0) },
    shipTo: toOrderAddress(o.shipping),
    billTo: toOrderAddress(o.billing),
    payment: {
      brand: o.payment.wallet ? `${o.payment.wallet} · ${o.payment.brand}` : o.payment.brand,
      last4: o.payment.last4,
      authCode: o.payment.authCode,
      referenceNo: o.payment.referenceNo,
      paidAt: placedAt,
    },
    /* Guests have no account page: the signed order-status link works signed out. */
    orderUrl: o.userId ? `${base}/account#orders/${encodeURIComponent(o.orderNo)}` : orderStatusHref(o.orderNo),
    accountUrl: o.userId ? undefined : (() => {
      const t = orderAccessToken(o.orderNo)
      const q = new URLSearchParams({ order: o.orderNo, email: o.email })
      if (t) q.set("t", t)
      return `${base}/account/register?${q}`
    })(),
    dealer: o.dealer,
    tracking: o.tracking ? {
      carrier: o.tracking.carrier,
      trackingNo: o.tracking.trackingNo,
      trackingUrl: o.tracking.trackingUrl || trackingHref(o.tracking),
    } : null,
  }
}

export function toInvoiceInput(o: Order, base: string, bn: { gstHstBn: string; qstBn: string | null }): InvoiceInput {
  if (!o.invoiceNo || !o.invoiceDate) throw new Error(`invoice_not_issued:${o.orderNo}`)
  const invoiceDealer = (() => {
    if (!o.dealer) return null
    const current = getDealer(o.dealer.id)
    if (!current) return o.dealer
    return {
      ...o.dealer,
      street: current.street,
      city: current.city,
      province: current.province,
      postalCode: current.postalCode,
      phone: current.phone,
      email: current.email,
      hoursEn: current.hoursEn,
      hoursFr: current.hoursFr,
      services: current.services,
    }
  })()
  return {
    ...toEmailInput(o, base),
    dealer: invoiceDealer,
    invoiceNo: o.invoiceNo,
    invoiceDate: new Date(o.invoiceDate),
    invoicePdfUrl: invoicePdfHref(o.orderNo),
    gstHstBn: bn.gstHstBn,
    qstBn: (() => {
      if (o.quote.tax.province !== "QC") return null
      if (!bn.qstBn) throw new Error(`invoice_qst_bn_missing:${o.orderNo}`)
      return bn.qstBn
    })(),
  }
}

/** Public shape returned to the browser (confirmation page, account › Orders). No consents/IPs. */
export function publicOrder(o: Order) {
  return {
    orderNo: o.orderNo,
    status: o.status,
    guest: o.userId === null,
    createdAt: o.createdAt,
    locale: o.locale,
    email: o.email,
    phone: o.phone,
    items: o.items,
    deliveryMethod: o.deliveryMethod,
    shipping: o.shipping,
    billing: o.billing,
    seller: o.seller,
    dealer: o.dealer,
    quote: o.quote,
    payment: o.payment && {
      method: o.payment.method, wallet: o.payment.wallet, brand: o.payment.brand, last4: o.payment.last4,
      authCode: o.payment.authCode, referenceNo: o.payment.referenceNo, paidAt: o.payment.paidAt, threeDS: o.payment.threeDS, saved: !!o.payment.vaultToken,
    },
    invoiceNo: o.invoiceNo,
    invoiceDate: o.invoiceDate,
    notifications: o.notifications,
    payChannel: o.paymentMethod === "pos" ? "pos" : "ht",
    pos: o.pos,
    canPushPos: o.paymentMethod === "pos" && o.status === "pending_payment",
    amountPaidCents: amountPaidCents(o),
    balanceCents: Math.max(0, o.quote.totalCents - amountPaidCents(o)),
    payments: ledgerOpen(o).map(p => ({ id: p.id, amountCents: p.amountCents, at: p.at, channel: p.channel, note: p.note ?? null })),
  }
}

/** Ops console: public shape plus fulfillment, notes, attempts (no token hashes). */
export function staffOrder(o: Order) {
  return {
    ...publicOrder(o),
    userId: o.userId,
    claimedAt: o.claimedAt ?? null,
    firstName: o.firstName,
    notes: o.notes,
    fulfillment: o.fulfillment ?? (o.status === "paid" || o.status === "cancelled" ? "unfulfilled" : null),
    internalNotes: o.internalNotes ?? [],
    consents: o.consents,
    declined: o.declined,
    paymentAttempts: (o.paymentAttempts ?? []).map(a => ({ n: a.n, at: a.at, outcome: a.outcome, code: a.code })),
    posTerminalId: o.posTerminalId,
    saveCard: o.saveCard,
    canEditMoney: o.status === "pending_payment" || o.status === "declined" || o.status === "expired",
    canReopen: o.status === "declined" || o.status === "expired",
    riskHold: o.riskHold ?? null,
    erp: o.erp ?? null,
    openedAt: o.openedAt ?? null,
    clientIp: (o.consents || []).map(c => c.ip).find(ip => ip && ip !== "local") || (o.consents || [])[0]?.ip || null,
    statusHref: orderStatusHref(o.orderNo),
  }
}
