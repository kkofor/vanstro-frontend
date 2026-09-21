/**
 * GET /api/sessions   — list the caller's device sessions (account › Devices).
 * POST /api/sessions  — { action: "revoke-others" } signs out every other session.
 */
import { auth } from "@/lib/auth"
import { currentHash, sessions } from "@/lib/sessions"

export async function GET(req: Request) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  const hash = currentHash(req)
  if (hash) await sessions.touch(hash)
  const rows = await sessions.listByUser(session.userId, hash)
  return Response.json(
    {
      sessions: rows.map(r => ({
        id: r.publicId,
        current: r.current,
        createdAt: r.createdAt,
        lastActiveAt: r.lastActiveAt,
        browser: r.browser,
        device: r.device,
        city: r.city,
        province: r.province,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  )
}

export async function POST(req: Request) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (body?.action !== "revoke-others") return Response.json({ error: "invalid_request" }, { status: 400 })
  const hash = currentHash(req)
  const revoked = await sessions.revokeOthers(session.userId, hash)
  return Response.json({ ok: true, revoked }, { headers: { "cache-control": "no-store" } })
}
