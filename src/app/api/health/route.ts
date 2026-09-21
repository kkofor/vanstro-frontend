import { paymentMode } from "@/lib/payments"
import { goCloudConfigured } from "@/lib/terminals"
import { erpConfigured } from "@/lib/erp"

export async function GET() {
  return Response.json({
    ok: true,
    payment: paymentMode(),
    ht: !!process.env.MONERIS_HT_PROFILE_ID,
    mail: !!process.env.AZURE_COMMUNICATION_CONNECTION_STRING,
    pos: goCloudConfigured() || paymentMode() === "mock",
    erp: erpConfigured(),
  })
}
