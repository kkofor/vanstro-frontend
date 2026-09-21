/**
 * lib/auth.ts — session lookup for API routes.
 *
 * Production: replace `auth()` with the real session store (the cookie set by /api/auth/*).
 * `x-vs-user` is a prototype header only — do not ship it as production auth.
 * DEV_DEMO_USER (Guannan demo) is ignored unless APP_URL is localhost.
 */
import { db } from "./users"
import { sessionUser } from "./sessions"
import { terminalIdForDealer } from "./terminals"
import { listDealers } from "./dealers"

export type AccountRole = "customer" | "dealer" | "staff"

export interface Session {
  userId: string
  email: string
  name: string
  role: AccountRole
  dealerId: string | null
  terminalId: string | null
  emailVerifiedAt: string | null
}

export async function auth(req?: Request): Promise<Session | null> {
  if (!req) return null
  if (req.headers.get("x-vs-guest") === "1") return null
  const user = await sessionUser(req)
  if (!user) return null
  const role = user.role === "dealer" ? "dealer" : "customer"
  let dealerId = role === "dealer" ? (user.dealerId ?? null) : null
  if (role === "dealer" && !dealerId) {
    const email = user.email.trim().toLowerCase()
    const match = listDealers({ includeDisabled: true }).find(d => d.email.trim().toLowerCase() === email)
    dealerId = match?.id ?? null
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
  return { userId: user.id, email: user.email, name, role, dealerId, terminalId: dealerId ? terminalIdForDealer(dealerId) : null, emailVerifiedAt: user.emailVerifiedAt ?? null }
}

export { db }
