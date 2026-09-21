/**
 * Staff (ops) gate for /api/admin/*. Prototype session is still x-vs-user;
 * production replaces this with an IdP group check. A customer/dealer header
 * never gets through.
 */
import { auth, type Session } from "./auth"

export async function requireStaff(req: Request): Promise<Session | Response> {
  const session = await auth(req)
  if (!session || session.role !== "staff") {
    return Response.json({ error: "forbidden" }, { status: 403, headers: { "cache-control": "no-store" } })
  }
  return session
}

export function isStaffSession(s: Session | null | undefined): s is Session & { role: "staff" } {
  return !!s && s.role === "staff"
}
