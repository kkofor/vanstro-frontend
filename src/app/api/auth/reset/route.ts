import { z } from "zod"
import { db, json, passwords, sessions } from "../_shared"
import { hashToken, isExpired, issueToken } from "../../../../lib/tokens"
import { passwordIssues } from "../../../../lib/password-policy"
const schema = z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128), signOutOthers: z.boolean().default(true) })
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return json({ error: "invalid_request", issues: parsed.error.flatten().fieldErrors }, 400)
  const { token, password } = parsed.data; const row = await db.tokens.findByHash("reset-password", hashToken(token)); if (!row || row.usedAt) return json({ error: "reset_invalid" }, 410); if (isExpired(new Date(row.expiresAt))) return json({ error: "reset_expired" }, 410)
  const user = await db.users.findById(row.userId); if (!user) return json({ error: "reset_invalid" }, 410)
  const pwIssues = passwordIssues(password)
  if (pwIssues.length) return json({ error: "invalid_request", issues: { password: pwIssues } }, 400)
  const hash = await passwords.hash(password); await db.users.setPassword(user.id, hash); await db.passwordHistory.push(user.id, hash); await db.tokens.markUsed(row.hash, new Date()); await db.tokens.deleteFor(user.id, "reset-password")
  const freeze = issueToken("freeze-account"); await db.tokens.upsert({ userId: user.id, purpose: "freeze-account", hash: freeze.hash, expiresAt: freeze.expiresAt.toISOString(), usedAt: null }); await sessions.revokeAll(user.id); const { cookie } = await sessions.create(user.id, true, { ua: req.headers.get("user-agent") })
  return json({ ok: true, signedOutOthers: parsed.data.signOutOthers }, 200, { "set-cookie": cookie })
}
