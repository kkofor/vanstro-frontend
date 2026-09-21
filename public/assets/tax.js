/* VANSTRO — destination-based Canadian sales tax (GST / HST / PST / QST)
   Rates as of 2026-04-01. Tangible personal property + taxable freight.
   HST provinces collect a single harmonized tax. QST is calculated on the
   sale price excluding GST (tax-on-tax ended in 2013). Work in integer cents. */
window.VSTax = (function () {
  const PROVINCES = {
    AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
    NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
    NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
    SK: 'Saskatchewan', YT: 'Yukon',
  };

  /* gst/hst/pst/qst are decimal rates. pstName is the provincial statute label. */
  const RATES = {
    ON: { kind: 'hst', hst: 0.13, hstSplit: { gst: 0.05, pv: 0.08 } },
    NB: { kind: 'hst', hst: 0.15, hstSplit: { gst: 0.05, pv: 0.10 } },
    NL: { kind: 'hst', hst: 0.15, hstSplit: { gst: 0.05, pv: 0.10 } },
    NS: { kind: 'hst', hst: 0.14, hstSplit: { gst: 0.05, pv: 0.09 } }, // 14% from 2025-04-01
    PE: { kind: 'hst', hst: 0.15, hstSplit: { gst: 0.05, pv: 0.10 } },
    AB: { kind: 'gst', gst: 0.05 },
    NT: { kind: 'gst', gst: 0.05 },
    NU: { kind: 'gst', gst: 0.05 },
    YT: { kind: 'gst', gst: 0.05 },
    BC: { kind: 'gst_pst', gst: 0.05, pst: 0.07, pstName: 'PST' },
    MB: { kind: 'gst_pst', gst: 0.05, pst: 0.07, pstName: 'RST' },
    SK: { kind: 'gst_pst', gst: 0.05, pst: 0.06, pstName: 'PST' },
    QC: { kind: 'gst_qst', gst: 0.05, qst: 0.09975, pstName: 'QST' },
  };

  const GST_HST_BN = '71411 2364 RT0001'; // Vanstro Global Supply Inc. GST/HST BN
  const QST_BN = '1220000000TQ0001';     // demo QST — required on QC invoices
  const AS_OF = '2026-04-01';

  function dollarsToCents(n) { return Math.round(Number(n) * 100); }
  function centsToDollars(c) { return (c / 100).toFixed(2); }
  function formatCAD(cents) {
    const n = (cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '$' + n;
  }
  function formatCADFr(cents) {
    const n = (cents / 100).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n + ' $';
  }

  function quote(province, taxableCents) {
    const code = String(province || '').toUpperCase();
    const rate = RATES[code];
    if (!rate) throw new Error('Unknown province: ' + province);
    const tax = { gst: 0, hst: 0, pst: 0, qst: 0 };
    if (rate.kind === 'hst') tax.hst = Math.round(taxableCents * rate.hst);
    else if (rate.kind === 'gst') tax.gst = Math.round(taxableCents * rate.gst);
    else if (rate.kind === 'gst_pst') {
      tax.gst = Math.round(taxableCents * rate.gst);
      tax.pst = Math.round(taxableCents * rate.pst);
    } else if (rate.kind === 'gst_qst') {
      tax.gst = Math.round(taxableCents * rate.gst);
      tax.qst = Math.round(taxableCents * rate.qst);
    }
    const taxTotal = tax.gst + tax.hst + tax.pst + tax.qst;
    const lines = [];
    if (tax.hst) {
      const pct = (rate.hst * 100).toFixed(0);
      lines.push({
        id: 'hst', code: 'HST',
        labelEn: `HST (${pct}%)`,
        labelFr: `TVH (${pct} %)`,
        rate: rate.hst, cents: tax.hst,
        noteEn: `Includes 5% GST + ${(rate.hstSplit.pv * 100).toFixed(0)}% provincial.`,
        noteFr: `Comprend 5 % TPS + ${(rate.hstSplit.pv * 100).toFixed(0)} % provincial.`,
      });
    }
    if (tax.gst) lines.push({
      id: 'gst', code: 'GST',
      labelEn: 'GST (5%)', labelFr: 'TPS (5 %)',
      rate: 0.05, cents: tax.gst,
    });
    if (tax.pst) lines.push({
      id: 'pst', code: rate.pstName,
      labelEn: `${rate.pstName} (${(rate.pst * 100).toFixed(0)}%)`,
      labelFr: `${rate.pstName} (${(rate.pst * 100).toFixed(0)} %)`,
      rate: rate.pst, cents: tax.pst,
    });
    if (tax.qst) lines.push({
      id: 'qst', code: 'QST',
      labelEn: 'QST (9.975%)', labelFr: 'TVQ (9,975 %)',
      rate: 0.09975, cents: tax.qst,
    });
    return {
      province: code,
      provinceName: PROVINCES[code],
      kind: rate.kind,
      taxableCents,
      tax,
      taxTotal,
      totalCents: taxableCents + taxTotal,
      combinedRate: taxTotal / taxableCents,
      lines,
      gstHstBn: GST_HST_BN,
      qstBn: rate.kind === 'gst_qst' ? QST_BN : null,
      asOf: AS_OF,
      basisEn: 'Tax is calculated on the shipping destination (place of supply for TPP). Freight is taxable at the same rate.',
      basisFr: 'La taxe est calculée selon la destination (lieu de fourniture des biens meubles corporels). Le transport est taxable au même taux.',
    };
  }

  return {
    PROVINCES, RATES, GST_HST_BN, QST_BN, AS_OF,
    dollarsToCents, centsToDollars, formatCAD, formatCADFr, quote,
  };
})();
