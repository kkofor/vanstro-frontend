import { z } from "zod"
import { sendMail } from "../../../../lib/mail"
import { buildLink, issueToken } from "../../../../lib/tokens"
import { resetPassword } from "../../../../emails"
import { clientIp, db, json, rateLimit } from "../_shared"
const schema = z.object({ email: z.string().trim().toLowerCase().email() })
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return json({ error: "invalid_request" }, 400)
  const { email } = parsed.data; const ip = clientIp(req)
  if (!rateLimit(`forgot:${email}`, 3, 3600) || !rateLimit(`forgot-ip:${ip}`, 10, 3600)) return json({ error: "rate_limited" }, 429)
  const user = await db.users.findByEmail(email)
  if (user) { const token = issueToken("reset-password"); await db.tokens.upsert({ userId: user.id, purpose: "reset-password", hash: token.hash, expiresAt: token.expiresAt.toISOString(), usedAt: null }); const mail = resetPassword({ locale: user.locale, firstName: user.firstName, link: buildLink("/reset-password", token.raw), requestedAt: new Date(), requestContext: undefined }); sendMail({ to: user.email, tag: `reset:${user.id}`, ...mail }).catch(() => {}) }
  return json({ ok: true, resendAfterSec: 52 }, 202)
}
