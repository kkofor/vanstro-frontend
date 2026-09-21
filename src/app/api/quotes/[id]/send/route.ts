/**
 * POST /api/quotes/:id/send  { email, confirm: true }
 * Dealer emails a quote to a customer address they typed. Requires explicit confirm.
 */
import { z } from "zod"
import { quotes } from "@/lib/quotes"
import { assertStore, requireDealer } from "../../_shared"
import { quoteEmail } from "@/emails/quote"
import { sendMail } from "@/lib/mail"
import { quotePdf } from "@/lib/invoice-pdf"
import { rateLimit } from "@/lib/rate-limit"

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  confirm: z.literal(true),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireDealer(req)
  if (!gate.ok) return gate.response
  const session = gate.session
  const { id } = await params
  const q = await quotes.get(id)
  if (!q) return Response.json({ error: "quote_not_found" }, { status: 404 })
  const mismatch = assertStore(session.dealerId, q.dealerId)
  if (mismatch) return mismatch

  if (!rateLimit(`quote-send-dealer:${session.dealerId}`, 10, 3600) || !rateLimit(`quote-send-id:${q.quoteNo}`, 3, 3600)) {
    return Response.json({ error: "rate_limited" }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid_request", issues: parsed.error.flatten() }, { status: 400 })
  const to = parsed.data.email

  try {
    const mail = quoteEmail(q)
    const pdf = await quotePdf(q)
    const { sentAt } = await sendMail({
      to, channel: "receipt", tag: `quote:${q.quoteNo}`, ...mail,
      attachments: [{ name: pdf.name, contentType: "application/pdf", content: pdf.content }],
    })
    await quotes.logNotification(q.quoteNo, { kind: "quote_email", to, sentAt, byUserId: session.userId })
    return Response.json({ ok: true, to, sentAt, attachment: { name: pdf.name, bytes: pdf.content.length } })
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    await quotes.logNotification(q.quoteNo, { kind: "quote_email", to, byUserId: session.userId, error: err })
    return Response.json({ error: "send_failed" }, { status: 502 })
  }
}
