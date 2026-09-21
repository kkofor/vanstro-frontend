import { z } from "zod"
import { db, json, passwords, rateLimit, sessions } from "../_shared"
import { clientIp } from "../_shared"

const schema = z.object({ identifier: z.string().trim().min(1), password: z.string().min(1), remember: z.boolean().optional() })
export async function POST(req: Request) {
  const ip = clientIp(req); const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: "invalid_request" }, 400)
  const { identifier, password } = parsed.data; const normalized = identifier.trim().toLowerCase()
  if (!rateLimit(`login:${ip}:${normalized}`, 5, 900)) return json({ error: "locked", retryAfter: 900 }, 423, { "retry-after": "900" })
  const user = await db.users.findByEmail(normalized)
  if (!user) return json({ error: "invalid_credentials" }, 401)
  if (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) { const retry = Math.ceil((Date.parse(user.lockedUntil) - Date.now()) / 1000); return json({ error: "locked", retryAfter: retry }, 423, { "retry-after": String(retry) }) }
  if (!user.passwordHash || !(await passwords.verify(password, user.passwordHash))) {
    const failed = await db.users.recordFailed(user.id); const left = Math.max(0, 5 - failed.attempts)
    if (failed.lockedUntil) return json({ error: "locked", retryAfter: 900 }, 423, { "retry-after": "900" })
    return json({ error: "invalid_credentials", attemptsLeft: left, captchaRequired: failed.attempts >= 3 }, 401)
  }
  if (!user.emailVerifiedAt) return json({ error: "email_unverified" }, 403)
  await db.users.clearFailed(user.id)
  const { cookie } = await sessions.create(user.id, true, { ua: req.headers.get("user-agent") })
  return json({ user: { id: user.id, displayName: `${user.firstName} ${user.lastName}`.trim() }, redirect: "/account" }, 200, { "set-cookie": cookie })
}
