/**
 * lib/order-access.ts — who may read / pay / resend a given order.
 *
 *   · the signed-in owner            (order.userId === session.userId)
 *   · a guest holding the order's access token  (HMAC "order-access" over orderNo, 30-day TTL,
 *     handed out by POST /api/orders or POST /api/orders/lookup, carried as ?t= or x-vs-order-token)
 *
 * Guest orders have userId === null until the customer registers with the same email and the
 * orders are claimed (POST /api/orders/claim). The token stays valid after claiming so links in
 * the confirmation email keep working.
 */
import { auth, type Session } from "./auth"
import { isStaffSession } from "./staff"
import type { Order } from "./orders"
import { appBase, signLinkTimed, verifyLink, verifyLinkTimed } from "./signed-links"

export const ORDER_ACCESS_PURPOSE = "order-access"
/** Email / confirmation links stay useful for a month; lookup issues a fresh token. */
export const ORDER_ACCESS_TTL_SEC = 30 * 24 * 60 * 60

export function orderAccessToken(orderNo: string): string | null {
  return signLinkTimed(ORDER_ACCESS_PURPOSE, orderNo, ORDER_ACCESS_TTL_SEC)
}

export function verifyOrderAccessToken(orderNo: string, token: string | null | undefined): boolean {
  if (!token) return false
  if (verifyLinkTimed(ORDER_ACCESS_PURPOSE, orderNo, token)) return true
  // Tokens issued before the TTL change were bare HMACs with no expiry.
  return verifyLink(ORDER_ACCESS_PURPOSE, orderNo, token)
}

export function presentedToken(req: Request): string | null {
  const h = req.headers.get("x-vs-order-token")
  if (h) return h
  try { return new URL(req.url).searchParams.get("t") } catch { return null }
}

export interface OrderAccess {
  session: Session | null
  /** true when the request was authorised by the guest token rather than a session. */
  viaToken: boolean
}

/** null → not allowed. Never reveals whether the order exists (callers answer 404 either way). */
export async function orderAccess(req: Request, order: Order): Promise<OrderAccess | null> {
  const session = await auth(req)
  if (isStaffSession(session)) return { session, viaToken: false }
  if (session && order.userId === session.userId) return { session, viaToken: false }
  const t = presentedToken(req)
  if (t && verifyOrderAccessToken(order.orderNo, t)) return { session, viaToken: true }
  return null
}

/** Public order-status page link for emails and the confirmation page (works signed out). */
export function orderStatusHref(orderNo: string): string {
  const t = orderAccessToken(orderNo)
  const q = new URLSearchParams({ o: orderNo })
  if (t) q.set("t", t)
  return `${appBase()}/order-status?${q}`
}
