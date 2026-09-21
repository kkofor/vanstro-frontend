/**
 * GET /api/me — prototype session (x-vs-user or demo customer).
 */
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await auth(req)
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 })
  return Response.json({
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    dealerId: session.dealerId,
    hasPos: session.role === "dealer" && !!session.terminalId,
    staff: session.role === "staff",
    emailVerifiedAt: session.emailVerifiedAt,
  })
}
