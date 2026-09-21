/**
 * Ops risk scoring from order + payment facts already on disk.
 * Never uses PAN / CVV. last4 + email/IP velocity only.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { DECLINE_MESSAGES } from "./checkout"
import type { Order } from "./orders"

export type RiskLevel = "clear" | "review" | "high"

export interface RiskSignal {
  id: string
  level: "review" | "high"
  label: string
}

export interface RiskAssessment {
  score: number
  level: RiskLevel
  signals: RiskSignal[]
}

export interface RiskHold {
  at: string
  by: string
  reason: string
}

export interface RiskBlock {
  email: string
  at: string
  by: string
  reason: string
}

export interface RiskStore {
  holds: Record<string, RiskHold>
  blocks: Record<string, RiskBlock>
}

const FILE = process.env.RISK_FILE ?? join(process.cwd(), "data", "risk.json")
let store: RiskStore = { holds: {}, blocks: {} }
let ready: Promise<void> | null = null

function nowIso() { return new Date().toISOString() }

async function load() {
  try {
    const raw = JSON.parse(await readFile(FILE, "utf8")) as Partial<RiskStore>
    store = { holds: raw.holds ?? {}, blocks: raw.blocks ?? {} }
  } catch {
    store = { holds: {}, blocks: {} }
  }
}

export function ensureRisk() {
  ready ??= load()
  return ready
}

async function persist() {
  await mkdir(dirname(FILE), { recursive: true })
  const tmp = FILE + ".tmp"
  await writeFile(tmp, JSON.stringify(store, null, 2))
  await rename(tmp, FILE)
}

export async function getRiskStore(): Promise<RiskStore> {
  await ensureRisk()
  return { holds: { ...store.holds }, blocks: { ...store.blocks } }
}

export async function isEmailBlocked(email: string): Promise<boolean> {
  await ensureRisk()
  return !!store.blocks[email.trim().toLowerCase()]
}

export async function setEmailBlock(email: string, by: string, reason: string, on: boolean): Promise<RiskStore> {
  await ensureRisk()
  const key = email.trim().toLowerCase()
  if (!key.includes("@")) throw new Error("invalid_email")
  if (on) store.blocks[key] = { email: key, at: nowIso(), by, reason: reason.trim().slice(0, 400) || "Blocked by ops" }
  else delete store.blocks[key]
  await persist()
  return getRiskStore()
}

export async function setRiskHoldRecord(orderNo: string, hold: RiskHold | null): Promise<void> {
  await ensureRisk()
  if (hold) store.holds[orderNo] = hold
  else delete store.holds[orderNo]
  await persist()
}

export function declineLabel(code: string | undefined): string {
  if (!code) return "—"
  const m = DECLINE_MESSAGES[code]
  if (m) return `${code} · ${m.en}`
  if (/^\d{3}$/.test(code) && Number(code) < 50) return `${code} · approved`
  return code
}

function normName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function hoursAgo(iso: string, h: number) {
  return Date.parse(iso) >= Date.now() - h * 3600 * 1000
}

function orderIp(o: Order) {
  return (o.consents || []).map(c => c.ip).find(ip => ip && ip !== "local") || (o.consents || [])[0]?.ip || null
}

export function assessRisk(order: Order, all: Order[], risk: RiskStore): RiskAssessment {
  const signals: RiskSignal[] = []
  const add = (id: string, level: "review" | "high", label: string) => {
    if (!signals.some(s => s.id === id)) signals.push({ id, level, label })
  }

  const attempts = order.paymentAttempts ?? []
  const declinedN = attempts.filter(a => a.outcome === "declined").length
  if (declinedN >= 4) add("attempt_storm", "high", `${declinedN} declined card attempts on this order`)
  else if (declinedN >= 2) add("attempt_retry", "review", `${declinedN} declined attempts before ${order.status}`)

  const unresolved = attempts.find(a => a.outcome === "pending" || (a.outcome === "error" && a.code !== "token_rejected"))
  if (unresolved && order.status !== "paid" && order.status !== "cancelled") {
    add("unresolved", "high", `Attempt #${unresolved.n} is still ${unresolved.outcome} (${unresolved.code || "no code"}) — do not retry payment`)
  }

  const lastDecline = [...attempts].reverse().find(a => a.outcome === "declined")
  if (lastDecline?.code === "076") add("nsf", "review", "Issuer 076 — insufficient funds")
  if (lastDecline?.code === "051") add("expired_card", "review", "Issuer 051 — expired card")
  if (attempts.some(a => a.code === "token_rejected" || a.code === "bad_token")) {
    add("token", "review", "Card token timed out or was rejected")
  }

  const total = order.payment?.amountCents ?? order.quote.totalCents
  if (total >= 800_000) add("very_high_ticket", "high", `Ticket ${fmt(total)}`)
  else if (total >= 300_000) add("high_ticket", "review", `Ticket ${fmt(total)}`)
  if (order.userId === null && total >= 200_000) add("guest_high", "high", `Guest checkout at ${fmt(total)}`)

  if (order.shipping.province !== order.billing.province) {
    add("prov_mismatch", "high", `Ship ${order.shipping.province} · bill ${order.billing.province}`)
  }
  const sn = normName(order.shipping.name || "")
  const bn = normName(order.billing.name || "")
  if (sn && bn && sn !== bn && !sn.includes(bn.split(" ")[0] || "___") && !bn.includes(sn.split(" ")[0] || "___")) {
    add("name_mismatch", "review", `Ship “${order.shipping.name}” · bill “${order.billing.name}”`)
  }

  const email = order.email.trim().toLowerCase()
  const recentEmail = all.filter(o => o.email.trim().toLowerCase() === email && hoursAgo(o.createdAt, 24))
  if (recentEmail.length >= 3) add("vel_email", "high", `${recentEmail.length} orders from this email in 24h`)

  const ip = orderIp(order)
  if (ip && ip !== "local") {
    const recentIp = all.filter(o => orderIp(o) === ip && hoursAgo(o.createdAt, 24))
    if (recentIp.length >= 3) add("vel_ip", "review", `${recentIp.length} orders from IP ${ip} in 24h`)
  }

  const last4 = order.payment?.last4
  if (last4) {
    const sameCard = all.filter(o => o.payment?.last4 === last4)
    const paidWithCard = all.filter(o => o.payment?.last4)
    const share = paidWithCard.length ? sameCard.length / paidWithCard.length : 0
    // Skip the store-wide test last4 (e.g. mock 4242 on most paid orders).
    if (share < 0.25) {
      const emails = new Set(sameCard.map(o => o.email.trim().toLowerCase()))
      if (emails.size >= 3) add("last4_spread", "high", `Card •••• ${last4} used on ${emails.size} emails`)
      else if (emails.size === 2) add("last4_reuse", "review", `Card •••• ${last4} on a second email`)
    }
  }

  const emailPaid = all.filter(o => o.email.trim().toLowerCase() === email && o.payment?.last4)
  const cards = new Set(emailPaid.map(o => o.payment!.last4))
  if (cards.size >= 3) add("many_cards", "high", `This email paid with ${cards.size} different last-4s`)

  if (order.status === "paid" && order.payment && !order.payment.threeDS && total >= 300_000) {
    add("no_3ds", "review", "Paid without 3-D Secure on a high ticket")
  }

  const hold = order.riskHold ?? risk.holds[order.orderNo]
  if (hold) add("held", "high", `Ops hold · ${hold.reason}`)
  if (risk.blocks[email]) add("blocked", "high", `Email is blocked from new checkout`)

  const score = Math.min(100, signals.reduce((s, x) => s + (x.level === "high" ? 28 : 14), 0))
  const level: RiskLevel = hold || signals.some(s => s.level === "high") && score >= 28
    ? (hold || score >= 40 || signals.filter(s => s.level === "high").length >= 2 ? "high" : "review")
    : signals.length ? "review" : "clear"
  const forced = hold ? "high" : level
  return { score, level: forced, signals }
}

function fmt(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100)
}

export function winnipegDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Winnipeg" })
}

export function inWindow(iso: string, window: "today" | "7d" | "all") {
  if (window === "all") return true
  const t = Date.parse(iso)
  if (window === "today") return winnipegDay(iso) === winnipegDay(new Date().toISOString())
  return t >= Date.now() - 7 * 24 * 3600 * 1000
}
