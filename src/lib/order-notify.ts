/**
 * lib/order-notify.ts — everything that happens after an order is paid.
 *
 *   1. Order confirmation email → customer          (receipts@mail.vanstro.ca)
 *   2. Tax invoice email + PDF attachment → customer (same sender; CRA-compliant, kept 6 years)
 *   3. Dealer order sheet → selected local dealer    (only if a dealer is assigned)
 *   4. ERP Order/syncEspoQuote                        (HT and POS; same hook)
 *
 * Each step is independent and logged on the order (`notifications` / `erp`), so a failed email
 * or ERP push surfaces in the API / ops console without blocking the others or un-paying the order.
 * SMS receipts are recorded as "not configured" until an SMS provider exists.
 */
import { sendMail } from "./mail"
import { orderConfirmation, invoice, paymentReceived, fulfillmentReady } from "../emails"
import { dealerNewOrder } from "../emails/dealer"
import { invoicePdf } from "./invoice-pdf"
import { GST_HST_BN, QST_BN } from "./tax"
import { amountPaidCents, MANUAL_CHANNEL_BRAND, orders, toEmailInput, toInvoiceInput, type LedgerPayment, type Order, type NotificationLog } from "./orders"
import { linkSecret } from "./signed-links"
import { pushPaidOrderToErp, type ErpPushRecord } from "./erp"
import { scheduleErpRetry } from "./erp-retry"

export function appBase(): string {
  return (process.env.APP_URL ?? "https://www.vanstro.ca").replace(/\/$/, "")
}

export interface NotifyResult {
  confirmation: { sentAt: string } | { failed: true; error: string }
  invoice: { sentAt: string; invoiceNo: string } | { failed: true; error: string }
  dealer: { sentAt: string; to: string } | { failed: true; error: string } | null
  sms: null
  erp: ErpPushRecord
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

async function log(orderNo: string, entry: NotificationLog) {
  try { await orders.logNotification(orderNo, entry) } catch { /* logging must never break the flow */ }
}

export async function sendPaymentReceived(o: Order, entry: LedgerPayment, to = o.email) {
  const paid = amountPaidCents(o)
  const mail = paymentReceived({
    locale: o.locale,
    firstName: o.firstName,
    orderNo: o.orderNo,
    receivedCents: entry.amountCents,
    balanceCents: Math.max(0, o.quote.totalCents - paid),
    totalCents: o.quote.totalCents,
    channelLabel: MANUAL_CHANNEL_BRAND[entry.channel],
    orderUrl: o.userId ? `${appBase()}/account#orders/${encodeURIComponent(o.orderNo)}` : `${appBase()}/account#orders`,
  })
  const { sentAt } = await sendMail({ to, channel: "receipt", tag: `payment:${o.orderNo}:${entry.id}`, ...mail })
  await log(o.orderNo, { kind: "payment_received", to, sentAt })
  return { sentAt }
}

export async function sendOrderConfirmation(o: Order, to = o.email) {
  const input = toEmailInput(o, appBase())
  const mail = orderConfirmation({ ...input, invoiceFollows: true })
  const { sentAt } = await sendMail({ to, channel: "receipt", tag: `order:${o.orderNo}`, ...mail })
  await log(o.orderNo, { kind: "order_confirmation", to, sentAt })
  return { sentAt }
}

function alreadySent(o: Order, kind: NotificationLog["kind"]) {
  return o.notifications.some(n => n.kind === kind && n.sentAt)
}

export async function sendFulfillmentReady(o: Order, to = o.email, opts: { force?: boolean } = {}) {
  const pickup = o.deliveryMethod === "pickup"
  const kind: NotificationLog["kind"] = pickup ? "ready_for_pickup" : "shipped"
  if (!opts.force && alreadySent(o, kind)) return { sentAt: o.notifications.find(n => n.kind === kind && n.sentAt)!.sentAt! }
  const mail = fulfillmentReady(toEmailInput(o, appBase()))
  const { sentAt } = await sendMail({ to, channel: "receipt", tag: `${kind}:${o.orderNo}`, ...mail })
  await log(o.orderNo, { kind, to, sentAt })
  return { sentAt }
}

export async function sendInvoice(o: Order, to = o.email) {
  if (!o.invoiceNo) throw new Error(`invoice_not_issued:${o.orderNo}`)
  if (!linkSecret()) throw new Error("invoice_link_unconfigured")
  const input = toInvoiceInput(o, appBase(), { gstHstBn: GST_HST_BN, qstBn: QST_BN })
  const mail = invoice(input)
  const pdf = await invoicePdf(input)
  const { sentAt } = await sendMail({
    to, channel: "receipt", tag: `invoice:${o.orderNo}`, ...mail,
    attachments: [{ name: pdf.name, contentType: "application/pdf", content: pdf.content }],
  })
  await log(o.orderNo, { kind: "invoice", to, sentAt })
  return { sentAt, invoiceNo: input.invoiceNo }
}

export async function notifyDealer(o: Order) {
  if (!o.dealer || !o.payment) return null
  const input = toEmailInput(o, appBase())
  const mail = dealerNewOrder({
    dealer: o.dealer,
    orderNo: o.orderNo,
    paidAt: new Date(o.payment.paidAt),
    customer: { name: o.shipping.name, email: o.email, phone: o.phone ? `+1 ${o.phone}` : null },
    shipTo: input.shipTo,
    items: input.items,
    totalCents: o.quote.totalCents,
    delivery: input.delivery,
    notes: o.notes,
  })
  const to = process.env.DEALER_NOTIFY_OVERRIDE ?? o.dealer.email
  const { sentAt } = await sendMail({ to, channel: "receipt", tag: `dealer:${o.orderNo}`, ...mail })
  await log(o.orderNo, { kind: "dealer_new_order", to, sentAt })
  return { sentAt, to }
}

/** Runs all post-payment notifications; never throws. */
export async function notifyPaidOrder(o: Order): Promise<NotifyResult> {
  const fresh = (await orders.get(o.orderNo)) ?? o
  const jobs = {
    confirmation: alreadySent(fresh, "order_confirmation")
      ? Promise.resolve({ sentAt: fresh.notifications.find(n => n.kind === "order_confirmation" && n.sentAt)!.sentAt! })
      : sendOrderConfirmation(fresh),
    invoice: !fresh.invoiceNo
      ? Promise.reject(new Error("invoice_held"))
      : alreadySent(fresh, "invoice")
        ? Promise.resolve({ sentAt: fresh.notifications.find(n => n.kind === "invoice" && n.sentAt)!.sentAt!, invoiceNo: fresh.invoiceNo })
        : sendInvoice(fresh),
    dealer: alreadySent(fresh, "dealer_new_order")
      ? Promise.resolve(fresh.dealer ? { sentAt: fresh.notifications.find(n => n.kind === "dealer_new_order" && n.sentAt)!.sentAt!, to: fresh.notifications.find(n => n.kind === "dealer_new_order" && n.sentAt)!.to } : null)
      : notifyDealer(fresh),
  }
  const [c, i, d, e] = await Promise.allSettled([
    jobs.confirmation,
    jobs.invoice,
    jobs.dealer,
    pushPaidOrderToErp(fresh),
  ])
  if (c.status === "rejected") await log(o.orderNo, { kind: "order_confirmation", to: o.email, error: errMsg(c.reason) })
  if (i.status === "rejected" && errMsg(i.reason) !== "invoice_held") await log(o.orderNo, { kind: "invoice", to: o.email, error: errMsg(i.reason) })
  if (d.status === "rejected" && o.dealer) await log(o.orderNo, { kind: "dealer_new_order", to: o.dealer.email, error: errMsg(d.reason) })
  const erp: ErpPushRecord = scheduleErpRetry(e.status === "fulfilled"
    ? e.value
    : { status: "failed", at: new Date().toISOString(), attempts: (fresh.erp?.attempts ?? 0) + 1, error: errMsg(e.reason), path: "Order/syncEspoQuote" })
  try { await orders.setErp(o.orderNo, erp) } catch { /* persist must never break the paid response */ }
  if (erp.status === "success" || erp.status === "skipped") {
    try {
      const cur = await orders.get(o.orderNo)
      if (cur && (!cur.fulfillment || cur.fulfillment === "unfulfilled")) {
        await orders.setFulfillment(o.orderNo, "processing")
      }
    } catch { /* fulfillment persist must never break the paid response */ }
  }
  return {
    confirmation: c.status === "fulfilled" ? c.value : { failed: true, error: errMsg(c.reason) },
    invoice: i.status === "fulfilled" ? i.value : { failed: true, error: errMsg(i.reason) },
    dealer: !o.dealer ? null : d.status === "fulfilled" && d.value ? d.value : { failed: true, error: d.status === "rejected" ? errMsg(d.reason) : "skipped" },
    sms: null,
    erp,
  }
}

/** Staff retry from the order page. Re-sends even after a previous success. */
export async function retryErpPush(orderNo: string): Promise<ErpPushRecord> {
  const o = await orders.get(orderNo)
  if (!o) throw new Error("order_not_found")
  if (o.status !== "paid") throw new Error("order_not_paid")
  const erp = scheduleErpRetry(await pushPaidOrderToErp(o, { force: true }))
  await orders.setErp(orderNo, erp)
  if (erp.status === "success" || erp.status === "skipped") {
    const cur = await orders.get(orderNo)
    if (cur && (!cur.fulfillment || cur.fulfillment === "unfulfilled")) {
      await orders.setFulfillment(orderNo, "processing")
    }
  }
  return erp
}
