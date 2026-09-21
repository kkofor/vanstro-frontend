/**
 * GET /api/orders/:orderNo/invoice.pdf
 * Streams the tax invoice PDF for the order's owner, a guest holding the order-access token,
 * or a signed email link (?t=).
 */
import { orderAccess } from "@/lib/order-access"
import { orders, toInvoiceInput } from "@/lib/orders"
import { invoicePdf } from "@/lib/invoice-pdf"
import { appBase } from "@/lib/order-notify"
import { GST_HST_BN, QST_BN } from "@/lib/tax"
import { verifyLink } from "@/lib/signed-links"
import { auth } from "@/lib/auth"

export async function GET(req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params
  const order = await orders.get(orderNo)
  if (!order) return Response.json({ error: "not_found" }, { status: 404 })

  const token = new URL(req.url).searchParams.get("t")
  // Signed invoice link (email), owner session, or guest order-access token — any one suffices.
  const tokenOk = verifyLink("invoice", orderNo, token)
  if (!tokenOk && !(await orderAccess(req, order))) {
    const session = await auth(req)
    if (session) return Response.json({ error: "forbidden" }, { status: 403 })
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  if (order.status !== "paid" || !order.invoiceNo) return Response.json({ error: "invoice_not_issued", status: order.status }, { status: 409 })

  try {
    const { name, content } = await invoicePdf(toInvoiceInput(order, appBase(), { gstHstBn: GST_HST_BN, qstBn: QST_BN }))
    return new Response(new Uint8Array(content), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "private, max-age=3600",
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    void message
    return Response.json({ error: "invoice_render_failed" }, { status: 500 })
  }
}
