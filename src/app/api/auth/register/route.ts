import { z } from "zod"
import { sendMail } from "../../../../lib/mail"
import { buildLink, issueToken } from "../../../../lib/tokens"
import { verifyEmail } from "../../../../emails"
import { clientIp, db, json, localeFrom, passwords, rateLimit } from "../_shared"
import { passwordIssues } from "../../../../lib/password-policy"
import { dealerByInviteCode, ensureDealers } from "../../../../lib/dealers"

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(60), lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(128),
  acceptTerms: z.literal(true), marketingConsent: z.boolean().default(false), locale: z.enum(["en-CA", "fr-CA"]).optional(),
  role: z.enum(["customer", "dealer"]).default("customer"),
  /** Dealer invites are long-lived; never echo the code back or put it in HTML. */
  inviteCode: z.string().trim().max(40).optional(),
})

export async function POST(req: Request) {
  const ip = clientIp(req)
  if (!rateLimit(`register:${ip}`, 10, 3600)) return json({ error: "rate_limited" }, 429)
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: "invalid_request", issues: parsed.error.flatten().fieldErrors }, 400)
  const b = parsed.data; const locale = b.locale ?? localeFrom(req)
  const pwIssues = passwordIssues(b.password)
  if (pwIssues.length) return json({ error: "invalid_request", issues: { password: pwIssues } }, 400)
  if (await db.users.findByEmail(b.email)) return json({ error: "email_exists" }, 409)
  let dealerId: string | null = null
  if (b.role === "dealer") {
    await ensureDealers()
    const dealer = dealerByInviteCode(b.inviteCode || "")
    if (!dealer) return json({ error: "invalid_invite" }, 400)
    dealerId = dealer.id
  }
  let user
  try {
    user = await db.users.create({ email: b.email, firstName: b.firstName, lastName: b.lastName, locale, passwordHash: await passwords.hash(b.password), role: b.role, dealerId, marketingConsent: b.marketingConsent })
  } catch (error) {
    if (error instanceof Error && error.message === "email_exists") return json({ error: "email_exists" }, 409)
    throw error
  }
  const token = issueToken("verify-email")
  await db.tokens.upsert({ userId: user.id, purpose: "verify-email", hash: token.hash, expiresAt: token.expiresAt.toISOString(), usedAt: null })
  const mail = verifyEmail({ locale, firstName: user.firstName, link: buildLink("/verify-email", token.raw) })
  try { await sendMail({ to: user.email, tag: `verify:${user.id}`, ...mail }) } catch (error) { console.error("[mail] verify failed", user.id, error) }
  return json({ user: { id: user.id, displayName: `${user.firstName} ${user.lastName}`.trim() }, status: "pending_verification" }, 201)
}
