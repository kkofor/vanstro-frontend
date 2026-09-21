/**
 * Moneris Go Cloud — second payment channel (card-present at a Vanstro terminal).
 * Hosted Tokenization + REST /payments in lib/moneris.ts is unchanged.
 *
 * QA:    POST https://ippostest.moneris.com/v3/Terminal/
 * Prod:  POST https://ippos.moneris.com/v3/Terminal/
 */
import { paymentMode } from "./payments"

const GO_URL = {
  qa: "https://ippostest.moneris.com/v3/Terminal/",
  prod: "https://ippos.moneris.com/v3/Terminal/",
} as const

export type GoPushResult =
  | { ok: true; mock: true; cloudTicket: string }
  | { ok: true; mock: false; cloudTicket: string; receiptUrl?: string }
  | { ok: false; code: string; message: string }

export async function pushPurchase(input: {
  orderNo: string
  totalCents: number
  terminalId: string
  postBackUrl: string
  idempotencyKey: string
}): Promise<GoPushResult> {
  if (paymentMode() === "mock") {
    return { ok: true, mock: true, cloudTicket: `mock-go-${input.orderNo}` }
  }
  const storeId = process.env.MONERIS_GO_STORE_ID || process.env.MONERIS_STORE_ID || ""
  const apiToken = process.env.MONERIS_GO_API_TOKEN || ""
  const istConfigCode = process.env.MONERIS_GO_IST_CONFIG || ""
  if (!storeId || !apiToken || !istConfigCode) {
    return { ok: false, code: "pos_not_configured", message: "Moneris Go Cloud credentials are not set." }
  }
  const env = process.env.MONERIS_ENV === "prod" ? "prod" : "qa"
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const dataTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const body = {
    apiVersion: "3.0",
    apiToken,
    storeId,
    istConfigCode,
    polling: "true",
    postBackUrl: input.postBackUrl,
    dataId: `${input.orderNo}-${Date.now()}`,
    dataTimestamp,
    data: {
      request: [
        {
          orderId: input.orderNo,
          idempotencyKey: input.idempotencyKey,
          terminalId: input.terminalId,
          action: "purchase",
          totalAmount: String(input.totalCents),
        },
      ],
    },
  }
  let res: Response
  try {
    res = await fetch(GO_URL[env], { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  } catch (e) {
    return { ok: false, code: "pos_unreachable", message: e instanceof Error ? e.message : String(e) }
  }
  const json = await res.json().catch(() => ({})) as {
    receipt?: { statusCode?: string; status?: string; data?: { response?: Array<{ cloudTicket?: string; receiptUrl?: string; statusCode?: string; status?: string; completed?: string }> } }
  }
  const row = json.receipt?.data?.response?.[0]
  if (!res.ok || json.receipt?.statusCode === "5904" || row?.statusCode === "5904") {
    return { ok: false, code: "pos_busy", message: row?.status || json.receipt?.status || "Terminal is busy." }
  }
  const ticket = row?.cloudTicket
  if (!ticket) {
    return { ok: false, code: "pos_rejected", message: row?.status || json.receipt?.status || `Go Cloud HTTP ${res.status}` }
  }
  return { ok: true, mock: false, cloudTicket: ticket, receiptUrl: row.receiptUrl }
}
