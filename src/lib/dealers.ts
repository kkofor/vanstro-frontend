/**
 * lib/dealers.ts — participating independent local dealers.
 *
 * Business model (www.vanstro.ca/dealer-services-and-responsibility, v2026-1.3):
 *  • Vanstro Global Supply Inc. is the Seller of the products: catalog, pricing, checkout,
 *    product policy, taxes and the tax invoice.
 *  • The dealer selected for an order is an independent business. It is the customer's
 *    first point of contact for pickup, delivery coordination, returns/exchanges and
 *    after-sales help. Dealer Services (installation, measurement, design, disposal…)
 *    are quoted, scheduled, invoiced and collected by the dealer, never by checkout.
 *  • A customer whose province has no participating dealer is fulfilled directly by
 *    Vanstro (dealer = null) and pickup is unavailable.
 *
 * The disclosure MUST be shown before payment (checkout step 1 + a required acknowledgment
 * at step 2) and repeated on the confirmation page, the order emails and the invoice.
 *
 * Production reads this build-time snapshot. NOTE: `account-ux/scripts/generate-dealers.mts`
 * only writes `account-ux/shadcn/lib/dealers-snapshot.json`, NOT this file
 * (`src/lib/dealers-snapshot.json`) — the two snapshot files must currently be kept in
 * lockstep by hand; there is no generator or sync step for this one.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { randomBytes } from "node:crypto"
import type { ProvinceCode } from "./tax"
import dealerSnapshot from "./dealers-snapshot.json"

export const DEALER_SERVICES = ["pickup", "delivery", "installation", "measurement", "design", "disposal"] as const
export type DealerService = typeof DEALER_SERVICES[number]

export interface Dealer {
  id: string
  code: string            // public dealer code shown on the map, e.g. "MB10"
  /** Private invite issued by Vanstro. Long-lived (no expiry). Never write a real code into any frontend asset. */
  inviteCode: string
  name: string
  street: string
  city: string
  province: ProvinceCode
  postalCode: string
  phone: string           // display format is supplied by the directory snapshot
  email: string
  hoursEn: string
  hoursFr: string
  services: DealerService[]
  areaEn: string
  areaFr: string
  /** Hidden from checkout / invite. Existing order snapshots stay as they were. */
  disabled?: boolean
  /** ERP Account id (e.g. MB01) — sent as `accountId`. */
  erpAccountId?: string
  /** ERP / Espo User id — sent as `userId` on POS orders. */
  erpUserId?: string
}

const DEALER_SEED: Dealer[] = dealerSnapshot as Dealer[]

function cloneDealer(d: Dealer): Dealer {
  return { ...d, services: [...d.services] }
}

/** Live directory. Seed first; `ensureDealers()` merges `data/dealers.json`. Mutated in place so older `DEALERS` imports stay current. */
export const DEALERS: Dealer[] = DEALER_SEED.map(cloneDealer)

export const SERVICE_LABEL: Record<DealerService, { en: string; fr: string }> = {
  pickup: { en: "Pickup", fr: "Ramassage" },
  delivery: { en: "Local delivery", fr: "Livraison locale" },
  installation: { en: "Installation", fr: "Installation" },
  measurement: { en: "Site measurement", fr: "Mesure sur place" },
  design: { en: "Design consultation", fr: "Consultation design" },
  disposal: { en: "Removal & disposal", fr: "Enlèvement et élimination" },
}

export const DEALER_POLICY_URL = "https://www.vanstro.ca/dealer-services-and-responsibility/"
export const DEALER_MAP_URL = "https://www.vanstro.ca/dealers/map/"

export function dealersFor(province: ProvinceCode): Dealer[] {
  return listDealers().filter(d => d.province === province)
}

export function getDealer(id: string, opts?: { includeDisabled?: boolean }): Dealer | undefined {
  const d = DEALERS.find(x => x.id === id)
  if (!d) return undefined
  if (d.disabled && !opts?.includeDisabled) return undefined
  return d
}

/** Vanstro-issued invite for dealer self-serve sign-up. Case-insensitive; hyphens optional. */
export function dealerByInviteCode(raw: string): Dealer | undefined {
  const n = raw.trim().toUpperCase().replace(/[\s-]+/g, "")
  if (!n) return undefined
  return listDealers().find(d => d.inviteCode.replace(/-/g, "") === n)
}

export function listDealers(opts?: { includeDisabled?: boolean }): Dealer[] {
  return (opts?.includeDisabled ? DEALERS : DEALERS.filter(d => !d.disabled)).map(cloneDealer)
}

/** Default assignment when the customer has not picked one: first participating dealer in the shipping province. */
export function defaultDealer(province: ProvinceCode): Dealer | null {
  return dealersFor(province)[0] ?? null
}

export function dealerAddress(d: Pick<Dealer, "street" | "city" | "province" | "postalCode">): string {
  return `${d.street}, ${d.city} ${d.province} ${d.postalCode}`
}

/** tel: href, +1 implied. */
export function dealerTel(d: Pick<Dealer, "phone">): string {
  return `tel:+1${d.phone.replace(/\D/g, "")}`
}

/**
 * Snapshot stored on the order at creation. Orders keep the dealer as it was at purchase
 * time (name/contact may change later); emails and the invoice render from this snapshot.
 */
export type DealerSnapshot = Pick<Dealer, "id" | "code" | "name" | "street" | "city" | "province" | "postalCode" | "phone" | "email" | "hoursEn" | "hoursFr" | "services">

export function snapshotDealer(d: Dealer): DealerSnapshot {
  const { id, code, name, street, city, province, postalCode, phone, email, hoursEn, hoursFr, services } = d
  return { id, code, name, street, city, province, postalCode, phone, email, hoursEn, hoursFr, services }
}

/* ---------- disclosure copy (single source for checkout, emails, PDF) ---------- */

export const DEALER_COPY = {
  "en-CA": {
    badge: "Independent dealer",
    seller: "Seller: Vanstro Global Supply Inc.",
    intro: (name: string) => `${name} is an independent local dealer, separately owned and operated. The products on this order are sold by Vanstro Global Supply Inc., shown as the Seller on your invoice.`,
    dealerHandles: "Your dealer handles",
    dealerList: ["Pickup and delivery coordination", "Order communication and handoff", "Returns, exchanges and after-sales help (first point of contact)", "Dealer Services such as installation or measurement (quoted and billed separately)"],
    vanstroHandles: "Vanstro handles",
    vanstroList: ["Catalog, product pricing and checkout", "Product supply and product information", "Product policy, warranty and escalations", "Taxes and the tax invoice for the product sale"],
    boundary: "Dealer Services are not included in this order total. The dealer sets their scope, price and schedule and collects payment for them directly.",
    noDealer: "No participating dealer in your province yet. Vanstro Global Supply Inc. is the Seller and fulfils this order directly from Winnipeg. For pickup, delivery, returns and after-sales help contact support@vanstro.ca or 204 221 2288.",
    ack: (name: string) => `I understand ${name} is an independent local dealer and my first contact for pickup, delivery coordination, returns and after-sales help, and that any Dealer Services (installation, measurement, etc.) are agreed and paid separately with the dealer.`,
    invoiceNote: (name: string) => `${name} is an independent local dealer and your first contact for pickup, delivery coordination, returns and after-sales help. Dealer Services (installation, measurement, etc.) are not part of this invoice and are quoted and billed separately by the dealer.`,
    policyLink: "How responsibilities are split",
  },
  "fr-CA": {
    badge: "Détaillant indépendant",
    seller: "Vendeur : Vanstro Global Supply Inc.",
    intro: (name: string) => `${name} est un détaillant local indépendant, dont la propriété et l’exploitation sont distinctes de Vanstro. Les produits de cette commande sont vendus par Vanstro Global Supply Inc., identifiée comme vendeur sur votre facture.`,
    dealerHandles: "Votre détaillant s’occupe de",
    dealerList: ["Ramassage et coordination de la livraison", "Communication sur la commande et remise des produits", "Retours, échanges et service après-vente (premier contact)", "Services du détaillant : installation, mesure, etc. (devis et facturation séparés)"],
    vanstroHandles: "Vanstro s’occupe de",
    vanstroList: ["Catalogue, prix des produits et paiement", "Approvisionnement et information produit", "Politique produit, garantie et escalades", "Taxes et facture pour la vente des produits"],
    boundary: "Les services du détaillant ne sont pas inclus dans le total de cette commande. Le détaillant en fixe la portée, le prix et l’horaire et en perçoit le paiement directement.",
    noDealer: "Aucun détaillant participant dans votre province pour l’instant. Vanstro Global Supply Inc. est le vendeur et exécute cette commande directement depuis Winnipeg. Pour le ramassage, la livraison, les retours et le service après-vente, écrivez à support@vanstro.ca ou appelez le 204 221 2288.",
    ack: (name: string) => `Je comprends que ${name} est un détaillant local indépendant et mon premier contact pour le ramassage, la coordination de la livraison, les retours et le service après-vente, et que tout service du détaillant (installation, mesure, etc.) est convenu et payé séparément avec le détaillant.`,
    invoiceNote: (name: string) => `${name} est un détaillant local indépendant et votre premier contact pour le ramassage, la coordination de la livraison, les retours et le service après-vente. Les services du détaillant (installation, mesure, etc.) ne font pas partie de cette facture; ils sont devisés et facturés séparément par le détaillant.`,
    policyLink: "Partage des responsabilités",
  },
} as const

/* ------------------------------------------------------------------ staff overlay (data/dealers.json) */

const DEALER_FILE = process.env.DEALERS_FILE ?? join(process.cwd(), "data", "dealers.json")
const PROVINCE_OK = new Set<string>(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"])
const ID_RE = /^[A-Z]{2}-[A-Z0-9]{2,16}$/
const CODE_RE = /^[A-Z]{2}\d{2}$/
const INVITE_RE = /^VS-[A-Z0-9-]{6,28}$/

type DealerRecord = Partial<Dealer> & { id: string }
let records: Record<string, DealerRecord> = {}
let dealersReady: Promise<void> | null = null

function replaceLive(next: Dealer[]) {
  DEALERS.length = 0
  DEALERS.push(...next)
}

function rebuild() {
  const byId = new Map(DEALER_SEED.map(d => [d.id, cloneDealer(d)]))
  for (const [id, rec] of Object.entries(records)) {
    const base = byId.get(id)
    if (base) {
      byId.set(id, normalizeDealer({ ...base, ...rec, id }))
    } else {
      try { byId.set(id, normalizeDealer({ ...rec, id })) }
      catch { /* skip incomplete extra rows */ }
    }
  }
  replaceLive([...byId.values()])
}

function normalizeInvite(raw: string) {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, "")
}

function normalizeDealer(input: Partial<Dealer> & { id: string }): Dealer {
  const id = input.id.trim().toUpperCase()
  if (!ID_RE.test(id)) throw new Error("invalid_dealer_id")
  const province = (input.province || "").toUpperCase() as ProvinceCode
  if (!PROVINCE_OK.has(province)) throw new Error("invalid_province")
  const code = (input.code || "").trim().toUpperCase()
  if (!CODE_RE.test(code)) throw new Error("invalid_dealer_code")
  if (code.slice(0, 2) !== province) throw new Error("dealer_code_province")
  const inviteCode = (input.inviteCode || "").trim().toUpperCase()
  if (!INVITE_RE.test(inviteCode)) throw new Error("invalid_invite")
  const services = (input.services || []).filter((s): s is DealerService => (DEALER_SERVICES as readonly string[]).includes(s))
  if (!services.length) throw new Error("invalid_services")
  const name = (input.name || "").trim()
  const street = (input.street || "").trim()
  const city = (input.city || "").trim()
  const postalCode = (input.postalCode || "").trim().toUpperCase()
  const phone = (input.phone || "").trim()
  const email = (input.email || "").trim().toLowerCase()
  if (!name || !street || !city || !postalCode || !phone || !email || !email.includes("@")) throw new Error("invalid_dealer")
  return {
    id, code, inviteCode, name, street, city, province, postalCode, phone, email,
    hoursEn: (input.hoursEn || "").trim() || "Mon–Fri 9 a.m.–5 p.m.",
    hoursFr: (input.hoursFr || "").trim() || (input.hoursEn || "").trim() || "Lun–Ven 9 h–17 h",
    services,
    areaEn: (input.areaEn || "").trim() || city,
    areaFr: (input.areaFr || "").trim() || (input.areaEn || "").trim() || city,
    disabled: !!input.disabled,
    erpAccountId: optEspoId(input.erpAccountId),
    erpUserId: optEspoId(input.erpUserId),
  }
}

/** ERP Account / User id (MB01, or an Espo entity id). Rejects prototype `usr_*`. Empty clears. */
function optEspoId(raw?: string | null): string | undefined {
  const v = (raw ?? "").trim()
  if (!v) return undefined
  if (/^usr_/i.test(v) || !/^[a-zA-Z0-9]{2,24}$/.test(v)) throw new Error("invalid_erp_id")
  return v
}

async function persistDealers() {
  await mkdir(dirname(DEALER_FILE), { recursive: true })
  const tmp = DEALER_FILE + ".tmp"
  await writeFile(tmp, JSON.stringify({ updatedAt: new Date().toISOString(), records }, null, 2))
  await rename(tmp, DEALER_FILE)
}

async function loadDealers() {
  try {
    const raw = JSON.parse(await readFile(DEALER_FILE, "utf8")) as { records?: Record<string, DealerRecord> }
    records = raw.records && typeof raw.records === "object" ? raw.records : {}
  } catch {
    records = {}
  }
  rebuild()
}

export function ensureDealers() {
  dealersReady ??= loadDealers()
  return dealersReady
}
void ensureDealers()

function assertUnique(next: Dealer, ignoreId?: string) {
  const inviteN = normalizeInvite(next.inviteCode)
  for (const d of DEALERS) {
    if (ignoreId && d.id === ignoreId) continue
    if (d.id === next.id) throw new Error("dealer_id_taken")
    if (d.code === next.code) throw new Error("dealer_code_taken")
    if (normalizeInvite(d.inviteCode) === inviteN) throw new Error("invite_taken")
  }
}

export type DealerWrite = Partial<Dealer> & { id?: string }

export async function upsertDealer(input: DealerWrite, _by: string): Promise<Dealer> {
  await ensureDealers()
  const creating = !input.id || !getDealer(input.id, { includeDisabled: true })
  const id = creating
    ? (input.id?.trim().toUpperCase() || suggestDealerId(input.province, input.name))
    : input.id!.trim().toUpperCase()
  const prev = getDealer(id, { includeDisabled: true })
  const merged = normalizeDealer({
    ...(prev ?? {}),
    ...input,
    id,
    inviteCode: input.inviteCode || prev?.inviteCode || suggestInvite(input.code || prev?.code || `${(input.province || "MB")}10`),
    code: input.code || prev?.code,
    province: input.province || prev?.province,
    services: input.services || prev?.services,
    erpAccountId: input.erpAccountId !== undefined ? input.erpAccountId : prev?.erpAccountId,
    erpUserId: input.erpUserId !== undefined ? input.erpUserId : prev?.erpUserId,
  })
  assertUnique(merged, creating ? undefined : id)
  records[id] = merged
  rebuild()
  await persistDealers()
  return cloneDealer(getDealer(id, { includeDisabled: true })!)
}

function suggestDealerId(province?: string, name?: string) {
  const p = (province || "XX").toUpperCase().slice(0, 2)
  const slug = (name || "NEW").replace(/[^A-Za-z0-9]+/g, "").slice(0, 8).toUpperCase() || "NEW"
  let id = `${p}-${slug}`
  let n = 2
  while (getDealer(id, { includeDisabled: true })) id = `${p}-${slug}${n++}`
  return id
}

function suggestInvite(code: string) {
  return `VS-${code.toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`
}

export function publicDealer(d: Dealer) {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    street: d.street,
    city: d.city,
    province: d.province,
    postalCode: d.postalCode,
    phone: d.phone,
    email: d.email,
    hoursEn: d.hoursEn,
    hoursFr: d.hoursFr,
    services: d.services,
    areaEn: d.areaEn,
    areaFr: d.areaFr,
  }
}
