/**
 * Destination-based Canadian sales tax (GST / HST / PST / QST) for TPP + taxable freight.
 * Rates as of 2026-04-01. QST is on the sale price excluding GST.
 * Always compute in integer cents; round half-up at the line.
 */
export const PROVINCES = {
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick",
  NL: "Newfoundland and Labrador", NS: "Nova Scotia", NT: "Northwest Territories",
  NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec",
  SK: "Saskatchewan", YT: "Yukon",
} as const
export type ProvinceCode = keyof typeof PROVINCES

export type TaxKind = "hst" | "gst" | "gst_pst" | "gst_qst"

export const TAX_RATES: Record<ProvinceCode, {
  kind: TaxKind
  gst?: number
  hst?: number
  pst?: number
  qst?: number
  pstName?: "PST" | "RST" | "QST"
  hstSplit?: { gst: number; pv: number }
}> = {
  ON: { kind: "hst", hst: 0.13, hstSplit: { gst: 0.05, pv: 0.08 } },
  NB: { kind: "hst", hst: 0.15, hstSplit: { gst: 0.05, pv: 0.10 } },
  NL: { kind: "hst", hst: 0.15, hstSplit: { gst: 0.05, pv: 0.10 } },
  NS: { kind: "hst", hst: 0.14, hstSplit: { gst: 0.05, pv: 0.09 } },
  PE: { kind: "hst", hst: 0.15, hstSplit: { gst: 0.05, pv: 0.10 } },
  AB: { kind: "gst", gst: 0.05 },
  NT: { kind: "gst", gst: 0.05 },
  NU: { kind: "gst", gst: 0.05 },
  YT: { kind: "gst", gst: 0.05 },
  BC: { kind: "gst_pst", gst: 0.05, pst: 0.07, pstName: "PST" },
  MB: { kind: "gst_pst", gst: 0.05, pst: 0.07, pstName: "RST" },
  SK: { kind: "gst_pst", gst: 0.05, pst: 0.06, pstName: "PST" },
  QC: { kind: "gst_qst", gst: 0.05, qst: 0.09975, pstName: "QST" },
}

export const GST_HST_BN = process.env.VANSTRO_GST_HST_BN ?? "71411 2364 RT0001"
export const QST_BN = process.env.VANSTRO_QST_BN?.trim() || null
export const TAX_AS_OF = "2026-04-01"

export function dollarsToCents(n: number | string) {
  return Math.round(Number(n) * 100)
}
export function formatCAD(cents: number, locale: "en-CA" | "fr-CA" = "en-CA") {
  const n = (cents / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return locale === "fr-CA" ? `${n} $` : `$${n}`
}

export interface TaxLine {
  id: "hst" | "gst" | "pst" | "qst"
  code: string
  labelEn: string
  labelFr: string
  rate: number
  cents: number
  noteEn?: string
  noteFr?: string
}

export interface TaxQuote {
  province: ProvinceCode
  provinceName: string
  kind: TaxKind
  taxableCents: number
  tax: { gst: number; hst: number; pst: number; qst: number }
  taxTotal: number
  totalCents: number
  combinedRate: number
  lines: TaxLine[]
  gstHstBn: string
  qstBn: string | null
  asOf: string
}

export function quoteTax(province: ProvinceCode, taxableCents: number): TaxQuote {
  const rate = TAX_RATES[province]
  if (!rate) throw new Error(`Unknown province: ${province}`)
  const tax = { gst: 0, hst: 0, pst: 0, qst: 0 }
  if (rate.kind === "hst") tax.hst = Math.round(taxableCents * rate.hst!)
  else if (rate.kind === "gst") tax.gst = Math.round(taxableCents * rate.gst!)
  else if (rate.kind === "gst_pst") {
    tax.gst = Math.round(taxableCents * rate.gst!)
    tax.pst = Math.round(taxableCents * rate.pst!)
  } else {
    tax.gst = Math.round(taxableCents * rate.gst!)
    tax.qst = Math.round(taxableCents * rate.qst!)
  }
  const taxTotal = tax.gst + tax.hst + tax.pst + tax.qst
  const lines: TaxLine[] = []
  if (tax.hst) {
    const pct = (rate.hst! * 100).toFixed(0)
    lines.push({
      id: "hst", code: "HST",
      labelEn: `HST (${pct}%)`, labelFr: `TVH (${pct} %)`,
      rate: rate.hst!, cents: tax.hst,
      noteEn: `Includes 5% GST + ${(rate.hstSplit!.pv * 100).toFixed(0)}% provincial.`,
      noteFr: `Comprend 5 % TPS + ${(rate.hstSplit!.pv * 100).toFixed(0)} % provincial.`,
    })
  }
  if (tax.gst) lines.push({ id: "gst", code: "GST", labelEn: "GST (5%)", labelFr: "TPS (5 %)", rate: 0.05, cents: tax.gst })
  if (tax.pst) lines.push({
    id: "pst", code: rate.pstName!,
    labelEn: `${rate.pstName} (${(rate.pst! * 100).toFixed(0)}%)`,
    labelFr: `${rate.pstName} (${(rate.pst! * 100).toFixed(0)} %)`,
    rate: rate.pst!, cents: tax.pst,
  })
  if (tax.qst) lines.push({ id: "qst", code: "QST", labelEn: "QST (9.975%)", labelFr: "TVQ (9,975 %)", rate: 0.09975, cents: tax.qst })
  return {
    province, provinceName: PROVINCES[province], kind: rate.kind,
    taxableCents, tax, taxTotal, totalCents: taxableCents + taxTotal,
    combinedRate: taxableCents ? taxTotal / taxableCents : 0, lines,
    gstHstBn: GST_HST_BN, qstBn: rate.kind === "gst_qst" ? QST_BN : null, asOf: TAX_AS_OF,
  }
}
