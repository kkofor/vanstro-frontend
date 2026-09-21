import { clearSessionCookie, currentHash, sessions } from "../../../../lib/sessions"
export async function POST(req: Request) {
  const hash = currentHash(req)
  if (hash) await sessions.revokeByHash(hash)
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() } })
}
