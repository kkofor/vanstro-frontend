import type { ErpColorListItem } from "./types.js";

export function mapErpColorsToFinishOptions(colors: ErpColorListItem[], locale: "en-CA" | "fr-CA" = "en-CA") {
  return colors
    .sort((left, right) => left.sort - right.sort)
    .map((color, index) => ({
      name:
        locale === "fr-CA"
          ? color.color_name_fr || color.color_name_en || color.color_name_cn
          : color.color_name_en || color.color_name_cn,
      sku: color.color_code,
      manufacturerPartNumber: color.color_code,
      colorName:
        locale === "fr-CA"
          ? color.color_name_fr || color.color_name_en
          : color.color_name_en || color.color_name_cn,
      colorHex: color.color_code.startsWith("#") ? color.color_code : undefined,
      image: color.color_image ? { url: color.color_image, alt: color.color_name_en } : undefined,
      active: index === 0
    }));
}

export function parseErpDealerId(value: string | null | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
