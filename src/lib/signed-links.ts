/**
 * HMAC tokens for callbacks and email links that cannot send x-vs-user.
 * Set VANSTRO_LINK_SECRET in production. Localhost gets a default in load-env.mts.
 */
import { createHmac, timingSafeEqual } from "node:crypto"

export function isLocalAppUrl(): boolean {
  const raw = process.env.APP_URL
  if (!raw) return true
  try {
    const h = new URL(raw).hostname
    return h === "localhost" || h === "127.0.0.1" || h === "::1"
  } catch {
    return false
  }
}

export function linkSecret(): string | null {
  const s = process.env.VANSTRO_LINK_SECRET?.trim()
  return s || null
}

export function signLink(purpose: string, payload: string): string | null {
  const s = linkSecret()
  if (!s) return null
  return createHmac("sha256", s).update(`${purpose}:${payload}`).digest("hex")
}

export function verifyLink(purpose: string, payload: string, token: string | null | undefined): boolean {
  const expect = signLink(purpose, payload)
  if (!expect || !token) return false
  const a = Buffer.from(expect, "utf8")
  const b = Buffer.from(token, "utf8")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** HMAC plus unix expiry: `<mac>.<exp>`. Used for guest order-access links. */
export function signLinkTimed(purpose: string, payload: string, ttlSec: number): string | null {
  const exp = Math.floor(Date.now() / 1000) + ttlSec
  const mac = signLink(purpose, `${payload}:${exp}`)
  return mac ? `${mac}.${exp}` : null
}

export function verifyLinkTimed(purpose: string, payload: string, token: string | null | undefined): boolean {
  if (!token) return false
  const i = token.lastIndexOf(".")
  if (i <= 0) return false
  const exp = Number(token.slice(i + 1))
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  return verifyLink(purpose, `${payload}:${exp}`, token.slice(0, i))
}

export function appBase(): string {
  return (process.env.APP_URL ?? "http://localhost:8787").replace(/\/$/, "")
}

export function goPostbackUrl(orderNo: string): string | null {
  const t = signLink("go-postback", orderNo)
  if (!t) return null
  return `${appBase()}/api/checkout/moneris/go/postback?o=${encodeURIComponent(orderNo)}&t=${t}`
}

export function invoicePdfHref(orderNo: string): string {
  const path = `/api/orders/${encodeURIComponent(orderNo)}/invoice.pdf`
  const t = signLink("invoice", orderNo)
  return t ? `${appBase()}${path}?t=${t}` : `${appBase()}${path}`
}
