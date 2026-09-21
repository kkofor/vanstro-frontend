"use client";

import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { dealerContacts } from "@/lib/data/dealer-contacts";
import type { StorefrontDealerSummary } from "@/lib/api/api-contract";
import type { SiteLocale } from "@/lib/i18n/locale";

type DealerOption = {
  key: string;
  value: string;
  label: string;
};

/**
 * Build one select option from a dealer summary.
 *
 * The submitted value keeps the `${code} - ${name}` contract used before this
 * extraction ("MB01 - Yuan Construction Ltd.", "AB10 - AB10"). The visible
 * text uses the city when a location exists ("MB01 - Winnipeg", "AB10 -
 * Calgary"); a dealer without a location falls back to the full name so the
 * option never renders a blank label. location.city is used deliberately —
 * the API layer overwrites location.name with the dealer name for
 * single-location dealers.
 */
function toOption(summary: StorefrontDealerSummary): DealerOption {
  const location = summary.locations[0];
  const code = summary.code ?? location?.code ?? summary.name;
  return {
    key: summary.id,
    value: `${code} - ${summary.name}`,
    label: location?.city ? `${code} - ${location.city}` : `${code} - ${summary.name}`
  };
}

/**
 * Storefront API data when it resolves; the static list keeps the select from
 * rendering empty when the API is unavailable (fixture and local builds). The
 * static fallback has no city field, so its label mirrors its value.
 */
export function DealerSelect({ locale = "en-CA" }: { locale: SiteLocale }) {
  const french = locale === "fr-CA";
  const { dealerSummaries } = useLocale();

  const options: DealerOption[] =
    dealerSummaries.length > 0
      ? dealerSummaries.map(toOption)
      : dealerContacts.map((dealer) => ({
          key: dealer.dealer,
          value: dealer.dealer,
          label: dealer.dealer
        }));

  return (
    <Field controlId="dealer" label={french ? "Détaillant préféré" : "Preferred dealer"}>
      <Select name="dealer" defaultValue="">
        <option value="">{french ? "Je ne sais pas — choisir selon mon emplacement" : "Not sure / route by location"}</option>
        {options.map((option) => (
          <option value={option.value} key={option.key}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
