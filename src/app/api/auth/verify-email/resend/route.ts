import { z } from "zod"
import { clientIp, db, json, rateLimit } from "../../_shared"
import { buildLink, issueToken } from "../../../../../lib/tokens"
import { verifyEmail } from "../../../../../emails"
import { sendMail } from "../../../../../lib/mail"
const schema = z.object({ email: z.string().trim().toLowerCase().email() })
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return json({ error: "invalid_request" }, 400)
  const { email } = parsed.data; if (!rateLimit(`verify-resend:${email}`, 1, 60) || !rateLimit(`verify-resend-ip:${clientIp(req)}`, 20, 3600)) return json({ error: "rate_limited" }, 429)
  const user = await db.users.findByEmail(email)
  if (user && !user.emailVerifiedAt) { const token = issueToken("verify-email"); await db.tokens.upsert({ userId: user.id, purpose: "verify-email", hash: token.hash, expiresAt: token.expiresAt.toISOString(), usedAt: null }); const mail = verifyEmail({ locale: user.locale, firstName: user.firstName, link: buildLink("/verify-email", token.raw) }); sendMail({ to: user.email, tag: `verify:${user.id}`, ...mail }).catch(() => {}) }
  return json({ ok: true }, 202)
}
