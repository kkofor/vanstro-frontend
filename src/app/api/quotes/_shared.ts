import { auth, type Session } from "@/lib/auth"
import type { StoredAddress } from "@/lib/orders"
import type { Address } from "@/lib/validators"

export async function requireDealer(req: Request): Promise<
  | { ok: true; session: Session & { dealerId: string } }
  | { ok: false; response: Response }
> {
  const session = await auth(req)
  if (!session) return { ok: false, response: Response.json({ error: "unauthenticated" }, { status: 401 }) }
  if (session.role !== "dealer") return { ok: false, response: Response.json({ error: "quotes_dealer_only" }, { status: 403 }) }
  if (!session.dealerId) {
    return { ok: false, response: Response.json({ error: "dealer_account_incomplete", detail: "This dealer account is not linked to a store." }, { status: 403 }) }
  }
  return { ok: true, session: session as Session & { dealerId: string } }
}

export function assertStore(sessionDealerId: string, quoteDealerId: string): Response | null {
  if (sessionDealerId !== quoteDealerId) return Response.json({ error: "quote_store_mismatch" }, { status: 403 })
  return null
}

const DEMO_ADDRESSES: Record<string, StoredAddress> = {
  "1": { name: "Guannan Zhang", street: "88 Waterfront Dr", unit: "Unit 1204", city: "Winnipeg", province: "MB", postalCode: "R3B 0T3" },
  "2": { name: "Guannan Zhang", company: "Northline Renovations Ltd.", street: "410 Adelaide St W", city: "Toronto", province: "ON", postalCode: "M5V 1S8" },
}

export function resolveQuoteAddress(ref: { addressId: string } | { address: Address }): StoredAddress | null {
  if ("address" in ref) {
    const a = ref.address
    return { name: a.name, company: a.company || undefined, street: a.street, unit: a.unit || undefined, city: a.city, province: a.province, postalCode: a.postalCode, phone: a.phone || undefined }
  }
  return DEMO_ADDRESSES[ref.addressId] ?? null
}
