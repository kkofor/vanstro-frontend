import type { ProductFinishOption } from "../api/api-contract.ts";
import type { SiteLocale } from "../i18n/locale.ts";

export type ProductFinishPresentation = {
  option: ProductFinishOption;
  colorName: string;
  configuration: ProductFinishOption["configuration"];
  configurationLabel: string | null;
};

const CONFIGURATION_LABELS = {
  "cabinet-only": {
    "en-CA": "Vanity Cabinet",
    "fr-CA": "Meuble-lavabo"
  },
  "with-top": {
    "en-CA": "Vanity Cabinet + Top",
    "fr-CA": "Meuble-lavabo + comptoir"
  }
} as const;

const COLOR_NAME_ALIASES: Readonly<Record<string, string>> = {
  "White with top": "White",
  "White cabinet only": "White",
  "Light Grey with top": "Light Grey",
  "Light Grey cabinet only": "Light Grey",
  "Blanc avec comptoir": "Blanc",
  "Blanc, sans comptoir": "Blanc",
  "Gris pâle avec comptoir": "Gris pâle",
  "Gris pâle, sans comptoir": "Gris pâle"
};

/**
 * Configuration labels ("Vanity Cabinet", "Vanity Cabinet + Top") describe a
 * bathroom-vanity-specific attribute (does the SKU include a countertop).
 * Kitchen cabinets have no such distinction, but their -WH/-LG manufacturer
 * part number suffixes match the same cabinet-only inference regex, so this
 * must stay gated to vanities to avoid mislabeling kitchen cabinet cards.
 */
export function isVanityConfigurationCategory(category?: string | null) {
  return Boolean(category && category.toLowerCase().includes("vanit"));
}

export function finishConfigurationLabel(
  configuration: ProductFinishOption["configuration"],
  locale: SiteLocale,
  category?: string | null
) {
  if (!configuration) return null;
  if (category !== undefined && !isVanityConfigurationCategory(category)) return null;
  return CONFIGURATION_LABELS[configuration][locale];
}

export function finishOptionIdentity(option: ProductFinishOption) {
  return option.sku ?? option.name;
}

export function findFinishOptionByIdentity(
  options: readonly ProductFinishOption[],
  identity?: string | null
) {
  if (!identity) return undefined;
  return (
    options.find((option) => option.sku === identity) ??
    options.find((option) => option.name === identity)
  );
}

export function inferFinishColorName(option: ProductFinishOption) {
  const explicit = option.colorName?.trim();
  if (explicit && COLOR_NAME_ALIASES[explicit]) return COLOR_NAME_ALIASES[explicit];
  if (explicit && !/with top|cabinet only|avec comptoir|sans comptoir/i.test(explicit)) {
    return explicit;
  }
  const named = COLOR_NAME_ALIASES[option.name];
  if (named) return named;
  return explicit ?? option.name;
}

export function inferFinishConfiguration(option: ProductFinishOption): ProductFinishOption["configuration"] {
  if (option.configuration) return option.configuration;
  const name = option.name.toLowerCase();
  if (name.includes("with top") || name.includes("avec comptoir")) return "with-top";
  if (name.includes("cabinet only") || name.includes("sans comptoir")) return "cabinet-only";
  const mpn = option.manufacturerPartNumber ?? "";
  if (/-TOP(?:$|[-/])/i.test(mpn) || mpn.endsWith("-TOP")) return "with-top";
  if (/(?:-WH|-LG)(?:$|[-/])/i.test(mpn) && !/-TOP/i.test(mpn)) return "cabinet-only";
  return undefined;
}

export function presentProductFinishOptions(
  options: readonly ProductFinishOption[],
  locale: SiteLocale,
  category?: string | null
): ProductFinishPresentation[] {
  return options.map((option) => {
    const configuration = inferFinishConfiguration(option);
    return {
      option,
      colorName: inferFinishColorName(option),
      configuration,
      configurationLabel: finishConfigurationLabel(configuration, locale, category)
    };
  });
}

export type ProductFinishSwatch = {
  hex: string;
  name: string;
  sku: string;
  optionName: string;
};

export function uniqueProductFinishSwatches(
  product: {
    sku?: string | null;
    finishOptions?: readonly ProductFinishOption[] | null;
    colorHex?: string | null;
    colorName?: string | null;
    finish?: string | null;
  },
  locale: SiteLocale,
  category?: string | null
): ProductFinishSwatch[] {
  const presented = presentProductFinishOptions(product.finishOptions ?? [], locale, category);
  const preferredConfiguration =
    presented.find((item) => item.option.active)?.configuration ??
    presented.find((item) => item.configuration === "with-top")?.configuration;
  const seen = new Set<string>();
  const swatches: ProductFinishSwatch[] = [];
  for (const item of presented) {
    const hex = item.option.colorHex?.trim();
    if (!hex) continue;
    const key = item.colorName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const resolved =
      findProductFinishOption(presented, item.colorName, preferredConfiguration) ?? item;
    swatches.push({
      hex: resolved.option.colorHex?.trim() || hex,
      name: resolved.colorName,
      sku: resolved.option.sku ?? product.sku ?? "",
      optionName: finishOptionIdentity(resolved.option)
    });
  }
  if (!swatches.length) {
    const hex = product.colorHex?.trim();
    if (hex) {
      swatches.push({
        hex,
        name: product.colorName ?? product.finish ?? "",
        sku: product.sku ?? "",
        optionName: product.colorName ?? product.finish ?? ""
      });
    }
  }
  return swatches;
}

export function findProductFinishOption(
  options: readonly ProductFinishPresentation[],
  colorName: string,
  configuration?: ProductFinishOption["configuration"]
) {
  if (configuration) {
    return options.find(
      (candidate) => candidate.colorName === colorName && candidate.configuration === configuration
    );
  }
  return options.find((candidate) => candidate.colorName === colorName);
}
