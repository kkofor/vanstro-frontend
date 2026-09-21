/**
 * GET /api/checkout/payment-config
 * Public, non-secret configuration the checkout page needs before any order exists:
 * payment mode (live / mock) and the Moneris Hosted Tokenization frame (URL + profile id).
 * The profile id is not a credential — Moneris pins it to this site's origin — but the
 * OAuth client secret and merchant id never leave the server.
 */
import { paymentMode } from "@/lib/payments"
import { hostedTokenization } from "@/lib/moneris"

export async function GET() {
  const mode = paymentMode()
  const { env, url, profileId } = hostedTokenization()
  return Response.json(
    { mode, env, ht: mode === "live" && profileId ? { url, profileId } : null, configured: mode === "mock" || !!profileId },
    { headers: { "cache-control": "no-store" } }
  )
}
