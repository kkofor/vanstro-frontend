import type { Locale } from "../../../lib/mail"
import { db } from "../../../lib/users"
import { passwords } from "../../../lib/passwords"
import { sessions } from "../../../lib/sessions"
import { clientIp as requestIp, rateLimit as windowRateLimit } from "../../../lib/rate-limit"

export interface UserRow {
  id: string
  email: string
  firstName: string
  lastName: string
  locale: Locale
  emailVerifiedAt: string | null
  passwordHash: string | null
  role: "customer" | "dealer"
}
export function localeFrom(req: Request, fallback: Locale = "en-CA"): Locale {
  return /^fr\b/i.test(req.headers.get("accept-language") ?? "") ? "fr-CA" : fallback
}
export function clientIp(req: Request): string { return requestIp(req) }
export function json(body: unknown, status = 200, headers?: HeadersInit) { return Response.json(body, { status, headers }) }
export const rateLimit = async (key: string, max: number, windowSec: number) => windowRateLimit(key, max, windowSec)
export async function describeRequest(_req: Request): Promise<string | undefined> { return undefined }
export { db, passwords, sessions }
