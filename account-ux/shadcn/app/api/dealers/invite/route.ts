/**
 * GET /api/dealers/invite?code=
 * Resolves a Vanstro-issued dealer invite to that store. Does not list codes.
 */
import { dealerByInviteCode, ensureDealers } from "@/lib/dealers"

export async function GET(req: Request) {
  await ensureDealers()
  const code = new URL(req.url).searchParams.get("code") || ""
  const d = dealerByInviteCode(code)
  if (!d) return Response.json({ error: "unknown_invite" }, { status: 404 })
  return Response.json({ id: d.id, name: d.name, city: d.city, code: d.code })
}
