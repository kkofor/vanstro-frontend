import { z } from "zod"
import { db, json, sessions } from "../_shared"
import { hashToken, isExpired } from "../../../../lib/tokens"
const schema = z.object({ token: z.string().min(20).max(200) })
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return json({ error: "invalid_request" }, 400)
  const row = await db.tokens.findByHash("verify-email", hashToken(parsed.data.token)); if (!row || row.usedAt) return json({ error: "token_invalid" }, 410)
  if (isExpired(new Date(row.expiresAt))) return json({ error: "token_expired" }, 410)
  const user = await db.users.findById(row.userId); if (!user) return json({ error: "token_invalid" }, 410)
  const now = new Date(); await db.tokens.markUsed(row.hash, now); await db.users.markVerified(user.id, now)
  const { cookie } = await sessions.create(user.id, true, { ua: req.headers.get("user-agent") })
  return json({ ok: true, redirect: "/account", firstName: user.firstName }, 200, { "set-cookie": cookie })
}
