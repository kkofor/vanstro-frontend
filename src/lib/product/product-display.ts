import { DEFAULT_LOCALE, type SiteLocale } from "../i18n/locale.ts";
import { formatDisplayMeasurement } from "../i18n/display-format.ts";

const MATERIAL_DIMENSION_TOKENS = [
  "mdf",
  "pvc",
  "plywood",
  "painted",
  "primed",
  "finish",
  "white",
  "material"
];

export function formatProductSize(dimensions: string, locale: SiteLocale = DEFAULT_LOCALE) {
  const [size, ...details] = dimensions.split(",");
  const displayValue = details.some((detail) =>
    MATERIAL_DIMENSION_TOKENS.some((token) => detail.toLowerCase().includes(token))
  ) ? size : dimensions;

  return formatDisplayMeasurement(displayValue, locale);
}
