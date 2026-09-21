/**
 * lib/erp.ts — push a paid storefront order to Vanstro ERP.
 *
 * Same contract as EspoCRM `CQuote::postActionPushToErp` in the Desktop/CRM package:
 *   POST {ERP_BASE_URL}/Order/syncEspoQuote
 *   headers: token, server: 1, Content-Type: application/json
 *   success when JSON `{ code: 1 }`
 *
 * Field names match `CQuote::buildPayload` so the existing ERP mapper can ingest them.
 * `source` is `EspoCRM`. `accountId` is the Espo Account id already on the ERP dealer
 * (Yuan / MB01 → 6a8810b93b08b6495). `userId` is that dealer's Espo User id when stored.
 * Prototype `usr_*` session ids are never sent.
 * Money is CAD dollars (ERP), converted from our integer cents.
 *
 * Hook: `notifyPaidOrder` — both payment channels (HT + POS / Go) already land there
 * after `orders.markPaid`. A failed push does not roll back payment; staff retry from
 * the order page. Token lives in env, never in the repo.
 */
import { getItem } from "./catalogue"
import { getCustomerCrm } from "./customer-crm"
import { DELIVERY, type DeliveryMethod } from "./checkout"
import { ensureDealers, getDealer } from "./dealers"
import type { Order, StoredAddress } from "./orders"

export type ErpPushStatus = "skipped" | "success" | "failed"

export interface ErpPushRecord {
  status: ErpPushStatus
  at: string
  attempts: number
  error?: string
  /** Path only — never the token or host credentials. */
  path?: string
  /** Espo User / Account ids actually sent (same set as CRM). */
  userId?: string | null
  accountId?: string | null
}

const SHIP: Record<DeliveryMethod, "Pickup" | "Local Delivery" | "Freight"> = {
  pickup: "Pickup",
  white: "Local Delivery",
  freight: "Freight",
}

export function erpConfigured() {
  return !!(process.env.ERP_BASE_URL?.trim() && process.env.ERP_TOKEN?.trim())
}

function dollars(cents: number) {
  return Math.round(cents) / 100
}

function addr(a: StoredAddress) {
  const street = [a.street, a.unit].filter(Boolean).join(", ")
  return {
    street,
    city: a.city,
    state: a.province,
    postalCode: a.postalCode,
    country: "Canada",
  }
}

function winnipegDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Winnipeg" })
}

/** ERP Account / User id. Prototype session ids (`usr_*`) are not in that set. */
function espoId(raw?: string | null): string | null {
  const v = (raw || "").trim()
  if (!v || /^usr_/i.test(v)) return null
  return /^[a-zA-Z0-9]{2,24}$/.test(v) ? v : null
}

export async function resolveErpIds(o: Order) {
  await ensureDealers()
  const dealer = o.dealer ? getDealer(o.dealer.id, { includeDisabled: true }) : null
  const crm = await getCustomerCrm(o.email)
  const dealerUser = espoId(dealer?.erpUserId)
  const customerUser = espoId(crm?.erpUserId) || espoId(o.userId)
  return {
    userId: o.paymentMethod === "pos" ? (dealerUser || customerUser) : (customerUser || dealerUser),
    accountId: espoId(dealer?.erpAccountId),
    accountName: dealer?.name ?? o.dealer?.name ?? null,
  }
}

/** Payload aligned with CRM `CQuote::buildPayload`, plus storefront-only extras ERP can ignore. */
export async function buildErpPayload(o: Order) {
  const tax = o.quote.tax
  const items = await Promise.all(o.items.map(async (line, i) => {
    const cat = await getItem(line.sku).catch(() => null)
    return {
      id: `${o.orderNo}:${line.sku}:${i}`,
      name: line.name,
      skuId: line.sku,
      skuNumber: line.sku,
      modelNumber: line.variant || cat?.variant || null,
      colorName: null as string | null,
      category: cat?.category || null,
      quantity: line.qty,
      listPrice: dollars(cat?.unitCents ?? line.unitCents),
      unitPrice: dollars(line.unitCents),
      description: line.variant || null,
    }
  }))

  const ids = await resolveErpIds(o)
  return {
    source: "EspoCRM",
    userId: ids.userId,
    taxNumber: null as string | null,
    orderId: o.orderNo,
    orderNumber: o.orderNo,
    status: "Accepted",
    dateQuoted: winnipegDay(o.payment?.paidAt || o.createdAt),
    accountId: ids.accountId,
    accountName: ids.accountName,
    buyerName: o.shipping.name || o.firstName || null,
    buyerPhone: o.phone || o.shipping.phone || null,
    buyerEmail: o.email,
    billingAddress: addr(o.billing),
    shippingAddress: addr(o.shipping),
    shippingProvider: SHIP[o.deliveryMethod],
    currency: "CAD",
    subtotal: dollars(o.quote.subtotalCents),
    discountAmount: dollars(o.quote.discountCents),
    shippingCharge: dollars(o.quote.freightCents),
    taxAmount: dollars(tax.taxTotal),
    gstAmount: dollars((tax.tax.gst || 0) + (tax.tax.hst || 0)),
    pstAmount: dollars((tax.tax.pst || 0) + (tax.tax.qst || 0)),
    grandTotal: dollars(o.quote.totalCents),
    description: o.notes || (o.quote.promo ? `Promo ${o.quote.promo.code}` : null),
    items,
    // extras — ERP mapper can ignore
    storefront: {
      payChannel: o.paymentMethod === "pos" ? "pos" : "ht",
      paymentMethod: o.paymentMethod,
      paidAt: o.payment?.paidAt ?? null,
      invoiceNo: o.invoiceNo,
      deliveryMethod: o.deliveryMethod,
      deliveryLabel: DELIVERY[o.deliveryMethod].labelEn,
      dealerCode: o.dealer?.code ?? null,
      guest: o.userId === null,
      authCode: o.payment?.authCode ?? null,
      referenceNo: o.payment?.referenceNo ?? null,
    },
  }
}

export async function pushPaidOrderToErp(o: Order, opts: { force?: boolean } = {}): Promise<ErpPushRecord> {
  const prev = o.erp
  const attempts = (prev?.attempts ?? 0) + 1
  const at = new Date().toISOString()

  const ids = o.status === "paid" ? await resolveErpIds(o) : { userId: null, accountId: null }

  if (o.status !== "paid") {
    return { status: "failed", at, attempts, error: "order_not_paid", path: "Order/syncEspoQuote", ...ids }
  }
  if (prev?.status === "success" && !opts.force) return prev
  if (!erpConfigured()) {
    return { status: "skipped", at, attempts, error: "erp_unconfigured", path: "Order/syncEspoQuote", ...ids }
  }

  const base = process.env.ERP_BASE_URL!.trim().replace(/\/$/, "")
  const token = process.env.ERP_TOKEN!.trim()
  const path = "Order/syncEspoQuote"
  const url = `${base}/${path}`
  const payload = await buildErpPayload(o)

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        token,
        server: "1",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    })
    const text = await res.text()
    let decoded: { code?: unknown; msg?: unknown } = {}
    try { decoded = JSON.parse(text) as { code?: unknown; msg?: unknown } } catch { /* not json */ }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`)
    }
    if ((decoded.code as number | undefined) !== 1) {
      throw new Error(String(decoded.msg || "Unexpected ERP response"))
    }
    console.info(`[erp] ${o.orderNo} pushed (${o.paymentMethod === "pos" ? "pos" : "ht"})`)
    return { status: "success", at, attempts, path, userId: payload.userId, accountId: payload.accountId }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error(`[erp] ${o.orderNo} failed: ${error}`)
    return { status: "failed", at, attempts, error, path, userId: payload.userId, accountId: payload.accountId }
  }
}
