/**
 * components/checkout/tax-lines.tsx
 * Destination-based Canadian tax lines for the order summary and the tax invoice.
 * One row per line returned by lib/tax.ts (HST | GST | GST+PST/RST | GST+QST),
 * labels switch with locale (QC shows TPS / TVQ). Pulses briefly when the quote changes.
 */
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { formatCAD, type TaxQuote } from "@/lib/tax"

export interface TaxLinesProps extends React.HTMLAttributes<HTMLDListElement> {
  quote: TaxQuote
  locale?: "en-CA" | "fr-CA"
  /** Show registration numbers below the lines (order summary: yes, receipt: handled by TaxInvoice). */
  showRegistration?: boolean
}

export function TaxLines({ quote, locale = "en-CA", showRegistration = true, className, ...props }: TaxLinesProps) {
  const fr = locale === "fr-CA"
  const [pulse, setPulse] = React.useState(false)
  const prev = React.useRef(quote.province)
  React.useEffect(() => {
    if (prev.current !== quote.province) {
      prev.current = quote.province
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 900)
      return () => clearTimeout(t)
    }
  }, [quote.province])

  return (
    <dl className={cn("space-y-1.5 text-sm", className)} aria-live="polite" {...props}>
      {quote.lines.map((l) => (
        <div key={l.id} className={cn("flex items-baseline justify-between gap-3 rounded-sm px-1 -mx-1 transition-colors", pulse && "bg-brand-green-50")}>
          <dt className="text-muted-foreground">
            {fr ? l.labelFr : l.labelEn}
            {l.noteEn && <span className="sr-only"> {fr ? l.noteFr : l.noteEn}</span>}
          </dt>
          <dd className="tabular-nums">{formatCAD(l.cents, locale)}</dd>
        </div>
      ))}
      {showRegistration && (
        <p className="pt-1 text-xs text-muted-foreground">
          {fr ? "No TPS/TVH" : "GST/HST No."} <span className="font-mono">{quote.gstHstBn}</span>
          {quote.qstBn && (
            <>
              {" · "}
              {fr ? "No TVQ" : "QST No."} <span className="font-mono">{quote.qstBn}</span>
            </>
          )}
          {" · "}
          {fr ? `taux au ${quote.asOf}` : `rates as of ${quote.asOf}`}
        </p>
      )}
    </dl>
  )
}
