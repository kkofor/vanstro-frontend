/**
 * HTML → PDF for invoices using headless Chromium (`--print-to-pdf`).
 *
 * Local/dev: uses the installed Google Chrome. Production: set CHROME_PATH to the
 * container's chromium (or swap `htmlToPdf` for Playwright/Puppeteer — the HTML is
 * self-contained, so any Chromium-based renderer produces the same document).
 * Letter size and zero margins come from the template's @page rule.
 */
import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import type { InvoiceInput } from "../emails/orders"
import { renderInvoiceHtml } from "../emails/invoice-pdf"

const run = promisify(execFile)

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean) as string[]

export async function htmlToPdf(html: string): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "vanstro-invoice-"))
  const src = join(dir, "invoice.html")
  const out = join(dir, "invoice.pdf")
  await writeFile(src, html, "utf8")
  let lastErr: unknown
  try {
    for (const chrome of CHROME_CANDIDATES) {
      try {
        const flags = [
          "--headless=new", "--disable-gpu", "--no-first-run",
          "--no-pdf-header-footer", `--print-to-pdf=${out}`, `file://${src}`,
        ]
        if (process.env.CHROME_NO_SANDBOX === "1") flags.splice(2, 0, "--no-sandbox")
        await run(chrome, flags, { timeout: 30_000 })
        return await readFile(out)
      } catch (err) {
        lastErr = err
      }
    }
    void lastErr
    throw new Error("invoice_chrome_unavailable")
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export function invoiceFileName(invoiceNo: string): string {
  return `Vanstro-${invoiceNo.replace(/[^A-Za-z0-9-]/g, "")}.pdf`
}

export async function invoicePdf(input: InvoiceInput): Promise<{ name: string; content: Buffer }> {
  return { name: invoiceFileName(input.invoiceNo), content: await htmlToPdf(renderInvoiceHtml(input)) }
}
