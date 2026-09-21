/**
 * DELETE /api/sessions/:id — sign out one other device session.
 * The caller's own session ("current" or the legacy synthetic row) cannot be revoked here —
 * use POST /api/auth/logout for that.
 */
import { auth } from "@/lib/auth"
import { currentHash, sessions } from "@/lib/sessions"

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  const { id } = await ctx.params
  if (id === "legacy") return Response.json({ error: "cannot_revoke_current" }, { status: 403 })
  const hash = currentHash(req)
  if (hash) {
    const rows = await sessions.listByUser(session.userId, hash)
    const current = rows.find(r => r.current)
    if (current && current.publicId === id) return Response.json({ error: "cannot_revoke_current" }, { status: 403 })
  }
  const ok = await sessions.revokeOne(session.userId, id)
  if (!ok) return Response.json({ error: "not_found" }, { status: 404 })
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } })
}
