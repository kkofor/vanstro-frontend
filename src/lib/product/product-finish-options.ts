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

export function presentProductFinishOptions(
  options: readonly ProductFinishOption[],
  locale: SiteLocale
): ProductFinishPresentation[] {
  return options.map((option) => ({
    option,
    colorName: option.colorName ?? option.name,
    configuration: option.configuration,
    configurationLabel: option.configuration ? CONFIGURATION_LABELS[option.configuration][locale] : null
  }));
}

export function findProductFinishOption(
  options: readonly ProductFinishPresentation[],
  colorName: string,
  configuration?: ProductFinishOption["configuration"]
) {
  return options.find((candidate) =>
    candidate.colorName === colorName && candidate.configuration === configuration
  ) ?? options.find((candidate) => candidate.colorName === colorName);
}
