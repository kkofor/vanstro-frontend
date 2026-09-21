import type { SiteLocale } from "./locale.ts";

const DEFAULT_LOCALE: SiteLocale = "en-CA";

const VULGAR_FRACTIONS: Readonly<Record<string, string>> = {
  "¼": "0.25",
  "½": "0.5",
  "¾": "0.75",
  "⅛": "0.125",
  "⅜": "0.375",
  "⅝": "0.625",
  "⅞": "0.875"
};

function decimalFraction(numerator: string, denominator: string) {
  const denominatorValue = Number(denominator);
  if (!denominatorValue) return `${numerator}/${denominator}`;
  return String(Number(numerator) / denominatorValue);
}

function normalizeMeasurementSource(value: string) {
  const protectedFractions: string[] = [];
  const fractionSafeValue = value
    .replace(/[，、；;]/g, "__SEPARATOR__")
    .replace(/ /g, "__NBSP__")
    .replace(/[¼½¾⅛⅜⅝⅞]/g, (fraction) => {
      protectedFractions.push(fraction);
      return `__FRACTION_${protectedFractions.length - 1}__`;
    });

  return fractionSafeValue
    .normalize("NFKC")
    .replace(/__NBSP__/g, " ")
    .replace(/__SEPARATOR__/g, " × ")
    .replace(/__FRACTION_(\d+)__/g, (_, index: string) => protectedFractions[Number(index)])
    .replace(/[／⁄]/g, "/")
    .replace(/(["'])\s*\/\s*(?=[WHDLHP]\b)/g, "$1 × ")
    .replace(/[＊*⋆★☆]/g, "×")
    .replace(/\s+[xX]\s+/g, " × ")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s*×\s*/g, " × ")
    .replace(/^\(\s*[WHDLHP](?:\s*×\s*[WHDLHP])+\s*\)\s*/i, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function formatMoney(
  money: { amount: number; currency: string },
  locale: SiteLocale = DEFAULT_LOCALE
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency
  }).format(money.amount);
}

export function formatDisplayMeasurement(value: string, locale: SiteLocale = DEFAULT_LOCALE) {
  const normalized = normalizeMeasurementSource(value);
  if (locale !== "fr-CA") {
    return normalized
      .replace(/(\d)\s*(ft|feet|foot)\b/gi, "$1 $2")
      .trim();
  }

  return normalized
    .replace(/(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)/g, (_, whole: string, numerator: string, denominator: string) =>
      String(Number(whole) + Number(decimalFraction(numerator, denominator)))
    )
    .replace(/(\d+)\s*-\s*([¼½¾⅛⅜⅝⅞])/g, (_, whole: string, fraction: string) =>
      String(Number(whole) + Number(VULGAR_FRACTIONS[fraction]))
    )
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_, numerator: string, denominator: string) => decimalFraction(numerator, denominator))
    .replace(/(\d+)\s*([¼½¾⅛⅜⅝⅞])/g, (_, whole: string, fraction: string) =>
      String(Number(whole) + Number(VULGAR_FRACTIONS[fraction]))
    )
    .replace(/([¼½¾⅛⅜⅝⅞])/g, (_, fraction: string) => VULGAR_FRACTIONS[fraction])
    .replace(/(\d+)\.(\d+)/g, "$1,$2")
    .replace(/([\d,]+)\s*(?:"|\bin(?:ch(?:es)?)?\b)/gi, "$1 po")
    .replace(/([\d,]+)\s*(?:'|\bft\b|\bfeet\b|\bfoot\b)/gi, "$1 pi")
    .replace(/([\d,]+)ft\b/gi, "$1 pi")
    .replace(/([\d,]+)\s*(mm|cm|m|kg|g|L|mL)\b/gi, "$1 $2")
    .replace(/([\d,]+)\s*%/g, "$1 %")
    .replace(/\bW\b/g, "L")
    .replace(/\bD\b/g, "P")
    .replace(/\b([LHP])\s*([\d,]+ (?:po|pi|mm|cm|m))\b/g, "$2 ($1)")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function formatUnitPrice(
  money: { amount: number; currency: string },
  unit: string,
  locale: SiteLocale = DEFAULT_LOCALE
) {
  const localizedUnit = locale === "fr-CA" && unit === "each" ? "unité" : unit;
  return locale === "fr-CA"
    ? `${formatMoney(money, locale)} l’${localizedUnit}`
    : `${formatMoney(money, locale)}/${unit === "each" ? "ea" : unit}`;
}
