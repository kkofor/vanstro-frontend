/**
 * One-time tokens for email verification and password reset.
 *
 * Rules (see docs/07-register.md, docs/03-forgot-password.md):
 *  - 32 random bytes, base64url in the link. Only the SHA-256 hash is stored.
 *  - verify-email: 24 h TTL.  reset-password: 15 min TTL, single use.
 *  - Issuing a new token invalidates any previous one for the same purpose + user.
 *  - Lookups are by hash; comparison is constant-time.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export type TokenPurpose = "verify-email" | "reset-password" | "freeze-account" | "claim-order"

export const TOKEN_TTL_SEC: Record<TokenPurpose, number> = {
  "verify-email": 24 * 60 * 60,
  "reset-password": 15 * 60,
  "freeze-account": 30 * 60,
  "claim-order": 30 * 60,
}

export interface IssuedToken {
  /** Raw value to embed in the link. Never persist. */
  raw: string
  /** SHA-256 hex of raw. Persist this. */
  hash: string
  expiresAt: Date
}

export function issueToken(purpose: TokenPurpose, now = new Date()): IssuedToken {
  const raw = randomBytes(32).toString("base64url")
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(now.getTime() + TOKEN_TTL_SEC[purpose] * 1000),
  }
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex")
}

/** Constant-time compare of a presented raw token against a stored hash. */
export function tokenMatches(raw: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(raw), "hex")
  const b = Buffer.from(storedHash, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

export function isExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime()
}

export function buildLink(path: "/verify-email" | "/reset-password" | "/security/freeze" | "/claim-order", raw: string): string {
  const base = (process.env.APP_URL ?? "https://www.vanstro.ca").replace(/\/$/, "")
  return `${base}${path}?token=${encodeURIComponent(raw)}`
}
